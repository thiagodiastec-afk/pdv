import { useState, type FormEvent } from 'react';

export type BusinessProfile = 'retail' | 'services' | 'mixed';

export interface Business {
  name: string;
  profile: BusinessProfile;
}

const profiles = [
  { id: 'retail', label: 'Comércio', description: 'Produtos com controle de estoque.' },
  { id: 'services', label: 'Serviços', description: 'Serviços cobrados por atendimento.' },
  { id: 'mixed', label: 'Operação mista', description: 'Produtos e serviços na mesma venda.' },
] as const;

export function BusinessSetup({ business, onSave, onClose }: {
  business?: Business;
  onSave: (business: Business, demo: boolean) => Promise<boolean>;
  onClose?: () => void;
}) {
  const [name, setName] = useState(business?.name ?? '');
  const [profile, setProfile] = useState<BusinessProfile>(business?.profile ?? 'retail');
  const [demo, setDemo] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), profile }, demo);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-[#141e22]/95 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-5 rounded-xl border border-white/15 bg-[#1b272c] p-6 text-white">
        <h1 className="text-xl font-bold">{business ? 'Meu negócio' : 'Configure seu negócio'}</h1>
        <label className="block text-sm">
          Nome comercial
          <input required maxLength={80} value={name} onChange={event => setName(event.target.value)}
            className="mt-1 block w-full rounded border border-white/20 bg-[#141e22] p-2" />
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Tipo de operação</legend>
          {profiles.map(option => (
            <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded border border-white/15 p-3">
              <input type="radio" name="business-profile" checked={profile === option.id}
                onChange={() => setProfile(option.id)} />
              <span><strong>{option.label}</strong><span className="block text-sm text-slate-300">{option.description}</span></span>
            </label>
          ))}
        </fieldset>
        {!business && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={demo} onChange={event => setDemo(event.target.checked)} />
            Usar dados de demonstração para testar
          </label>
        )}
        <div className="flex justify-end gap-3">
          {onClose && <button type="button" onClick={onClose} className="px-3 py-2">Cancelar</button>}
          <button disabled={saving} className="rounded bg-[#00c885] px-4 py-2 font-bold text-slate-950">
            {business ? 'Salvar perfil' : 'Começar'}
          </button>
        </div>
      </form>
    </div>
  );
}
