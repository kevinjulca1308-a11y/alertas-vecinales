import { getReportUrl } from "./native";
import React, { useState } from "react";
import {
  MapPin,
  Heart,
  Bookmark,
  MessageCircle,
  Send,
  Clock3,
  Check,
  ArrowUpRight,
  Trash2,
  LoaderCircle,
  AlertTriangle,
  Copy,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  MapView,
  ReportImage,
  dateLabel,
  categoryIcons,
  categoryTone,
} from "./ui";
import { api } from "./api";
import { statuses } from "./data";
export default function ReportDetail({
  report: r,
  user,
  onUpdate,
  onDelete,
  onAuth,
  notify,
}) {
  const [tab, setTab] = useState("history"),
    [comment, setComment] = useState(""),
    [status, setStatus] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [image, setImage] = useState(0);
  const Icon = categoryIcons[r.category];
  const action = async (kind, method, body) => {
    if (!user) {
      onAuth();
      return false;
    }
    if (busy) return false;
    setBusy(kind);
    setError("");
    try {
      const { report } = await api(`/reports/${r.id}/${kind}`, {
        method,
        body,
      });
      onUpdate(report);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    setBusy("delete");
    setError("");
    try {
      await api(`/reports/${r.id}`, { method: "DELETE" });
      onDelete(r.id);
      notify("Tu reporte fue eliminado.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="report-detail">
      <div className="detail-cover">
        {image === 0 ? (
          <ReportImage report={r} />
        ) : (
          <img
            src={r.photos[image]}
            alt={`Fotografía ${image + 1} del reporte`}
          />
        )}
        <div className="detail-image-shade" />
        <span className="detail-code">
          {r.id}
          {r.demo ? " · EJEMPLO" : ""}
        </span>
        <Badge status={r.status} />
      </div>
      {r.photos.length > 1 && (
        <div className="gallery-nav">
          {r.photos.map((p, i) => (
            <button
              key={i}
              aria-label={`Ver foto ${i + 1}`}
              className={image === i ? "active" : ""}
              onClick={() => setImage(i)}
            >
              <img src={p} alt="" />
            </button>
          ))}
        </div>
      )}
      <div className="detail-body">
        <div className="detail-category">
          <span className={`category-label ${categoryTone[r.category]}`}>
            <Icon size={15} />
            {r.category}
          </span>
          <span className={`priority-label ${r.priority}`}>
            <i /> Prioridad {r.priority.toLowerCase()}
          </span>
        </div>
        <h2>{r.title}</h2>
        <div className="detail-address">
          <MapPin size={16} />
          {r.address}
        </div>
        <p className="detail-description">{r.description}</p>
        <div className="detail-author">
          <span className="avatar">{r.author[0]}</span>
          <div>
            <strong>{r.author}</strong>
            <small>Publicado el {dateLabel(r.date)}</small>
          </div>
          <button
            aria-label="Copiar enlace al reporte"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(getReportUrl(r.id));
                notify("Enlace copiado");
              } catch {
                setError(
                  "No pudimos copiar el enlace. Copia la dirección del navegador.",
                );
              }
            }}
          >
            <Copy size={16} />
          </button>
        </div>
        <div className="detail-actions">
          <button
            className={`button ${r.supported ? "primary" : "secondary"}`}
            disabled={!!busy}
            onClick={() => action("support", "PUT", { active: !r.supported })}
          >
            <Heart size={17} fill={r.supported ? "currentColor" : "none"} />
            {r.supported ? "Apoyado" : "Apoyar"} <span>{r.votes}</span>
          </button>
          <button
            className={`button secondary ${r.saved ? "is-saved" : ""}`}
            disabled={!!busy}
            onClick={() => action("save", "PUT", { active: !r.saved })}
          >
            <Bookmark size={17} fill={r.saved ? "currentColor" : "none"} />
            {r.saved ? "Guardado" : "Guardar"}
          </button>
        </div>
        <MapView reports={[r]} position={[r.lat, r.lng]} height={220} />
        <a
          className="directions-link"
          href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir ubicación en Google Maps <ArrowUpRight size={15} />
        </a>
        <div className="detail-tabs">
          <button
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            <Clock3 size={16} /> Seguimiento
          </button>
          <button
            className={tab === "comments" ? "active" : ""}
            onClick={() => setTab("comments")}
          >
            <MessageCircle size={16} /> Comentarios{" "}
            <span>{r.comments.length}</span>
          </button>
        </div>
        {tab === "history" ? (
          <>
            <div className="timeline">
              {r.history.map((h, i) => (
                <div className="timeline-event" key={i}>
                  <span className={i === r.history.length - 1 ? "latest" : ""}>
                    <Check size={13} />
                  </span>
                  <div>
                    <strong>{h.status}</strong>
                    <p>{h.note}</p>
                    <small>{dateLabel(h.date)}</small>
                  </div>
                </div>
              ))}
            </div>
            {r.own && (
              <form
                className="status-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await action("status", "PATCH", { status, note })) {
                    setNote("");
                    setStatus("");
                    notify("Seguimiento actualizado");
                  }
                }}
              >
                <h3>Registrar una actualización</h3>
                <p>Comparte un cambio que hayas observado.</p>
                <label className="field">
                  Nuevo estado
                  <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Selecciona el estado</option>
                    {statuses
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  Nota de seguimiento
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explica qué cambió en el lugar..."
                  />
                </label>
                <button className="button primary" disabled={!!busy}>
                  {busy === "status" ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  Actualizar estado
                </button>
              </form>
            )}
            <div className="info-callout small">
              <ShieldCheck size={18} />
              <p>
                {r.demo
                  ? "Este es un reporte de ejemplo. Sus datos y avances son ilustrativos."
                  : "Los estados son actualizaciones del vecino; no representan una confirmación municipal."}
              </p>
            </div>
          </>
        ) : (
          <div className="comments-panel">
            {r.comments.length ? (
              r.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <span className="avatar">{c.author[0]}</span>
                  <div>
                    <strong>
                      {c.author}
                      {c.own && <small> · Tú</small>}
                    </strong>
                    <time>{dateLabel(c.date)}</time>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="comment-empty">
                <MessageCircle size={24} />
                <strong>Empieza la conversación.</strong>
                <p>Comparte información útil o pregunta por el avance.</p>
              </div>
            )}
            {user ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await action("comments", "POST", { body: comment }))
                    setComment("");
                }}
              >
                <label className="field">
                  Tu comentario
                  <textarea
                    rows={3}
                    required
                    minLength={3}
                    maxLength={600}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="¿Tienes más información sobre este problema?"
                  />
                </label>
                <div className="comment-footer">
                  <span>{comment.length}/600</span>
                  <button className="button primary" disabled={!!busy}>
                    {busy === "comments" ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <Send size={15} />
                    )}{" "}
                    Enviar comentario
                  </button>
                </div>
              </form>
            ) : (
              <button className="button secondary" onClick={onAuth}>
                Iniciar sesión para comentar
              </button>
            )}
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        {r.own && (
          <div className="delete-area">
            {confirm ? (
              <div>
                <p>
                  ¿Eliminar este reporte y su historial? Esta acción no se puede
                  deshacer.
                </p>
                <button
                  className="button danger"
                  disabled={!!busy}
                  onClick={remove}
                >
                  Sí, eliminar reporte
                </button>
                <button
                  className="button ghost"
                  disabled={!!busy}
                  onClick={() => setConfirm(false)}
                >
                  Conservar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)}>
                <Trash2 size={15} /> Eliminar mi reporte
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
