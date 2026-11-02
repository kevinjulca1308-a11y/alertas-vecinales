# Publicación gratuita · AlertaVecinal Guadalupe

Configuración implementada: **Render Free → Express → Firestore Spark**, con **Cloudinary Free** para las fotografías. El APK y la web utilizan la misma API HTTPS. La computadora personal puede estar apagada y el celular puede usar datos móviles.

El código está preparado, pero crear cuentas y configurar los secretos no publica el servicio por sí solo. La URL debe obtenerse de un despliegue real en Render; no se ha inventado una dirección ni se incluyeron claves en el APK.

## 1. Crear Cloudinary Free

Regístrate en [Cloudinary Free](https://cloudinary.com/users/register_free) y conserva el plan **Free**. En la consola abre Settings → API Keys y localiza Cloud name, API Key y API Secret. No habilites un preset de subida sin firma: este servidor autentica las subidas con el SDK oficial.

Para probar en esta computadora, completa los tres campos ya preparados al final del archivo privado `.env` y agrega `PHOTO_PROVIDER=cloudinary`:

```dotenv
PHOTO_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=TU_CLOUD_NAME
CLOUDINARY_API_KEY=TU_API_KEY
CLOUDINARY_API_SECRET=TU_API_SECRET
```

Reinicia `npm.cmd run dev` después de completar los valores. Las fotografías nuevas se guardan en `alertavecinal/<proyecto>/reports/<reporte>/` dentro de Cloudinary. Firestore guarda sus URLs HTTPS e identificadores de eliminación, no su contenido base64. Las claves privadas se quedan en Node.

## 2. Verificar Firebase Spark

En Firebase Console comprueba que el proyecto use **Spark** para mantener las cuotas gratuitas sin activar facturación. No habilites Cloud Run, Functions, Storage ni TTL de sesiones para esta configuración. Firestore ya es compatible con la app.

Para Render se necesita una cuenta de servicio con acceso a Firestore en ese proyecto. Reutiliza la cuenta de servicio privada existente si corresponde. Su JSON se introduce **solo como secreto de Render**, nunca como archivo del repositorio ni por chat. El servidor admite `FIREBASE_SERVICE_ACCOUNT_JSON`; localmente puede seguir usando `GOOGLE_APPLICATION_CREDENTIALS` con la ruta del archivo privado.

Las fotos antiguas que estén en Firebase Storage no se migran automáticamente. Se conservan sus referencias y el proveedor anterior sigue disponible si configuras su bucket. Cambiar el plan de Firebase puede afectar ese almacenamiento; revisa y exporta las fotos antiguas antes de hacer ese cambio. Los nuevos reportes con Cloudinary no necesitan un bucket Firebase.

## 3. Desplegar en Render Free

1. Conecta tu cuenta de Render y el repositorio de AlertaVecinal.
2. Usa **New → Blueprint** y el archivo `render.yaml` de la rama con estos cambios. El manifiesto fija `plan: free`, no crea bases de datos de Render ni discos de pago.
3. Completa los secretos que Render solicita:

| Variable | Valor |
| --- | --- |
| `FIREBASE_PROJECT_ID` | ID real del proyecto de Firebase |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo de la cuenta de servicio, como variable secreta |
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |

El manifiesto configura `DB_PROVIDER=firebase`, `PHOTO_PROVIDER=cloudinary`, Node 24 y `NODE_ENV=production`. No copies `GOOGLE_APPLICATION_CREDENTIALS` con una ruta de Windows a Render. No uses SQLite en Render Free: su disco es temporal y el arranque ahora rechaza esa combinación.

La compilación usa `npm ci --include=dev && npm run build`; el inicio usa `node server/index.js`. Express sirve también la web compilada y escucha en el `PORT` que Render proporciona. No hace falta un segundo servicio para la web.

4. Espera que el servicio quede activo y copia **su URL HTTPS real**.
5. Abre `URL_REAL/api/health`. Debe devolver `{"ok":true,"database":"Firestore"}`.

## 4. Conectar el celular

En el APK instalado, abre **Configurar conexión**, pega la URL HTTPS real y pulsa **Comprobar y guardar**. Para incluirla en los siguientes APK, configura `VITE_API_SERVER_URL` en el `.env` local o en las variables del repositorio de GitHub y compila de nuevo:

```powershell
npm.cmd run android:sync
```

Después genera e instala el APK actualizado. Una dirección guardada manualmente conserva prioridad: quien ya tenga la IP local debe cambiarla una vez.

La conexión espera hasta 90 segundos y reintenta únicamente la comprobación de disponibilidad. No se reenvían automáticamente registros, reportes ni comentarios. La actualización automática ahora ocurre cada dos minutos mientras la pantalla está visible; el botón de actualizar sigue disponible.

## 5. Comprobar el despliegue real

Con el Wi-Fi del celular apagado y los datos móviles activos: abre la app, inicia sesión, crea un reporte con fotografías, recarga y comprueba su persistencia. Elimina un reporte de prueba y verifica también su eliminación en Cloudinary. Repite el acceso después de dejar el servicio inactivo para comprobar la espera inicial. Las pruebas locales no sustituyen estas comprobaciones con tus cuentas reales.

Las pruebas del repositorio usan cuentas ficticias, un emulador Firestore aislado y respuestas simuladas de Cloudinary; no consumen cuota de las cuentas reales.

## Límites del costo cero

Render Free puede suspenderse por inactividad y tiene cuotas de recursos. Firestore Spark y Cloudinary Free también tienen cuotas. Esta configuración permite un piloto sin planes de pago; no garantiza capacidad ilimitada ni disponibilidad de un servicio de emergencias. No uses solicitudes automáticas ajenas a la actividad de los usuarios para impedir que Render se suspenda.

## Limpieza de fotos ante fallos

Si una subida falla antes de guardar el reporte, se intenta borrar lo enviado. Si falla la confirmación de guardado en Firestore, las fotos se conservan porque el reporte podría haberse guardado realmente. Si falla la eliminación de fotos, el reporte queda oculto con sus metadatos de limpieza.

Un administrador del servidor puede reintentar la limpieza de un reporte que **ya esté eliminado**:

```powershell
npm.cmd run photos:cleanup -- AV-CODIGO
```

El comando rechaza reportes activos. Un fallo de red durante una subida también puede requerir revisar archivos huérfanos en Cloudinary; se identifican por el código de reporte.

## Referencias oficiales

- [Render Free y sus límites](https://render.com/docs/free).
- [Configuración Blueprint](https://render.com/docs/blueprint-spec).
- [Secretos en Render](https://render.com/docs/configure-environment-variables).
- [Cuotas Firestore](https://firebase.google.com/docs/firestore/quotas).
- [Cloudinary Free](https://cloudinary.com/pricing).
- [SDK de subida Node.js](https://cloudinary.com/documentation/node_image_and_video_upload).
