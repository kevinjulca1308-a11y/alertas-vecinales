import React, { useState } from "react";
import {
  Server,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getServerUrl, setServerUrl, normalizeServerUrl } from "./native";
import { CapacitorHttp } from "@capacitor/core";
export default function ServerSettings({ onSaved }) {
  const [url, setUrl] = useState(getServerUrl),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ok, setOk] = useState(false);
  const connect = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk(false);
    try {
      const target = normalizeServerUrl(url);
      const response = await CapacitorHttp.get({
        url: `${target}/api/health`,
        responseType: "json",
        connectTimeout: 8000,
        readTimeout: 8000,
      });
      const body =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;
      if (response.status !== 200 || !body.ok || body.database !== "SQLite")
        throw Error("Ese servidor no responde como AlertaVecinal.");
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
      <h2>Conecta tu comunidad.</h2>
      <p>
        La app Android necesita el servidor de AlertaVecinal para guardar las
        cuentas y reportes.
      </p>
      <form onSubmit={connect}>
        <label className="field">
          Dirección del servidor
          <input
            autoCapitalize="none"
            autoCorrect="off"
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setOk(false);
            }}
            placeholder="http://10.0.2.2:3001"
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
      <div className="info-callout">
        <p>
          En el emulador de Android Studio usa{" "}
          <strong>http://10.0.2.2:3001</strong> y deja abierto{" "}
          <strong>npm run dev</strong> en tu computadora. En un celular real,
          usa la IP de tu computadora en la misma red Wi-Fi. La versión de
          publicación necesita un servidor HTTPS.
        </p>
      </div>
    </div>
  );
}
