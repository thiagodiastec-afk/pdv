import { useState } from 'react';
import { formatBRL, type Product } from '../data/posData';

export interface WorkOrder {
  id: string;
  customer: string;
  equipment: string;
  serial: string;
  issue: string;
  quote: number;
  approved: boolean;
  createdAt: string;
  saleId?: string;
  lines?: { productId: string; quantity: number }[];
}

export function WorkOrders({ orders, products, checkoutOrderId, onSave, onCharge }: {
  orders: WorkOrder[];
  products: Product[];
  checkoutOrderId?: string;
  onSave: (order: WorkOrder) => Promise<boolean>;
  onCharge: (order: WorkOrder) => void;
}) {
  const [draft, setDraft] = useState<WorkOrder | null>(null);
  const [lineProduct, setLineProduct] = useState('');
  const [saving, setSaving] = useState(false);

  function newOrder() {
    setDraft({
      id: crypto.randomUUID(), customer: '', equipment: '', serial: '', issue: '',
      quote: 0, approved: false, createdAt: new Date().toISOString(),
    });
  }

  return (
    <section className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Ordens de serviço</h1>
        <button type="button" onClick={newOrder} className="rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-950">
          Nova ordem
        </button>
      </div>
      {draft && (
        <form className="grid gap-3 rounded border border-white/15 p-4 sm:grid-cols-2" onSubmit={async event => {
          event.preventDefault();
          if (saving || !draft.customer.trim() || !draft.equipment.trim() || !draft.issue.trim()) return;
          setSaving(true);
          try {
            if (await onSave({
              ...draft, customer: draft.customer.trim(), equipment: draft.equipment.trim(),
              issue: draft.issue.trim(), serial: draft.serial.trim(),
            })) setDraft(null);
          } finally {
            setSaving(false);
          }
        }}>
          {([['customer', 'Cliente'], ['equipment', 'Equipamento'], ['serial', 'Número de série'], ['issue', 'Defeito relatado']] as const).map(([key, label]) => (
            <label key={key}>{label}
              <input required={key !== 'serial'} maxLength={200} value={draft[key]}
                className="block w-full rounded bg-slate-800 p-2"
                onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
            </label>
          ))}
          <label>Orçamento (R$)
            <input type="number" min="0" step="0.01" required value={draft.quote}
              className="block w-full rounded bg-slate-800 p-2"
              onChange={event => setDraft({ ...draft, quote: Number(event.target.value) })} />
          </label>
          <label className="self-end p-2">
            <input type="checkbox" checked={draft.approved} onChange={event => setDraft({ ...draft, approved: event.target.checked })} />
            {' '}Orçamento aprovado
          </label>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend>Peças e serviços</legend>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Item da ordem" className="rounded bg-slate-800 p-2"
                value={lineProduct} onChange={event => setLineProduct(event.target.value)}>
                <option value="">Selecione no catálogo</option>
                {products.map(product => <option value={product.id} key={product.id}>{product.name} · {formatBRL(product.price)}</option>)}
              </select>
              <button type="button" disabled={!lineProduct || draft.lines?.some(line => line.productId === lineProduct)}
                onClick={() => setDraft({ ...draft, lines: [...(draft.lines ?? []), { productId: lineProduct, quantity: 1 }] })}>
                Adicionar item à ordem
              </button>
            </div>
            {(draft.lines ?? []).map(line => (
              <div className="flex flex-wrap items-center gap-3" key={line.productId}>
                <span>{products.find(product => product.id === line.productId)?.name ?? 'Item indisponível'}</span>
                <label>Quantidade
                  <input type="number" required min="1" step="1" className="ml-2 w-20 rounded bg-slate-800 p-2"
                    value={line.quantity} onChange={event => setDraft({ ...draft,
                      lines: draft.lines?.map(item => item.productId === line.productId ? { ...item, quantity: Number(event.target.value) } : item),
                    })} />
                </label>
                <button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines?.filter(item => item.productId !== line.productId) })}>
                  Remover
                </button>
              </div>
            ))}
          </fieldset>
          <div className="flex gap-3">
            <button disabled={saving} className="rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-950">Salvar ordem</button>
            <button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
          </div>
        </form>
      )}
      <ul className="space-y-2">
        {orders.map(order => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/15 p-4">
            <div>
              <strong>{order.equipment} · {order.customer}</strong>
              <p className="text-sm text-slate-300">{order.issue}{order.serial && ` · Série ${order.serial}`}</p>
              <p className="text-sm">{(order.lines ?? []).map(line =>
                line.quantity + ' × ' + (products.find(product => product.id === line.productId)?.name ?? 'Item indisponível')
              ).join(' · ')}</p>
              <p className="text-sm">{order.saleId ? 'Faturada' : order.approved ? 'Aprovada' : 'Aguardando aprovação'}</p>
            </div>
            {!order.saleId && (
              <div className="flex gap-3">
                <button type="button" disabled={checkoutOrderId === order.id} onClick={() => setDraft(order)}>Editar ordem</button>
                {order.approved && <button type="button" disabled={!!checkoutOrderId && checkoutOrderId !== order.id}
                  onClick={() => onCharge(order)} className="text-emerald-300">Enviar para o caixa</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
