> Para el despliegue gratuito solicitado, utiliza [DESPLIEGUE_GRATUITO.md](DESPLIEGUE_GRATUITO.md). Este documento conserva la alternativa Cloud Run, que requiere facturación.

# Usar AlertaVecinal con datos móviles · Guadalupe

La solución permanente es publicar la API Express en HTTPS. El teléfono se conecta a la API por Internet y la API conserva cuentas, sesiones y reportes en Firestore. La computadora personal deja de ser el servidor. Se necesita Internet, pero no estar conectado a un Wi-Fi específico.

## Hosting propuesto: Google Cloud Run

Como este proyecto ya usa Firebase/Firestore, propongo Cloud Run en el mismo proyecto de Google Cloud. El Firebase Admin SDK admite credenciales automáticas de la identidad del servicio en ese entorno. No hay que incluir una clave privada en la imagen o en el APK.

Cloud Run requiere un proyecto con facturación habilitada. Tiene cuota gratuita y cobro por uso; eso no garantiza costo cero. También pueden facturarse Firestore, Storage, la compilación y el almacenamiento de imágenes. Configura avisos de presupuesto antes de publicar; estos avisos no son un tope automático de gasto.

Estado actual: configuración preparada en el repositorio. No se ha creado ningún servicio en la nube, no hay una URL pública nueva y no se activó facturación. Docker y gcloud no están instalados en esta computadora, por lo que la imagen no se ha construido ni probado localmente.

## Qué quedó preparado

- `Dockerfile`: compila la web y ejecuta Express con Node 24, Firestore, cookies seguras de producción y usuario de sistema sin privilegios.
- `.dockerignore` y `.gcloudignore`: limitan la subida al código de la aplicación. Excluyen `.env`, claves privadas, la base local y los archivos Android.
- `server/index.js`: respeta el puerto `PORT` asignado por el hosting y escucha en `0.0.0.0` en producción.
- `VITE_API_SERVER_URL`: permite fijar la URL pública en el APK al compilarlo. Una dirección guardada manualmente por un usuario conserva prioridad; esos usuarios deben actualizarla una vez desde Configurar conexión.
- El mapa vacío y los formularios parten de Guadalupe, Pacasmayo, La Libertad. Los datos nuevos de demostración están identificados y ubicados alrededor de la ciudad; sus sectores son ficticios. Los reportes existentes no se trasladan ni se modifican.

## Preparar tu cuenta

1. Abre Google Cloud con la misma cuenta que administra Firebase y selecciona el mismo proyecto de Firestore.
2. Activa facturación y configura avisos de presupuesto.
3. Instala Google Cloud CLI e inicia sesión con `gcloud init`.
4. Crea una cuenta de servicio de ejecución para AlertaVecinal. Concédele `roles/datastore.user` en el proyecto de Firestore. Para fotografías, concédele `roles/storage.objectUser` en el bucket concreto de Firebase Storage.
5. La cuenta que hace el despliegue necesita los permisos para desplegar desde código, compilar y utilizar esa cuenta de servicio. Sigue los requisitos oficiales del despliegue desde fuente; no uses una cuenta de servicio de ejecución con rol Owner.

Las cuentas de servicio creadas para la ejecución pueden usar credenciales automáticas. No definas `GOOGLE_APPLICATION_CREDENTIALS` con una ruta de Windows dentro de Cloud Run.

## Publicar desde PowerShell

En la raíz del proyecto, define estos valores con los de tu cuenta. La región debe elegirse cerca de la base Firestore; `southamerica-west1` es solo un ejemplo a revisar según dónde esté tu base.

```powershell
$cloudProject = 'ID_REAL_DEL_PROYECTO'
$cloudRegion = 'southamerica-west1'
$cloudIdentity = 'CUENTA_DE_EJECUCION@ID_REAL_DEL_PROYECTO.iam.gserviceaccount.com'
$cloudBucket = 'NOMBRE_REAL_DEL_BUCKET'
gcloud config set project $cloudProject
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud meta list-files-for-upload
```

Revisa el listado de archivos antes del despliegue: no debe contener `.env`, claves privadas ni `data/`. Después:

```powershell
gcloud run deploy alertavecinal --source . --region $cloudRegion --allow-unauthenticated --service-account $cloudIdentity --port 8080 --memory 512Mi --cpu 1 --min-instances 0 --max-instances 2 --set-env-vars "NODE_ENV=production,API_HOST=0.0.0.0,DB_PROVIDER=firebase,FIREBASE_PROJECT_ID=$cloudProject,FIREBASE_STORAGE_BUCKET=$cloudBucket"
```

La API debe ser accesible por Internet para que la app pueda mostrar los reportes e iniciar sesión. Los permisos de vecinos y administradores siguen verificándose dentro de Express; hacer el servicio accesible no convierte a los visitantes en administradores. `--max-instances` limita capacidad, no establece un límite monetario.

Si aún no utilizas fotos, omite `FIREBASE_STORAGE_BUCKET` y su permiso. La app ya comprueba y avisa si intentas adjuntar fotos sin Storage configurado.

Cloud Run devuelve la URL real del servicio. Comprueba `URL_REAL/api/health`: debe responder `{"ok":true,"database":"Firestore"}`. Abre esa URL desde el celular con el Wi-Fi apagado y los datos móviles activos. Verifica después registro, inicio/cierre de sesión, publicación, fotografías y recarga de la sesión.

## Conectar el APK

Para probar con el APK instalado, abre **Configurar conexión**, introduce la URL HTTPS real que devolvió Cloud Run y pulsa **Comprobar y guardar**. No uses `localhost`, `10.0.2.2` ni la IP privada de la computadora.

Para incluir esa dirección en los siguientes APK, agrega a tu `.env` local:

```dotenv
VITE_API_SERVER_URL=https://URL_REAL_DEL_SERVICIO
```

Después ejecuta:

```powershell
npm.cmd run android:sync
```

Genera e instala el APK actualizado desde Android Studio. La URL es pública y puede incorporarse a la app; las claves privadas de Firebase siempre permanecen en el servidor. Para compilar desde GitHub, abre Settings → Secrets and variables → Actions → Variables y crea **VITE_API_SERVER_URL** con esa misma URL. El workflow ya la pasa a la compilación de Android.

## Fuentes oficiales

- [Desplegar Node.js en Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service).
- [Puerto y dirección de escucha del contenedor](https://cloud.google.com/run/docs/container-contract).
- [Identidad del servicio](https://cloud.google.com/run/docs/configuring/services/service-identity).
- [Firebase Admin y credenciales automáticas en Cloud Run](https://firebase.google.com/docs/admin/setup).
- [Precios de Cloud Run](https://cloud.google.com/run/pricing).
- [Referencia municipal para el centro de Guadalupe](https://www.muniguadalupe.gob.pe/web/pdf/Indicadores_de_Brechas.pdf).
