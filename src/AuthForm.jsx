import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, Eye, EyeOff, Mail, LockKeyhole, UserRound, AlertTriangle, MapPin, CheckCircle2, Users, ShieldCheck } from 'lucide-react';
import { api } from './api';
import { CreatorCredit } from './CreatorCard';

export default function AuthForm({ mode = 'login', onModeChange, onBack, onSuccess, appearance, connection }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [visible, setVisible] = useState(false);
  const heading = useRef(null);
  const register = mode === 'register';
  useEffect(() => {
    setError(''); setVisible(false);
    setForm((previous) => ({ ...previous, password: '' }));
    heading.current?.focus({ preventScroll: true });
    const previousTitle = document.title;
    document.title = `${register ? 'Crear cuenta' : 'Iniciar sesión'} · AlertaVecinal`;
    return () => { document.title = previousTitle; };
  }, [mode]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { user } = await api(`/auth/${mode}`, { method: 'POST', body: form });
      await onSuccess(user);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <div className="auth-page">
    <header className="auth-header">
      <button className="brand" onClick={onBack} disabled={busy} aria-label="AlertaVecinal, volver a la comunidad"><span className="brand-mark"><img src="/logo.png" alt="" width="52" height="52" /></span><span>Alerta<span>Vecinal</span><small>HOGAR CONECTADO</small></span></button>
      <div className="auth-header-actions">{appearance}<button className="auth-back" aria-label="Volver a la comunidad" onClick={onBack} disabled={busy}><ArrowLeft size={17} /><span>Volver a la comunidad</span></button></div>
    </header>
    <main className="auth-layout" id="main-content">
      <section className="auth-story" aria-label="Una comunidad que se cuida">
        <span className="auth-story-label"><span />VECINOS CONECTADOS, BARRIOS MEJORES</span>
        <h2>Más cerca.<br />Más seguros.<br /><span>Más comunidad.</span></h2>
        <p>Las pequeñas acciones hacen grandes barrios. Conecta con tus vecinos y sé parte del cambio.</p>
        <div className="auth-constellation" aria-hidden="true">
          <div className="community-orbit orbit-outer" /><div className="community-orbit orbit-inner" />
          <div className="auth-logo-tile"><img src="/logo.png" alt="" width="160" height="160" /></div>
          <span className="community-node node-report"><span><MapPin size={19} /></span><div><strong>Hazlo visible</strong><small>Reporta en tu barrio</small></div></span>
          <span className="community-node node-progress"><span><CheckCircle2 size={19} /></span><div><strong>Sigue el cambio</strong><small>Cada avance cuenta</small></div></span>
          <span className="community-node node-people"><Users size={18} />Juntos hacemos más</span>
        </div>
        <div className="auth-story-footer"><span><MapPin size={16} />Reporta</span><i /><span><Users size={16} />Participa</span><i /><span><CheckCircle2 size={16} />Da seguimiento</span></div>
      </section>
      <section className="auth-form-side" aria-labelledby="auth-title">
        <div className="auth-panel">
          <span className="auth-welcome-icon">{register ? <Users size={23} /> : <UserRound size={23} />}</span>
          <span className="eyebrow">{register ? 'HAZ COMUNIDAD' : 'TU COMUNIDAD TE ESPERA'}</span>
          <h1 id="auth-title" ref={heading} tabIndex={-1}>{register ? 'Tu barrio empieza contigo.' : 'Qué bueno verte de nuevo.'}</h1>
          <p>{register ? 'Crea tu cuenta y da el primer paso hacia un barrio mejor.' : 'Inicia sesión para seguir lo que importa y hacer que las cosas pasen.'}</p>
          <nav className="auth-tabs" aria-label="Acceso a tu cuenta">
            {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([value, label]) => <button type="button" key={value} disabled={busy} aria-current={mode === value ? 'page' : undefined} className={mode === value ? 'active' : ''} onClick={() => onModeChange(value)}>{label}</button>)}
          </nav>
          <form onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy}>
              <legend className="sr-only">{register ? 'Datos para crear tu cuenta' : 'Datos para iniciar sesión'}</legend>
              {register && <label className="field">Tu nombre<div className="input-icon"><UserRound size={18} /><input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={60} autoComplete="name" placeholder="¿Cómo te llamas?" /></div></label>}
              <label className="field">Correo electrónico<div className="input-icon"><Mail size={18} /><input name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={160} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="vecino@ejemplo.com" /></div></label>
              <label className="field">Contraseña<div className="input-icon"><LockKeyhole size={18} /><input name="password" type={visible ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? 'password-hint' : undefined} placeholder={register ? 'Al menos 8 caracteres' : 'Tu contraseña'} /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{register && <small id="password-hint">Usa al menos 8 caracteres. Combina letras, números y símbolos.</small>}</label>
              {error && <div className="error-message" role="alert"><AlertTriangle size={17} />{error}</div>}
              <button className="button primary auth-submit" disabled={busy}><span>{busy ? 'Un momento...' : register ? 'Crear mi cuenta' : 'Entrar a mi comunidad'}</span>{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}</button>
            </fieldset>
          </form>
          {busy && <p className="auth-wait" role="status">La primera conexión puede tardar hasta 90 segundos.</p>}
          <p className="auth-note"><ShieldCheck size={16} /><span>Tu correo solo es visible para ti y la administración.</span></p>
          {connection}
          <div className="auth-explore"><span>Conoce lo que sucede en tu barrio</span><button className="text-button" onClick={onBack} disabled={busy}>Explorar la comunidad<ArrowRight size={15} /></button></div>
        </div>
      </section>
    </main>
    <footer className="auth-footer"><span>AlertaVecinal · Hogar conectado</span><CreatorCredit /></footer>
  </div>;
}
