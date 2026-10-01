# VIVIA — Tu vida, en un solo lugar

Asistente personal (PWA) para organizar pendientes, agenda, Mia y su cuota escolar, carrera, proyectos y documentos. Se instala en el celular, se usa desde la computadora y los datos se sincronizan.

> **Estado honesto de esta entrega:** el código está completo, pero **todavía no se compiló ni se probó dentro de la app**. El entorno donde se escribió bloqueaba la descarga de paquetes (npm), así que no se pudo ejecutar `npm run build`. Lo que sí se verificó: la lógica central (importes, 50 %, tareas vencidas, validación de la IA) con **30 tests que pasan**. El primer paso al recibirlo es instalar y compilar (abajo); es esperable corregir algún error menor de tipos.

## Stack
React + TypeScript + Vite + Tailwind · PWA (`vite-plugin-pwa`) · Supabase (PostgreSQL, Auth, Storage, Edge Functions) · IA con Claude API desde el servidor.

## Instalación (primera vez)
Requisitos: Node 20+ y una cuenta gratuita de [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env        # y completá las dos variables VITE_*
npm run test                # 30 tests de la lógica central
npm run typecheck           # primera verificación de tipos
npm run build               # compila
npm run dev                 # http://localhost:5173
```

## Base de datos
1. En Supabase: **New project**.
2. **SQL Editor** → pegá y ejecutá `supabase/migrations/0001_init.sql` (crea tablas, seguridad por usuario y el bucket privado de archivos).
3. **Project Settings → API**: copiá la *Project URL* y la clave *anon public* a `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. **Authentication → URL Configuration**: agregá la URL de tu app (local y producción) para los correos de confirmación y recuperación de contraseña.
5. (Solo desarrollo) `supabase/seed.dev.sql` carga datos de ejemplo. **No lo uses en producción.**

## Conectar la IA (Claude)
La clave **nunca** va en el frontend. Se guarda como secreto del servidor:
```bash
npm i -g supabase
supabase login && supabase link --project-ref TU-REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy interpret
supabase functions deploy extract-payment
```
Sin esto, VIVIA funciona (tareas, agenda, documentos, cuotas cargadas a mano) pero **"Hablale a VIVIA" y la lectura automática del PDF muestran un aviso claro de que la IA no está configurada**; no hay nada simulado.

## Qué está implementado
- Registro, login, logout, recuperación de contraseña, sesión persistente; datos aislados por usuario (RLS).
- Inicio con resumen (Hoy, Mia, Carrera, Proyectos, Documentos) y botón **Hablale a VIVIA** (texto o voz → IA → confirmación → guardado).
- **Pendientes**: 6 estados, las vencidas **nunca desaparecen** (Mantener / Reprogramar / Completar / Cancelar), filtros Hoy · Próximas · Vencidas · Esta semana · Todas, prioridad, etiquetas, recurrencia (al completar crea la siguiente), notas y adjuntos.
- **Agenda**: día, semana y mes; eventos manuales o por IA.
- **Mia**: Cuotas, Agenda, Pendientes, Documentos y Automatizaciones.
- **Cuota de Mia**: sube el PDF → la IA lo lee → identifica el **total final** (no el primer importe) → calcula el % en centavos enteros (317.510 → 158.755) → arma el mensaje con tu plantilla → **abre WhatsApp** con el texto listo → vos tocás Enviar → marcás 🟢 Enviado (queda fecha, hora, mes, total, importe, documento y destinatario). Si hay dudas muestra lo detectado y pide confirmar o corregir.
- Mi carrera, Mis proyectos, Documentos (subir, ver, clasificar, buscar, eliminar), Automatizaciones con historial, Búsqueda global, Ajustes (responsable de pago, %, teléfono, plantilla).
- PWA instalable con aviso **"✨ Nueva versión de VIVIA disponible → Actualizar ahora"** que no borra datos.

## Lo que requiere algo externo o no está hecho
| Tema | Situación |
|---|---|
| IA y lectura de PDF | Requiere `ANTHROPIC_API_KEY` (ver arriba). |
| Notificaciones con la app **cerrada** | No incluidas: requieren Web Push (servidor + claves VAPID). Hoy avisan **mientras VIVIA está abierta**. |
| Voz | Usa el dictado del navegador (Chrome/Edge/Safari). No funciona en todos. |
| WhatsApp | Abre el chat con el mensaje; **no envía solo** (a propósito). |
| Tabla `mia_items` | Creada en la base pero sin pantalla propia: Mia usa tareas, eventos y documentos con módulo "Mia". |
| Notas | Se guardan como pendientes con la etiqueta `#nota`. |
| Pruebas de PWA/actualización | Se verifica por configuración (test automático), pero conviene probarla a mano una vez desplegada. |

## Actualizar y volver atrás
Ver `docs/DEPLOYMENT.md`. Arquitectura en `docs/ARCHITECTURE.md`.
