# Despliegue, actualización y rollback

## Ambientes
| | Desarrollo | Producción |
|---|---|---|
| Supabase | Un proyecto de **prueba** | Otro proyecto **distinto** |
| Variables | `.env` local | Variables del hosting |
| Datos demo | `supabase/seed.dev.sql` permitido | **Nunca** |

## Primer despliegue (Vercel, gratis; Netlify es equivalente)
1. Subí el código a GitHub (`.env` no se sube: está en `.gitignore`).
2. En Vercel: **Add New → Project** → elegí el repositorio. Framework: Vite.
3. **Environment Variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto de **producción**.
4. Deploy. `vercel.json` ya redirige las rutas a la app y evita cachear `sw.js`.
5. Supabase → **Authentication → URL Configuration**: agregá la URL final.
6. En el celular: abrí la URL → "Agregar a pantalla de inicio".

## Actualizar
1. Hacé los cambios y `git push` a `main`. Vercel publica solo.
2. Si hay cambios de base de datos: creá `supabase/migrations/000N_….sql` y ejecutalo en el SQL Editor **antes** de publicar la app.
3. Cambios en funciones de IA: `supabase functions deploy interpret` / `extract-payment`.
4. La app instalada detecta la versión nueva, la descarga en segundo plano y muestra **"✨ Nueva versión de VIVIA disponible"**. Al tocar **Actualizar ahora** se recarga con la versión nueva. No hay que reinstalar y los datos se conservan.

## Rollback
- **App**: en Vercel → Deployments → versión anterior → **Promote to Production** (o `git revert` + push). Los dispositivos recibirán el aviso de actualización hacia esa versión.
- **Base de datos**: las migraciones son aditivas, por eso la app anterior sigue funcionando con el esquema nuevo. No borres columnas en una migración; si hace falta, hacelo en una migración posterior, cuando ya no haya versiones viejas en uso.
- **Antes de migraciones grandes**: Supabase → Database → Backups (o `supabase db dump`).
- **Funciones**: redeploy desde el commit anterior.

## Lista de chequeo después de publicar
- [ ] Crear cuenta e ingresar · recuperar contraseña (llega el correo)
- [ ] Crear tarea con fecha de ayer: aparece como 🔴 Vencida y no desaparece
- [ ] Subir un PDF de cuota real: total correcto, 50 % correcto, WhatsApp abre con el mensaje
- [ ] "Hablale a VIVIA" con texto y con voz
- [ ] Instalar en el celular, publicar un cambio mínimo y confirmar que aparece "Nueva versión" y los datos siguen
