import { useState } from 'react';

export interface ServiceFiscalConfig {
  municipality: string;
  municipalityCode: string;
  municipalRegistration: string;
  issuer: 'undecided' | 'national' | 'municipal';
}

const emptyConfig: ServiceFiscalConfig = {
  municipality: '',
  municipalityCode: '',
  municipalRegistration: '',
  issuer: 'undecided',
};

export function ServiceFiscalSettings({ config, onSave }: {
  config?: ServiceFiscalConfig;
  onSave: (config: ServiceFiscalConfig) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(config ?? emptyConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ServiceFiscalConfig>(key: K, value: ServiceFiscalConfig[K]) {
    setSaved(false);
    setDraft(current => ({ ...current, [key]: value }));
  }

  return (
    <form className="space-y-4 rounded-xl border border-white/15 bg-[#1b272c] p-5"
      onSubmit={async event => {
        event.preventDefault();
        setSaving(true);
        try {
          setSaved(await onSave({
            ...draft,
            municipality: draft.municipality.trim(),
            municipalRegistration: draft.municipalRegistration.trim(),
          }));
        } finally {
          setSaving(false);
        }
      }}>
      <h1 className="text-lg font-bold">Configuração de serviços · NFS-e</h1>
      <p className="text-sm text-slate-300">
        Cadastro para futura integração. Emissão e homologação ainda indisponíveis.
      </p>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <label>Município do prestador
          <input className="mt-1 block w-full rounded bg-[#141e22] p-2" maxLength={100}
            value={draft.municipality} onChange={event => update('municipality', event.target.value)} />
        </label>
        <label>Código IBGE do município
          <input className="mt-1 block w-full rounded bg-[#141e22] p-2" inputMode="numeric" pattern="[0-9]{7}"
            maxLength={7} value={draft.municipalityCode}
            onChange={event => update('municipalityCode', event.target.value.replace(/\D/g, ''))} />
        </label>
        <label>Inscrição municipal
          <input className="mt-1 block w-full rounded bg-[#141e22] p-2" maxLength={40}
            value={draft.municipalRegistration} onChange={event => update('municipalRegistration', event.target.value)} />
        </label>
        <label>Emissor de serviços
          <select className="mt-1 block w-full rounded bg-[#141e22] p-2" value={draft.issuer}
            onChange={event => update('issuer', event.target.value as ServiceFiscalConfig['issuer'])}>
            <option value="undecided">A definir com a contabilidade</option>
            <option value="national">Emissor nacional</option>
            <option value="municipal">Emissor municipal</option>
          </select>
        </label>
      </fieldset>
      <button disabled={saving} className="rounded bg-[#00c885] px-4 py-2 font-bold text-slate-950">
        Salvar cadastro de serviços
      </button>
      {saved && <p role="status">Cadastro de serviços salvo.</p>}
    </form>
  );
}
