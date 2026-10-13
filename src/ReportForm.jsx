import React, { useState, useRef } from "react";
import {
  Camera,
  ImagePlus,
  X,
  MapPin,
  LocateFixed,
  Check,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  Send,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { categories } from "./data";
import { categoryIcons, categoryTone, MapView } from "./ui";
import { api, compressPhoto, getLocation } from "./api";
export default function ReportForm({ onCreated, onClose }) {
  const [step, setStep] = useState(0),
    [form, setForm] = useState({
      title: "",
      description: "",
      category: "Alumbrado",
      priority: "Media",
      address: "",
      photos: [],
    }),
    [position, setPosition] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [finding, setFinding] = useState(false);
  const camera = useRef(null),
    gallery = useRef(null),
    readLock = useRef(false),
    submitLock = useRef(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const upload = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (readLock.current) return;
    readLock.current = true;
    setReading(true);
    setError("");
    try {
      if (files.length + form.photos.length > 3)
        throw Error("Puedes adjuntar hasta 3 fotos.");
      const images = [];
      for (const file of files) images.push(await compressPhoto(file));
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...images] }));
    } catch (e) {
      setError(e.message);
    } finally {
      readLock.current = false;
      setReading(false);
    }
  };
  const gps = async () => {
    setFinding(true);
    setError("");
    try {
      setPosition(await getLocation());
    } catch (e) {
      setError(e.message);
    } finally {
      setFinding(false);
    }
  };
  const next = () => {
    setError("");
    if (
      step === 0 &&
      (form.title.trim().length < 5 || form.description.trim().length < 10)
    ) {
      setError(
        "Escribe un título de al menos 5 caracteres y una descripción de al menos 10.",
      );
      return;
    }
    if (
      step === 1 &&
      (!position ||
        !position.every(Number.isFinite) ||
        Math.abs(position[0]) > 90 ||
        Math.abs(position[1]) > 180 ||
        form.address.trim().length < 5)
    ) {
      setError(
        "Escribe una dirección y selecciona el punto exacto en el mapa.",
      );
      return;
    }
    setStep(step + 1);
  };
  const submit = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const { report } = await api("/reports", {
        method: "POST",
        body: { ...form, lat: position[0], lng: position[1] },
      });
      onCreated(report);
    } catch (e) {
      setError(e.message);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="report-wizard">
      <div className="dialog-heading">
        <span className="eyebrow">TU VOZ HACE LA DIFERENCIA</span>
        <h2>Un reporte. Un barrio mejor.</h2>
        <p>Cuéntanos qué sucede y ayúdanos a ubicarlo.</p>
      </div>
      <div className="wizard-steps">
        {["El problema", "La ubicación", "Revisar y enviar"].map((label, i) => (
          <div
            key={label}
            className={step === i ? "active" : step > i ? "done" : ""}
          >
            <span>{step > i ? <Check size={14} /> : i + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          step < 2 ? next() : submit();
        }}
      >
        {step === 0 && (
          <div className="wizard-panel">
            <label className="field-label">¿Qué tipo de problema es?</label>
            <div className="category-picker">
              {categories.map((c) => {
                const Icon = categoryIcons[c];
                return (
                  <button
                    type="button"
                    key={c}
                    className={`${categoryTone[c]} ${form.category === c ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, category: c })}
                  >
                    <Icon size={21} />
                    <span>{c}</span>
                    {form.category === c && <Check size={13} />}
                  </button>
                );
              })}
            </div>
            <label className="field">
              Título del reporte <span>*</span>
              <input
                name="title"
                autoFocus
                placeholder="Ej. Luminaria apagada frente al parque"
                value={form.title}
                onChange={update}
                maxLength={100}
              />
            </label>
            <label className="field">
              Describe el problema <span>*</span>
              <textarea
                name="description"
                placeholder="¿Qué sucede? ¿Desde cuándo? Incluye detalles que puedan ayudar."
                value={form.description}
                onChange={update}
                maxLength={1500}
                rows={4}
              />
              <small>{form.description.length}/1500 caracteres</small>
            </label>
            <label className="field-label">Prioridad</label>
            <div className="priority-picker">
              {[
                ["Baja", "Puede esperar"],
                ["Media", "Necesita atención"],
                ["Alta", "Representa un riesgo"],
              ].map(([p, label]) => (
                <button
                  className={form.priority === p ? "selected" : ""}
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                >
                  <span className={`priority-dot ${p}`} />
                  <div>
                    <strong>{p}</strong>
                    <small>{label}</small>
                  </div>
                </button>
              ))}
            </div>
            <div className="field-label photo-heading">
              Fotos del problema <small>Opcional · hasta 3 fotos</small>
            </div>
            <input
              className="sr-only"
              ref={camera}
              aria-label="Tomar foto"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={upload}
            />
            <input
              className="sr-only"
              ref={gallery}
              aria-label="Adjuntar fotografías"
              type="file"
              accept="image/*"
              multiple
              onChange={upload}
            />
            <div className="photo-inputs">
              <button
                type="button"
                disabled={reading || form.photos.length >= 3}
                onClick={() => camera.current.click()}
              >
                <Camera size={20} /> Usar cámara
              </button>
              <button
                type="button"
                disabled={reading || form.photos.length >= 3}
                onClick={() => gallery.current.click()}
              >
                {reading ? (
                  <LoaderCircle size={20} className="spin" />
                ) : (
                  <ImagePlus size={20} />
                )}{" "}
                {reading ? "Procesando..." : "Subir fotografías"}
              </button>
            </div>
            {form.photos.length > 0 && (
              <div className="photo-thumbnails">
                {form.photos.map((src, i) => (
                  <div key={i}>
                    <img src={src} alt={`Foto ${i + 1}`} />
                    <button
                      aria-label={`Quitar foto ${i + 1}`}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          photos: form.photos.filter((_, n) => n !== i),
                        })
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="form-tip">
              No fotografíes rostros, placas o información personal. Hasta 15 MB
              por foto antes de comprimir.
            </p>
          </div>
        )}
        {step === 1 && (
          <div className="wizard-panel">
            <div className="location-callout">
              <span>
                <MapPin size={23} />
              </span>
              <div>
                <strong>El lugar exacto importa.</strong>
                <p>Selecciona un punto en el mapa o usa tu ubicación actual.</p>
              </div>
            </div>
            <label className="field">
              Dirección o referencia <span>*</span>
              <input
                name="address"
                placeholder="Calle, número, distrito o referencia cercana"
                value={form.address}
                onChange={update}
                maxLength={200}
              />
            </label>
            <button
              className="button secondary gps-button"
              type="button"
              onClick={gps}
              disabled={finding}
            >
              {finding ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <LocateFixed size={17} />
              )}{" "}
              {finding ? "Buscando ubicación..." : "Usar mi ubicación GPS"}
            </button>
            <MapView
              pick
              position={position}
              onPick={setPosition}
              height={290}
            />
            <div
              className={`coordinate-label ${position ? "has-position" : ""}`}
            >
              {position ? (
                <>
                  <Check size={16} /> Punto seleccionado ·{" "}
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </>
              ) : (
                <>
                  <MapPin size={16} /> Haz clic en el mapa para seleccionar el
                  punto.
                </>
              )}
            </div>
            <details className="manual-location">
              <summary>Ingresar coordenadas manualmente</summary>
              <div>
                <label>
                  Latitud
                  <input
                    aria-label="Latitud"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={position?.[0] ?? ""}
                    onChange={(e) =>
                      setPosition([
                        e.target.value === "" ? NaN : Number(e.target.value),
                        position?.[1] ?? -77.031,
                      ])
                    }
                  />
                </label>
                <label>
                  Longitud
                  <input
                    aria-label="Longitud"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={position?.[1] ?? ""}
                    onChange={(e) =>
                      setPosition([
                        position?.[0] ?? -12.118,
                        e.target.value === "" ? NaN : Number(e.target.value),
                      ])
                    }
                  />
                </label>
              </div>
            </details>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-panel review-panel">
            <div className="review-top">
              <span className={`category-icon ${categoryTone[form.category]}`}>
                {React.createElement(categoryIcons[form.category], {
                  size: 26,
                })}
              </span>
              <div>
                <small>
                  {form.category} · Prioridad {form.priority.toLowerCase()}
                </small>
                <h3>{form.title}</h3>
              </div>
            </div>
            <p>{form.description}</p>
            <div className="review-location">
              <MapPin size={18} />
              <div>
                <strong>{form.address}</strong>
                <small>
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </small>
              </div>
            </div>
            {form.photos.length > 0 && (
              <div className="photo-thumbnails review-photos">
                {form.photos.map((src, i) => (
                  <img key={i} src={src} alt={`Foto ${i + 1} del reporte`} />
                ))}
              </div>
            )}
            <div className="info-callout">
              <ShieldCheck size={22} />
              <p>
                Tu reporte se guardará en la comunidad. Podrás consultar el
                seguimiento, recibir comentarios y registrar cambios. No se
                envía automáticamente a la municipalidad.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            <AlertTriangle size={17} />
            {error}
          </div>
        )}
        <div className="wizard-footer">
          <button
            type="button"
            className="button ghost"
            disabled={busy}
            onClick={() =>
              step > 0 ? (setStep(step - 1), setError("")) : onClose()
            }
          >
            {step > 0 ? (
              <>
                <ArrowLeft size={16} /> Atrás
              </>
            ) : (
              "Cancelar"
            )}
          </button>
          <span>Paso {step + 1} de 3</span>
          <button
            className="button primary"
            disabled={busy || reading || finding}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : step < 2 ? null : (
              <Send size={17} />
            )}{" "}
            {step < 2
              ? "Continuar"
              : busy
                ? "Publicando..."
                : "Publicar reporte"}
            {step < 2 && <ArrowRight size={17} />}
          </button>
        </div>
      </form>
    </div>
  );
}
