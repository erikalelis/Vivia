import { useState } from 'react';
import { Empty, ErrorBox, fmtDate, Loading } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { deleteDocument, documentsRepo, documentUrl, friendly, uploadDocument } from '@/services/api';
import type { DocumentRow, ModuleName } from '@/types';

const MODULES: { v: ModuleName; l: string }[] = [{ v: 'general', l: 'General' }, { v: 'mia', l: 'Mia' }, { v: 'carrera', l: 'Carrera' }, { v: 'proyectos', l: 'Proyectos' }];
const fmtSize = (n: number | null) => !n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function Documents({ module }: { module?: ModuleName }) {
  const { data, loading, error, reload } = useLoad(async () => {
    const all = await documentsRepo.list();
    return module ? all.filter((d) => d.module === module) : all;
  }, [module]);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<ModuleName | 'todos'>('todos');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 20 * 1024 * 1024) { setMsg(`«${f.name}» supera los 20 MB.`); continue; }
        await uploadDocument(f, { module: module ?? (mod === 'todos' ? 'general' : mod) });
      }
      await reload();
    } catch (e) { setMsg(friendly(e)); } finally { setBusy(false); }
  }

  const open = async (d: DocumentRow) => { try { window.open(await documentUrl(d.storage_path), '_blank', 'noopener'); } catch (e) { setMsg(friendly(e)); } };
  const classify = async (d: DocumentRow, m: ModuleName) => { await documentsRepo.update(d.id, { module: m }); reload(); };
  const remove = async (d: DocumentRow) => { if (confirm(`¿Eliminar «${d.name}»? Esta acción no se puede deshacer.`)) { try { await deleteDocument(d); reload(); } catch (e) { setMsg(friendly(e)); } } };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const list = (data ?? []).filter((d) => (mod === 'todos' || d.module === mod) && (!q || `${d.name} ${d.category ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      {!module && <h1 className="page-title">Documentos</h1>}
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="btn-primary cursor-pointer !mb-0 !text-white">{busy ? 'Subiendo…' : '+ Subir archivo'}
          <input type="file" multiple className="hidden" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} /></label>
        <input className="min-w-0 flex-1" type="search" placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!module && <select className="!w-auto" value={mod} onChange={(e) => setMod(e.target.value as ModuleName | 'todos')}><option value="todos">Todos</option>{MODULES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select>}
      </div>
      {msg && <p className="mb-2 text-terracota" role="alert">{msg}</p>}
      {list.length === 0 ? <Empty>No hay documentos.</Empty> : (
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id} className="card flex flex-wrap items-center gap-3">
              <span className="text-2xl" aria-hidden>{d.mime_type?.startsWith('image/') ? '🖼️' : '📄'}</span>
              <div className="min-w-0 flex-1">
                <button className="block max-w-full truncate text-left text-lg" onClick={() => open(d)}>{d.name}</button>
                <p className="text-xs text-suave">{fmtDate(d.created_at)} · {fmtSize(d.size_bytes)}{d.category ? ` · ${d.category}` : ''}</p>
              </div>
              <select className="!w-auto text-sm" value={d.module} onChange={(e) => classify(d, e.target.value as ModuleName)} aria-label="Clasificar">{MODULES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
              <button className="btn-soft !py-1.5 text-sm" onClick={() => open(d)}>Ver / descargar</button>
              <button className="btn-danger !py-1.5 text-sm" onClick={() => remove(d)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
