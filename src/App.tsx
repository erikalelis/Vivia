import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { VivMark } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import Login, { ResetPassword } from '@/pages/Login';
import Home from '@/pages/Home';
import Entrevista from '@/pages/Entrevista';
import Traducir from '@/pages/Traducir';
import Reunion from '@/pages/Reunion';
import Ingles from '@/pages/Ingles';
import Perfil from '@/pages/Perfil';
import Privacidad from '@/pages/Privacidad';
import UpdatePrompt from '@/pwa/UpdatePrompt';

export default function App() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex h-full items-center justify-center bg-mist"><VivMark size={72} /></div>;

  return (
    <>
      <UpdatePrompt />
      <Routes>
        <Route path="/restablecer" element={<ResetPassword onDone={() => navigate('/')} />} />
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/entrevista" element={<Entrevista />} />
                <Route path="/reunion" element={<Reunion />} />
                <Route path="/traducir" element={<Traducir />} />
                <Route path="/ingles" element={<Ingles />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/privacidad" element={<Privacidad />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
    </>
  );
}
