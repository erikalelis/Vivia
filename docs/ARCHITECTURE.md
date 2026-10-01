# Arquitectura de VIVIA

```
Navegador / PWA (React + TS)
 ├─ pages/ y components/   → pantallas (solo presentación y estado de UI)
 ├─ hooks/                 → useAuth, useLoad, useVoice, useReminders
 ├─ services/              → acceso a datos (api.ts), IA (ai.ts), automatización de cuota (tuition.ts), "despejar la cabeza" (brain.ts)
 ├─ domain/                → lógica de negocio PURA, sin red ni React → testeable
 │    money.ts · payments.ts · message.ts · tasks.ts · interpret.ts
 └─ pwa/UpdatePrompt.tsx   → aviso y activación de nuevas versiones
        │  HTTPS (clave anon + sesión del usuario)
        ▼
Supabase
 ├─ PostgreSQL + RLS       → cada fila pertenece a un usuario; la base lo exige
 ├─ Auth                   → registro, login, recuperación
 ├─ Storage (bucket "documents", privado, carpeta <user_id>/)
 └─ Edge Functions (Deno)  → interpret · extract-payment  ──►  Claude API (la clave vive solo acá)
```

## Decisiones clave
- **Dinero en centavos enteros** (`bigint`, y `bigint` en la base). Nunca `number` con decimales. El % se hace en puntos básicos con redondeo mitad hacia arriba.
- **"Vencida" se calcula, no se guarda como destino final**: una tarea abierta con fecha pasada se muestra vencida y sigue en la lista. Solo Completar/Cancelar la saca de la lista activa. Nada se borra automáticamente.
- **El total de la cuota no se asume**: `resolveTotal` usa el total declarado por el documento, lo contrasta con la suma de conceptos y, si no coinciden o falta, marca `needs_review` y pide confirmación.
- **La IA propone, la persona confirma.** Todo lo que devuelve la IA pasa por `validateInterpretation` antes de guardarse. Los importes del PDF vuelven como texto y se convierten en el cliente.
- **IA desacoplada**: la app depende de la interfaz `AiProvider` (`services/ai.ts`). Para cambiar de proveedor: implementar esa interfaz y reemplazar `export const ai`. Las funciones del servidor son el único lugar que conoce a Anthropic.
- **Sin datos en el navegador**: nada importante en localStorage/IndexedDB (un test lo vigila). El service worker solo cachea archivos de la app, nunca datos.
- **Actualizaciones**: `registerType: 'prompt'`. El service worker nuevo se descarga y espera; al tocar "Actualizar ahora" se activa y recarga. Como los datos están en Supabase, actualizar no los toca. `cleanupOutdatedCaches` elimina la caché vieja.
- **Seguridad**: solo la clave anon en el frontend; RLS en todas las tablas; políticas de Storage por carpeta de usuario; las funciones descargan los PDF con el JWT de la usuaria.

## Cómo agregar una automatización nueva
1. Definila como en `TUITION_AUTOMATION` (`services/tuition.ts`) y escribí su servicio.
2. Registrá cada ejecución con `runsRepo.create({ automation_id, status, detail })`.
3. Aparece sola en la pantalla Automatizaciones (usa `ensureAutomation`).

## Migraciones
Archivos numerados en `supabase/migrations/` (`0002_…sql`, etc.), solo hacia adelante. Aditivas (columnas nuevas con valor por defecto) para que la versión vieja de la app siga funcionando mientras se actualiza.
