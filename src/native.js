import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
export const isNative = () => Capacitor.isNativePlatform();
export const DEFAULT_ANDROID_SERVER = normalizeServerUrl(
  import.meta.env?.VITE_API_SERVER_URL || "https://alertavecinal-guadalupe.onrender.com",
);
export function normalizeServerUrl(value) {
  const url = new URL(value.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Usa una dirección HTTP o HTTPS, sin contraseñas, parámetros ni fragmentos.",
    );
  return url
    .toString()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}
const isLocalServer = (value) => {
  const host = new URL(value).hostname;
  return host === 'localhost' || host === '[::1]' || host === '0.0.0.0' || host.endsWith('.local') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
};
export function selectServerUrl(saved, shipped, previousShipped) {
  const fallback = normalizeServerUrl(shipped);
  const selected = saved ? normalizeServerUrl(saved) : fallback;
  // Migrate an old LAN/emulator setting once when upgrading to a public-server build.
  // Explicit choices made after that upgrade, and other public communities, retain priority.
  if (previousShipped !== fallback && isLocalServer(selected) &&
      fallback.startsWith('https://') && !isLocalServer(fallback)) return fallback;
  return selected;
}
export function getServerUrl() {
  try {
    const saved = localStorage.getItem('av-android-server');
    const selected = selectServerUrl(saved, DEFAULT_ANDROID_SERVER, localStorage.getItem('av-server-default'));
    localStorage.setItem('av-server-default', DEFAULT_ANDROID_SERVER);
    if (saved && selected !== normalizeServerUrl(saved)) localStorage.setItem('av-android-server', selected);
    return selected;
  } catch {
    return DEFAULT_ANDROID_SERVER;
  }
}
export function setServerUrl(value) {
  const result = normalizeServerUrl(value);
  localStorage.setItem("av-android-server", result);
  localStorage.setItem('av-server-default', DEFAULT_ANDROID_SERVER);
  return result;
}
export function getReportUrl(id) {
  const root = isNative()
    ? getServerUrl()
    : `${location.origin}${location.pathname}`;
  return `${root.replace(/\/$/, "")}/#reporte/${id}`;
}
export function nativeRequest(path, options = {}, serverUrl = getServerUrl()) {
  const timeout = Math.max(1, Math.floor((options.timeoutMs || 90000) / 2));
  return CapacitorHttp.request({
    url: `${serverUrl}/api${path}`,
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...options.headers },
    data: options.body,
    responseType: "json",
    connectTimeout: timeout,
    readTimeout: timeout,
  });
}
export async function nativePhoto(source = "camera") {
  try {
    const result = await Camera.getPhoto({
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Base64,
      quality: 80,
      width: 1100,
      height: 1100,
      correctOrientation: true,
      saveToGallery: false,
    });
    const bytes = Uint8Array.from(atob(result.base64String), (c) =>
      c.charCodeAt(0),
    );
    return new File([bytes], `foto.${result.format}`, {
      type: `image/${result.format === "jpg" ? "jpeg" : result.format}`,
    });
  } catch (e) {
    if (/cancel|canceled|cancelled/i.test(e.message)) return null;
    throw new Error(
      "No se pudo abrir la cámara o galería. Revisa los permisos de la app e inténtalo nuevamente.",
    );
  }
}
export async function nativeLocation() {
  try {
    let permissions = await Geolocation.checkPermissions();
    if (
      permissions.location !== "granted" &&
      permissions.coarseLocation !== "granted"
    )
      permissions = await Geolocation.requestPermissions();
    if (
      permissions.location !== "granted" &&
      permissions.coarseLocation !== "granted"
    )
      throw Error("Permission denied");
    const p = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
    return [p.coords.latitude, p.coords.longitude];
  } catch {
    throw new Error(
      "Activa la ubicación y permite su acceso en Android. También puedes indicar el lugar manualmente.",
    );
  }
}
export async function shareCsv(text) {
  const file = await Filesystem.writeFile({
    path: `alertavecinal-${Date.now()}.csv`,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({
    title: "Reportes de AlertaVecinal",
    files: [file.uri],
    dialogTitle: "Guardar o compartir reportes",
  });
}
