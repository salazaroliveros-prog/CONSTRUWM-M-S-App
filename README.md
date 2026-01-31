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

- `GEMINI_API_KEY`: clave de Gemini (ver [.env.example](.env.example)).
- `VITE_BASE` (opcional): base path para despliegues en subruta (ej. GitHub Pages). Ejemplo: `VITE_BASE=/mi-repo/`

Importante: esta app usa la API key en el frontend; si despliegas públicamente, esa key queda expuesta. Para producción, lo ideal es mover la llamada a Gemini a un backend o función serverless.

## Despliegue a GitHub Pages (estático)

1. Construir (genera `dist/`):
   - `npm run build`
2. Configurar `VITE_BASE` para tu repo (ej. `/mi-repo/`) y volver a construir.
3. Publicar `dist/` con GitHub Pages (o usando GitHub Actions).

## Despliegue a Google Cloud

### Opción A: Cloud Storage (sitio estático)

1. `npm run build`
2. Crear un bucket, habilitar hosting estático y subir el contenido de `dist/`.
3. (Opcional) Habilitar Cloud CDN.

Guía paso a paso (con comandos `gcloud`): [docs/deploy-gcp-storage.md](docs/deploy-gcp-storage.md)

### Opción B: Cloud Run (contenedor)

1. `npm run build`
2. Crear una imagen (por ejemplo con Nginx) que sirva `dist/`.
3. Desplegar la imagen en Cloud Run.

Este repo ya incluye una opción lista para Cloud Run:

- Workflow de GitHub Pages: [.github/workflows/pages.yml](.github/workflows/pages.yml)
- Contenedor Nginx para Cloud Run: [Dockerfile](Dockerfile) + [nginx.conf](nginx.conf)

Ejemplo (Cloud Run, desde tu máquina con gcloud configurado):

- `gcloud run deploy wm-constructora --source . --region us-central1 --allow-unauthenticated`
