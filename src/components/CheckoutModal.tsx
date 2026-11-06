import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  FileCheck2,
  UserCheck,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  CartItem,
  PaymentMethod,
  PAYMENT_LABELS,
  formatBRL,
  formatCpfCnpj,
} from '../data/posData';

interface CheckoutModalProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  initialCustomerCpf: string;
  initialCustomerName: string;
  onUpdateDiscount: (newDiscount: number) => void;
  onClose: () => void;
  onConfirmSale: (payload: {
    paymentMethod: PaymentMethod;
    amountTendered: number;
    changeAmount: number;
    customerCpfCnpj: string;
    customerName: string;
    emitirNfce: boolean;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  subtotal,
  discount,
  initialCustomerCpf,
  initialCustomerName,
  onUpdateDiscount,
  onClose,
  onConfirmSale,
}) => {
  const total = Math.max(0, subtotal - discount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>(total.toFixed(2));
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState<string>(initialCustomerCpf);
  const [customerName, setCustomerName] = useState<string>(initialCustomerName);
  const [discountInput, setDiscountInput] = useState<string>(discount > 0 ? discount.toFixed(2) : '');
  const [emitirNfce, setEmitirNfce] = useState<boolean>(true);
  const [transmittingStep, setTransmittingStep] = useState<string | null>(null);

  useEffect(() => {
    const newTotal = Math.max(0, subtotal - discount);
    setAmountTenderedStr(newTotal.toFixed(2));
  }, [subtotal, discount]);

  const parsedTendered = parseFloat(amountTenderedStr.replace(',', '.')) || 0;
  const effectiveTendered = paymentMethod === 'DINHEIRO' ? Math.max(parsedTendered, total) : total;
  const changeAmount = paymentMethod === 'DINHEIRO' ? Math.max(0, parsedTendered - total) : 0;

  const handleApplyDiscount = (valStr: string) => {
    setDiscountInput(valStr);
    const num = parseFloat(valStr.replace(',', '.')) || 0;
    const clamped = Math.min(Math.max(0, num), subtotal);
    onUpdateDiscount(clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transmittingStep) return;

    if (emitirNfce) {
      setTransmittingStep('Assinando XML com Certificado Digital ICP-Brasil A1...');
      setTimeout(() => {
        setTransmittingStep('Transmitindo Lote NFC-e para SEFAZ (Ambiente Produção)...');
      }, 280);
      setTimeout(() => {
        onConfirmSale({
          paymentMethod,
          amountTendered: effectiveTendered,
          changeAmount,
          customerCpfCnpj: customerCpfCnpj.trim(),
          customerName: customerName.trim(),
          emitirNfce,
        });
      }, 620);
    } else {
      onConfirmSale({
        paymentMethod,
        amountTendered: effectiveTendered,
        changeAmount,
        customerCpfCnpj: customerCpfCnpj.trim(),
        customerName: customerName.trim(),
        emitirNfce,
      });
    }
  };

  const paymentOptions: {
    id: PaymentMethod;
    shortcut: string;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'DINHEIRO',
      shortcut: '1',
      label: 'Dinheiro',
      icon: <Banknote className="w-4 h-4" />,
    },
    {
      id: 'PIX',
      shortcut: '2',
      label: 'PIX QR Code',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'DEBITO',
      shortcut: '3',
      label: 'Cartão Débito',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'CREDITO',
      shortcut: '4',
      label: 'Cartão Crédito',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'VALE_REFEICAO',
      shortcut: '5',
      label: 'Vale Refeição',
      icon: <Wallet className="w-4 h-4" />,
    },
  ];

  const quickCashValues = [
    total,
    Math.ceil(total / 10) * 10 === total ? total + 10 : Math.ceil(total / 10) * 10,
    50,
    100,
  ].filter((v, idx, arr) => v >= total && arr.indexOf(v) === idx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1b272c] border border-white/10 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141e22] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-[#00c885]" />
            <div>
              <h2 className="text-base font-bold text-white">
                Finalizar Venda & Emitir Nota Fiscal (NFC-e)
              </h2>
              <p className="text-xs text-slate-400">
                {items.reduce((acc, i) => acc + i.quantity, 0)} itens no cupom · Modelo 65 SEFAZ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Payment Methods Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              1. Selecione a Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {paymentOptions.map((opt) => {
                const active = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      setAmountTenderedStr(total.toFixed(2));
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#00c885]/15 border-[#00c885] text-white shadow-sm'
                        : 'bg-[#141e22] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <span className={active ? 'text-[#00c885]' : 'text-slate-400'}>{opt.icon}</span>
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered & Change Calculator OR Electronic Payment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#141e22] p-4 rounded-lg border border-white/10">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {paymentMethod === 'DINHEIRO'
                  ? 'Valor Recebido em Espécie (R$)'
                  : `Pagamento via ${PAYMENT_LABELS[paymentMethod].label}`}
              </label>
              {paymentMethod === 'DINHEIRO' ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={amountTenderedStr}
                    onChange={(e) => setAmountTenderedStr(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1b272c] border border-[#00c885]/60 rounded-lg text-white font-mono text-base font-bold tabular-nums focus:outline-none focus:border-[#00c885]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {quickCashValues.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountTenderedStr(val.toFixed(2))}
                        className="px-2.5 py-1 bg-[#25333a] hover:bg-[#2f414a] text-slate-200 rounded text-xs font-mono tabular-nums cursor-pointer transition-colors"
                      >
                        {formatBRL(val)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-300 py-1">
                  Integração TEF / Pinpad pronta. Valor debitado integralmente:{' '}
                  <span className="font-mono font-bold text-white tabular-nums">
                    {formatBRL(total)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <div className="space-y-1 text-xs tabular-nums">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal dos Produtos:</span>
                  <span className="font-mono">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Desconto (R$):</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    max={subtotal}
                    placeholder="0,00"
                    value={discountInput}
                    onChange={(e) => handleApplyDiscount(e.target.value)}
                    className="w-24 px-2 py-0.5 text-right bg-[#1b272c] border border-white/15 rounded text-white font-mono text-xs tabular-nums focus:outline-none focus:border-[#00c885]"
                  />
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-white/10 space-y-1 tabular-nums">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-slate-300">TOTAL A PAGAR:</span>
                  <span className="text-lg font-bold font-mono text-[#00c885]">
                    {formatBRL(total)}
                  </span>
                </div>
                {paymentMethod === 'DINHEIRO' && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Troco a Devolver:</span>
                    <span className="text-sm font-bold font-mono text-amber-300">
                      {formatBRL(changeAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consumer Identification for NFC-e */}
          <div className="bg-[#141e22] p-4 rounded-lg border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00c885]" />
                <span className="text-xs font-semibold text-white">
                  2. Dados do Consumidor na Nota Fiscal Paulista / NFC-e (Opcional)
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emitirNfce}
                  onChange={(e) => setEmitirNfce(e.target.checked)}
                  className="accent-[#00c885] rounded"
                />
                Transmitir XML SEFAZ
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  CPF ou CNPJ na Nota
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={customerCpfCnpj}
                  onChange={(e) => setCustomerCpfCnpj(formatCpfCnpj(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1b272c] border border-white/15 rounded-lg text-sm text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nome do Cliente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Consumidor Final"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1b272c] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-[#00c885]"
                />
              </div>
            </div>
          </div>

          {transmittingStep && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#00c885]/15 border border-[#00c885]/40 rounded-lg text-xs text-emerald-200 font-medium">
              <Loader2 className="w-4 h-4 text-[#00c885] animate-spin shrink-0" />
              <span>{transmittingStep}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141e22] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Voltar ao Cupom (ESC)
          </button>

          <button
            type="submit"
            disabled={Boolean(transmittingStep)}
            className="px-6 py-3 bg-[#00c885] hover:bg-[#00b377] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          >
            <span>CONFIRMAR E EMITIR NFC-e — {formatBRL(total)}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
