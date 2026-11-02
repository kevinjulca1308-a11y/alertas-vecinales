## Alternativa gratuita para fotos y servidor

Para **Render Free + Firestore Spark + Cloudinary Free**, sigue [DESPLIEGUE_GRATUITO.md](DESPLIEGUE_GRATUITO.md). El proveedor de fotos se elige con `PHOTO_PROVIDER=cloudinary`; no requiere Firebase Storage. Las instrucciones de Storage que siguen corresponden al proveedor opcional `firebase`.

# Firebase en AlertaVecinal

La app admite SQLite local o Cloud Firestore. Selecciona el proveedor con `DB_PROVIDER`.
Sin configuración sigue usando SQLite; no se crea una conexión ficticia a la nube.

Arquitectura: Android/web → API Express → Firestore + Firebase Storage.
Se conservan las cuentas propias de AlertaVecinal, contraseñas con scrypt y cookies HttpOnly.
Esta integración no utiliza Firebase Authentication ni requiere `google-services.json` en Android.
El Admin SDK y las claves privadas se ejecutan únicamente en el servidor.

## Crear y conectar tu proyecto

1. Crea un proyecto en https://console.firebase.google.com/.
2. En **Firestore Database**, crea la base **(default)** en modo producción y selecciona una región cercana a tus usuarios. Usa la edición Standard / modo nativo.
3. Si usarás fotografías, activa **Storage** y copia el nombre exacto del bucket que muestra Firebase, sin `gs://`. Para Cloud Storage Firebase requiere el plan Blaze; revisa costos y configura alertas de presupuesto. Puedes probar reportes sin fotos sin configurar bucket.
4. En **Configuración del proyecto → Cuentas de servicio**, genera una clave privada para el servidor. Guarda el JSON fuera del repositorio, por ejemplo en una carpeta privada de tu usuario. No lo compartas por chat ni lo incluyas en el APK. En producción usa una identidad de servicio del entorno con permisos mínimos de Firestore y del bucket.
5. Copia `.env.example` a `.env` en la raíz del proyecto y completa:

```dotenv
DB_PROVIDER=firebase
FIREBASE_PROJECT_ID=tu-id-real
FIREBASE_STORAGE_BUCKET=nombre-exacto-del-bucket
GOOGLE_APPLICATION_CREDENTIALS=C:/ruta/privada/cuenta-servicio.json
API_PORT=3001
API_HOST=127.0.0.1
```

6. Publica `firestore.rules` y `storage.rules` desde sus editores en Firebase Console, o desde la raíz con Firebase CLI:

```powershell
npx firebase-tools deploy --only firestore:rules,storage --project tu-id-real
```

Las reglas bloquean el acceso directo de clientes. Express valida la sesión, la propiedad y los datos; el Admin SDK accede con IAM. No habilites reglas públicas para solucionar errores de configuración.

7. Instala dependencias con `npm.cmd install` y ejecuta `npm.cmd run dev`. El servidor debe anunciar **Firestore**. `/api/health` debe devolver `{"ok":true,"database":"Firestore"}`. Si las credenciales no funcionan, el servidor falla al iniciar en vez de guardar silenciosamente en SQLite.
8. Crea una cuenta y un reporte; comprueba en Firebase Console las colecciones `users`, `user_emails`, `sessions` y `reports`. Comprueba comentarios, apoyos, guardados y seguimiento con una segunda cuenta.

Los datos que ya están en SQLite permanecen intactos y no se importan automáticamente. Firestore comienza vacío, sin reportes de demostración. Para volver a los datos locales cambia a `DB_PROVIDER=sqlite` y reinicia el servidor.

## Fotos, sesiones y eliminación

Las fotos se suben como JPEG a `reports/<id>/<n>.jpg` en Storage. Firestore guarda URLs de descarga y metadatos; no imágenes base64 que podrían superar el límite de tamaño del documento. Estas URLs permiten ver las fotos de reportes públicos a quien posea el enlace.

Una subida interrumpida puede dejar archivos sin reporte; revisa periódicamente los archivos huérfanos. La eliminación marca primero el reporte como eliminado para impedir nuevas interacciones y después elimina fotos y subcolecciones. Si la limpieza falla, el reporte queda oculto con `deleted=true` y se registra el ID para reintentar la limpieza administrativamente.

Las sesiones caducadas dejan de autenticar inmediatamente. Configura una política TTL para `sessions.expires_at` en Firestore para eliminarlas automáticamente; la eliminación TTL no determina la validez de la sesión.

El listado mantiene el comportamiento actual: consulta todos los reportes y sus detalles cada dos minutos. Es adecuado para un piloto, pero genera lecturas facturables; antes de un despliegue grande agrega paginación, resúmenes y carga de comentarios al abrir un reporte.

## Android y despliegue

Compila y sincroniza desde la raíz con `npm.cmd run android:sync`, y genera el APK en Android Studio. El logo adjunto está incluido en `public/logo.png`, en el encabezado, el indicador de carga y los recursos nativos de inicio e ícono.

Firestore no sustituye el alojamiento de Express. Para usar la app fuera de tu Wi-Fi despliega la API en un servidor HTTPS con las variables anteriores y configura esa URL en **Servidor Android**. Para publicar usa `NODE_ENV=production`. No configures `NODE_ENV=production` sobre un servidor HTTP local: las cookies requieren HTTPS.

## Pruebas locales de Firestore

Las pruebas de SQLite y de validación continúan ejecutándose con `npm.cmd test`.
Para comprobar realmente transacciones y permisos en Firestore sin tocar datos reales:

```powershell
npx firebase-tools emulators:exec --only firestore --project demo-alertavecinal "npm.cmd run test:firebase"
```

Las pruebas de integración Firebase se omiten si no está definido `FIRESTORE_EMULATOR_HOST`. Nunca usan un proyecto real y prueban cuentas únicas, sesiones, propiedad, apoyos idempotentes, comentarios, seguimiento y eliminación. Las subidas de fotos requieren una prueba adicional con tu bucket configurado.

Referencias oficiales:
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/storage/admin/start
- https://firebase.google.com/docs/firestore/security/rules-query
