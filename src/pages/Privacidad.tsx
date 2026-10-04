import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { ErrorBox, Loading } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { friendly } from '@/services/api';
import { exportProfileJson, listProfile, removeAllProfile, removeBySource } from '@/services/profile';

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Privacidad() {
  const navigate = useNavigate();
  const items = useLoad(listProfile);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: () => Promise<void>, ok: string) {
    setMsg(null);
    try { await action(); await items.reload(); setMsg({ ok: true, text: ok }); }
    catch (e) { setMsg({ ok: false, text: friendly(e) }); }
  }

  if (items.loading) return <Loading />;
  if (items.error) return <ErrorBox message={items.error} onRetry={items.reload} />;

  const total = items.data?.length ?? 0;
  const fromCv = items.data?.filter((i) => i.source === 'cv').length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={() => navigate('/perfil')} aria-label="Volver al perfil"><Icon name="back" /></button>
        <h1 className="text-2xl md:text-3xl">Privacidad y datos</h1>
      </div>

      <div className="card flex flex-col gap-2 text-[15px] text-muted">
        <p>Vivia guarda solo lo que se entiende de tu CV y lo que vos le contás. <strong className="text-ink">El archivo del CV no se guarda.</strong></p>
        <p>Para ordenar tu información, el texto se envía a la IA (Gemini, de Google). Tus datos son solo tuyos: ninguna otra persona puede verlos.</p>
      </div>

      {msg && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-lake-soft text-lake-dark' : 'bg-terracota-soft text-terracota'}`} role="alert">{msg.text}</p>}

      <div className="card flex flex-col gap-3">
        <p className="font-bold">Mi perfil ({total} datos)</p>
        <button className="btn-outline justify-start" disabled={total === 0} onClick={() => void run(async () => download('mi-perfil-vivia.json', await exportProfileJson()), 'Descargué tu perfil en un archivo.')}>Exportar mi perfil</button>
        <button className="btn-outline justify-start" disabled={fromCv === 0} onClick={() => { if (window.confirm('¿Eliminar todo lo que salió de tu CV? Lo que agregaste vos se mantiene.')) void run(() => removeBySource('cv'), 'Eliminé los datos de tu CV.'); }}>Eliminar lo que salió de mi CV</button>
        <button className="btn-danger justify-start" disabled={total === 0} onClick={() => { if (window.confirm('¿Eliminar todo tu perfil profesional? No se puede deshacer.')) void run(removeAllProfile, 'Eliminé tu perfil profesional.'); }}>Eliminar todo mi perfil</button>
      </div>

      <p className="px-1 text-sm text-muted">Las grabaciones, transcripciones y conversaciones se van a poder eliminar desde acá cuando estén disponibles.</p>
    </div>
  );
}
