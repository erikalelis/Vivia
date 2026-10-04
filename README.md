# Vivia — Asistente profesional con IA

PWA instalable (Android, iPhone y computadora) que ayuda a preparar entrevistas, acompañarlas en vivo, traducir, practicar inglés, grabar reuniones y mantener un perfil profesional armado a partir del CV.

Hecho por Bluvia.

## Secciones
- **Inicio**: acceso rápido a todo.
- **Entrevista**: preparar según la vacante, responder una pregunta, modo en vivo (silencioso, manos libres) y "me quedé en blanco".
- **Reunión**: graba, transcribe y genera resumen, decisiones y tareas. No guarda el audio.
- **Inglés**: traducir es/en/pt con detección de idioma y práctica por voz con correcciones y errores frecuentes.
- **Perfil**: CV (PDF, Word o texto) y datos agregados por voz o texto, con control de qué usa Vivia.
- **Privacidad**: exportar y borrar perfil, reuniones e historial de inglés.

## Stack
React + TypeScript + Vite + Tailwind · PWA (`vite-plugin-pwa`) · Supabase (Postgres con RLS, Auth, Edge Functions) · IA con Gemini desde el servidor (Claude como respaldo).

## Publicación
Cada push a `main` corre los tests, compila y publica en GitHub Pages (`.github/workflows`). Las usuarias instaladas reciben el aviso "Actualizar ahora"; no hace falta reinstalar.

## Base de datos
Ejecutar en el SQL Editor de Supabase, en orden: `supabase/migrations/0001_init.sql`, `0002_perfil.sql`, `0003_ingles.sql`, `0004_reuniones.sql`. Las migraciones son aditivas.

## IA
La clave nunca va en el frontend. Se guarda como secreto del servidor:
```bash
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy profile-extract interview language meeting
```
Sin clave, la app muestra un aviso claro; no hay respuestas simuladas.

## Desarrollo
```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm test
npm run dev
```

## Límites conocidos
- El audio del sistema en el modo en vivo solo funciona en Chrome/Edge de escritorio (compartir pestaña con audio). En el celular se usa el micrófono.
- El reconocimiento de voz depende del navegador.
- Más detalle en `docs/ARCHITECTURE.md` y `docs/DEPLOYMENT.md`.
