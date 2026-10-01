import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, fmtDate, Loading } from '@/components/ui';
import BrainDump from '@/components/BrainDump';
import { effectiveStatus, filterTasks, isClosed, nowInBuenosAires } from '@/domain/tasks';
import { useLoad } from '@/hooks/useLoad';
import { careerRepo, documentsRepo, eventsRepo, getSettings, paymentsRepo, projectsRepo, tasksRepo } from '@/services/api';
import { askNotificationPermission } from '@/hooks/useReminders';
import Icon from '@/components/Icon';

function greeting(): string {
  const h = Number(nowInBuenosAires().time.slice(0, 2));
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Home() {
  const [dump, setDump] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [settings, tasks, events, projects, career, docs, payments] = await Promise.all([
      getSettings(), tasksRepo.list(), eventsRepo.list(), projectsRepo.list(), careerRepo.list(), documentsRepo.list(), paymentsRepo.list()
    ]);
    return { settings, tasks, events, projects, career, docs, payments };
  });

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'No pude cargar el resumen.'} onRetry={reload} />;

  const { settings, tasks, events, projects, career, docs, payments } = data;
  const today = nowInBuenosAires().date;
  const hoy = filterTasks(tasks, 'hoy');
  const vencidas = filterTasks(tasks, 'vencidas');
  const eventosHoy = events.filter((e) => e.starts_at.slice(0, 10) === today || new Date(e.starts_at).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) === today);
  const proximos = events.filter((e) => new Date(e.starts_at) > new Date()).slice(0, 3);
  const miaOpen = tasks.filter((t) => t.module === 'mia' && !isClosed(t));
  const lastPay = payments[0];
  const careerOpen = tasks.filter((t) => t.module === 'carrera' && !isClosed(t));
  const activeProjects = projects.filter((p) => !['finalizado', 'pausado', 'idea'].includes(p.status));
  const toReview = docs.filter((d) => !d.related_id).slice(0, 3);

  return (
    <div>
      <h1 className="page-title">{greeting()}, {settings.display_name ?? ''}</h1>

      <button className="btn-primary mb-5 w-full !rounded-2xl !py-5 text-lg font-semibold tracking-wide md:w-auto md:!px-10" onClick={() => setDump(true)}><Icon name="mic" size={24} />HABLALE A VIVIA</button>
      {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
        <button className="btn-soft mb-5 ml-0 w-full md:ml-3 md:w-auto" onClick={() => askNotificationPermission().then(reload)}>Activar recordatorios</button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card md:col-span-2">
          <h2 className="mb-2 text-xl">Hoy</h2>
          {vencidas.length > 0 && (
            <Link to="/pendientes" className="mb-3 block rounded-xl bg-terracota-soft p-3 text-terracota">🔴 {vencidas.length} {vencidas.length === 1 ? 'cosa vencida' : 'cosas vencidas'} esperando tu decisión</Link>
          )}
          {hoy.length + eventosHoy.length === 0 ? <Empty>Nada programado para hoy.</Empty> : (
            <ul className="space-y-1.5">
              {eventosHoy.map((e) => <li key={e.id}>📅 {e.title} <span className="text-suave">{e.all_day ? '' : new Date(e.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}</span></li>)}
              {hoy.map((t) => <li key={t.id}>✅ {t.title} <span className="text-suave">{t.due_time?.slice(0, 5) ?? ''}</span></li>)}
            </ul>
          )}
          {proximos.length > 0 && (<><h3 className="mb-1 mt-4 text-sm text-suave">Próximas fechas</h3>
            <ul className="space-y-1">{proximos.map((e) => <li key={e.id} className="text-sm">{fmtDate(e.starts_at)} · {e.title}</li>)}</ul></>)}
        </section>

        <Link to="/mia" className="card">
          <h2 className="mb-1 text-xl">Mia</h2>
          <p>{miaOpen.length} {miaOpen.length === 1 ? 'pendiente' : 'pendientes'}{miaOpen.filter((t) => effectiveStatus(t) === 'vencida').length > 0 && <span className="text-terracota"> · {miaOpen.filter((t) => effectiveStatus(t) === 'vencida').length} vencidos</span>}</p>
          <p className="text-sm text-suave">{lastPay ? `Última cuota: ${lastPay.status === 'enviado' ? 'enviada' : lastPay.status === 'listo_para_enviar' ? 'lista para enviar' : 'pendiente de revisar'}` : 'Todavía no cargaste ninguna cuota.'}</p>
        </Link>

        <Link to="/carrera" className="card">
          <h2 className="mb-1 text-xl">Carrera</h2>
          <p>{career.filter((c) => !['rechazado', 'descartado'].includes(c.status)).length} postulaciones activas</p>
          <p className="text-sm text-suave">{careerOpen.length} tareas profesionales abiertas</p>
        </Link>

        <Link to="/proyectos" className="card">
          <h2 className="mb-1 text-xl">Proyectos</h2>
          <p>{activeProjects.length} {activeProjects.length === 1 ? 'proyecto activo' : 'proyectos activos'}</p>
          <p className="truncate text-sm text-suave">{activeProjects[0]?.name ?? 'Sin proyectos en marcha.'}</p>
        </Link>

        <Link to="/documentos" className="card">
          <h2 className="mb-1 text-xl">Documentos</h2>
          <p>{docs.length} guardados</p>
          <p className="truncate text-sm text-suave">{toReview.length ? `Sin clasificar: ${toReview.map((d) => d.name).join(', ')}` : 'Todo en orden.'}</p>
        </Link>
      </div>

      {dump && <BrainDump onClose={() => setDump(false)} onSaved={reload} />}
    </div>
  );
}
