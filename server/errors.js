export const PHOTO_UPLOADS_DISABLED_MESSAGE = 'Las fotografías todavía no están habilitadas. Puedes publicar el reporte sin fotos.';
export function photoUploadsDisabled() {
  return Object.assign(new Error(PHOTO_UPLOADS_DISABLED_MESSAGE), { status: 503, code: 'PHOTO_UPLOADS_DISABLED' });
}
