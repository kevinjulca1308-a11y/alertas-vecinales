import React, { useState } from "react";
import {
  MapPin,
  ArrowRight,
  LoaderCircle,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { api } from "./api";
export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState("login"),
    [form, setForm] = useState({ name: "", email: "", password: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { user } = await api(`/auth/${mode}`, {
        method: "POST",
        body: form,
      });
      onSuccess(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-panel">
      <span className="auth-brand">
        <MapPin size={28} />
      </span>
      <span className="eyebrow">UNA COMUNIDAD QUE SE CUIDA</span>
      <h2>
        {mode === "login"
          ? "Qué bueno verte de nuevo."
          : "Tu barrio empieza contigo."}
      </h2>
      <p>
        {mode === "login"
          ? "Entra para reportar, participar y seguir los cambios."
          : "Crea tu cuenta y sé parte de una comunidad mejor."}
      </p>
      <div className="auth-tabs">
        {[
          ["login", "Iniciar sesión"],
          ["register", "Crear cuenta"],
        ].map(([value, label]) => (
          <button
            key={value}
            disabled={busy}
            className={mode === value ? "active" : ""}
            onClick={() => {
              setMode(value);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label className="field">
            Tu nombre
            <div className="input-icon">
              <UserRound size={17} />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                placeholder="¿Cómo te llamas?"
              />
            </div>
          </label>
        )}
        <label className="field">
          Correo electrónico
          <div className="input-icon">
            <Mail size={17} />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              placeholder="vecino@ejemplo.com"
            />
          </div>
        </label>
        <label className="field">
          Contraseña
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              type={visible ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "register" ? "Al menos 8 caracteres" : "Tu contraseña"
              }
            />
            <button
              type="button"
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        {error && (
          <div className="error-message" role="alert">
            <AlertTriangle size={17} />
            {error}
          </div>
        )}
        <button className="button primary auth-submit" disabled={busy}>
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <ArrowRight size={17} />
          )}{" "}
          {busy
            ? "Un momento..."
            : mode === "login"
              ? "Entrar a mi comunidad"
              : "Crear mi cuenta"}
        </button>
      </form>
      <p className="auth-note">
        Tu correo no será visible en los reportes. Esta versión no tiene
        recuperación de contraseña.
      </p>
    </div>
  );
}
