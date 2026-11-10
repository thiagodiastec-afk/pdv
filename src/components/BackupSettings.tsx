import { useState } from 'react';

export function BackupSettings({ onExport, onRestore }: {
  onExport: () => void;
  onRestore: (data: unknown) => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
      <h1 className="text-xl font-bold">Backup e restauração</h1>
      <p className="text-slate-300">O arquivo contém dados do negócio e dos clientes. Guarde a cópia em local seguro.</p>
      <button type="button" onClick={onExport} className="rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-950">Exportar backup</button>
      <form className="space-y-3 rounded border border-white/15 p-4" onSubmit={async event => {
        event.preventDefault();
        if (!file || busy) return;
        setBusy(true);
        setError('');
        try {
          if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo excede 10 MB.');
          const data: unknown = JSON.parse(await file.text());
          if (!window.confirm('Restaurar este backup substituirá os dados atuais deste terminal. Continuar?')) return;
          if (await onRestore(data)) setFile(null);
        } catch {
          setError('Não foi possível ler um backup válido do CromaPDV.');
        } finally {
          setBusy(false);
        }
      }}>
        <label className="block">Arquivo de backup
          <input type="file" accept=".json,application/json" required className="block" disabled={busy}
            onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); }} />
        </label>
        <button disabled={!file || busy} className="rounded border border-amber-300 px-3 py-2 disabled:opacity-50">Restaurar backup</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
