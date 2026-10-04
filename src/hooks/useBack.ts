import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Botón "volver" de las pantallas: retrocede UN paso en el historial (igual que la flecha del teléfono).
 * Si la pantalla se abrió directo (sin historial), va a la pantalla indicada sin agregar entradas nuevas.
 */
export function useBack(fallback = '/') {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
