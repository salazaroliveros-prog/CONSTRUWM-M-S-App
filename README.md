<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Nota importante (Windows)

Si la ruta de la carpeta del proyecto contiene `&` (por ejemplo `...CORPORACION_M&S-WM`), en Windows `npm run dev`/`npm run build` puede fallar porque `cmd.exe` interpreta `&` como separador de comandos.

Opciones recomendadas:

- Renombrar la carpeta para quitar `&` (recomendado).
- Workaround (sin renombrar): ejecutar Vite directamente:
  - Dev: `node .\\node_modules\\vite\\bin\\vite.js`
  - Build: `node .\\node_modules\\vite\\bin\\vite.js build`

## Variables de entorno

- `GEMINI_API_KEY`: clave de Gemini (usada por el servidor en Cloud Run; ver [.env.example](.env.example)).
- `VITE_BASE` (opcional): base path para despliegues en subruta (ej. GitHub Pages). Ejemplo: `VITE_BASE=/mi-repo/`

### Supabase (DB + Edge Functions)

Este proyecto incluye Edge Functions para:

- Portal público de asistencia: `mark-attendance`
- Portal público de postulantes/contrato: `submit-contract`
- Admin RRHH (sin Supabase Auth todavía): `admin-rh`

Frontend (en `.env.local`, ver [.env.example](.env.example)):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ORG_ID`
- `VITE_PORTAL_ATTENDANCE_TOKEN`
- `VITE_PORTAL_APPLICATIONS_TOKEN`
- `VITE_ADMIN_TOKEN`

Secrets en Supabase (Dashboard → Edge Functions → Secrets):

- `WM_ORG_ID`
- `PORTAL_ATTENDANCE_TOKEN`
- `PORTAL_APPLICATIONS_TOKEN`
- `ADMIN_TOKEN`
- `SERVICE_ROLE_KEY` (service role key; Supabase bloquea nombres que empiezan con `SUPABASE_`)
- `WM_TIMEZONE` (opcional, default `America/Guatemala`)

Importante: esta app usa la API key en el frontend; si despliegas públicamente, esa key queda expuesta. Para producción, lo ideal es mover la llamada a Gemini a un backend o función serverless.

## Despliegue a GitHub Pages (estático)

1. Construir (genera `dist/`):
   - `npm run build`
2. Configurar `VITE_BASE` para tu repo (ej. `/mi-repo/`) y volver a construir.
3. Publicar `dist/` con GitHub Pages (o usando GitHub Actions).

Nota: GitHub Pages es hosting estático. Las funciones de IA (Gemini) requieren un backend; para eso usa Cloud Run.

## Despliegue a Google Cloud

### Opción A: Cloud Storage (sitio estático)

1. `npm run build`
2. Crear un bucket, habilitar hosting estático y subir el contenido de `dist/`.
3. (Opcional) Habilitar Cloud CDN.

Guía paso a paso (con comandos `gcloud`): [docs/deploy-gcp-storage.md](docs/deploy-gcp-storage.md)

### Opción B: Cloud Run (contenedor)

1. `npm run build`
2. Crear una imagen Docker que sirva `dist/` y exponga un endpoint `/api` para Gemini (este repo ya incluye el `Dockerfile`).
3. Desplegar la imagen en Cloud Run.

Este repo ya incluye una opción lista para Cloud Run:

- Workflow de GitHub Pages: [.github/workflows/pages.yml](.github/workflows/pages.yml)
- Contenedor Nginx para Cloud Run: [Dockerfile](Dockerfile) + [nginx.conf](nginx.conf)

Ejemplo (Cloud Run, desde tu máquina con gcloud configurado):

- `gcloud run deploy wm-constructora --source . --region us-central1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=TU_KEY`

Recomendación: en producción usa Secret Manager en lugar de `--set-env-vars`.
