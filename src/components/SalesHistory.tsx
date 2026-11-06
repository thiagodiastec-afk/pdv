import { useState } from 'react';
import { formatBRL, type CashMovement, type FiscalInvoice } from '../data/posData';

export function SalesHistory({ movements, invoices }: {
  movements: CashMovement[];
  invoices: FiscalInvoice[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sales = movements.filter(movement => movement.type === 'VENDA');

  return (
    <section className="flex-1 overflow-auto p-5">
      <h1 className="mb-4 text-xl font-bold">Histórico de vendas</h1>
      {sales.length === 0 && <p className="text-slate-300">Nenhuma venda registrada.</p>}
      <ul className="space-y-2">
        {sales.map(sale => {
          const invoice = sale.invoiceNumero === undefined ? undefined :
            invoices.find(entry => entry.numero === sale.invoiceNumero);
          const items = sale.items ?? invoice?.items;
          const discount = sale.discount ?? invoice?.discount;
          return (
            <li key={sale.id} className="rounded border border-white/15 bg-[#1b272c]">
              <button type="button" className="flex w-full flex-wrap justify-between gap-2 p-3 text-left"
                aria-expanded={selected === sale.id}
                onClick={() => setSelected(selected === sale.id ? null : sale.id)}>
                <span>{sale.createdAt} · {sale.paymentMethod}</span>
                <strong>{formatBRL(sale.amount)}</strong>
              </button>
              {selected === sale.id && (
                <div className="space-y-2 border-t border-white/10 p-3 text-sm">
                  <p>{sale.description}</p>
                  {sale.operation && <p>{sale.operation === 'repair' ? 'Conserto ou assistência técnica' : 'Atendimento de balcão'}</p>}
                  {invoice?.status === 'CANCELADA' && <p className="text-amber-200">Venda estornada</p>}
                  {items ? (
                    <ul>{items.map(item => (
                      <li key={item.product.id} className="flex justify-between gap-2">
                        <span>{item.quantity} × {item.product.name}</span>
                        <span className="text-slate-400">{item.product.kind === 'service' ? 'Serviço' : 'Mercadoria'}</span>
                        <span>{formatBRL(item.quantity * item.product.price)}</span>
                      </li>
                    ))}</ul>
                  ) : <p>Os itens desta venda antiga não foram gravados.</p>}
                  {discount !== undefined && <p>Desconto {formatBRL(discount)}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
