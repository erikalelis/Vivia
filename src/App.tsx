import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { VivMark } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import Login, { ResetPassword } from '@/pages/Login';
import Home from '@/pages/Home';
import Perfil from '@/pages/Perfil';
import Privacidad from '@/pages/Privacidad';
import Proximo from '@/pages/Proximo';
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
                <Route path="/entrevista" element={<Proximo titulo="Entrevista" icono="chat" texto="Prepará entrevistas con respuestas basadas en tu perfil profesional real." />} />
                <Route path="/reunion" element={<Proximo titulo="Reunión" icono="mic" texto="Grabá o subí el audio de una reunión y recibí resumen, decisiones y tareas." />} />
                <Route path="/traducir" element={<Proximo titulo="Traducir" icono="translate" texto="Detectá el idioma solo y entendé o respondé en español, inglés o portugués." />} />
                <Route path="/ingles" element={<Proximo titulo="Practicar inglés" icono="globe" texto="Conversá por voz con Vivia sobre situaciones reales de tu trabajo." />} />
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
