# Despliegue en Google Cloud Storage (sitio estático)

Esta app es un SPA (Vite + React). Para que funcione el enrutamiento (al refrescar URLs internas), es importante configurar el *error page* para que sirva `index.html`.

> Requisito: `gcloud` instalado y autenticado (`gcloud auth login`).

## 0) Build

Asegúrate de generar `dist/`.

- `npm run build`

Si estás en Windows y tu ruta contiene `&`, usa:

- `node .\\node_modules\\vite\\bin\\vite.js build`

Recomendación: para Cloud Storage normalmente el sitio vive en la raíz, así que `VITE_BASE=/`.

## 1) Crear bucket

El nombre del bucket debe ser globalmente único.

```bash
PROJECT_ID="tu-project-id"
REGION="us-central1"
BUCKET="wm-constructora-${PROJECT_ID}"

gcloud config set project ${PROJECT_ID}

# Crea el bucket (Uniform Bucket-Level Access recomendado)
gcloud storage buckets create gs://${BUCKET} \
  --location=${REGION} \
  --uniform-bucket-level-access
```

## 2) Configurar hosting estático (SPA-friendly)

```bash
# Página principal
# Página de error: index.html (sirve como fallback para rutas del SPA)
gcloud storage buckets update gs://${BUCKET} \
  --web-main-page-suffix=index.html \
  --web-error-page=index.html
```

## 3) Hacer público el bucket (sitio público)

```bash
gcloud storage buckets add-iam-policy-binding gs://${BUCKET} \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

## 4) Subir el build (dist/)

```bash
gcloud storage rsync -r dist gs://${BUCKET}
```

## 5) URL de acceso (sin CDN)

Cloud Storage hosting clásico expone una URL tipo:

- `http://storage.googleapis.com/${BUCKET}/index.html`

Si necesitas HTTPS “bonito” y mejor performance, usa Cloud CDN (siguiente sección).

---

# (Opcional) Cloud CDN + Load Balancer HTTPS

Esta es la forma recomendada para producción: CDN, HTTPS administrado y dominio propio.

## A) Crear backend bucket y habilitar CDN

```bash
BACKEND_BUCKET="${BUCKET}-backend"
URL_MAP="${BUCKET}-url-map"
HTTPS_PROXY="${BUCKET}-https-proxy"
FORWARD_RULE="${BUCKET}-https-fr"

gcloud compute backend-buckets create ${BACKEND_BUCKET} \
  --gcs-bucket-name=${BUCKET} \
  --enable-cdn

gcloud compute url-maps create ${URL_MAP} \
  --default-backend-bucket=${BACKEND_BUCKET}
```

## B) (Opcional) Dominio + certificado administrado

Si tienes dominio (ej. `wm.tu-dominio.com`):

```bash
DOMAIN="wm.tu-dominio.com"
CERT="${BUCKET}-cert"

gcloud compute ssl-certificates create ${CERT} \
  --domains=${DOMAIN} \
  --global
```

## C) Crear proxy HTTPS y regla de forwarding

```bash
gcloud compute target-https-proxies create ${HTTPS_PROXY} \
  --url-map=${URL_MAP} \
  --ssl-certificates=${CERT} \
  --global

gcloud compute forwarding-rules create ${FORWARD_RULE} \
  --global \
  --target-https-proxy=${HTTPS_PROXY} \
  --ports=443
```

Luego apunta tu DNS (registro `A`) a la IP que te muestre:

```bash
gcloud compute forwarding-rules describe ${FORWARD_RULE} --global --format="value(IPAddress)"
```

---

## Notas

- Si cambias el nombre del repo y despliegas en subruta (GitHub Pages), ajusta `VITE_BASE`. Para GCS normalmente es `/`.
- Este proyecto usa `GEMINI_API_KEY` en frontend: si el sitio es público, la key queda expuesta. Para producción, usa un backend/proxy.
