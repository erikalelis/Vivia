import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Layout, { MorePage } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useReminderNotifications } from '@/hooks/useReminders';
import Login, { ResetPassword } from '@/pages/Login';
import Home from '@/pages/Home';
import Tasks from '@/pages/Tasks';
import Agenda from '@/pages/Agenda';
import Mia from '@/pages/Mia';
import Career from '@/pages/Career';
import Projects from '@/pages/Projects';
import Documents from '@/pages/Documents';
import Automations from '@/pages/Automations';
import SearchPage from '@/pages/Search';
import SettingsPage from '@/pages/Settings';
import UpdatePrompt from '@/pwa/UpdatePrompt';

export default function App() {
  const { session, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  useReminderNotifications(Boolean(session));

  if (loading) return <div className="flex h-full items-center justify-center text-3xl text-salvia-dark font-display">VIVIA</div>;

  return (
    <>
      <UpdatePrompt />
      <Routes>
        <Route path="/restablecer" element={<ResetPassword onDone={() => navigate('/')} />} />
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="*" element={
            <Layout refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/pendientes" element={<Tasks />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/mia" element={<Mia />} />
                <Route path="/carrera" element={<Career />} />
                <Route path="/proyectos" element={<Projects />} />
                <Route path="/documentos" element={<Documents />} />
                <Route path="/automatizaciones" element={<Automations />} />
                <Route path="/buscar" element={<SearchPage />} />
                <Route path="/ajustes" element={<SettingsPage />} />
                <Route path="/mas" element={<MorePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
    </>
  );
}
