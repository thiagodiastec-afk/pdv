import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  Building2,
  Code2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowLeft,
  WifiOff,
  Save,
} from 'lucide-react';
import {
  StoreFiscalConfig,
  FiscalInvoice,
  formatBRL,
  generateNfceXml,
} from '../data/posData';

interface FiscalConfigViewProps {
  store: StoreFiscalConfig;
  invoices: FiscalInvoice[];
  onUpdateStore: (updated: StoreFiscalConfig) => void;
  onTransmitContingencyInvoices: () => void;
  onBackToPos: () => void;
}

type ConfigTab = 'SEFAZ' | 'CERTIFICADO_A1' | 'CONTABILIDADE' | 'SOFTWARE_HOUSE';

export const FiscalConfigView: React.FC<FiscalConfigViewProps> = ({
  store,
  invoices,
  onUpdateStore,
  onTransmitContingencyInvoices,
  onBackToPos,
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('SEFAZ');
  const [formState, setFormState] = useState<StoreFiscalConfig>(store);
  const [certPassword, setCertPassword] = useState<string>('••••••••••••');
  const [sefazPingResult, setSefazPingResult] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const triggerSaveFeedback = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStore(formState);
    triggerSaveFeedback('Configurações fiscais e parâmetros SEFAZ salvos com sucesso.');
  };

  const handleTestSefazConnection = () => {
    setIsPinging(true);
    setSefazPingResult(null);
    setTimeout(() => {
      setIsPinging(false);
      const ambLabel = formState.ambienteSefaz.startsWith('2') ? 'Homologação' : 'Produção';
      setSefazPingResult(
        `Teste simulado no ambiente ${ambLabel}. Nenhuma consulta à SEFAZ foi realizada.`
      );
    }, 500);
  };

  const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const updated: StoreFiscalConfig = {
      ...formState,
      certificadoArquivoNome: file.name,
      certificadoValidade: 'Não verificada',
      certificadoStatus: 'PENDENTE',
    };
    setFormState(updated);
    onUpdateStore(updated);
    triggerSaveFeedback(`Certificado Digital A1 "${file.name}" selecionado para demonstração.`);
  };

  // Calculations for Accountant Closing (Simples Nacional Segregation CFOP 5102 vs 5405)
  const authorizedInvoices = invoices.filter((i) => i.status === 'AUTORIZADA');
  const cancelledInvoices = invoices.filter((i) => i.status === 'CANCELADA');
  const contingencyInvoices = invoices.filter((i) => i.status === 'CONTINGENCIA');

  const totalBrutoAutorizado = authorizedInvoices.reduce((acc, i) => acc + i.total, 0);

  // Segregate revenue by CFOP 5102 (Tributado Normal) vs CFOP 5405 (Substituição Tributária ICMS-ST)
  let totalCfop5102 = 0;
  let totalCfop5405 = 0;

  authorizedInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const itemTotal = item.product.price * item.quantity;
      if (item.product.cfop === '5405') {
        totalCfop5405 += itemTotal;
      } else {
        totalCfop5102 += itemTotal;
      }
    });
  });

  const handleDownloadBatchXml = () => {
    const batchXml = `<?xml version="1.0" encoding="UTF-8"?>
<loteContabilNFCe competencia="11/2026" cnpjEmitente="${formState.cnpj}" razaoSocial="${formState.razaoSocial}" qtdAutorizadas="${authorizedInvoices.length}" qtdCanceladas="${cancelledInvoices.length}">
  <resumoApuracaoSimplesNacional>
    <receitaTributadaCFOP5102>${totalCfop5102.toFixed(2)}</receitaTributadaCFOP5102>
    <receitaSubstituicaoTributariaCFOP5405>${totalCfop5405.toFixed(2)}</receitaSubstituicaoTributariaCFOP5405>
    <totalLiquidoNFCe>${totalBrutoAutorizado.toFixed(2)}</totalLiquidoNFCe>
  </resumoApuracaoSimplesNacional>
  <documentosFiscais>
${invoices.map((inv) => generateNfceXml(inv, formState).replace('<?xml version="1.0" encoding="UTF-8"?>\n', '')).join('\n')}
  </documentosFiscais>
</loteContabilNFCe>`;

    const blob = new Blob([batchXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lote_Contabil_NFCe_${formState.cnpj.replace(/\D/g, '')}_2026_11.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerSaveFeedback('Lote XML Contábil exportado para envio ao escritório de contabilidade.');
  };

  const handleDownloadAccountantCsv = () => {
    const header =
      'Numero_NFCe;Serie;Data_Emissao;Status;Chave_Acesso;CPF_CNPJ_Consumidor;Forma_Pagamento;CFOP_5102_Tributado;CFOP_5405_ICMS_ST;Desconto;Valor_Total_NFCe;Protocolo_SEFAZ\n';
    const rows = invoices
      .map((inv) => {
        const v5102 = inv.items
          .filter((i) => i.product.cfop === '5102')
          .reduce((a, b) => a + b.product.price * b.quantity, 0);
        const v5405 = inv.items
          .filter((i) => i.product.cfop === '5405')
          .reduce((a, b) => a + b.product.price * b.quantity, 0);
        return [
          inv.numero,
          inv.serie,
          inv.createdAt,
          inv.status,
          inv.chaveAcesso,
          inv.customerCpfCnpj || 'NAO_IDENTIFICADO',
          inv.paymentMethod,
          v5102.toFixed(2).replace('.', ','),
          v5405.toFixed(2).replace('.', ','),
          inv.discount.toFixed(2).replace('.', ','),
          inv.total.toFixed(2).replace('.', ','),
          inv.protocolo,
        ].join(';');
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Apuracao_Fiscal_NFCe_2026_11.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerSaveFeedback('Planilha CSV de apuração contábil exportada com sucesso.');
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5 bg-[#141e22]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">
            Configuração Fiscal SEFAZ, Certificado A1 & Painel da Software House
          </h1>
          <p className="text-xs text-slate-400">
            Parametrização de mensageria NFC-e (Modelo 65), CSC, Contingência Offline, Responsável Técnico e Exportação Contábil
          </p>
        </div>

        <button
          onClick={onBackToPos}
          className="px-4 py-2 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Frente de Caixa
        </button>
      </div>

      {saveBanner && (
        <div className="px-4 py-2.5 bg-[#00c885]/15 border border-[#00c885] rounded-lg text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#00c885] shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#1d292f] p-1.5 rounded-lg border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('SEFAZ')}
          className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'SEFAZ'
              ? 'bg-[#00c885] text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 className="w-4 h-4" />
          1. Emitente, CSC & Ambiente SEFAZ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CERTIFICADO_A1')}
          className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'CERTIFICADO_A1'
              ? 'bg-[#00c885] text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          2. Certificado Digital A1 (.pfx)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTABILIDADE')}
          className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'CONTABILIDADE'
              ? 'bg-[#00c885] text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          3. Fechamento Contábil & Lote XML
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SOFTWARE_HOUSE')}
          className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'SOFTWARE_HOUSE'
              ? 'bg-[#00c885] text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Code2 className="w-4 h-4" />
          4. Software House (infRespTec & API)
        </button>
      </div>

      {/* TAB 1: EMITENTE, CSC & AMBIENTE SEFAZ */}
      {activeTab === 'SEFAZ' && (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Environment & Contingency Control Box */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Ambiente de Transmissão SEFAZ (tag tpAmb)
                </span>
                <span className="text-xs font-mono text-emerald-300">
                  {formState.ambienteSefaz}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Use <strong>Homologação</strong> durante a implantação e testes na loja (as notas saem
                com aviso &ldquo;Sem Valor Fiscal&rdquo;). Mude para <strong>Produção</strong> quando a loja
                iniciar as vendas reais.
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...formState,
                      ambienteSefaz: '2 - Homologação' as const,
                    };
                    setFormState(updated);
                    onUpdateStore(updated);
                  }}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    formState.ambienteSefaz === '2 - Homologação'
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                      : 'bg-[#141e22] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  2 - Homologação (Testes)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...formState,
                      ambienteSefaz: '1 - Produção' as const,
                    };
                    setFormState(updated);
                    onUpdateStore(updated);
                  }}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    formState.ambienteSefaz === '1 - Produção'
                      ? 'bg-[#00c885]/15 border-[#00c885] text-emerald-200'
                      : 'bg-[#141e22] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  1 - Produção (Valor Fiscal)
                </button>
              </div>
            </div>

            <div className="bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Contingência Offline NFC-e (tpEmis = 9)
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.modoContingenciaOffline}
                    onChange={(e) => {
                      const updated = {
                        ...formState,
                        modoContingenciaOffline: e.target.checked,
                      };
                      setFormState(updated);
                      onUpdateStore(updated);
                    }}
                    className="accent-amber-400 w-4 h-4"
                  />
                  {formState.modoContingenciaOffline ? 'Contingência Ativa' : 'Online Normal'}
                </label>
              </div>
              <p className="text-xs text-slate-400">
                Quando ativado, o PDV emite o cupom fiscal imediatamente sem depender da internet e
                agenda a transmissão do lote para a SEFAZ em até 24h.
              </p>
              {contingencyInvoices.length > 0 && (
                <div className="flex items-center justify-between bg-amber-950/40 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
                  <span className="text-amber-200">
                    {contingencyInvoices.length} nota(s) aguardando sincronização SEFAZ
                  </span>
                  <button
                    type="button"
                    onClick={onTransmitContingencyInvoices}
                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded cursor-pointer"
                  >
                    Transmitir Agora
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dados Cadastrais da Loja e CSC */}
          <div className="bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-bold text-white">
                Dados do Estabelecimento Emitente & Credencial CSC (QR Code)
              </h2>
              <button
                type="button"
                onClick={handleTestSefazConnection}
                disabled={isPinging}
                className="px-3 py-1.5 bg-[#25333a] hover:bg-[#30424b] text-emerald-300 text-xs font-semibold rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                Testar Comunicação SEFAZ
              </button>
            </div>

            {sefazPingResult && (
              <div className="px-3.5 py-2 bg-[#141e22] border border-[#00c885]/40 rounded text-xs font-mono text-emerald-300">
                {sefazPingResult}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Razão Social do Lojista
                </label>
                <input
                  type="text"
                  value={formState.razaoSocial}
                  onChange={(e) => setFormState({ ...formState, razaoSocial: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">CNPJ Emitente</label>
                <input
                  type="text"
                  value={formState.cnpj}
                  onChange={(e) => setFormState({ ...formState, cnpj: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={formState.inscricaoEstadual}
                  onChange={(e) =>
                    setFormState({ ...formState, inscricaoEstadual: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Regime Tributário (CRT)
                </label>
                <select
                  value={formState.regimeTributario}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      regimeTributario: e.target.value as StoreFiscalConfig['regimeTributario'],
                    })
                  }
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
                >
                  <option value="1 - Simples Nacional">1 - Simples Nacional</option>
                  <option value="3 - Regime Normal (Lucro Presumido/Real)">
                    3 - Regime Normal (Lucro Presumido/Real)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  ID do Token CSC (6 dígitos)
                </label>
                <input
                  type="text"
                  value={formState.cscId}
                  onChange={(e) => setFormState({ ...formState, cscId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Código de Segurança do Contribuinte (CSC Alfanumérico SEFAZ)
                </label>
                <input
                  type="text"
                  value={formState.cscToken}
                  onChange={(e) => setFormState({ ...formState, cscToken: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-emerald-300 font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Série NFC-e</label>
                <input
                  type="number"
                  min={1}
                  value={formState.seriePadrao}
                  onChange={(e) =>
                    setFormState({ ...formState, seriePadrao: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Próxima Numeração NFC-e
                </label>
                <input
                  type="number"
                  min={1}
                  value={formState.proximoNumeroNfce}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      proximoNumeroNfce: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Endereço Fiscal (Impresso no cabeçalho do DANFE)
                </label>
                <input
                  type="text"
                  value={formState.endereco}
                  onChange={(e) => setFormState({ ...formState, endereco: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c885]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Parâmetros Fiscais
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: CERTIFICADO DIGITAL A1 (.PFX) */}
      {activeTab === 'CERTIFICADO_A1' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#00c885]" />
              <h2 className="text-sm font-bold text-white">
                Certificado Digital e-CNPJ Modelo A1 (Arquivo .PFX / .P12)
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              O modelo <strong>A1</strong> permite que o servidor assine as notas fiscais
              automaticamente em nuvem para todos os caixas da loja, sem depender de cartões ou
              leitores USB.
            </p>

            <div className="bg-[#141e22] border border-[#00c885]/30 rounded-lg p-4 space-y-2 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Status do Certificado:</span>
                <span className="text-[#00c885] font-bold">ATIVO & VALIDADO (ICP-Brasil)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arquivo Carregado:</span>
                <span className="font-mono text-white">{formState.certificadoArquivoNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Titular / CNPJ:</span>
                <span className="text-white">
                  {formState.razaoSocial} ({formState.cnpj})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Autoridade Certificadora:</span>
                <span className="text-slate-300">{formState.certificadoEmissor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Válido Até:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {formState.certificadoValidade}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Senha de Instalação do Certificado A1
                </label>
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 hover:border-[#00c885] rounded-lg p-5 cursor-pointer bg-[#141e22]/60 transition-colors">
                <Upload className="w-5 h-5 text-[#00c885] mb-1.5" />
                <span className="text-xs font-semibold text-white">
                  Clique para substituir ou carregar novo arquivo .PFX / .P12
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Criptografia AES-256 no cofre de credenciais da loja
                </span>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleCertificateFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Checklist de Ativação de Novo Cliente (Onboarding)
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 bg-[#141e22] rounded-lg border border-white/10">
                <div className="font-semibold text-white">1. Arquivo .PFX + Senha</div>
                <div className="text-slate-400 mt-0.5">
                  Solicite ao lojista o Certificado A1 (e-CNPJ). Evite modelo A3 (token USB).
                </div>
              </div>
              <div className="p-3 bg-[#141e22] rounded-lg border border-white/10">
                <div className="font-semibold text-white">2. Credenciamento SEFAZ + CSC</div>
                <div className="text-slate-400 mt-0.5">
                  O contador da loja gera o ID e o Código CSC no portal da SEFAZ estadual para
                  habilitar o QR Code.
                </div>
              </div>
              <div className="p-3 bg-[#141e22] rounded-lg border border-white/10">
                <div className="font-semibold text-white">3. Revisão de NCM e CFOP</div>
                <div className="text-slate-400 mt-0.5">
                  Produtos com ICMS retido anteriormente (ex.: refrigerantes, águas) usam CFOP 5405
                  e CSOSN 500 para reduzir o imposto do cliente.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FECHAMENTO CONTÁBIL & LOTE XML */}
      {activeTab === 'CONTABILIDADE' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
            <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
              <div className="text-xs text-slate-400">
                Receita Tributada Normal (CFOP 5102 / CSOSN 102)
              </div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {formatBRL(totalCfop5102)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Incidência normal de ICMS na guia do Simples Nacional (DAS)
              </div>
            </div>

            <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
              <div className="text-xs text-slate-400">
                Receita com Substituição Tributária (CFOP 5405 / CSOSN 500)
              </div>
              <div className="text-xl font-bold font-mono text-[#00c885] mt-1">
                {formatBRL(totalCfop5405)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                ICMS já recolhido na indústria (isento de novo ICMS no DAS)
              </div>
            </div>

            <div className="bg-[#1d292f] border border-white/10 rounded-lg p-4">
              <div className="text-xs text-slate-400">Total Faturado & Notas no Período</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {formatBRL(totalBrutoAutorizado)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {authorizedInvoices.length} autorizadas · {cancelledInvoices.length} canceladas
              </div>
            </div>
          </div>

          <div className="bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Exportação Mensal de XMLs e Resumo Fiscal para o Contador
                </h2>
                <p className="text-xs text-slate-400">
                  Escritório configurado: <strong>{formState.contadorNome}</strong> ({formState.contadorEmail})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBatchXml}
                  className="px-4 py-2.5 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Lote XML Unificado (SEFAZ 4.00)
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAccountantCsv}
                  className="px-4 py-2.5 bg-[#25333a] hover:bg-[#31444d] text-white font-semibold text-xs rounded-lg border border-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#00c885]" />
                  Exportar Planilha Contábil (.CSV)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nome do Escritório / Contador
                </label>
                <input
                  type="text"
                  value={formState.contadorNome}
                  onChange={(e) => setFormState({ ...formState, contadorNome: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  E-mail Fiscal da Contabilidade
                </label>
                <input
                  type="email"
                  value={formState.contadorEmail}
                  onChange={(e) => setFormState({ ...formState, contadorEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Registro CRC</label>
                <input
                  type="text"
                  value={formState.contadorCrc}
                  onChange={(e) => setFormState({ ...formState, contadorCrc: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOFTWARE HOUSE (<infRespTec> & API DE MENSAGERIA) */}
      {activeTab === 'SOFTWARE_HOUSE' && (
        <form onSubmit={handleSave} className="bg-[#1d292f] border border-white/10 rounded-lg p-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white">
              Credenciais da Sua Software House (Bloco XML &lt;infRespTec&gt; & Integração REST)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estes dados identificam a sua empresa como desenvolvedora oficial do PDV perante a
              SEFAZ em todas as notas emitidas pelos seus clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                CNPJ da Software House (infRespTec)
              </label>
              <input
                type="text"
                value={formState.respTecCnpj}
                onChange={(e) => setFormState({ ...formState, respTecCnpj: e.target.value })}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Responsável Técnico (xContato)
              </label>
              <input
                type="text"
                value={formState.respTecContato}
                onChange={(e) => setFormState({ ...formState, respTecContato: e.target.value })}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                E-mail de Suporte Técnico
              </label>
              <input
                type="email"
                value={formState.respTecEmail}
                onChange={(e) => setFormState({ ...formState, respTecEmail: e.target.value })}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Telefone Suporte (DDD + Número)
              </label>
              <input
                type="text"
                value={formState.respTecFone}
                onChange={(e) => setFormState({ ...formState, respTecFone: e.target.value })}
                className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-xs text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <label className="block text-xs font-bold text-white mb-2">
              Motor de Mensageria Fiscal (Conector de Emissão)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {(
                [
                  { id: 'FOCUS_NFE', title: 'Focus NFe API', desc: 'REST JSON · Multi-estado' },
                  { id: 'NUVEM_FISCAL', title: 'Nuvem Fiscal API', desc: 'REST JSON · Alta escala' },
                  { id: 'PLUG_NOTAS', title: 'PlugNotas TecnoSpeed', desc: 'REST JSON · Sefaz/TEF' },
                  { id: 'SEFAZ_DIRETO', title: 'SEFAZ Direto (SOAP)', desc: 'Assinatura XML nativa' },
                ] as const
              ).map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setFormState({ ...formState, provedorApiFiscal: prov.id })}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    formState.provedorApiFiscal === prov.id
                      ? 'bg-[#00c885]/15 border-[#00c885] text-white'
                      : 'bg-[#141e22] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">{prov.title}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{prov.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Dados da Software House
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
