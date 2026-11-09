import { test, expect } from '@playwright/test';

test('appearance persists across reloads, routes and narrow screens', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.community-intro')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('inicio-noche-desktop.png'), fullPage: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Abrir llamadas de emergencia' })).toBeInViewport();
  }
  await page.getByRole('button', { name: 'Personalizar apariencia', exact: true }).click();
  await page.getByRole('button', { name: /Aurora/ }).click();
  await page.getByLabel('Tamaño de lectura').selectOption('large');
  await page.getByLabel('Movimiento de la interfaz').selectOption('reduced');
  await page.getByRole('button', { name: 'Liso', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.reload();
  for (const [key, value] of Object.entries({ accent: 'aurora', text: 'large', motion: 'reduced', background: 'plain' })) {
    await expect(page.locator('html')).toHaveAttribute(`data-${key}`, value);
  }
  await page.getByRole('button', { name: 'Personalizar apariencia', exact: true }).click();
  await expect(page.getByRole('button', { name: /Aurora/ })).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator('.appearance-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('personalizar-aurora-movil.png'), fullPage: true });
  await page.getByRole('button', { name: 'Restablecer diseño' }).click();
  for (const [key, value] of Object.entries({ theme: 'dark', accent: 'ocean', text: 'normal', motion: 'system', background: 'gradient' })) {
    await expect(page.locator('html')).toHaveAttribute(`data-${key}`, value);
  }
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('inicio-noche-movil.png'), fullPage: true });
  await page.getByRole('button', { name: 'Personalizar apariencia', exact: true }).click();
  await page.getByRole('button', { name: /Bosque/ }).click();
  await page.getByRole('button', { name: 'Día', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.goto('/#/login');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'forest');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: testInfo.outputPath('login-bosque-claro.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('emergency directory works without login or API; phone links never place test calls', async ({ page }, testInfo) => {
  await page.route('**/api/**', route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir llamadas de emergencia' }).click();
  const dialog = page.getByRole('dialog', { name: 'Llamadas de emergencia' });
  await expect(dialog).toBeVisible();
  for (const [name, number, dial] of [
    ['Policía Nacional', '105', '105'], ['Bomberos', '116', '116'], ['SAMU', '106', '106'],
    ['Serenazgo de Guadalupe', '941 337 924', '+51941337924'],
    ['Comisaría de Guadalupe', '044 566 806', '+5144566806'], ['Línea 100', '100', '100'],
  ]) {
    const contact = dialog.getByRole('link', { name: `Llamar a ${name} al ${number}` });
    await expect(contact).toHaveAttribute('href', `tel:${dial}`);
    await expect(contact.getByRole('img', { name: `Icono de ${name}`, exact: true })).toBeVisible();
  }
  await expect(dialog.getByText(/no envía una alerta automática/)).toBeVisible();
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('emergencias-movil.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abrir llamadas de emergencia' })).toBeFocused();
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Emergencias', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Llamadas de emergencia' })).toBeVisible();
});

test('creator contact is accessible on the community and access pages without opening TikTok', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const creator = page.getByRole('link', { name: 'Contactar al creador @kxvn04_ en TikTok', exact: true });
  await expect(creator).toHaveCount(1);
  await expect(creator).toHaveAttribute('href', 'https://www.tiktok.com/@kxvn04_');
  await expect(creator).toHaveAttribute('target', '_blank');
  await expect(creator).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByRole('region', { name: 'Ayuda inmediata' }).locator('.authority-icon')).toHaveCount(3);
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Tema de la aplicación').selectOption(theme);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(creator).toBeVisible();
      await page.locator('.creator-card').screenshot({ path: testInfo.outputPath(`creador-${theme}-${width}.png`) });
    }
  }
  for (const route of ['/#/login', '/#/registro']) {
    await page.goto(route);
    await expect(creator).toHaveCount(1);
    await expect(creator).toHaveAttribute('href', 'https://www.tiktok.com/@kxvn04_');
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(creator).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
