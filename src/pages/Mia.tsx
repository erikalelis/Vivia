import { useState } from 'react';
import Agenda from '@/pages/Agenda';
import Documents from '@/pages/Documents';
import TaskList from '@/components/TaskList';
import Tuition from '@/components/Tuition';
import AutomationsPanel from '@/pages/Automations';

const TABS = [
  { k: 'cuotas', l: 'Cuotas' }, { k: 'agenda', l: 'Agenda' }, { k: 'pendientes', l: 'Pendientes' },
  { k: 'documentos', l: 'Documentos' }, { k: 'automatizaciones', l: 'Automatizaciones' }
] as const;

export default function Mia() {
  const [tab, setTab] = useState<(typeof TABS)[number]['k']>('cuotas');
  return (
    <div>
      <h1 className="page-title">Mia</h1>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`chip shrink-0 !px-3 !py-1.5 text-sm ${tab === t.k ? 'bg-salvia text-white' : 'bg-white text-suave'}`}>{t.l}</button>)}
      </div>
      {tab === 'cuotas' && <Tuition />}
      {tab === 'agenda' && <Agenda module="mia" />}
      {tab === 'pendientes' && <TaskList module="mia" />}
      {tab === 'documentos' && <Documents module="mia" />}
      {tab === 'automatizaciones' && <AutomationsPanel onlyKey="cuota_escolar_mia" />}
    </div>
  );
}
