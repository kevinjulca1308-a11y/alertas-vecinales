# Administración y diseño de AlertaVecinal

La aplicación tiene una vista vecinal y un panel de administración, con temas claro, oscuro y automático. La preferencia se guarda en cada dispositivo. El tema automático sigue al sistema.

## Activar una cuenta administradora

1. Crea tu cuenta desde la aplicación.
2. En la raíz del proyecto, con el mismo `.env` que utiliza la API, ejecuta:

```powershell
npm.cmd run admin:grant -- tu-correo@ejemplo.com
```

3. Vuelve a iniciar sesión. La app abrirá el panel de administración. También puedes cambiar entre **Administración** y **Vista de vecino** en el menú.

No hay contraseña ni cuenta administradora predeterminada. Los roles no se pueden elegir desde el registro ni cambiar enviando campos extra a la API. El comando se ejecuta únicamente por quien administra el servidor; funciona con SQLite y Firestore.

## Permisos

| Acción | Vecino | Administrador |
| --- | --- | --- |
| Publicar, comentar, apoyar y guardar | Sí | Sí |
| Cambiar estado o eliminar un reporte | Solo los propios | Todos |
| Retirar comentarios | No | Sí |
| Ver usuarios y correos | No | Sí |
| Suspender o reactivar vecinos | No | Sí |

La suspensión bloquea la autenticación con sesiones existentes y nuevos inicios de sesión mientras permanezca activa. Se conservan los reportes. Las cuentas administradoras no pueden ser suspendidas desde la interfaz. Los cambios de estado administrativos quedan identificados en el seguimiento.

El rol administrativo no representa una verificación municipal. Es la administración de esta comunidad.

## Simplificación

Se reemplazó la interfaz anterior por una navegación breve: Inicio, Mapa, Mis reportes y Guardados. Se quitaron controles de presentación duplicados, paneles promocionales repetidos y estadísticas públicas separadas; las métricas de gestión viven en Administración.

Los reportes de ejemplo quedan ocultos al abrir la app y pueden verse desde **Explorar ejemplos** o **Cuenta → Reportes de ejemplo**. No se borraron cuentas ni reportes existentes. Las cifras de administración excluyen los ejemplos.

SQLite conserva la tabla `users` y agrega `user_access` automáticamente al abrir la base existente. Firestore utiliza campos opcionales `role` y `status` en los usuarios; las cuentas anteriores se consideran vecinos activos.

## Verificación

```powershell
npm.cmd test
npm.cmd run test:e2e
npx firebase-tools emulators:exec --only firestore --project demo-alertavecinal "npm.cmd run test:firebase"
npm.cmd run android:sync
```

Las pruebas de navegador usan una base en memoria y cuentas exclusivas de pruebas. No alteran tu base local ni datos reales de Firebase.
