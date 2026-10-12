# AlertaVecinal · Reportes ciudadanos

Aplicación web adaptable para reportar problemas de alumbrado, limpieza, vías públicas y áreas verdes. Incluye fotografías desde cámara o galería, GPS, selección de ubicación en OpenStreetMap, filtros, apoyos y seguimiento de estados.

## Desarrollo

Requiere Node.js 20.19+ o 22.12+.

```sh
npm ci
npm run dev -- --port 5173
```

```sh
npm test
npm run build
npm run preview -- --port 4173
```

## Uso y alcance

- Crea un reporte con título, descripción, categoría, dirección y punto en el mapa. La foto es opcional y se comprime antes de guardarse.
- El botón GPS solicita permiso. Cámara y GPS necesitan HTTPS o localhost y un navegador compatible; la galería y selección manual del mapa son alternativas.
- Los reportes propios aparecen en «Mis reportes». Abre uno para registrar cambios de estado y consultar su historial.
- Reportes y apoyos se guardan en localStorage, exclusivamente en ese navegador. No existe servidor, autenticación ni integración municipal. No se comparten entre usuarios o dispositivos. Borrar el almacenamiento elimina los datos.
- Los reportes iniciales son ejemplos claramente identificados. Sus fotografías son ilustrativas, no evidencia de problemas reales.
- Mapas requieren acceso a `*.tile.openstreetmap.org`. Fotografías de ejemplo usan `images.unsplash.com`; fuentes usan `fonts.googleapis.com` y `fonts.gstatic.com`. Hay imagen y fuentes de respaldo.
- Evita subir información personal. Los cambios de estado son registros del vecino, no confirmaciones de una autoridad.

Para uso público compartido se necesita una siguiente fase con backend, base de datos, almacenamiento de fotos, autenticación y roles para las autoridades.
