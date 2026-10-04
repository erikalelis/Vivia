import Icon from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';

/** Perfil provisorio: por ahora solo muestra la cuenta y permite salir. El perfil profesional llega en la Fase 5. */
export default function Perfil() {
  const { session, signOut } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Mi perfil profesional</h1>
      <div className="card flex flex-col gap-3">
        <p className="text-sm text-muted">Tu cuenta</p>
        <p className="font-semibold">{session?.user.email}</p>
        <button className="btn-outline self-start" onClick={() => void signOut()}><Icon name="logout" size={20} />Cerrar sesión</button>
      </div>
      <div className="card flex flex-col gap-2">
        <p className="font-semibold">CV y experiencia</p>
        <p className="text-sm text-muted">Cargar tu CV y completar tu perfil llega en una próxima actualización de Vivia.</p>
      </div>
    </div>
  );
}
