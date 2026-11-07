import { useState } from 'react';
import type { Product } from '../data/posData';
import { readSupplierProducts, type SupplierProduct } from '../data/supplierProducts';

type PreviewRow = {
  item: SupplierProduct;
  price: string;
  stock: string;
  selected: boolean;
};

const MAX_ITEMS = 500;

export function BatchProductImport({ products, onAddProducts }: {
  products: Product[];
  onAddProducts: (products: Product[]) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const existingBarcodes = new Set(products.map(product => product.barcode).filter(Boolean));
  const selected = rows.filter(row => row.selected);
  const duplicateBarcodes = new Set<string>();
  const seenBarcodes = new Set(existingBarcodes);

  for (const { item } of selected) {
    if (!item.barcode) continue;
    if (seenBarcodes.has(item.barcode)) duplicateBarcodes.add(item.barcode);
    seenBarcodes.add(item.barcode);
  }

  function parsePrice(value: string) {
    return /^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) ? Number(value.replace(',', '.')) : NaN;
  }

  async function readFile(file: File) {
    setRows([]);
    setMessage('');
    setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Selecione um XML de até 5 MB.');
      const items = readSupplierProducts(await file.text());
      if (!items.length) throw new Error('Nenhum produto de NF-e encontrado no XML.');
      if (items.length > MAX_ITEMS) throw new Error('Selecione um XML com até 500 itens.');
      const seen = new Set(existingBarcodes);
      const nextRows = items.map(item => {
        const selected = !item.barcode || !seen.has(item.barcode);
        if (item.barcode) seen.add(item.barcode);
        return { item, price: '', stock: '0', selected };
      });
      setRows(nextRows);
      const skipped = nextRows.filter(row => !row.selected).length;
      if (skipped) setMessage(`${skipped} item(ns) com código de barras repetido ficaram desmarcados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ler o XML.');
    } finally {
      setBusy(false);
    }
  }

  function updateRow(index: number, patch: Partial<PreviewRow>) {
    setRows(current => current.map((row, position) => position === index ? { ...row, ...patch } : row));
  }

  async function save() {
    if (!selected.length || busy) return;
    if (duplicateBarcodes.size) {
      setMessage('Desmarque os itens com código de barras repetido antes de salvar.');
      return;
    }
    if (selected.some(row => !Number.isFinite(parsePrice(row.price)) || parsePrice(row.price) <= 0 ||
      !/^\d+$/.test(row.stock.trim()) || !Number.isSafeInteger(Number(row.stock)))) {
      setMessage('Informe um preço de venda positivo e um estoque inteiro a partir de zero para cada item marcado.');
      return;
    }

    const codes = new Set(products.map(product => product.code));
    let nextCode = 1001;
    const imported = selected.map(({ item, price, stock }): Product => {
      while (codes.has(String(nextCode))) nextCode++;
      return {
        id: 'prod-' + crypto.randomUUID(),
        code: String(nextCode++),
        barcode: item.barcode,
        name: item.name,
        price: parsePrice(price),
        stock: Number(stock),
        category: 'Outros',
        isFavorite: true,
        featuredInMainGrid: true,
        image: '/assets/products/agua_mineral.png',
        unit: item.unit === 'KG' || item.unit === 'LT' ? item.unit : 'UN',
        ncm: item.ncm,
        cest: item.cest || undefined,
        cfop: '5102',
        csosn: '102',
        ibptFederalPct: 4.2,
        ibptStatePct: 12,
      };
    });

    setBusy(true);
    try {
      if (await onAddProducts(imported)) {
        setRows([]);
        setMessage(`${imported.length} produto(s) cadastrado(s).`);
      } else {
        setMessage('O lote não foi salvo. Confira se algum item foi cadastrado em outra tela.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-white/15 p-4 text-sm">
      <h2 className="font-bold">Importar produtos em lote</h2>
      <p className="text-slate-300">
        Carregue o XML do fornecedor e informe preço de venda e estoque.
        O CFOP do fornecedor fica fora da importação. Revise as sugestões fiscais depois do cadastro.
      </p>
      <label className="block">XML para importação em lote
        <input type="file" accept=".xml,text/xml,application/xml" disabled={busy} className="mt-1 block"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void readFile(file);
          }} />
      </label>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr>
              <th scope="col">Importar</th><th scope="col">Produto</th><th scope="col">Código de barras</th>
              <th scope="col">Preço de venda</th><th scope="col">Estoque</th>
            </tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-white/10">
                  <td className="p-2">
                    <input type="checkbox" aria-label={`Importar linha ${index + 1}`} checked={row.selected}
                      disabled={busy || existingBarcodes.has(row.item.barcode)}
                      onChange={event => updateRow(index, { selected: event.target.checked })} />
                  </td>
                  <td>{row.item.name}</td>
                  <td className="pr-2">
                    {row.item.barcode || 'Sem GTIN'}
                    {existingBarcodes.has(row.item.barcode) && <span className="block text-amber-200">Já cadastrado</span>}
                    {row.selected && duplicateBarcodes.has(row.item.barcode) && <span className="block text-amber-200">Duplicado</span>}
                  </td>
                  <td className="p-2">
                    <input type="text" inputMode="decimal" aria-label={`Preço de venda da linha ${index + 1}`}
                      value={row.price} disabled={busy || !row.selected}
                      onChange={event => updateRow(index, { price: event.target.value })}
                      className="w-28 rounded bg-[#141e22] p-2" />
                  </td>
                  <td className="p-2">
                    <input type="text" inputMode="numeric" aria-label={`Estoque da linha ${index + 1}`}
                      value={row.stock} disabled={busy || !row.selected}
                      onChange={event => updateRow(index, { stock: event.target.value })}
                      className="w-24 rounded bg-[#141e22] p-2" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <button type="button" disabled={busy || !selected.length}
        className="rounded bg-[#00c885] px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
        onClick={() => void save()}>Cadastrar produtos selecionados</button>}
      {message && <p role="status" className="text-amber-200">{message}</p>}
    </section>
  );
}
