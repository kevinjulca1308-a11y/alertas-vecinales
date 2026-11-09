import React, { useState } from "react";
import {
  Server,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getServerUrl, setServerUrl, normalizeServerUrl } from "./native";
import { checkServerConnection } from './api';
import { community } from "./community";
export default function ServerSettings({ onSaved }) {
  const [url, setUrl] = useState(getServerUrl),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ok, setOk] = useState(false);
  const connect = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setOk(false);
    try {
      const target = normalizeServerUrl(url);
      await checkServerConnection(target);
      setServerUrl(target);
      setOk(true);
      onSaved();
    } catch (e) {
      setError(
        e.message ||
          "No se pudo conectar. Revisa la dirección, la red y que el servidor esté encendido.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="info-dialog">
      <span className="auth-brand">
        <Server size={26} />
      </span>
      <h2>Conecta con {community.name}.</h2>
      <p>
        Con una dirección HTTPS de tu comunidad podrás entrar usando datos
        móviles o Wi-Fi, desde cualquier lugar.
      </p>
      <form onSubmit={connect}>
        <label className="field">
          Dirección del servidor
          <input
            autoCapitalize="none"
            autoCorrect="off"
            type="url"
            required
            disabled={busy}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setOk(false);
            }}
            placeholder="https://servidor-de-tu-comunidad.example"
          />
        </label>
        {error && (
          <div className="error-message" role="alert">
            <AlertTriangle size={17} />
            {error}
          </div>
        )}
        {ok && (
          <p>
            <CheckCircle2 size={16} /> Conexión comprobada.
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}{" "}
          {busy ? "Comprobando..." : "Comprobar y guardar"}
        </button>
      </form>
      {busy && <p role="status">La primera conexión puede tardar hasta 90 segundos. Mantén esta pantalla abierta.</p>}
      <details className="info-callout">
        <summary>Pruebas con un servidor en tu computadora</summary>
        <p>
          En el emulador de Android Studio usa{" "}
          <strong>http://10.0.2.2:3001</strong> y deja abierto{" "}
          <strong>npm run dev</strong> en tu computadora. En un celular real,
          usa la IP de tu computadora en la misma red Wi-Fi. La versión de
          publicación necesita un servidor HTTPS.
        </p>
      </details>
    </div>
  );
}
