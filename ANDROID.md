# Ejecutar AlertaVecinal en Android Studio

El repositorio incluye el proyecto Android de Capacitor en `android/`. La interfaz sigue hecha con React/JavaScript; la actividad Android está en Java y los plugins proporcionan cámara, galería, GPS y exportación nativa. **No necesitas ejecutar `cap init` ni `cap add android` otra vez.**

## Lo que debes instalar

- Node.js **24 LTS** (incluye npm).
- Android Studio actualizado, con el SDK **Android 15 / API 35** y Build Tools **35.0.0**. Android Studio te ofrecerá instalar los componentes que falten al sincronizar.
- En Android Studio, usa el **JDK 21** incluido: Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK.

## 1. Descargar e instalar

Descarga la última versión de GitHub o actualiza el clon con `git pull`. Abre PowerShell en la carpeta que contiene `package.json`:

```powershell
npm.cmd ci
npm.cmd run android:sync
npm.cmd run android:open
```

El último comando abre Android Studio en la carpeta correcta. Si no lo encuentra, usa **File → Open** y selecciona la carpeta **`android`**, no la raíz del repositorio. Espera la sincronización de Gradle.

## 2. Encender el servidor de reportes

En otra terminal, dentro de la raíz del proyecto:

```powershell
npm.cmd run dev
```

**Deja esa terminal abierta mientras usas la app.** La base de datos SQLite y las cuentas se guardan en tu computadora, en `data/alertavecinal.sqlite`. No se incluyen dentro del APK.

## 3. Ejecutar en el emulador

1. En Android Studio abre **Tools → Device Manager**.
2. Crea un dispositivo con Android 15/API 35 y una imagen **Google Play** o **Google APIs** (para el GPS).
3. Selecciónalo en la barra superior y pulsa **▶ Run**.
4. La app ya usa `http://10.0.2.2:3001` para conectarse al servidor de tu computadora. Esa dirección es especial del emulador; no es la dirección del entorno de Codex.
5. Crea una cuenta y publica un reporte. Usa «Servidor Android» en el menú si necesitas cambiar o comprobar la conexión.

En el emulador, configura una ubicación desde **Extended Controls → Location** y envíala antes de pulsar GPS. La cámara puede mostrar la escena virtual o una webcam según la configuración del emulador. También puedes elegir una foto de la galería.

## 4. Usar un celular real

El celular y la computadora deben estar en la misma red Wi-Fi. En PowerShell:

```powershell
$env:API_HOST = "0.0.0.0"
npm.cmd run dev
```

Permite Node.js en el firewall de Windows **para tu red privada** cuando Windows lo solicite. Busca la IPv4 de tu computadora con `ipconfig`. En la app, abre **Servidor Android** e introduce, por ejemplo, `http://192.168.1.50:3001`, sustituyendo la IP por la tuya. Pulsa «Comprobar y guardar».

Conecta el celular por USB, activa **Opciones de desarrollador → Depuración USB**, autoriza la computadora, selecciónalo en Android Studio y pulsa **▶ Run**.

## Al cambiar la interfaz

```powershell
npm.cmd run android:sync
```

Después vuelve a ejecutar con **▶ Run**. `android:sync` compila React y copia los archivos y los plugins al proyecto Android. No modifica ni borra tu base de datos.

## Compilar automáticamente desde GitHub

El workflow **Compilar APK Android** compila un APK de prueba al subir cambios a `main`. También puedes iniciarlo manualmente:

1. Abre el repositorio en GitHub y entra en **Actions**.
2. Selecciona **Compilar APK Android**.
3. Pulsa **Run workflow**, deja la rama `main` y confirma **Run workflow**.
4. Abre la ejecución más reciente y espera que termine con una marca verde.
5. En la sección **Artifacts**, descarga **AlertaVecinal-Android-…**. Debes iniciar sesión en GitHub para descargar artefactos.
6. Descomprime el ZIP y encontrarás **AlertaVecinal-debug.apk** y su suma SHA-256.

No necesitas Node.js ni Android Studio en tu computadora para generar este APK: GitHub prepara Node 24, JDK 21 y el SDK 35, ejecuta las pruebas y compila la app. Los artefactos se conservan **14 días**; puedes generar otro APK ejecutando nuevamente el workflow. Si no aparece el botón, verifica que Actions esté habilitado y que tengas permisos de escritura en el repositorio.

La compilación automática no incluye el servidor ni ejecuta un emulador. Para usar los reportes debes encender el backend en tu computadora o conectar un servidor HTTPS. En Android Studio también puedes arrastrar el APK descargado al emulador para instalarlo.

Cada ejecución utiliza una firma de prueba nueva. Si Android rechaza instalarla como actualización, desinstala la app anterior y luego instala el nuevo APK. Los reportes del servidor se conservan, aunque tendrás que iniciar sesión y configurar otra vez la dirección del servidor en el dispositivo.

## Generar un APK de prueba

Tras ejecutar `android:sync`, desde PowerShell:

```powershell
cd android
.\gradlew.bat assembleDebug
```

El archivo se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. También puedes usar el menú de compilación de Android Studio.

## Conexión y publicación

- HTTP local está permitido **solo en la variante debug**. La variante release requiere un servidor HTTPS.
- La app usa HTTP nativo de Capacitor y el almacén de cookies Android para la sesión. No necesita desactivar CORS o la comprobación TLS.
- Camera usa la actividad de cámara/selector de fotos, sin guardar copias en la galería. GPS solicita permisos de ubicación en Android. No requiere ubicación en segundo plano.
- CSV se comparte mediante el diálogo nativo de Android.
- Para usarla sin la computadora encendida, debes desplegar el backend Node.js/SQLite en un servidor HTTPS con almacenamiento persistente y configurar su URL en la app. No existe un servidor público publicado por este proyecto.
- Compartir la dirección del servidor cambia qué comunidad y cuentas ves. Los datos permanecen en cada servidor.

## Si algo no carga

**No conecta:** comprueba que `npm run dev` siga abierto y que el servidor responda en `http://localhost:3001/api/health` desde el navegador de tu computadora. En el emulador usa `10.0.2.2`, en el celular la IP de tu computadora.

**No hay mapa:** requiere Internet para descargar OpenStreetMap. Puedes introducir coordenadas manualmente.

**GPS no encuentra ubicación:** activa la ubicación, concede el permiso y establece una ubicación simulada si usas el emulador.

**Gradle no sincroniza:** comprueba JDK 21, SDK 35, acceso a los repositorios de Google/Maven y que hayas ejecutado `npm ci` antes de abrir Android Studio. Los módulos Capacitor se leen desde `node_modules`.

## Validación realizada

Se compiló `assembleDebug` con JDK 21 y SDK 35 y se verificó la firma del APK. También pasaron 10 pruebas de lógica/API y 2 pruebas de navegador. La cámara y el GPS nativos están integrados; su uso en un emulador o celular debe comprobarse al ejecutar **Run**, ya que este entorno no ejecutó Android en un dispositivo.
