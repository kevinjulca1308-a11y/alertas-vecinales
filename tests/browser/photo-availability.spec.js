import { test, expect } from '@playwright/test';

const sampleImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6hsAAAAASUVORK5CYII=', 'base64');
async function openReport(page, context) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -7.243057, longitude: -79.470741 });
  expect((await context.request.post('/api/auth/login', { data: { email: 'admin@browser.test', password: 'PruebaAdmin123!' } })).ok()).toBe(true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo reporte', exact: true }).first().click();
}
async function fillAndReview(page, title) {
  await page.getByPlaceholder('Ej. Luminaria apagada frente al parque').fill(title);
  await page.getByPlaceholder('¿Qué sucede? ¿Desde cuándo? Incluye detalles que puedan ayudar.').fill('La luminaria no enciende desde ayer y requiere revisión.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByPlaceholder('Calle, número, distrito o referencia cercana').fill('Sector de prueba, Guadalupe');
  await page.getByRole('button', { name: 'Usar mi ubicación GPS' }).click();
  await expect(page.getByText('Punto seleccionado · -7.24306, -79.47074')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('unavailable storage is shown before attaching and a text report can still be published', async ({ page, context }, testInfo) => {
  await page.route('**/api/capabilities', route => route.fulfill({ json: { photoUploads: false } }));
  await openReport(page, context);
  await expect(page.getByText('Fotografías todavía no disponibles', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar cámara', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Subir fotografías', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('fotos-no-disponibles.png'), fullPage: true });
  await fillAndReview(page, 'Reporte con fotos deshabilitadas');
  await page.getByRole('button', { name: 'Publicar reporte', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reporte con fotos deshabilitadas', exact: true })).toBeVisible();
});

test('a stale upload capability preserves the draft and retries without photos only after an explicit choice', async ({ page, context }, testInfo) => {
  const submissions = [];
  await page.route('**/api/reports', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON();
    submissions.push(body);
    if (body.photos.length) return route.fulfill({ status: 503, json: { error: 'Las fotografías todavía no están habilitadas. Puedes publicar el reporte sin fotos.', code: 'PHOTO_UPLOADS_DISABLED' } });
    return route.continue();
  });
  await openReport(page, context);
  await expect(page.getByRole('button', { name: 'Subir fotografías', exact: true })).toBeEnabled();
  await page.getByLabel('Adjuntar fotografías').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: sampleImage });
  await expect(page.locator('.photo-thumbnails img')).toHaveCount(1);
  await fillAndReview(page, 'Reporte conservado tras fallar una fotografía');
  await page.getByRole('button', { name: 'Publicar reporte', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Puedes publicar el reporte sin fotos.');
  await expect(page.getByRole('heading', { name: 'Reporte conservado tras fallar una fotografía', exact: true })).toBeVisible();
  await expect(page.locator('.review-photos img')).toHaveCount(1);
  expect(submissions).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath('recuperar-reporte-sin-fotos.png'), fullPage: true });
  await page.getByRole('button', { name: 'Publicar sin fotografías', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[1].photos).toEqual([]);
  for (const key of ['title', 'description', 'address', 'lat', 'lng']) expect(submissions[1][key]).toEqual(submissions[0][key]);
  const reports = (await (await context.request.get('/api/reports')).json()).reports;
  expect(reports.filter(r => r.title === 'Reporte conservado tras fallar una fotografía')).toHaveLength(1);
});
