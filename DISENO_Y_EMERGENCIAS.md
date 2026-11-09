# Diseño nocturno y ayuda rápida

Actualización: 9 de noviembre de 2026.

## Iconos y creador (1.1.1)

Cada servicio tiene un pictograma vectorial propio: placa policial, casco de bomberos, ambulancia, patrulla de Serenazgo, comisaría y apoyo ante violencia. Son símbolos referenciales, no sellos oficiales, y se incluyen dentro del APK. Los accesos rápidos del inicio también muestran sus iconos.

La tarjeta **Creador de la app** presenta `@kxvn04_` y abre `https://www.tiktok.com/@kxvn04_` en una pestaña externa. Tiene acentos cian y rosa, una firma visual de TikTok y un diseño adaptable al tema claro u oscuro. El inicio de sesión y el registro incluyen el mismo contacto de forma compacta. El enlace no envía mensajes ni sigue la cuenta automáticamente.

## Apariencia

- Nueva base azul noche, superficies con profundidad, tarjetas de reportes más legibles, ilustración del barrio y navegación flotante en teléfonos.
- El modo oscuro es el valor inicial. Se conserva el tema que ya hubiera elegido cada persona.
- **Personalizar**, en el menú lateral o en el icono de paleta de la cabecera, está disponible sin iniciar sesión. También aparece en **Cuenta**.
- Paletas Océano, Aurora y Bosque; tema Noche, Día o Automático; fondo degradado o liso; lectura normal o grande; movimiento automático o reducido.
- Las preferencias se guardan en el dispositivo, también se aplican al registro y al inicio de sesión y se pueden restablecer.

## Llamadas

El botón **Emergencias / SOS** abre el directorio desde cualquier pantalla de la comunidad. También hay un acceso en el inicio, en el menú lateral y en la pantalla de acceso. No necesita una cuenta ni una respuesta de la API. En Android, el directorio está incluido en el APK.

Los enlaces `tel:` abren el marcador del dispositivo; la persona decide cuándo llamar. No requieren permisos de llamada directa. En un computador se necesita una aplicación que maneje enlaces telefónicos. Publicar un reporte no avisa automáticamente a una autoridad.

| Servicio | Número | Fuente |
| --- | --- | --- |
| Policía Nacional | 105 | [Estado peruano](https://www.gob.pe/547-telefonos-de-emergencia) |
| Bomberos | 116 | [Estado peruano](https://www.gob.pe/547-telefonos-de-emergencia) |
| SAMU, disponible en La Libertad | 106 | [Estado peruano](https://www.gob.pe/547-telefonos-de-emergencia) |
| Serenazgo de Guadalupe | 941 337 924 | [Municipalidad de Guadalupe](https://www.gob.pe/institucion/muniguadalupe/contacto-y-numeros-de-emergencias) |
| Comisaría de Guadalupe | 044 566 806 | [Municipalidad de Guadalupe](https://www.gob.pe/institucion/muniguadalupe/contacto-y-numeros-de-emergencias) |
| Línea 100 | 100 | [Estado peruano](https://www.gob.pe/547-telefonos-de-emergencia) |

Directorio consultado el 9 de noviembre de 2026. Los contactos y sus fuentes se mantienen en `src/emergency-contacts.js`. No se usó el antiguo teléfono de Serenazgo del plan municipal de 2024: se priorizó el directorio institucional actual.

## Entrega y verificación

- `npm test`: 21 pruebas pasadas; las 2 pruebas de Firestore requieren el emulador y se omiten cuando no está disponible. No se cambió la API ni la base de datos para este rediseño.
- `npm run test:e2e`: 8 escenarios, que incluyen persistencia, navegación, emergencias sin API, restauración de preferencias, administración, iconos y contacto del creador en pantallas de 320 a 1440 píxeles.
- Las pruebas de llamadas verifican los enlaces, sin realizar llamadas reales.
- Android: versión 1.1.1 (código 3), fondo y barras de arranque oscuros. La entrega es un APK de depuración para probar el diseño.

## Siguientes mejoras propuestas

1. Adjuntar una fotografía de resolución y distinguir claramente avances vecinales de intervenciones municipales.
2. Añadir filtros de zona o sector de Guadalupe cuando exista una lista validada por la comunidad.
3. Diseñar notificaciones de seguimiento con consentimiento y preferencias por reporte, sin presentar una publicación como despacho de emergencias.
4. Incorporar recuperación y cambio de contraseña antes de una distribución amplia.
