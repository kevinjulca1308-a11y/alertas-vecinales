# AlertaVecinal · Reportes ciudadanos

Aplicación web con React, API Node.js/Express y base de datos SQLite. Los vecinos pueden publicar problemas de alumbrado, limpieza, vías públicas y áreas verdes, adjuntar fotografías, ubicar el lugar y consultar el seguimiento.

## Probar en Windows

1. Instala **Node.js 24 LTS** desde https://nodejs.org/. Incluye npm. Cierra y abre PowerShell después de instalarlo.
2. Descarga el proyecto y abre PowerShell dentro de la carpeta que contiene `package.json`.
3. Ejecuta:

```powershell
node -v
npm.cmd ci
npm.cmd run dev
```

Abre `http://localhost:5173` en **tu computadora**. `npm run dev` inicia automáticamente el frontend y la API. Crea una cuenta desde «Iniciar sesión → Crear cuenta». No hay credenciales predefinidas.

En macOS/Linux los comandos son `npm ci` y `npm run dev`.

## Funciones

- Registro e inicio de sesión; contraseñas con scrypt y sesiones mediante cookies HttpOnly.
- Reportes compartidos entre los usuarios conectados al **mismo servidor**, persistentes en SQLite.
- Formulario en tres pasos: categoría, prioridad, descripción, hasta tres fotografías y ubicación.
- Cámara o galería mediante el navegador. Las imágenes se comprimen a JPEG antes de enviarse; máximo 15 MB por archivo original y aproximadamente 1 MB después de comprimir.
- GPS con permiso, selección en el mapa o coordenadas manuales. Se necesita HTTPS o localhost para GPS/cámara.
- Filtros por categoría, estado y prioridad; búsqueda sin distinguir acentos; orden por fecha, apoyos o prioridad.
- Tarjetas o lista, mapa de reportes, guardados personales y apoyos únicos por usuario.
- Comentarios y seguimiento con notas e historial. Solo el autor puede cambiar estados o eliminar su reporte.
- Estadísticas y exportación CSV de los reportes visibles.
- Navegación móvil, formularios accesibles por teclado, confirmación de eliminación y estados de error.
- Actualización de reportes cada 30 segundos mientras la página está visible; botón para actualizar inmediatamente.

Los seis reportes iniciales son **ejemplos identificados**. Puedes ocultarlos. Sus ilustraciones y conteos no representan problemas reales. No hay integración con una municipalidad: los cambios de estado son observaciones de los vecinos.

## SQLite o MySQL

SQLite es adecuado para el proyecto académico, un solo servidor y un volumen moderado: no exige instalar ni configurar otro servicio. La base de datos está en el **backend**, no en cada navegador. Por eso permite compartir reportes entre cuentas.

MySQL resulta útil cuando se necesita escalar a varios servidores o gestionar mayor concurrencia de escrituras. La app Android/web debe conectarse a una API; no debe conectarse directamente a MySQL con credenciales embebidas. Esta versión implementa **SQLite**, sin adaptador MySQL.

## Datos y arquitectura

```text
Navegador (React) → API (Express) → data/alertavecinal.sqlite
```

Tablas: `users`, `sessions`, `reports`, `history`, `comments`, `votes` y `bookmarks`. Hay claves foráneas, índices, transacciones para creación/seguimiento y restricciones para evitar apoyos duplicados. Las fotos comprimidas se guardan junto con el reporte. Para mayor volumen conviene mover las imágenes a almacenamiento de objetos.

`data/` está excluido de Git: las cuentas, sesiones y fotografías no se suben al repositorio. Para una copia de seguridad consistente, detén el servidor y copia la carpeta completa `data/` (incluidos archivos WAL si existen). Los datos antiguos de localStorage no se eliminan ni se importan automáticamente.

Variables opcionales:

| Variable   | Uso                                          | Predeterminado              |
| ---------- | -------------------------------------------- | --------------------------- |
| `DB_PATH`  | Ruta del archivo SQLite                      | `data/alertavecinal.sqlite` |
| `API_PORT` | Puerto de la API                             | `3001`                      |
| `API_HOST` | Dirección de escucha                         | `127.0.0.1`                 |
| `NODE_ENV` | En `production`, las cookies requieren HTTPS | Desarrollo                  |

El proxy de Vite utiliza `API_PORT` y apunta al puerto 3001 de forma predeterminada. No guardes contraseñas o bases de datos en Git.

## Validación y ejecución compilada

```sh
npm test
npm run build
npm start
```

Con `npm start`, la API sirve también los archivos compilados en `http://localhost:3001`. `npm run preview` solo sirve una vista de la compilación; para usar la API, ejecuta también `npm start`.

Para las pruebas de interfaz en Chromium:

```sh
npx playwright install chromium
npm run test:e2e
```

Las pruebas de navegador inician frontend y API propios con una base en memoria aislada. Las pruebas de API también comprueban la persistencia en un archivo temporal. Si el entorno ya tiene Chromium instalado, puedes indicar su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Para despliegue: usa Node 24, un disco persistente para `data/`, un solo proceso de API y HTTPS mediante un proxy. Define `NODE_ENV=production` para cookies Secure. Los datos de cada instalación son independientes hasta conectar los clientes al mismo servidor. No hay recuperación de contraseña ni cuentas municipales verificadas en esta versión.

## Android Studio

La interfaz sigue escrita en JavaScript y React. Capacitor puede empaquetarla para Android, pero el APK necesita conectarse a una API HTTPS accesible: el servidor de tu computadora no se incluye en el APK. La integración nativa de Capacitor, sus plugins de cámara/GPS y la configuración del servidor remoto no están incluidas. Primero prueba el flujo web completo con `npm run dev`.

## Red y privacidad

El mapa usa `*.tile.openstreetmap.org`; las fuentes opcionales usan `fonts.googleapis.com` y `fonts.gstatic.com`. Las ilustraciones se incluyen en el proyecto y funcionan sin descargar imágenes externas. Si el mapa no carga, la app muestra un aviso y permite indicar coordenadas manualmente.

El correo y las credenciales no se exponen en los reportes públicos. Las sesiones duran siete días; cerrar sesión invalida la cookie en el servidor. El autor puede eliminar su reporte y sus comentarios/seguimiento asociados. Evita publicar rostros, placas, documentos y datos personales.
