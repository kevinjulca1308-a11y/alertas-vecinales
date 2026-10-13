import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  X,
  MapPin,
  Check,
  Lightbulb,
  Trash2,
  Construction,
  Trees,
  Shapes,
  LocateFixed,
  LoaderCircle,
  WifiOff,
} from "lucide-react";
import { getLocation } from "./api";
export const categoryIcons = {
  Alumbrado: Lightbulb,
  Limpieza: Trash2,
  "Vías públicas": Construction,
  "Áreas verdes": Trees,
  Otros: Shapes,
};
export const categoryTone = {
  Alumbrado: "amber",
  Limpieza: "coral",
  "Vías públicas": "blue",
  "Áreas verdes": "green",
  Otros: "purple",
};
export const categoryImage = {
  Alumbrado: "light",
  Limpieza: "clean",
  "Vías públicas": "road",
  "Áreas verdes": "park",
  Otros: "city",
};
export const dateLabel = (date) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(date));
export function Badge({ status }) {
  return (
    <span
      className={`status-badge ${status === "Resuelto" ? "resolved" : status === "En proceso" ? "progress" : "reported"}`}
    >
      <i />
      {status}
    </span>
  );
}
export function ReportImage({ report, className = "" }) {
  const source = report.photos?.[0] || report.photo;
  return (
    <img
      className={className}
      src={
        source ||
        `/illustrations/${categoryImage[report.category] || "city"}.svg`
      }
      alt={
        report.demo || !source
          ? `Ilustración de ${report.category}`
          : `Fotografía de ${report.title}`
      }
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/placeholder.svg";
      }}
      loading="lazy"
    />
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...panel.current.querySelectorAll(
            'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`dialog ${wide ? "wide" : ""} ${className}`}
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="dialog-close icon-button"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={21} />
        </button>
        {children}
      </section>
    </div>
  );
}
export function MapView({
  reports = [],
  pick = false,
  position,
  onPick,
  onSelect,
  height = 300,
  selectedId,
  locate = false,
}) {
  const element = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    callbacks = useRef({ onPick, onSelect });
  callbacks.current = { onPick, onSelect };
  const [tileError, setTileError] = useState(false),
    [finding, setFinding] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const m = L.map(element.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(position || [-12.118, -77.031], 14);
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    })
      .on("tileerror", () => setTileError(true))
      .on("tileload", () => setTileError(false))
      .addTo(m);
    layer.current = L.layerGroup().addTo(m);
    if (pick)
      m.on("click", (e) =>
        callbacks.current.onPick?.([e.latlng.lat, e.latlng.lng]),
      );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      m.remove();
    };
  }, []);
  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    const items = pick
      ? position
        ? [{ lat: position[0], lng: position[1], status: "Reportado" }]
        : []
      : reports;
    for (const r of items.filter(
      (r) =>
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng) &&
        Math.abs(r.lat) <= 90 &&
        Math.abs(r.lng) <= 180,
    )) {
      const color =
        r.status === "Resuelto"
          ? "#208568"
          : r.status === "En proceso"
            ? "#da9b37"
            : "#f08065";
      L.marker([r.lat, r.lng], {
        keyboard: true,
        title: r.title || "Ubicación seleccionada",
        icon: L.divIcon({
          className: "map-pin",
          html: `<span style="background:${color};${selectedId === r.id ? "box-shadow:0 0 0 5px #ffffff99;" : ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>`,
          iconSize: [36, 43],
          iconAnchor: [18, 43],
        }),
      })
        .addTo(layer.current)
        .on("click", () => callbacks.current.onSelect?.(r));
    }
    if (
      pick &&
      position &&
      position.every(Number.isFinite) &&
      Math.abs(position[0]) <= 90 &&
      Math.abs(position[1]) <= 180
    )
      map.current.setView(position, 16, { animate: false });
    else if (items.length && !pick)
      map.current.fitBounds(
        items.map((r) => [r.lat, r.lng]),
        { padding: [40, 40], maxZoom: 15, animate: false },
      );
  }, [reports, position, selectedId]);
  const find = async () => {
    setFinding(true);
    setError("");
    try {
      const p = await getLocation();
      map.current.setView(p, 16, { animate: false });
      L.circleMarker(p, {
        radius: 8,
        color: "white",
        weight: 3,
        fillColor: "#4285f4",
        fillOpacity: 1,
      }).addTo(map.current);
    } catch (e) {
      setError(e.message);
    } finally {
      setFinding(false);
    }
  };
  return (
    <div className={`map-box ${pick ? "picking" : ""}`}>
      <div
        ref={element}
        style={{ height }}
        aria-label={
          pick ? "Selecciona la ubicación en el mapa" : "Mapa de reportes"
        }
      />
      {locate && (
        <button
          className="map-locate"
          aria-label="Centrar en mi ubicación"
          onClick={find}
          disabled={finding}
        >
          {finding ? (
            <LoaderCircle className="spin" size={19} />
          ) : (
            <LocateFixed size={19} />
          )}
        </button>
      )}
      {tileError && (
        <div className="map-offline">
          <WifiOff size={14} />
          <span>No se pudo cargar el mapa base. Verifica la conexión.</span>
        </div>
      )}
      {error && <div className="map-offline">{error}</div>}
    </div>
  );
}
export function Empty({ Icon = MapPin, title, text, action }) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
