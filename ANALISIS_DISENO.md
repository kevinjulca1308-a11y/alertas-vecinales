# Revisión general y de diseño · AlertaVecinal

Fecha: 2 de noviembre de 2026.

## Resultado de esta iteración

Se integró el logo proporcionado en la navegación de escritorio y móvil, la carga inicial, las pantallas de acceso, el favicon y los recursos nativos de icono e inicio de Android. Se conservó la imagen original y su fondo claro; se generaron tamaños adecuados para cada recurso.

El login y el registro ahora tienen una interfaz independiente, con enlaces directos `/#/login` y `/#/registro`. En escritorio, una composición de dos columnas combina el relato de comunidad con el formulario. En móvil se prioriza el formulario. Se mantienen los endpoints, las sesiones y los permisos existentes, y se conserva la intención de crear un reporte después de autenticarse.

La identidad utiliza azul, turquesa y verde del logo. Se mejoraron el tamaño de los textos de las tarjetas, la jerarquía del inicio, los botones, los bordes y la navegación activa. Hay adaptación a los temas claro y oscuro.

Los fondos degradados están activos inicialmente. En **Cuenta → Preferencias → Fondo de la aplicación**, se puede elegir **Degradado** o **Liso**. La elección se conserva en ese navegador o instalación; es independiente del tema claro/oscuro. El fondo liso también simplifica el bloque de bienvenida. Los botones y la composición de marca del acceso mantienen sus colores de identidad.

## Evaluación del diseño

La base era ordenada, pero el logo tenía poco protagonismo y varios textos de reportes eran pequeños. La autenticación en un diálogo compartía el mismo tratamiento que tareas secundarias, aunque representa un momento central para participar. Las nuevas pantallas hacen más clara esa transición.

Mi propuesta es mantener los degradados suaves en el fondo y las tarjetas sólidas: las fotografías, los estados y la lectura deben seguir siendo el centro de atención. En el acceso, el panel azul y verde puede ser más expresivo porque cumple una función de bienvenida. Conviene probar ambas opciones de fondo con personas reales antes de fijar la versión final.

El logo tiene muchos detalles. Funciona mejor con un tamaño generoso y un soporte claro, especialmente en modo oscuro. Para una siguiente versión de marca propondría una variante simplificada para tamaños de 16–32 píxeles y un archivo vectorial original. No se redibujó ni se alteró el símbolo recibido.

## Evaluación funcional y técnica

Hay una base útil para un piloto: reportes con fotografías y ubicación, filtros, apoyos, comentarios, guardados, historial, administración y recursos Android. El servidor aplica permisos, deriva las contraseñas con scrypt y usa sesiones con cookies HttpOnly. Las pruebas existentes comprueban propiedad, moderación y suspensión. Esta revisión no equivale a una auditoría de seguridad de producción.

La principal oportunidad técnica está en el listado: `/api/reports` presenta todos los reportes con sus detalles y el cliente vuelve a consultar cada 30 segundos. Los filtros y el límite de nueve tarjetas actúan en el navegador, por lo que no reducen lo descargado. Con más actividad esto aumentará la transferencia, el trabajo del servidor y las lecturas de Firestore.

El estado de un reporte representa observaciones y gestión dentro de esta comunidad. La interfaz no debe sugerir atención municipal confirmada sin una integración o verificación real.

## Mejoras propuestas, por prioridad

| Prioridad | Mejora | Beneficio y alcance propuesto |
| --- | --- | --- |
| Alta | Recuperación de contraseña y verificación de correo | Incorporar correos reales, enlaces de un solo uso y vencimiento. Hoy no existe ese flujo; no se agregó un enlace sin funcionamiento. |
| Alta | Paginación y consultas por filtros en la API | Descargar solo lo necesario. Separar el resumen de tarjetas de comentarios e historial, que se cargarían al abrir el reporte. |
| Alta | Avisos sobre reportes seguidos | Permitir activar avisos de cambios de estado y comentarios, con preferencias y opción de desactivarlos. Definir primero si serán dentro de la app, por correo o notificaciones push. |
| Media | Reportes cercanos y posibles duplicados | Antes de publicar, mostrar casos de categoría y ubicación similares para apoyar uno existente y concentrar el seguimiento. |
| Media | Ubicación pública y cuidado de las fotografías | Aclarar qué datos se publican, permitir revisar la ubicación y facilitar el ocultamiento de rostros, placas y otros datos antes de enviar una foto. |
| Media | Seguimiento más claro | Mostrar responsable cuando esté realmente asignado, última actualización y evidencia de solución; distinguir una observación vecinal de una confirmación administrativa. |
| Media | Borradores de reportes | Conservar el avance del formulario si se pierde la conexión o se cierra accidentalmente, con control sobre el almacenamiento de fotos. |
| Media | Accesibilidad y pruebas con vecinos | Revisar contraste, zoom al 200 %, lectores de pantalla y áreas táctiles, especialmente en acciones pequeñas de las tarjetas y pantallas administrativas. Probar tareas completas con vecinos de distintas edades. |
| Posterior | Organización del frontend | Separar navegación, preferencias, vistas administrativas y carga de datos de `main.jsx` para facilitar las siguientes iteraciones. |

Recomiendo empezar por recuperación de cuenta, paginación y avisos de seguimiento. Después conviene medir si las personas encuentran un reporte, lo publican y entienden su estado sin ayuda.

## Validación y límites

- Compilación de producción con Vite.
- Pruebas del servidor, filtros y configuración Android: 11 aprobadas; una integración Firebase se omite porque requiere el emulador.
- Pruebas de navegador en Chrome con bases aisladas: registro, login, errores de credenciales, historial de navegación, persistencia de preferencias, foto/GPS, participación, moderación y móvil.
- Revisión visual mediante capturas de acceso, comunidad y administración en claro/oscuro.
- Sincronización de recursos web hacia Capacitor Android. No se generó ni se instaló un APK nuevo y no se probó en un dispositivo Android real.
- Las cuentas usadas por las pruebas de navegador viven en una base en memoria; no se escribieron cuentas de prueba en la base del usuario.

Las propuestas de la tabla quedan pendientes; esta entrega implementa el cambio visual, el acceso independiente y la elección de fondo.
