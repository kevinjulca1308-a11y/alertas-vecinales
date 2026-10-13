export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Usa npm run dev para iniciar la app completa.",
    );
  }
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "No se pudo completar la operación."),
      { status: response.status },
    );
  return result;
}
export async function compressPhoto(file) {
  if (!file.type.startsWith("image/"))
    throw new Error("Selecciona una imagen JPG, PNG o WebP.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Cada foto puede pesar hasta 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("No se puede abrir esta foto. Prueba con JPG o PNG."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1100 / img.width, 1100 / img.height);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.75);
    if (result.length > 1400000) result = canvas.toDataURL("image/jpeg", 0.45);
    if (result.length > 1400000)
      throw new Error(
        "La foto sigue siendo muy grande. Prueba con otra imagen.",
      );
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error("El GPS no está disponible. Elige un punto en el mapa."),
      );
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      () =>
        reject(
          new Error(
            "No pudimos acceder al GPS. Revisa los permisos o elige el punto manualmente.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}
export function downloadReports(reports) {
  const columns = [
    "Código",
    "Título",
    "Categoría",
    "Estado",
    "Prioridad",
    "Dirección",
    "Latitud",
    "Longitud",
    "Fecha",
    "Ejemplo",
  ];
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-]/, "'")
      .replaceAll('"', '""') +
    '"';
  const rows = reports.map((r) => [
    r.id,
    r.title,
    r.category,
    r.status,
    r.priority,
    r.address,
    r.lat,
    r.lng,
    r.date,
    r.demo ? "Sí" : "No",
  ]);
  const blob = new Blob(
    [
      "\uFEFF" +
        [columns, ...rows].map((row) => row.map(escape).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alertavecinal-reportes.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
