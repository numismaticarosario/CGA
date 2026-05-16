# CGA — Monitor de Pair Trading

Dashboard crypto para monitorear indicadores de pair trading ADA/SOL mediante análisis de Z-Score en tiempo real.

**Solo lectura.** Sin trading, sin ejecución de órdenes.

-----

## Funcionalidades

- Z-Score de doble temporalidad (contexto 4H + entrada 5M)
- Entornos ADA/SOL y SOL/ADA
- Colores verde/rojo según umbrales configurados
- Autenticación con Google OAuth y lista de emails autorizados
- Caché de API de Binance para minimizar riesgo de rate limit
- UI dark mode responsive
- Listo para deploy en Render (Frankfurt/EU)

-----

## 1. Instalar dependencias

```bash
git clone https://github.com/TU_USUARIO/cga.git
cd cga
npm install
```

-----

## 2. Crear el archivo `.env`

```bash
cp .env.example .env
```

Completar `.env` con los valores correspondientes (ver secciones siguientes).

-----

## 3. Configurar la API de Binance

1. Ingresar a [Binance](https://www.binance.com) → Gestión de API
1. Crear una nueva clave de API (solo lectura es suficiente — no se necesita trading)
1. **Restringir por IP** si es posible, por seguridad
1. Copiar la clave y el secreto en `.env`:

```
BINANCE_API_KEY=tu_clave
BINANCE_API_SECRET=tu_secreto
```

> **Importante:** La app solo consulta endpoints públicos de datos de mercado (`/api/v3/klines`), que pueden no requerir autenticación. La clave se incluye para obtener límites de requests más altos.

-----

## 4. Configurar Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
1. Crear un proyecto → APIs y Servicios → Credenciales
1. Crear un **ID de cliente OAuth 2.0** (aplicación web)
1. Agregar URIs de redireccionamiento autorizados:
- Local: `http://localhost:3000/auth/google/callback`
- Producción: `https://tu-app.onrender.com/auth/google/callback`
1. Copiar el ID de cliente y el secreto en `.env`:

```
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

-----

## 5. Definir usuarios autorizados

Solo los emails listados en `AUTHORIZED_EMAILS` podrán acceder al dashboard:

```
AUTHORIZED_EMAILS=tuemail@gmail.com,otro@gmail.com
```

-----

## 6. Correr la app localmente

```bash
npm run dev     # con recarga automática (nodemon)
# o bien
npm start       # modo producción
```

Abrir: `http://localhost:3000`

-----

## 7. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Configuración inicial CGA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cga.git
git push -u origin main
```

> Asegurarse de tener un `.gitignore` que excluya `.env` y `node_modules/`.

-----

## 8. Hacer deploy en Render

1. Ir a [render.com](https://render.com) → New → Web Service
1. Conectar el repositorio de GitHub
1. Configurar:
- **Nombre:** `cga`
- **Región:** Frankfurt (EU) ← **obligatorio para acceder a Binance**
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Versión de Node:** 18+

-----

## 9. Configurar variables de entorno en Render

En el servicio de Render → pestaña **Environment**, agregar todas las variables del archivo `.env.example`:

|Variable              |Valor                                             |
|----------------------|--------------------------------------------------|
|`PORT`                |`3000` (Render lo setea automáticamente)          |
|`BINANCE_API_KEY`     |tu clave                                          |
|`BINANCE_API_SECRET`  |tu secreto                                        |
|`GOOGLE_CLIENT_ID`    |desde Google Console                              |
|`GOOGLE_CLIENT_SECRET`|desde Google Console                              |
|`GOOGLE_CALLBACK_URL` |`https://tu-app.onrender.com/auth/google/callback`|
|`AUTHORIZED_EMAILS`   |emails separados por coma                         |
|`SESSION_SECRET`      |una cadena larga y aleatoria                      |
|`CACHE_TTL_SECONDS`   |`60` o más                                        |


> Después de agregar las variables, actualizar la URI de redireccionamiento en Google Cloud Console para que coincida con la URL de Render.

-----

## 10. Evitar problemas de rate limit con Binance

La app usa una **caché en memoria** para reducir las llamadas a la API:

- `CACHE_TTL_SECONDS=60` significa que cada serie de datos se consulta como máximo una vez por minuto
- El dashboard se actualiza automáticamente cada 60 segundos
- Se consultan 4 series de velas por actualización (ADAUSDT 4h, ADAUSDT 5m, SOLUSDT 4h, SOLUSDT 5m)
- Con la caché activa, los requests reales a Binance se reducen a ~4 por minuto como máximo

**Consejos para reducir el riesgo aún más:**

- Aumentar `CACHE_TTL_SECONDS` a `120` o `300` si no se necesitan actualizaciones tan frecuentes
- Los endpoints públicos de Binance permiten 1200 requests por minuto — esta app usa una fracción mínima

-----

## 11. Agregar nuevos pairs o indicadores

Para agregar un nuevo entorno (por ejemplo BTC/ETH):

1. **`routes/api.js`** — Consultar las nuevas series de velas y calcular ratios/Z-Scores
1. **`public/index.html`** — Agregar un nuevo bloque `.env-block` con los IDs correspondientes
1. **`public/js/app.js`** — Llamar a `updateCard()` con los nuevos IDs y datos
1. **`public/css/style.css`** — No requiere cambios (el estilo es genérico)

Para modificar los umbrales, editar `CONTEXT_THRESHOLD` y `ENTRY_THRESHOLD` en `routes/api.js`.

-----

## Estructura del proyecto

```
cga/
├── server.js           # App Express + configuración de Passport
├── package.json
├── .env.example
├── README.md
├── routes/
│   ├── api.js          # Endpoint /api/dashboard
│   └── auth.js         # Rutas de Google OAuth
├── middleware/
│   └── auth.js         # Guard de autenticación
├── utils/
│   ├── binance.js      # Cliente Binance con caché
│   └── zscore.js       # Cálculo de Z-Score
└── public/
    ├── index.html      # Dashboard principal
    ├── login.html      # Pantalla de login
    ├── unauthorized.html
    ├── css/style.css
    └── js/app.js
```

-----

## Licencia

Uso privado.