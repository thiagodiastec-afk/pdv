import type { BusinessProfile } from './BusinessSetup';
import React, { useState } from 'react';
import {
  Plus,
  Search,
  Star,
  ArrowLeft,
  Check,
  Pencil,
  Trash2,
  PackageCheck,
  X,
} from 'lucide-react';
import { Product, CategoryId, formatBRL } from '../data/posData';

interface CatalogFiscalViewProps {
  products: Product[];
  profile: BusinessProfile;
  onAddProduct: (prod: Product) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onBackToPos: () => void;
}

export const CatalogFiscalView: React.FC<CatalogFiscalViewProps> = ({
  products,
  profile,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onToggleFavorite,
  onBackToPos,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'TODAS' | Exclude<CategoryId, 'Favoritos'>>(
    'TODAS'
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [isService, setIsService] = useState(profile === 'services');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [stockStr, setStockStr] = useState('50');
  const [unit, setUnit] = useState<'UN' | 'KG' | 'LT'>('UN');
  const [category, setCategory] = useState<Exclude<CategoryId, 'Favoritos'>>('Bebidas');
  const [barcode, setBarcode] = useState('7891000010990');
  const [ncm, setNcm] = useState('19059090');
  const [cest, setCest] = useState('');
  const [cfop, setCfop] = useState<'5102' | '5405'>('5102');
  const [csosn, setCsosn] = useState<'102' | '500'>('102');
  const [ibptFedStr, setIbptFedStr] = useState('4.20');
  const [ibptEstStr, setIbptEstStr] = useState('12.00');

  const filtered = products.filter((p) => {
    const matchesCategory = categoryFilter === 'TODAS' || p.category === categoryFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.code.includes(q) ||
      p.ncm.includes(q);
    return matchesCategory && matchesSearch;
  });

  const openNewProductForm = () => {
    setEditingId(null);
    setIsService(profile === 'services');
    setCode(String(1000 + products.length + 1));
    setName('');
    setPriceStr('');
    setStockStr('50');
    setUnit('UN');
    setCategory('Bebidas');
    setBarcode(`7891000010${String(products.length + 12).padStart(3, '0')}`);
    setNcm('19059090');
    setCest('');
    setCfop('5102');
    setCsosn('102');
    setIbptFedStr('4.20');
    setIbptEstStr('12.00');
    setShowForm(true);
  };

  const openEditProductForm = (prod: Product) => {
    setEditingId(prod.id);
    setIsService(prod.kind === 'service');
    setCode(prod.code);
    setName(prod.name);
    setPriceStr(prod.price.toFixed(2));
    setStockStr(String(prod.stock));
    setUnit(prod.unit);
    setCategory(prod.category);
    setBarcode(prod.barcode);
    setNcm(prod.ncm);
    setCest(prod.cest || '');
    setCfop(prod.cfop);
    setCsosn(prod.csosn);
    setIbptFedStr(prod.ibptFederalPct.toFixed(2));
    setIbptEstStr(prod.ibptStatePct.toFixed(2));
    setShowForm(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const stock = isService ? 0 : Math.max(0, parseInt(stockStr, 10) || 0);
    const ibptFederalPct = parseFloat(ibptFedStr.replace(',', '.')) || 4.2;
    const ibptStatePct = parseFloat(ibptEstStr.replace(',', '.')) || 12.0;

    if (!name.trim() || !Number.isFinite(price) || price <= 0) return;

    const categoryDefaultImage: Record<Exclude<CategoryId, 'Favoritos'>, string> = {
      Bebidas: '/assets/products/cafe_expresso.png',
      Lanches: '/assets/products/pao_de_queijo.png',
      Doces: '/assets/products/bolo_de_cenoura.png',
      Outros: '/assets/products/agua_mineral.png',
    };

    if (editingId) {
      const existing = products.find((p) => p.id === editingId);
      if (!existing) return;
      const updatedProd: Product = {
        ...existing,
        code: code.trim() || existing.code,
        barcode: isService ? '' : barcode.trim() || existing.barcode,
        name: name.trim(),
        price,
        kind: isService ? 'service' : undefined,
        stock,
        unit,
        category,
        ncm: ncm.replace(/\D/g, '').slice(0, 8).padEnd(8, '0'),
        cest: cest.replace(/\D/g, '') || undefined,
        cfop,
        csosn,
        ibptFederalPct,
        ibptStatePct,
      };
      onUpdateProduct(updatedProd);
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        code: code.trim() || String(1000 + products.length + 1),
        barcode: isService ? '' : barcode.trim() || `7891000010${products.length + 15}`,
        name: name.trim(),
        price,
        kind: isService ? 'service' : undefined,
        category,
        isFavorite: true,
        featuredInMainGrid: true,
        image: categoryDefaultImage[category],
        unit,
        ncm: ncm.replace(/\D/g, '').slice(0, 8).padEnd(8, '0'),
        cest: cest.replace(/\D/g, '') || undefined,
        cfop,
        csosn,
        ibptFederalPct,
        ibptStatePct,
        stock,
      };
      onAddProduct(newProd);
    }

    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5 bg-[#141e22]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">
            Catálogo de produtos e serviços
          </h1>
          <p className="text-xs text-slate-400">
            Cadastro completo de itens com EAN-13, NCM, CFOP (5102 / 5405), CSOSN, alíquotas IBPT e controle de estoque
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openNewProductForm}
            className="px-4 py-2 bg-[#25333a] hover:bg-[#31434c] text-white font-semibold text-xs rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#00c885]" />
            Cadastrar item
          </button>

          <button
            onClick={onBackToPos}
            className="px-4 py-2 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao PDV
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Total de Itens Ativos</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {products.length} produtos
          </div>
        </div>
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Tributados Normal (CFOP 5102)</div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
            {products.filter((p) => p.cfop === '5102').length} itens
          </div>
        </div>
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Subst. Tributária (CFOP 5405)</div>
          <div className="text-lg font-bold font-mono text-[#00c885] mt-0.5">
            {products.filter((p) => p.cfop === '5405').length} itens
          </div>
        </div>
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Unidades em Estoque</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {products.reduce((acc, p) => acc + p.stock, 0)} un.
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal Form */}
      {showForm && (
        <form
          onSubmit={handleSaveForm}
          className="bg-[#1d292f] border border-[#00c885]/50 rounded-xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#00c885]" />
              <span className="text-xs font-bold text-[#00c885] uppercase tracking-wider">
                {editingId
                  ? `Editando Produto Fiscal #${code} — ${name}`
                  : 'Novo item do catálogo'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {profile === 'mixed' && !editingId && (
            <label className="block text-sm">
              Tipo do item
              <select className="ml-2 rounded bg-[#141e22] p-2" value={isService ? 'service' : 'product'}
                onChange={event => setIsService(event.target.value === 'service')}>
                <option value="product">Produto</option>
                <option value="service">Serviço</option>
              </select>
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Cód. Interno</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">
                {isService ? 'Descrição do serviço' : 'Descrição do produto'}
              </label>
              <input
                type="text"
                required
                placeholder="Nome do item"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Preço Unit. (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                aria-label="Preço unitário"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            {!isService && <>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Estoque Atual</label>
              <input
                type="number"
                min="0"
                required
                aria-label="Estoque atual"
                value={stockStr}
                onChange={(e) => setStockStr(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Unidade / Categoria</label>
              <div className="flex gap-1.5">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'UN' | 'KG' | 'LT')}
                  className="w-16 px-2 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#00c885]"
                >
                  <option value="UN">UN</option>
                  <option value="KG">KG</option>
                  <option value="LT">LT</option>
                </select>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Exclude<CategoryId, 'Favoritos'>)}
                  className="flex-1 px-2 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
                >
                  <option value="Bebidas">Bebidas</option>
                  <option value="Lanches">Lanches</option>
                  <option value="Doces">Doces</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
            </>}
          </div>

          {!isService && <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Código EAN-13 / GTIN
              </label>
              <input
                type="text"
                maxLength={14}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">NCM (8 dígitos)</label>
              <input
                type="text"
                maxLength={8}
                required
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                CEST (Obrigatório p/ ST)
              </label>
              <input
                type="text"
                maxLength={7}
                placeholder="Ex: 0300100"
                value={cest}
                onChange={(e) => setCest(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">
                Regra Fiscal CFOP & CSOSN (Simples Nacional)
              </label>
              <select
                value={`${cfop}-${csosn}`}
                onChange={(e) => {
                  const [c, s] = e.target.value.split('-') as ['5102' | '5405', '102' | '500'];
                  setCfop(c);
                  setCsosn(s);
                }}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-emerald-300 font-mono focus:outline-none focus:border-[#00c885]"
              >
                <option value="5102-102">CFOP 5102 / CSOSN 102 — Tributado Normal</option>
                <option value="5405-500">CFOP 5405 / CSOSN 500 — Subst. Tributária (ICMS-ST)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                IBPT Fed / Est (%)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={ibptFedStr}
                  onChange={(e) => setIbptFedStr(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
                  title="IBPT Federal %"
                />
                <input
                  type="number"
                  step="0.1"
                  value={ibptEstStr}
                  onChange={(e) => setIbptEstStr(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
                  title="IBPT Estadual %"
                />
              </div>
            </div>
          </div>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Salvar alterações' : 'Salvar item'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por nome, código interno, EAN-13 ou NCM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1d292f] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1d292f] p-1 rounded-lg border border-white/10">
          {(['TODAS', 'Bebidas', 'Lanches', 'Doces', 'Outros'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#2a3b44] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'TODAS' ? 'Todas' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1d292f] border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-white/10 bg-[#172126] text-slate-400 font-semibold">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Código / EAN-13</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">NCM / CEST</th>
                <th className="py-3 px-4">CFOP / CSOSN</th>
                <th className="py-3 px-4 text-right">Estoque</th>
                <th className="py-3 px-4 text-right">Preço Unit.</th>
                <th className="py-3 px-4 text-center">Favorito</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded object-cover border border-white/10 shrink-0"
                      />
                      <span className="font-semibold text-white">{prod.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">
                    #{prod.code} · {prod.barcode}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">{prod.category}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">
                    {prod.ncm} {prod.cest ? `· CEST ${prod.cest}` : ''}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-emerald-300">
                    CFOP {prod.cfop} · CSOSN {prod.csosn}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                    {prod.kind === 'service' ? 'Serviço' : `${prod.stock} ${prod.unit}`}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                    {formatBRL(prod.price)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => onToggleFavorite(prod.id)}
                      className={`p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                        prod.isFavorite ? 'text-amber-400' : 'text-slate-600'
                      }`}
                      title="Fixar nos Favoritos do PDV"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditProductForm(prod)}
                        className="px-2.5 py-1 bg-[#25333a] hover:bg-[#31434c] text-slate-200 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar produto e tributação"
                      >
                        <Pencil className="w-3 h-3 text-[#00c885]" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-1.5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
