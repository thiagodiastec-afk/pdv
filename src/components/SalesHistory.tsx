import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatBRL, type CartItem, type CashMovement, type FiscalInvoice } from '../data/posData';

type ReturnSale = (saleId: string, quantities: Record<string, number>, reason: string) => Promise<boolean>;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function saleDate(timestamp: string) {
  const local = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(timestamp);
  return local ? `${local[3]}-${local[2]}-${local[1]}` : timestamp.slice(0, 10);
}

function ReturnForm({ saleId, items, onReturn, onClose }: {
  saleId: string;
  items: CartItem[];
  onReturn: ReturnSale;
  onClose: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const selection = items.filter(item => (quantities[item.product.id] ?? 0) > 0);
  const valid = selection.length > 0 && selection.every(item => {
    const quantity = quantities[item.product.id];
    return Number.isInteger(quantity) && quantity <= item.quantity;
  });

  return (
    <form className="space-y-3 rounded border border-white/15 p-3" onSubmit={async event => {
      event.preventDefault();
      if (!valid || !reason.trim() || saving) return;
      setSaving(true);
      try {
        const request = Object.fromEntries(selection.map(item => [item.product.id, quantities[item.product.id]]));
        if (await onReturn(saleId, request, reason.trim())) onClose();
      } finally {
        setSaving(false);
      }
    }}>
      <p className="font-semibold">Itens da devolução</p>
      <button type="button" disabled={saving} className="text-emerald-300 underline"
        onClick={() => setQuantities(Object.fromEntries(items.map(item => [item.product.id, item.quantity])))}>
        Selecionar todos os itens restantes
      </button>
      {items.map(item => (
        <label key={item.product.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{item.product.name} · {item.quantity} disponível(is)</span>
          <input type="number" min={0} max={item.quantity} step={1} disabled={saving}
            aria-label={`Quantidade a devolver de ${item.product.name}`}
            className="w-24 rounded bg-[#141e22] p-2"
            value={quantities[item.product.id] ?? ''}
            onChange={event => setQuantities(current => ({ ...current, [item.product.id]: event.target.valueAsNumber || 0 }))} />
        </label>
      ))}
      <label className="block">
        Motivo da devolução
        <input required maxLength={250} disabled={saving} className="mt-1 block w-full rounded bg-[#141e22] p-2"
          value={reason} onChange={event => setReason(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!valid || !reason.trim() || saving}
          className="rounded bg-[#00c885] px-3 py-2 font-semibold text-slate-950 disabled:opacity-50">
          Confirmar devolução
        </button>
        <button type="button" disabled={saving} onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
}

function SaleReceipt({ sale, businessName, items, discount, returnedAmount }: {
  sale: CashMovement;
  businessName?: string;
  items?: CartItem[];
  discount?: number;
  returnedAmount: number;
}) {
  return createPortal(
    <div id="sale-receipt-print" aria-hidden="true" className="hidden print:block">
      <style>{`@media print {
        #sale-receipt-print, #sale-receipt-print * { visibility: visible; }
        #sale-receipt-print {
          position: absolute; inset: 0 auto auto 0; width: 80mm; padding: 4mm;
          background: white; color: black; font: 11pt monospace;
        }
      }`}</style>
      <p><strong>{businessName ?? 'CromaPDV'}</strong></p>
      <p>COMPROVANTE DE VENDA · SEM VALOR FISCAL</p>
      <p>{sale.createdAt}</p>
      <p>Registro {sale.id}</p>
      {sale.customerName && <p>Cliente {sale.customerName}</p>}
      {items ? (
        <ul>{items.map(item => (
          <li key={item.product.id}>
            {item.quantity} × {item.product.name} · {formatBRL(item.quantity * item.product.price)}
          </li>
        ))}</ul>
      ) : <p>Venda antiga sem detalhamento de itens.</p>}
      {discount !== undefined && <p>Desconto {formatBRL(discount)}</p>}
      <p><strong>Total {formatBRL(sale.amount)}</strong> · {sale.paymentMethod}</p>
      {returnedAmount > 0 && <p>Devoluções registradas {formatBRL(returnedAmount)}</p>}
    </div>,
    document.body,
  );
}

function SaleDetails({ sale, invoice, returns, businessName, onReturn }: {
  sale: CashMovement;
  invoice?: FiscalInvoice;
  returns: CashMovement[];
  businessName?: string;
  onReturn?: ReturnSale;
}) {
  const [returning, setReturning] = useState(false);
  const items = sale.items ?? invoice?.items;
  const discount = sale.discount ?? invoice?.discount;
  const returnedItems = returns.flatMap(movement => movement.items ?? []);
  const remaining = (items ?? []).map(item => ({
    ...item,
    quantity: item.quantity - returnedItems.filter(returned => returned.product.id === item.product.id)
      .reduce((total, returned) => total + returned.quantity, 0),
  })).filter(item => item.quantity > 0);
  const returnedAmount = invoice?.status === 'CANCELADA'
    ? sale.amount
    : returns.reduce((total, movement) => total + movement.amount, 0);

  return (
    <div className="space-y-2 border-t border-white/10 p-3 text-sm">
      <p>{sale.description}</p>
      {sale.operation && <p>{sale.operation === 'repair' ? 'Conserto ou assistência técnica' : 'Atendimento de balcão'}</p>}
      {invoice?.status === 'CANCELADA' && <p className="text-amber-200">Venda estornada</p>}
      {returns.length > 0 && (
        <p className="text-amber-200">{remaining.length ? 'Devolução parcial' : 'Devolução total'}</p>
      )}
      {items ? (
        <ul>{items.map(item => (
          <li key={item.product.id} className="flex flex-wrap justify-between gap-2">
            <span>{item.quantity} × {item.product.name}</span>
            <span className="text-slate-400">{item.product.kind === 'service' ? 'Serviço' : 'Mercadoria'}</span>
            <span>{formatBRL(item.quantity * item.product.price)}</span>
          </li>
        ))}</ul>
      ) : <p>Os itens desta venda antiga não foram gravados.</p>}
      {discount !== undefined && <p>Desconto {formatBRL(discount)}</p>}
      {returns.length > 0 && (
        <ul aria-label="Devoluções registradas" className="space-y-1 text-slate-300">
          {returns.map(movement => (
            <li key={movement.id}>{movement.createdAt} · {formatBRL(movement.amount)} · {movement.description}{movement.authorizedBy && ' · Autorizado por ' + movement.authorizedBy}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded border border-white/20 px-3 py-2" onClick={() => window.print()}>
          Imprimir comprovante
        </button>
        {onReturn && sale.invoiceNumero === undefined && remaining.length > 0 && !returning && (
          <button type="button" className="rounded border border-white/20 px-3 py-2" onClick={() => setReturning(true)}>
            Registrar devolução
          </button>
        )}
      </div>
      {sale.invoiceNumero !== undefined && invoice?.status !== 'CANCELADA' && (
        <p className="text-slate-300">Para estornar esta venda, use o cancelamento no histórico de notas fiscais.</p>
      )}
      {returning && onReturn && remaining.length > 0 && (
        <ReturnForm saleId={sale.id} items={remaining} onReturn={onReturn} onClose={() => setReturning(false)} />
      )}
      <SaleReceipt sale={sale} businessName={businessName} items={items} discount={discount} returnedAmount={returnedAmount} />
    </div>
  );
}

export function SalesHistory({ movements, invoices, businessName, onReturn }: {
  movements: CashMovement[];
  invoices: FiscalInvoice[];
  businessName?: string;
  onReturn?: ReturnSale;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customer, setCustomer] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const query = normalize(customer.trim());
  const digits = /^[\d./\s-]+$/.test(query) ? query.replace(/\D/g, '') : '';
  const sales = movements.filter(movement => movement.type === 'VENDA').map(sale => ({
    sale,
    invoice: sale.invoiceId ? invoices.find(entry => entry.id === sale.invoiceId) :
      invoices.find(entry => entry.numero === sale.invoiceNumero),
  })).filter(({ sale, invoice }) => {
    const date = saleDate(sale.createdAt);
    const name = normalize(sale.customerName ?? invoice?.customerName ?? '');
    const documentNumber = (sale.customerCpfCnpj ?? invoice?.customerCpfCnpj ?? '').replace(/\D/g, '');
    return (!start || date >= start) && (!end || date <= end) &&
      (!query || name.includes(query) || (digits && documentNumber.includes(digits)));
  });

  return (
    <section className="min-h-0 flex-1 overflow-auto p-5 pb-10">
      <h1 className="mb-4 text-xl font-bold">Histórico de vendas</h1>
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="text-sm">
          Cliente ou CPF/CNPJ
          <input className="mt-1 block w-full rounded border border-white/15 bg-[#1b272c] p-2"
            value={customer} onChange={event => setCustomer(event.target.value)} />
        </label>
        <label className="text-sm">
          Data inicial
          <input type="date" max={end || undefined}
            className="mt-1 block w-full rounded border border-white/15 bg-[#1b272c] p-2"
            value={start} onChange={event => setStart(event.target.value)} />
        </label>
        <label className="text-sm">
          Data final
          <input type="date" min={start || undefined}
            className="mt-1 block w-full rounded border border-white/15 bg-[#1b272c] p-2"
            value={end} onChange={event => setEnd(event.target.value)} />
        </label>
      </div>
      {sales.length === 0 && <p className="text-slate-300">Nenhuma venda encontrada.</p>}
      <ul className="space-y-2">
        {sales.map(({ sale, invoice }) => (
          <li key={sale.id} className="rounded border border-white/15 bg-[#1b272c]">
            <button type="button" className="flex w-full flex-wrap justify-between gap-2 p-3 text-left"
              aria-expanded={selected === sale.id} onClick={() => setSelected(selected === sale.id ? null : sale.id)}>
              <span>{sale.createdAt} · {sale.paymentMethod}{(sale.customerName ?? invoice?.customerName)
                && ` · ${sale.customerName ?? invoice?.customerName}`}</span>
              <strong>{formatBRL(sale.amount)}</strong>
            </button>
            {selected === sale.id && (
              <SaleDetails sale={sale} invoice={invoice} businessName={businessName} onReturn={onReturn}
                returns={movements.filter(movement => movement.returnSaleId === sale.id || (invoice && movement.type === 'ESTORNO' && movement.invoiceId === invoice.id))} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
