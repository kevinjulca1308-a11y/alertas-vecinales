import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
export const isNative = () => Capacitor.isNativePlatform();
export const DEFAULT_ANDROID_SERVER = "http://10.0.2.2:3001";
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
export function getServerUrl() {
  try {
    return normalizeServerUrl(
      localStorage.getItem("av-android-server") || DEFAULT_ANDROID_SERVER,
    );
  } catch {
    return DEFAULT_ANDROID_SERVER;
  }
}
export function setServerUrl(value) {
  const result = normalizeServerUrl(value);
  localStorage.setItem("av-android-server", result);
  return result;
}
export function getReportUrl(id) {
  const root = isNative()
    ? getServerUrl()
    : `${location.origin}${location.pathname}`;
  return `${root.replace(/\/$/, "")}/#reporte/${id}`;
}
export function nativeRequest(path, options = {}) {
  return CapacitorHttp.request({
    url: `${getServerUrl()}/api${path}`,
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...options.headers },
    data: options.body,
    responseType: "json",
    connectTimeout: 15000,
    readTimeout: 20000,
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
