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
    .click();
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
  await page.getByRole("button", { name: /Comentarios/ }).click();
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
    viewer.getByRole("button", { name: "Eliminar mi reporte" }),
  ).toHaveCount(0);
  await other.close();
  await page.getByRole("button", { name: "Eliminar mi reporte" }).click();
  await page.getByRole("button", { name: "Conservar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sí, eliminar reporte" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Eliminar mi reporte" }).click();
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
      name: "Tu primer reporte puede cambiar algo.",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("filters, export, map, mobile navigation and layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".report-card")).toHaveCount(6);
  await page.getByRole("textbox", { name: "Buscar reportes" }).fill("AREQUIPA");
  await expect(page.locator(".report-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Borrar búsqueda" }).click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filtrar por estado" })
    .selectOption("Resuelto");
  await expect(page.locator(".report-card")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar reportes filtrados" })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "alertavecinal-reportes.csv",
  );
  await page.getByRole("button", { name: "Estadísticas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reportes por categoría" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa", exact: true }).first().click();
  await expect(page.locator(".map-result")).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("button", { name: "Inicio", exact: true })
    .click();
  await expect(page.locator(".report-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Mis reportes", exact: true })
    .click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  await expect(
    page.getByRole("heading", { name: "Un espacio para tus reportes." }),
  ).toBeVisible();
});
