import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Lock, Unlock, Wallet } from 'lucide-react';
import { CashMovement, formatBRL } from '../data/posData';
import { getCashBalance, type CashClosing } from '../data/cashShifts';

interface CashMovementModalProps {
  operatorName: string;
  isOpenRegister: boolean;
  movements: CashMovement[];
  closings: CashClosing[];
  onClose: () => void;
  onAddMovement: (type: 'SANGRIA' | 'SUPRIMENTO', amount: number, description: string) => Promise<boolean>;
  onToggleRegisterStatus: (amount: number) => Promise<boolean>;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
  operatorName,
  isOpenRegister,
  movements,
  closings,
  onClose,
  onAddMovement,
  onToggleRegisterStatus,
}) => {
  const [tab, setTab] = useState<'SANGRIA' | 'SUPRIMENTO' | 'RESUMO'>('SANGRIA');
  const [cashAmount, setCashAmount] = useState(isOpenRegister ? '' : '0');
  const [saving, setSaving] = useState(false);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('Retirada para cofre central');

  const totalVendasGerais = movements
    .filter((m) => m.type === 'VENDA')
    .reduce((acc, m) => acc + m.amount, 0);
  const totalSangrias = movements
    .filter((m) => m.type === 'SANGRIA')
    .reduce((acc, m) => acc + m.amount, 0);
  const totalSuprimentos = movements
    .filter((m) => m.type === 'SUPRIMENTO')
    .reduce((acc, m) => acc + m.amount, 0);

  const saldoGavetaDinheiro = getCashBalance(movements);
  const counted = cashAmount.trim() === '' ? NaN : Number(cashAmount.replace(',', '.'));
  const validCashAmount = Number.isFinite(counted) && counted >= 0;

  async function handleToggle() {
    if (saving || !validCashAmount) return;
    setSaving(true);
    try {
      if (await onToggleRegisterStatus(counted)) {
        setCashAmount(isOpenRegister ? '0' : '');
        setTab('RESUMO');
      }
    } finally {
      setSaving(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'RESUMO' || !isOpenRegister || saving) return;
    const val = Number(amountStr.replace(',', '.'));
    if (!Number.isFinite(val) || val <= 0) return;
    setSaving(true);
    try {
      if (await onAddMovement(tab, val, description.trim() || (tab === 'SANGRIA' ? 'Sangria de caixa' : 'Suprimento de troco'))) {
        setAmountStr('');
        setTab('RESUMO');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141e22] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-[#00c885]" />
            <div>
              <h2 className="text-base font-bold text-white">
                Gestão de Caixa & Sangria (F7)
              </h2>
              <p className="text-xs text-slate-400">
                Status atual: {isOpenRegister ? 'Caixa Aberto' : 'Caixa Fechado'} · {operatorName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-1.5 bg-[#141e22] p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('SANGRIA');
                setDescription('Retirada para cofre central');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'SANGRIA'
                  ? 'bg-[#25333a] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sangria (Retirada)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('SUPRIMENTO');
                setDescription('Reforço de troco em moedas/cédulas');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'SUPRIMENTO'
                  ? 'bg-[#25333a] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Suprimento (Entrada)
            </button>
            <button
              type="button"
              onClick={() => setTab('RESUMO')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'RESUMO'
                  ? 'bg-[#25333a] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Extrato do Turno
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-300">
            {isOpenRegister ? 'Dinheiro contado (R$)' : 'Saldo inicial (R$)'}
            <input type="number" min="0" step="0.01" value={cashAmount}
              onChange={event => setCashAmount(event.target.value)}
              className="mt-1 block w-32 rounded bg-[#141e22] p-2 text-white" />
          </label>
          <button
            type="button"
            disabled={saving || !validCashAmount}
            onClick={handleToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isOpenRegister
                ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                : 'border-[#00c885]/50 text-[#00c885] hover:bg-[#00c885]/10'
            }`}
          >
            {isOpenRegister ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Fechar Caixa
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                Reabrir Caixa
              </>
            )}
          </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Quick Balance Strip */}
          <div className="grid grid-cols-3 gap-3 bg-[#141e22] p-3.5 rounded-lg border border-white/10 text-xs tabular-nums">
            <div>
              <div className="text-slate-400">Saldo em Espécie (Gaveta)</div>
              <div className="text-sm font-bold font-mono text-[#00c885] mt-0.5">
                {formatBRL(saldoGavetaDinheiro)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Faturamento Bruto</div>
              <div className="text-sm font-bold font-mono text-white mt-0.5">
                {formatBRL(totalVendasGerais)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Sangrias / Suprimentos</div>
              <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
                -{formatBRL(totalSangrias)} / +{formatBRL(totalSuprimentos)}
              </div>
            </div>
          </div>

          {isOpenRegister && validCashAmount && (
            <p className="text-xs text-slate-300">
              Diferença prevista: {formatBRL(Math.round((counted - saldoGavetaDinheiro) * 100) / 100)}
            </p>
          )}
          {closings.length > 0 && (
            <details className="rounded-lg border border-white/10 p-3 text-sm" open={!isOpenRegister}>
              <summary className="cursor-pointer font-semibold">Fechamentos registrados</summary>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {closings.map(closing => (
                  <li key={closing.id} className="text-xs text-slate-300">
                    <div>{closing.createdAt} · {closing.operatorName}</div>
                    <div>Esperado {formatBRL(closing.expected)} · Contado {formatBRL(closing.counted)} · Diferença {formatBRL(closing.difference)}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {isOpenRegister && tab !== 'RESUMO' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor da {tab === 'SANGRIA' ? 'Sangria (Retirada R$)' : 'Entrada de Suprimento (R$)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141e22] border border-white/15 rounded-lg text-white font-mono text-base font-bold tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observação / Motivo para Comprovante
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#141e22] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-[#00c885]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {tab === 'SANGRIA' ? (
                    <>
                      <ArrowDownRight className="w-4 h-4" />
                      Registrar Sangria
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Registrar Suprimento
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="max-h-56 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/10 bg-[#141e22]">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs tabular-nums"
                >
                  <div>
                    <div className="font-semibold text-white">{mov.description}</div>
                    <div className="text-[11px] text-slate-400">
                      {mov.createdAt} · {mov.type} {mov.paymentMethod ? `· ${mov.paymentMethod}` : ''}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      mov.type === 'SANGRIA' || mov.type === 'ESTORNO'
                        ? 'text-red-400'
                        : 'text-[#00c885]'
                    }`}
                  >
                    {mov.type === 'SANGRIA' || mov.type === 'ESTORNO' ? '-' : '+'}
                    {formatBRL(mov.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
