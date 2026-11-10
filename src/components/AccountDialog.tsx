import { useState } from 'react';
import { createAccount, verifyPassword, type Account } from '../data/accounts';

const input = 'block w-full rounded bg-slate-800 p-2 text-white';

export function AccountDialog({ accounts, mode, onClose, onAuthenticate, onCreate }: {
  accounts: Account[];
  mode: 'login' | 'approval' | 'create';
  onClose?: () => void;
  onAuthenticate: (account: Account) => void;
  onCreate: (account: Account) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Account['role']>('operator');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const eligible = mode === 'approval' ? accounts.filter(account => account.role === 'manager') : accounts;
  const creating = mode === 'create';
  const first = accounts.length === 0;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-auto bg-black/85 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="w-full max-w-md space-y-4 rounded-xl bg-[#1b272c] p-6 text-white"
        onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          setError('');
          setBusy(true);
          try {
            if (creating) {
              if (!name.trim() || password.length < 6) {
                setError('Informe um nome e uma senha com pelo menos 6 caracteres.');
                return;
              }
              if (!(await onCreate(await createAccount(name.trim(), first ? 'manager' : role, password)))) {
                setError('Confira se o nome já está em uso e tente novamente.');
              }
            } else {
              const account = eligible.find(entry => entry.id === selected);
              if (account && await verifyPassword(account, password)) onAuthenticate(account);
              else setError('Usuário ou senha inválidos.');
            }
          } catch {
            setError('Não foi possível verificar a senha neste terminal.');
          } finally {
            setBusy(false);
            setPassword('');
          }
        }}>
        <h2 id="account-dialog-title" className="text-xl font-bold">{creating ? first ? 'Cadastrar primeiro gerente' : 'Cadastrar usuário' :
          mode === 'approval' ? 'Autorização do gerente' : 'Entrar no PDV'}</h2>
        <fieldset disabled={busy} className="space-y-3">
          {creating ? <>
            <label>Nome do usuário<input className={input} required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
            {!first && <label>Função<select className={input} value={role} onChange={event => setRole(event.target.value === 'manager' ? 'manager' : 'operator')}>
              <option value="operator">Operador</option><option value="manager">Gerente</option>
            </select></label>}
          </> : <label>Usuário<select aria-label="Usuário" className={input} required value={selected} onChange={event => setSelected(event.target.value)}>
            <option value="">Selecione</option>
            {eligible.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select></label>}
          <label>Senha<input className={input} required type="password" minLength={creating ? 6 : undefined}
            maxLength={128} autoComplete={creating ? 'new-password' : 'current-password'} value={password}
            onChange={event => setPassword(event.target.value)} /></label>
          {error && <p role="alert" className="text-amber-200">{error}</p>}
          <div className="flex justify-end gap-3">
            {onClose && <button type="button" onClick={onClose}>Voltar</button>}
            <button className="rounded bg-emerald-400 px-3 py-2 font-bold text-slate-950">
              {creating ? 'Salvar usuário' : mode === 'approval' ? 'Autorizar' : 'Entrar'}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
