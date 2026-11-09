import { test, expect } from "@playwright/test";
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6hsAAAAASUVORK5CYII=",
  "base64",
);
test("account, photo/GPS report, collaboration, persistence and ownership", async ({
  page,
  context,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -12.12, longitude: -77.03 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Nuevo reporte", exact: true })
    .first().click();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByPlaceholder("¿Cómo te llamas?").fill("Ana Vecina");
  await page.getByPlaceholder("vecino@ejemplo.com").fill("ana@prueba.test");
  await page
    .getByPlaceholder("Al menos 8 caracteres")
    .fill("PruebaVecinal123!");
  await page
    .getByRole("button", { name: "Crear mi cuenta", exact: true })
    .click();
  await page
    .getByPlaceholder("Ej. Luminaria apagada frente al parque")
    .fill("Luminaria apagada en el parque de prueba");
  await page
    .getByPlaceholder(
      "¿Qué sucede? ¿Desde cuándo? Incluye detalles que puedan ayudar.",
    )
    .fill("La luminaria no funciona desde ayer. Hace falta revisarla.");
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: photo });
  await expect(page.locator(".photo-thumbnails img")).toHaveCount(1);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByPlaceholder("Calle, número, distrito o referencia cercana")
    .fill("Calle Primavera 125, Miraflores");
  await page.getByRole("button", { name: "Usar mi ubicación GPS" }).click();
  await expect(
    page.getByText("Punto seleccionado · -12.12000, -77.03000"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Publicar reporte", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Luminaria apagada en el parque de prueba",
      exact: true,
    })
    .click();
  await page.locator(".status-form select").selectOption("En proceso");
  await page
    .getByPlaceholder("Explica qué cambió en el lugar...")
    .fill("Se inició el mantenimiento de la luminaria.");
  await page
    .getByRole("button", { name: "Actualizar estado", exact: true })
    .click();
  await expect(
    page.getByText("Se inició el mantenimiento de la luminaria."),
  ).toBeVisible();
  await page.locator(".detail-tabs").getByRole("button", { name: /Comentarios/ }).click();
  await page
    .getByPlaceholder("¿Tienes más información sobre este problema?")
    .fill("Gracias por reportar este problema.");
  await page.getByRole("button", { name: "Enviar comentario" }).click();
  await expect(
    page.getByText("Gracias por reportar este problema."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apoyar 0", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apoyado 1", exact: true }),
  ).toBeVisible();
  const reportUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Guardado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apoyado 1", exact: true }),
  ).toBeVisible();
  const other = await browser.newContext();
  const viewer = await other.newPage();
  await viewer.goto(reportUrl);
  await expect(
    viewer.getByRole("heading", {
      name: "Luminaria apagada en el parque de prueba",
      exact: true,
    }),
  ).toBeVisible();
  await expect(viewer.locator(".status-form")).toHaveCount(0);
  await expect(
    viewer.getByRole("button", { name: "Eliminar reporte" }),
  ).toHaveCount(0);
  await other.close();
  await page.getByRole("button", { name: "Eliminar reporte" }).click();
  await page.getByRole("button", { name: "Conservar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sí, eliminar reporte" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Eliminar reporte" }).click();
  await page
    .getByRole("button", { name: "Sí, eliminar reporte", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Mis reportes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Aquí empieza el cambio",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('filters, themes, export, map and mobile navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.report-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar ejemplos' }).click();
  await expect(page.locator('.report-card')).toHaveCount(6);
  await page.getByRole('textbox', { name: 'Buscar reportes' }).fill('SECTOR DE EJEMPLO 1');
  await expect(page.locator('.report-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await page.getByLabel('Filtrar por estado').selectOption('Resuelto');
  await expect(page.locator('.report-card')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar reportes filtrados' }).click();
  expect((await download).suggestedFilename()).toBe('alertavecinal-reportes.csv');
  await page.getByLabel('Tema de la aplicación').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Tema de la aplicación').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByLabel('Tema de la aplicación').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Explorar ejemplos' }).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.locator('.map-result')).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-bottom-nav').getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.locator('.report-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await expect(page.locator('.mobile-menu[aria-controls]')).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Cerrar navegación', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('.mobile-menu[aria-controls]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.mobile-menu[aria-controls]')).toBeFocused();
  await page.locator('.mobile-menu[aria-controls]').click();
  await page.locator('.menu-overlay').click({ position: { x: 370, y: 100 } });
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 500 });
  await page.locator('.mobile-menu[aria-controls]').click();
  await page.locator('.profile-button').scrollIntoViewIfNeeded();
  await expect(page.locator('.profile-button')).toBeInViewport();
  await page.locator('.sidebar').getByRole('button', { name: 'Mis reportes', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Mis reportes', exact: true })).toBeVisible();
});

test('administrator dashboard, report moderation and user suspension', async ({ page, browser }, testInfo) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const community = await browser.newContext({ baseURL: 'http://localhost:5175' });
  const registration = await community.request.post('/api/auth/register', { data: { name: 'Lucía de la comunidad', email: 'lucia@browser.test', password: 'PruebaVecinal123!' } });
  const { user: neighbor } = await registration.json();
  let reportId;
  for (const [title, category, priority] of [
    ['Luminaria apagada frente al parque', 'Alumbrado', 'Alta'],
    ['Residuos pendientes de recolección', 'Limpieza', 'Media'],
    ['Vereda dañada en la calle Primavera', 'Vías públicas', 'Alta'],
  ]) {
    const response = await community.request.post('/api/reports', { data: { title, category, priority, description: 'Los vecinos solicitan revisar este problema de la comunidad.', address: 'Calle Primavera, Miraflores', lat: -12.12, lng: -77.03, photos: [] } });
    expect(response.status()).toBe(201);
    const result = await response.json();
    reportId ||= result.report.id;
  }
  await community.request.post('/api/reports/' + reportId + '/comments', { data: { body: 'Comentario que necesita moderación.' } });
  await page.goto('/');
  await expect(page.locator('.report-card')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('vecinos-claro.png'), fullPage: true });
  await page.getByLabel('Tema de la aplicación').selectOption('dark');
  await page.screenshot({ path: testInfo.outputPath('vecinos-oscuro.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('movil-oscuro.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByPlaceholder('vecino@ejemplo.com').fill('admin@browser.test');
  await page.getByPlaceholder('Tu contraseña').fill('PruebaAdmin123!');
  await page.getByRole('button', { name: 'Entrar a mi comunidad' }).click();
  await expect(page.getByRole('heading', { name: 'Una comunidad mejor atendida' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reportes por categoría' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('administracion-oscuro.png'), fullPage: true });
  await page.getByLabel('Tema de la aplicación').selectOption('light');
  await page.screenshot({ path: testInfo.outputPath('administracion-claro.png'), fullPage: true });
  await page.locator('.sidebar').getByRole('button', { name: 'Usuarios', exact: true }).click();
  await page.getByLabel('Buscar usuarios').fill('lucia@browser.test');
  await page.getByRole('button', { name: 'Suspender', exact: true }).click();
  await page.getByRole('button', { name: 'Suspender cuenta', exact: true }).click();
  await expect(page.locator('.user-status')).toHaveText('Suspendido');
  expect((await community.request.get('/api/me')).status()).toBe(200);
  expect((await (await community.request.get('/api/me')).json()).user).toBeNull();
  await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Reactivar cuenta', exact: true }).click();
  await expect(page.locator('.user-status')).toHaveText('Activo');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('usuarios-movil.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.sidebar').getByRole('button', { name: /^Reportes/ }).click();
  await page.getByRole('listitem').filter({ hasText: 'Luminaria apagada frente al parque' }).click();
  await page.locator('.status-form select').selectOption('En proceso');
  await page.getByPlaceholder('Explica qué cambió en el lugar...').fill('Se asignó la revisión del alumbrado.');
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
  await expect(page.getByText('Administración: Se asignó la revisión del alumbrado.')).toBeVisible();
  await page.locator('.detail-tabs').getByRole('button', { name: /Comentarios/ }).click();
  await page.getByRole('button', { name: 'Retirar comentario' }).click();
  await expect(page.getByText('Comentario que necesita moderación.')).toHaveCount(0);
  expect(errors).toEqual([]);
  await community.close();
});
