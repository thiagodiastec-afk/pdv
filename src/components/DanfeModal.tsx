import React, { useState } from 'react';
import { Printer, Download, CheckCircle2, Copy, Check, X, FileCode2, Ban } from 'lucide-react';
import {
  FiscalInvoice,
  StoreFiscalConfig,
  formatBRL,
  formatChaveAcesso,
  PAYMENT_LABELS,
  generateNfceXml,
} from '../data/posData';

interface DanfeModalProps {
  invoice: FiscalInvoice;
  store: StoreFiscalConfig;
  onClose: () => void;
  onCancelInvoice?: (invoiceId: string, reason: string) => void;
}

export const DanfeModal: React.FC<DanfeModalProps> = ({
  invoice,
  store,
  onClose,
  onCancelInvoice,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Erro de digitação nos itens da venda');

  const xmlContent = generateNfceXml(invoice, store);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(invoice.chaveAcesso);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFCe_${invoice.chaveAcesso}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141e22] border-b border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#00c885] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">
                {invoice.status === 'CANCELADA'
                  ? `NFC-e Nº ${String(invoice.numero).padStart(6, '0')} (CANCELADA)`
                  : `NFC-e Nº ${String(invoice.numero).padStart(6, '0')} Emitida com Sucesso`}
              </h2>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                Protocolo simulado: {invoice.protocolo} · Série {String(invoice.serie).padStart(3, '0')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Split between Thermal Receipt & Fiscal Telemetry/Actions */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: 80mm Thermal Receipt Preview */}
          <div className="md:col-span-7 flex justify-center">
            <div
              id="danfe-printable-area"
              className="w-full max-w-[340px] bg-[#fffef7] text-neutral-900 rounded-md p-5 shadow-lg border border-neutral-300 font-mono text-[11px] leading-relaxed select-all"
            >
              {/* Store Header */}
              <div className="text-center border-b border-dashed border-neutral-400 pb-2.5 mb-2.5">
                <div className="font-bold text-xs uppercase tracking-tight">{store.razaoSocial}</div>
                <div className="text-[10px] text-neutral-700">
                  CNPJ: {store.cnpj} · IE: {store.inscricaoEstadual}
                </div>
                <div className="text-[10px] text-neutral-600">
                  {store.endereco} — {store.cidadeUf}
                </div>
                <div className="mt-1.5 font-bold text-[10px] border-t border-dashed border-neutral-300 pt-1.5">
                  DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
                </div>
                <div className="text-[9px] text-neutral-600">
                  Não permite aproveitamento de crédito de ICMS
                </div>
              </div>

              {invoice.status === 'CANCELADA' && (
                <div className="bg-red-100 border border-red-400 text-red-900 text-center py-1.5 px-2 font-bold text-xs mb-2.5">
                  DOCUMENTO FISCAL CANCELADO
                </div>
              )}

              {invoice.status === 'CONTINGENCIA' && (
                <div className="bg-amber-100 border border-amber-500 text-amber-950 text-center py-1.5 px-2 font-bold text-[10px] mb-2.5">
                  EMITIDA EM CONTINGÊNCIA OFFLINE (tpEmis=9)
                  <div className="font-normal text-[9px]">Pendente de autorização na SEFAZ</div>
                </div>
              )}

              {(invoice.ambienteEmissao || store.ambienteSefaz).startsWith('2') && (
                <div className="bg-neutral-200 border border-neutral-400 text-neutral-900 text-center py-1.5 px-2 font-bold text-[10px] mb-2.5">
                  EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL
                </div>
              )}

              {/* Items Table */}
              <div className="border-b border-dashed border-neutral-400 pb-2 mb-2">
                <div className="grid grid-cols-12 font-bold text-[10px] border-b border-neutral-300 pb-1 mb-1">
                  <span className="col-span-2">CÓD</span>
                  <span className="col-span-5">DESCRIÇÃO</span>
                  <span className="col-span-2 text-right">QTD</span>
                  <span className="col-span-3 text-right">VL TOT</span>
                </div>
                <div className="space-y-1.5">
                  {invoice.items.map((item, index) => (
                    <div key={`${item.product.id}-${index}`} className="text-[10px] tabular-nums">
                      <div className="grid grid-cols-12">
                        <span className="col-span-2 text-neutral-600">{item.product.code}</span>
                        <span className="col-span-5 font-semibold truncate">{item.product.name}</span>
                        <span className="col-span-2 text-right">
                          {item.quantity}x {item.product.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="col-span-3 text-right font-semibold">
                          {(item.quantity * item.product.price).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="text-[9px] text-neutral-500">
                        NCM: {item.product.ncm} · CFOP: {item.product.cfop} · CSOSN: {item.product.csosn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 space-y-0.5 text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span>Qtd. Total de Itens</span>
                  <span>{invoice.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatBRL(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>Desconto</span>
                    <span>- {formatBRL(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>VALOR TOTAL R$</span>
                  <span>{formatBRL(invoice.total)}</span>
                </div>
                <div className="flex justify-between pt-1 text-[10px]">
                  <span>FORMA DE PAGAMENTO</span>
                  <span className="font-semibold">{PAYMENT_LABELS[invoice.paymentMethod].label}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Valor Pago</span>
                  <span>{formatBRL(invoice.amountTendered)}</span>
                </div>
                {invoice.changeAmount > 0 && (
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Troco</span>
                    <span>{formatBRL(invoice.changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* IBPT Tax Breakdown */}
              <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[9px] text-neutral-700 tabular-nums">
                <div>
                  Tributos Totais Incidentes (Lei Federal 12.741/2012):{' '}
                  <span className="font-bold">
                    {formatBRL(invoice.tribFederal + invoice.tribEstadual)}
                  </span>
                </div>
                <div>
                  Federal: {formatBRL(invoice.tribFederal)} · Estadual: {formatBRL(invoice.tribEstadual)} · Fonte: IBPT
                </div>
              </div>

              {/* Consumer Identification */}
              <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-center text-[10px]">
                {invoice.customerCpfCnpj ? (
                  <div>
                    <div className="font-bold">CONSUMIDOR — CPF/CNPJ: {invoice.customerCpfCnpj}</div>
                    {invoice.customerName && <div>Nome: {invoice.customerName}</div>}
                  </div>
                ) : (
                  <div className="font-bold">CONSUMIDOR NÃO IDENTIFICADO</div>
                )}
              </div>

              {/* Fiscal Metadata & Chave de Acesso */}
              <div className="text-center space-y-1.5">
                <div className="font-bold text-[10px]">
                  NFC-e Nº {String(invoice.numero).padStart(6, '0')} · Série{' '}
                  {String(invoice.serie).padStart(3, '0')} · {invoice.createdAt}
                </div>
                <div className="text-[9px] text-neutral-600">
                  Consulte pela Chave de Acesso em: nfce.fazenda.sp.gov.br
                </div>
                <div className="text-[10px] font-bold tracking-tight bg-neutral-100 p-1.5 rounded border border-neutral-300 break-words tabular-nums">
                  {formatChaveAcesso(invoice.chaveAcesso)}
                </div>
                <p className="py-2 font-bold">SIMULAÇÃO · SEM VALOR FISCAL</p>
                <div className="text-[9px] text-neutral-700 tabular-nums">
                  Protocolo de Autorização: <span className="font-bold">{invoice.protocolo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions, Chave Copy, XML Inspector & Cancellation */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="bg-[#141e22] border border-white/10 rounded-lg p-4 space-y-3">
                <div className="text-xs font-medium text-slate-400">
                  Resultado da simulação
                </div>
                <div className="text-sm font-semibold text-white">
                  {invoice.status === 'CANCELADA'
                    ? 'Cancelamento simulado'
                    : '100 - Autorizado o uso da NFC-e'}
                </div>
                <div className="text-xs text-slate-400">
                  Ambiente: <span className="text-slate-200">{store.ambienteSefaz}</span> · Operador:{' '}
                  <span className="text-slate-200">{invoice.operatorName}</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-400 mb-1">Chave de Acesso (44 dígitos)</div>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-emerald-300 bg-black/30 px-2.5 py-1.5 rounded border border-white/10 flex-1 truncate tabular-nums">
                      {invoice.chaveAcesso}
                    </code>
                    <button
                      onClick={handleCopyKey}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-[#00c885]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handlePrint}
                  className="w-full py-3 px-4 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Cupom DANFE (80mm)
                </button>

                <button
                  onClick={handleDownloadXml}
                  className="w-full py-2.5 px-4 bg-[#25333a] hover:bg-[#2e3f47] text-white font-medium text-sm rounded-lg border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#00c885]" />
                  Baixar XML Fiscal (NFC-e 4.00)
                </button>

                <button
                  onClick={() => setShowXmlPreview(!showXmlPreview)}
                  className="w-full py-2 px-4 bg-transparent hover:bg-white/5 text-slate-300 font-medium text-xs rounded-lg border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileCode2 className="w-4 h-4 text-slate-400" />
                  {showXmlPreview ? 'Ocultar Estrutura XML' : 'Inspecionar Estrutura XML SEFAZ'}
                </button>
              </div>

              {showXmlPreview && (
                <div className="bg-[#0e1518] border border-white/10 rounded-lg p-3 max-h-44 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-emerald-300/90 whitespace-pre-wrap break-all">
                    {xmlContent}
                  </pre>
                </div>
              )}

              {invoice.status === 'AUTORIZADA' && onCancelInvoice && (
                <div className="pt-2 border-t border-white/10">
                  {!showCancelPrompt ? (
                    <button
                      onClick={() => setShowCancelPrompt(true)}
                      className="w-full py-2 px-3 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Simular cancelamento da NFC-e
                    </button>
                  ) : (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3 space-y-2">
                      <label className="block text-xs font-medium text-red-200">
                        Justificativa do Cancelamento (mín. 15 caracteres):
                      </label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#141e22] border border-red-500/40 rounded text-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (cancelReason.trim().length >= 15) {
                              onCancelInvoice(invoice.id, cancelReason.trim());
                              setShowCancelPrompt(false);
                            }
                          }}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded cursor-pointer"
                        >
                          Confirmar Estorno
                        </button>
                        <button
                          onClick={() => setShowCancelPrompt(false)}
                          className="py-1.5 px-3 bg-white/10 text-slate-300 text-xs rounded cursor-pointer"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Nova Venda / Voltar ao PDV (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
