import Icon from '@/components/Icon';
import { useBack } from '@/hooks/useBack';

/**
 * Pantalla provisoria de un módulo que se activa en una próxima actualización de Vivia.
 * Se reemplaza módulo por módulo; no guarda nada ni simula funciones.
 */
export default function Proximo({ titulo, icono, texto }: { titulo: string; icono: string; texto: string }) {
  const goBack = useBack();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={goBack} aria-label="Volver al inicio"><Icon name="back" /></button>
        <h1 className="text-2xl md:text-3xl">{titulo}</h1>
      </div>
      <div className="card flex flex-col items-center gap-4 !p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-berry-soft text-berry"><Icon name={icono} size={28} /></span>
        <p className="max-w-sm text-base text-muted">{texto}</p>
        <p className="text-sm font-semibold text-berry">Llega en una próxima actualización de Vivia.</p>
      </div>
    </div>
  );
}
