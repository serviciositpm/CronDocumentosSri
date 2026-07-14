# ─────────────────────────────────────────────
# ETAPA 1: Build (compila TypeScript)
# ─────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copiar solo los manifests primero (aprovecha caché de capas de Docker)
COPY package*.json tsconfig.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar)
# PUPPETEER_SKIP_DOWNLOAD evita descargar Chrome aquí (lo instalamos en la
# siguiente etapa desde los repositorios del sistema)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

# Copiar el código fuente y compilar
COPY src/ ./src/
RUN npm run build

# ─────────────────────────────────────────────
# ETAPA 2: Runtime (imagen final, más liviana)
# ─────────────────────────────────────────────
FROM node:20-slim AS runner

# Instalar Chromium y sus dependencias del sistema operativo.
# Usamos el Chromium del sistema (no el bundleado de Puppeteer) porque:
#   1. Es más estable en entornos sin GUI
#   2. Permite controlar la versión exacta
#   3. Reduce el tamaño de la imagen final
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    cifs-utils \
    fonts-liberation \
    fonts-dejavu-core \
    # wget y unzip para descargar la fuente Code39Azalea durante el build
    wget \
    unzip \
    # fontconfig para registrar la fuente en el sistema
    fontconfig \
 && rm -rf /var/lib/apt/lists/*

# ── Instalar fuente Code39Azalea (licencia Creative Commons CC BY-ND) ──
# Chromium headless necesita la fuente registrada en el sistema para
# renderizarla en los PDFs. La descargamos del sitio oficial de Azalea
# Software y la registramos con fc-cache para que Chromium la encuentre.
RUN mkdir -p /usr/share/fonts/truetype/code39azalea \
 && wget -q "https://azaleabarcodes.com/free-font/Code39Azalea.zip" \
         -O /tmp/Code39Azalea.zip \
 && unzip -q /tmp/Code39Azalea.zip -d /tmp/code39 \
 && find /tmp/code39 -name "*.ttf" -exec cp {} /usr/share/fonts/truetype/code39azalea/ \; \
 && find /tmp/code39 -name "*.otf" -exec cp {} /usr/share/fonts/truetype/code39azalea/ \; \
 && fc-cache -fv \
 && rm -rf /tmp/Code39Azalea.zip /tmp/code39 \
 # Verificar que la fuente quedó registrada
 && fc-list | grep -i "code39" || echo "ADVERTENCIA: fuente Code39 no encontrada"

WORKDIR /app

# Copiar solo dependencias de producción desde la etapa builder
COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev

# Copiar el JS compilado y las plantillas HTML
COPY --from=builder /app/dist ./dist
COPY src/infrastructure/pdf/templates ./dist/infrastructure/pdf/templates

# Crear usuario no-root para correr el servicio (buena práctica de seguridad)
# El flag --no-sandbox de Puppeteer es necesario cuando se corre como root,
# pero con un usuario dedicado podemos evitarlo.
RUN groupadd -r cron-sri && useradd -r -g cron-sri -m cron-sri \
 && chown -R cron-sri:cron-sri /app

USER cron-sri

# Decirle a Puppeteer dónde está el Chromium del sistema
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# El proceso principal del contenedor
CMD ["node", "dist/app.js"]