import React, { useState } from 'react';
import {
  Search,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldAlert,
  Send,
  X,
} from 'lucide-react';
import {
  FiscalInvoice,
  StoreFiscalConfig,
  formatBRL,
  PAYMENT_LABELS,
  generateNfceXml,
} from '../data/posData';

interface InutilizedRange {
  id: string;
  serie: number;
  numeroInicial: number;
  numeroFinal: number;
  justificativa: string;
  protocoloSefaz: string;
  createdAt: string;
}

interface InvoicesHistoryViewProps {
  invoices: FiscalInvoice[];
  store: StoreFiscalConfig;
  onSelectInvoice: (inv: FiscalInvoice) => void;
  onTransmitSingleContingency?: (invoiceId: string) => void;
  onBackToPos: () => void;
}

export const InvoicesHistoryView: React.FC<InvoicesHistoryViewProps> = ({
  invoices,
  store,
  onSelectInvoice,
  onTransmitSingleContingency,
  onBackToPos,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'TODAS' | 'AUTORIZADA' | 'CONTINGENCIA' | 'CANCELADA'
  >('TODAS');
  const [showInutilizarModal, setShowInutilizarModal] = useState(false);
  const [inutSerie, setInutSerie] = useState(String(store.seriePadrao));
  const [inutInicio, setInutInicio] = useState('1480');
  const [inutFim, setInutFim] = useState('1480');
  const [inutJustificativa, setInutJustificativa] = useState(
    'Quebra de sequência de numeração por falha de energia no PDV'
  );
  const [inutilizedList, setInutilizedList] = useState<InutilizedRange[]>([]);

  const filtered = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'TODAS' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      String(inv.numero).includes(q) ||
      inv.chaveAcesso.includes(q) ||
      (inv.customerCpfCnpj || '').toLowerCase().includes(q) ||
      (inv.customerName || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const totalAutorizado = invoices
    .filter((i) => i.status === 'AUTORIZADA')
    .reduce((acc, i) => acc + i.total, 0);

  const totalTributos = invoices
    .filter((i) => i.status === 'AUTORIZADA')
    .reduce((acc, i) => acc + i.tribFederal + i.tribEstadual, 0);

  const handleDownloadXml = (inv: FiscalInvoice) => {
    const xml = generateNfceXml(inv, store);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFCe_${inv.chaveAcesso}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInutilizarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inutJustificativa.trim().length < 15) return;
    const now = new Date();
    const newEntry: InutilizedRange = {
      id: `inut-${Date.now()}`,
      serie: parseInt(inutSerie, 10) || 1,
      numeroInicial: parseInt(inutInicio, 10) || 1,
      numeroFinal: parseInt(inutFim, 10) || 1,
      justificativa: inutJustificativa.trim(),
      protocoloSefaz: `135269${Math.floor(100000000 + Math.random() * 899999999)}`,
      createdAt: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`,
    };
    setInutilizedList((prev) => [newEntry, ...prev]);
    setShowInutilizarModal(false);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5 bg-[#141e22]">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">
            Notas Fiscais de Consumidor Eletrônicas (NFC-e Modelo 65)
          </h1>
          <p className="text-xs text-slate-400">
            Emissões sincronizadas com a SEFAZ · CNPJ Emitente: {store.cnpj} · Série{' '}
            {String(store.seriePadrao).padStart(3, '0')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowInutilizarModal(true)}
            className="px-3.5 py-2 bg-[#25333a] hover:bg-[#31434c] text-amber-300 font-semibold text-xs rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Inutilizar Numeração (SEFAZ 102)
          </button>

          <button
            onClick={onBackToPos}
            className="px-4 py-2 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Frente de Caixa
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
          <div className="text-xs text-slate-400">Total de NFC-e Autorizadas</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {invoices.filter((i) => i.status === 'AUTORIZADA').length} notas ·{' '}
            <span className="text-[#00c885]">{formatBRL(totalAutorizado)}</span>
          </div>
        </div>
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
          <div className="text-xs text-slate-400">Tributos Aproximados (IBPT Lei 12.741)</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            {formatBRL(totalTributos)}
          </div>
        </div>
        <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
          <div className="text-xs text-slate-400">Ambiente SEFAZ & Certificado A1</div>
          <div className="text-sm font-semibold text-emerald-300 mt-1.5">
            {store.ambienteSefaz} · {store.modoContingenciaOffline ? 'Contingência Ativa' : 'Online Normal'}
          </div>
        </div>
      </div>

      {/* Inutilized Numbers Log if any */}
      {inutilizedList.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3.5 space-y-2">
          <div className="text-xs font-bold text-amber-300">
            Faixas de Numeração Inutilizadas na SEFAZ (cStat 102 — Inutilização de Número Homologado)
          </div>
          <div className="divide-y divide-white/10 text-xs font-mono tabular-nums">
            {inutilizedList.map((item) => (
              <div key={item.id} className="py-1.5 flex flex-wrap justify-between gap-2 text-slate-300">
                <span>
                  Série {String(item.serie).padStart(3, '0')} · Nº {item.numeroInicial} até {item.numeroFinal} ({item.justificativa})
                </span>
                <span className="text-amber-300">
                  Protocolo: {item.protocoloSefaz} · {item.createdAt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número da NFC-e, Chave de Acesso (44 dígitos) ou CPF/CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1d292f] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1d292f] p-1 rounded-lg border border-white/10">
          {(['TODAS', 'AUTORIZADA', 'CONTINGENCIA', 'CANCELADA'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#2a3b44] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'TODAS'
                ? 'Todas'
                : st === 'AUTORIZADA'
                ? 'Autorizadas'
                : st === 'CONTINGENCIA'
                ? 'Contingência'
                : 'Canceladas'}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Fiscal Table */}
      <div className="bg-[#1d292f] border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-white/10 bg-[#172126] text-slate-400 font-semibold">
                <th className="py-3 px-4">Nº NFC-e / Série</th>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Consumidor (CPF/CNPJ)</th>
                <th className="py-3 px-4">Chave de Acesso SEFAZ</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações Fiscais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    #{String(inv.numero).padStart(6, '0')} / {String(inv.serie).padStart(3, '0')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{inv.createdAt}</td>
                  <td className="py-3 px-4 text-slate-300">
                    {inv.customerCpfCnpj ? (
                      <span className="font-mono">{inv.customerCpfCnpj}</span>
                    ) : (
                      <span className="text-slate-500">Não identificado</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                    {inv.chaveAcesso}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {PAYMENT_LABELS[inv.paymentMethod].label}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {formatBRL(inv.total)}
                  </td>
                  <td className="py-3 px-4">
                    {inv.status === 'AUTORIZADA' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        100 Autorizada
                      </span>
                    ) : inv.status === 'CONTINGENCIA' ? (
                      <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                        tpEmis=9 Contingência
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        101 Cancelada
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {inv.status === 'CONTINGENCIA' && onTransmitSingleContingency && (
                        <button
                          onClick={() => onTransmitSingleContingency(inv.id)}
                          className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Transmitir nota em contingência para SEFAZ"
                        >
                          <Send className="w-3 h-3" />
                          Transmitir
                        </button>
                      )}
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2.5 py-1 bg-[#25333a] hover:bg-[#31434c] text-white rounded text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Visualizar e Imprimir DANFE"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#00c885]" />
                        DANFE
                      </button>
                      <button
                        onClick={() => handleDownloadXml(inv)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Baixar arquivo XML"
                      >
                        <Download className="w-3.5 h-3.5" />
                        XML
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    Nenhuma NFC-e encontrada para o filtro informado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inutilização de Numeração SEFAZ */}
      {showInutilizarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <form
            onSubmit={handleInutilizarSubmit}
            className="bg-[#1b272c] border border-white/10 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Inutilização de Numeração NFC-e (SEFAZ)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInutilizarModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Utilize quando ocorrer quebra na sequência de numeração das notas fiscais (ex.: pulo
              de número por falha técnica sem emissão).
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Série</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inutSerie}
                  onChange={(e) => setInutSerie(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nº Inicial</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inutInicio}
                  onChange={(e) => setInutInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nº Final</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inutFim}
                  onChange={(e) => setInutFim(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Justificativa Oficial (mínimo 15 caracteres)
              </label>
              <input
                type="text"
                required
                minLength={15}
                value={inutJustificativa}
                onChange={(e) => setInutJustificativa(e.target.value)}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInutilizarModal(false)}
                className="px-3 py-1.5 bg-white/10 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Transmitir Inutilização (cStat 102)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
