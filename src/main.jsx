import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  MapPin,
  LayoutDashboard,
  Map,
  FileText,
  Bookmark,
  ChartNoAxesCombined,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  Heart,
  Bell,
  ChevronDown,
  SlidersHorizontal,
  Grid2X2,
  List,
  MessageCircle,
  CheckCircle2,
  Clock3,
  Construction,
  Download,
  RefreshCw,
  LoaderCircle,
  WifiOff,
  Menu,
  X,
  LogOut,
  UserRound,
  ShieldCheck,
  Leaf,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Lightbulb,
  Trash2,
  Trees,
  ArrowDownToLine,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { categories, statuses, filterReports } from "./data";
import { api, downloadReports } from "./api";
import {
  categoryIcons,
  categoryTone,
  MapView,
  Badge,
  ReportImage,
  Dialog,
  Empty,
  dateLabel,
} from "./ui";
import ReportForm from "./ReportForm";
import AuthForm from "./AuthForm";
import ReportDetail from "./ReportDetail";
const navigation = [
  ["Inicio", LayoutDashboard],
  ["Mapa", Map],
  ["Mis reportes", FileText],
  ["Guardados", Bookmark],
  ["Estadísticas", ChartNoAxesCombined],
];
function App() {
  const [reports, setReports] = useState([]),
    [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [page, setPage] = useState("Inicio"),
    [modal, setModal] = useState(null),
    [intent, setIntent] = useState(null),
    [selectedId, setSelectedId] = useState(null),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todas"),
    [status, setStatus] = useState("Todos"),
    [priority, setPriority] = useState("Todas"),
    [sort, setSort] = useState("recent"),
    [showDemo, setShowDemo] = useState(true),
    [view, setView] = useState("grid"),
    [menu, setMenu] = useState(false),
    [filters, setFilters] = useState(false),
    [toast, setToast] = useState(""),
    [pending, setPending] = useState(""),
    [limit, setLimit] = useState(9),
    [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);
  const notify = (message) => setToast(message);
  const load = async (initial = false) => {
    const current = ++request.current;
    try {
      const [data, identity] = await Promise.all([api("/reports"), api("/me")]);
      if (current !== request.current) return;
      setReports(data.reports);
      setUser(identity.user);
      setError("");
    } catch (e) {
      if (current === request.current) setError(e.message);
    } finally {
      if (current === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };
  useEffect(() => {
    load(true);
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    const visible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      request.current++;
    };
  }, []);
  useEffect(() => {
    const hash = () => {
      const match = location.hash.match(/^#reporte\/(AV-[a-zA-Z0-9-]+)$/);
      setSelectedId(match?.[1] || null);
    };
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => setLimit(9),
    [search, category, status, priority, page, showDemo, sort],
  );
  const openReport = (r) => {
    location.hash = `reporte/${r.id}`;
    setSelectedId(r.id);
  };
  const closeReport = () => {
    history.replaceState(null, "", location.pathname + location.search);
    setSelectedId(null);
  };
  const navigate = (p) => {
    setPage(p);
    setMenu(false);
    setSearch("");
    setCategory("Todas");
    setStatus("Todos");
    setPriority("Todas");
    setFilters(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const auth = (after = null) => {
    setIntent(after);
    setModal("auth");
  };
  const newReport = () => {
    if (user) setModal("new");
    else auth("new");
  };
  const replace = (r) => {
    request.current++;
    setRefreshing(false);
    setReports((items) =>
      items.some((x) => x.id === r.id)
        ? items.map((x) => (x.id === r.id ? r : x))
        : [r, ...items],
    );
  };
  const participate = async (r, kind) => {
    if (!user) {
      auth();
      return;
    }
    if (pending) return;
    setPending(`${kind}-${r.id}`);
    try {
      const { report } = await api(`/reports/${r.id}/${kind}`, {
        method: "PUT",
        body: { active: kind === "support" ? !r.supported : !r.saved },
      });
      replace(report);
      if (kind === "save")
        notify(
          report.saved
            ? "Reporte guardado. Lo encontrarás en Guardados."
            : "Reporte retirado de Guardados.",
        );
    } catch (e) {
      notify(e.message);
    } finally {
      setPending("");
    }
  };
  const visibleReports = useMemo(
    () => reports.filter((r) => showDemo || !r.demo),
    [reports, showDemo],
  );
  const filtered = useMemo(
    () =>
      filterReports(visibleReports, {
        search,
        category,
        status,
        priority,
        sort,
        mine: page === "Mis reportes",
        saved: page === "Guardados",
      }),
    [visibleReports, page, category, status, priority, search, sort],
  );
  const current = reports.find((r) => r.id === selectedId),
    owned = reports.filter((r) => r.own),
    saved = reports.filter((r) => r.saved),
    resolved = visibleReports.filter((r) => r.status === "Resuelto").length;
  const hasFilters =
    search ||
    category !== "Todas" ||
    status !== "Todos" ||
    priority !== "Todas";
  const clearFilters = () => {
    setSearch("");
    setCategory("Todas");
    setStatus("Todos");
    setPriority("Todas");
  };
  const stats = [
    {
      label: "Reportes de la comunidad",
      value: visibleReports.length,
      Icon: FileText,
      tone: "green",
      note: "Cada reporte es un primer paso",
      status: "Todos",
    },
    {
      label: "Pendientes de atención",
      value: visibleReports.filter((r) => r.status === "Reportado").length,
      Icon: Clock3,
      tone: "coral",
      note: "Tu apoyo los hace visibles",
      status: "Reportado",
    },
    {
      label: "En proceso",
      value: visibleReports.filter((r) => r.status === "En proceso").length,
      Icon: Construction,
      tone: "amber",
      note: "Seguimiento de los vecinos",
      status: "En proceso",
    },
    {
      label: "Problemas resueltos",
      value: resolved,
      Icon: CheckCircle2,
      tone: "green",
      note: "Pequeños logros, grandes cambios",
      status: "Resuelto",
    },
  ];
  return (
    <div className="app-shell">
      {menu && <div className="menu-overlay" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Inicio");
          }}
        >
          <span className="brand-mark">
            <MapPin size={24} />
          </span>
          <span>
            Alerta<span>Vecinal</span>
            <small>UNA COMUNIDAD QUE SE CUIDA</small>
          </span>
        </a>
        <div className="community-switch">
          <span>
            <MapPin size={17} />
          </span>
          <div>
            <strong>Mi comunidad</strong>
            <small>Reportes ciudadanos</small>
          </div>
          <Leaf size={17} />
        </div>
        <span className="nav-label">EXPLORA TU COMUNIDAD</span>
        <nav>
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Mis reportes" && owned.length > 0 && (
                <small>{owned.length}</small>
              )}
              {name === "Guardados" && saved.length > 0 && (
                <small>{saved.length}</small>
              )}
              {page === name && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-prompt">
            <span>
              <Heart size={23} />
            </span>
            <h3>
              Tu barrio necesita
              <br />
              tu mirada.
            </h3>
            <p>
              Una foto, una ubicación.
              <br />
              El primer paso lo das tú.
            </p>
            <button onClick={newReport}>
              Hacer un reporte <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="help-link" onClick={() => setModal("help")}>
            <Info size={17} /> ¿Cómo funciona?
          </button>
          <button
            className="sidebar-profile"
            onClick={() => (user ? setModal("profile") : auth())}
          >
            <span className="avatar">
              {user ? user.name[0].toUpperCase() : <UserRound size={17} />}
            </span>
            <div>
              <strong>{user ? user.name : "Hola, vecino"}</strong>
              <small>
                {user ? "Mi cuenta" : "Inicia sesión para participar"}
              </small>
            </div>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir navegación"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span>Mi comunidad</span>
            <i>/</i>
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-status ${error ? "disconnected" : ""}`}
            >
              <i />
              {error ? "Sin conexión al servidor" : "Comunidad conectada"}
            </span>
            <button
              className="icon-button"
              aria-label="Ver actividad"
              onClick={() => (user ? setModal("activity") : auth())}
            >
              <Bell size={19} />
              {owned.length > 0 && <span className="notification-dot" />}
            </button>
            <button
              className="top-profile"
              onClick={() => (user ? setModal("profile") : auth())}
            >
              <span className="avatar">
                {user ? user.name[0].toUpperCase() : <UserRound size={16} />}
              </span>
              <span>{user ? user.name.split(" ")[0] : "Iniciar sesión"}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                <i /> CADA VOZ CUENTA
              </span>
              <h1>
                {page === "Inicio"
                  ? "Un mejor barrio empieza contigo."
                  : page === "Mapa"
                    ? "Tu comunidad, en el mapa."
                    : page === "Mis reportes"
                      ? "Tu voz ya está haciendo cambios."
                      : page === "Guardados"
                        ? "Los reportes que te importan."
                        : "El pulso de tu comunidad."}
              </h1>
              <p>
                {page === "Mis reportes"
                  ? "Consulta tus reportes y comparte sus avances."
                  : page === "Guardados"
                    ? "Sigue de cerca los problemas y las mejoras de tu barrio."
                    : page === "Estadísticas"
                      ? "Datos para entender lo que pasa y dónde podemos mejorar."
                      : "Reporta lo que ves. Conecta con tus vecinos. Sigue cada avance."}
              </p>
            </div>
            <button
              className="button primary new-report-button"
              onClick={newReport}
            >
              <Plus size={19} /> Nuevo reporte
            </button>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <WifiOff size={21} />
              <div>
                <strong>No pudimos conectar con la comunidad.</strong>
                <p>{error}</p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setRefreshing(true);
                  load();
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          {page === "Inicio" && (
            <section className="hero">
              <div className="hero-copy">
                <span className="hero-pill">
                  <span /> PEQUEÑAS ACCIONES, GRANDES CAMBIOS
                </span>
                <h2>
                  Lo que ves hoy,
                  <br />
                  <span>puede mejorar mañana.</span>
                </h2>
                <p>
                  Una calle dañada, una luz apagada o un parque descuidado.
                  <br className="desktop-break" /> Hagamos visibles los
                  problemas de nuestra comunidad.
                </p>
                <button className="button hero-button" onClick={newReport}>
                  Reportar un problema <ArrowUpRight size={19} />
                </button>
                <div className="hero-footnote">
                  <ShieldCheck size={15} />
                  <span>Tu reporte cuenta. Tu comunidad también.</span>
                </div>
              </div>
              <div className="hero-art">
                <img
                  src="/illustrations/neighborhood.svg"
                  alt="Ilustración de un barrio con parques, edificios y vecinos"
                />
                <div className="hero-floating">
                  <span>
                    <Check size={17} />
                  </span>
                  <div>
                    <strong>Un cambio a la vez</strong>
                    <small>Juntos, el barrio mejora.</small>
                  </div>
                </div>
              </div>
            </section>
          )}
          {loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle size={27} className="spin" />
              <p>Conectando con tu comunidad...</p>
            </div>
          ) : (
            <>
              {(page === "Inicio" || page === "Estadísticas") && (
                <section
                  className="stats-grid"
                  aria-label="Resumen de la comunidad"
                >
                  {stats.map(
                    ({ label, value, Icon, tone, note, status: target }) => (
                      <button
                        className="stat-card"
                        key={label}
                        onClick={() => {
                          navigate("Inicio");
                          setStatus(target);
                          document
                            .getElementById("reports-heading")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }}
                      >
                        <div className="stat-top">
                          <span className={`stat-icon ${tone}`}>
                            <Icon size={20} />
                          </span>
                          <ArrowUpRight size={17} />
                        </div>
                        <strong>{String(value).padStart(2, "0")}</strong>
                        <h3>{label}</h3>
                        <small>{note}</small>
                      </button>
                    ),
                  )}
                </section>
              )}
              {page === "Estadísticas" ? (
                <section className="analytics-grid">
                  <div className="panel category-chart">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">¿QUÉ NECESITA ATENCIÓN?</span>
                        <h2>Reportes por categoría</h2>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => downloadReports(visibleReports)}
                      >
                        <Download size={16} /> Exportar
                      </button>
                    </div>
                    {categories.map((c) => {
                      const n = visibleReports.filter(
                        (r) => r.category === c,
                      ).length;
                      const Icon = categoryIcons[c];
                      return (
                        <div className="chart-row" key={c}>
                          <div>
                            <span
                              className={`category-icon ${categoryTone[c]}`}
                            >
                              <Icon size={17} />
                            </span>
                            <strong>{c}</strong>
                            <b>{n}</b>
                          </div>
                          <div className="chart-track">
                            <span
                              style={{
                                width: `${visibleReports.length ? (n / visibleReports.length) * 100 : 0}%`,
                              }}
                              className={categoryTone[c]}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="panel impact-panel">
                    <span className="eyebrow">EL AVANCE DE LA COMUNIDAD</span>
                    <h2>Cada solución cuenta.</h2>
                    <div
                      className="donut"
                      style={{
                        "--percent": `${visibleReports.length ? (resolved / visibleReports.length) * 100 : 0}%`,
                      }}
                    >
                      <div>
                        <strong>
                          {visibleReports.length
                            ? Math.round(
                                (resolved / visibleReports.length) * 100,
                              )
                            : 0}
                          %
                        </strong>
                        <span>resueltos</span>
                      </div>
                    </div>
                    <p>
                      {resolved} de {visibleReports.length} reportes están
                      resueltos.
                    </p>
                    <label className="demo-check">
                      <input
                        type="checkbox"
                        checked={showDemo}
                        onChange={(e) => setShowDemo(e.target.checked)}
                      />{" "}
                      Incluir reportes de ejemplo
                    </label>
                  </div>
                </section>
              ) : (
                <>
                  <div
                    className={`community-layout ${page === "Inicio" ? "with-aside" : ""}`}
                  >
                    <section className="reports-area">
                      <div className="section-heading" id="reports-heading">
                        <div>
                          <h2>
                            {page === "Mis reportes"
                              ? "Mis reportes"
                              : page === "Guardados"
                                ? "Reportes guardados"
                                : page === "Mapa"
                                  ? "Explora los reportes"
                                  : "Lo que pasa en tu comunidad"}{" "}
                            <span>{filtered.length}</span>
                          </h2>
                          <p>
                            {page === "Inicio"
                              ? "Un vistazo a los problemas y los avances cerca de ti."
                              : page === "Mapa"
                                ? "Selecciona un marcador o una tarjeta para ver los detalles."
                                : "Todos los detalles y avances, en un solo lugar."}
                          </p>
                        </div>
                        <div className="section-actions">
                          <button
                            className="icon-button"
                            aria-label="Actualizar reportes"
                            disabled={refreshing}
                            onClick={() => {
                              setRefreshing(true);
                              load();
                            }}
                          >
                            <RefreshCw
                              size={17}
                              className={refreshing ? "spin" : ""}
                            />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Exportar reportes filtrados"
                            onClick={() => {
                              downloadReports(filtered);
                              notify("Se descargó el archivo CSV.");
                            }}
                          >
                            <Download size={17} />
                          </button>
                          {page !== "Mapa" && (
                            <div className="view-toggle">
                              <button
                                className={view === "grid" ? "active" : ""}
                                aria-label="Vista de tarjetas"
                                onClick={() => setView("grid")}
                              >
                                <Grid2X2 size={16} />
                              </button>
                              <button
                                className={view === "list" ? "active" : ""}
                                aria-label="Vista de lista"
                                onClick={() => setView("list")}
                              >
                                <List size={17} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="filterbar">
                        <label className="search-field">
                          <Search size={18} />
                          <input
                            aria-label="Buscar reportes"
                            placeholder="Buscar por problema, calle o código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                          {search && (
                            <button
                              aria-label="Borrar búsqueda"
                              onClick={() => setSearch("")}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </label>
                        <button
                          className={`button filter-button ${filters || status !== "Todos" || priority !== "Todas" ? "active" : ""}`}
                          onClick={() => setFilters(!filters)}
                        >
                          <SlidersHorizontal size={16} /> Filtros
                          {(status !== "Todos" || priority !== "Todas") && (
                            <i />
                          )}
                        </button>
                        <select
                          aria-label="Ordenar reportes"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="recent">Más recientes</option>
                          <option value="popular">Más apoyados</option>
                          <option value="priority">Mayor prioridad</option>
                        </select>
                      </div>
                      {filters && (
                        <div className="advanced-filters">
                          <label>
                            Estado
                            <select
                              aria-label="Filtrar por estado"
                              value={status}
                              onChange={(e) => setStatus(e.target.value)}
                            >
                              <option value="Todos">Todos los estados</option>
                              {statuses.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Prioridad
                            <select
                              aria-label="Filtrar por prioridad"
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                            >
                              <option value="Todas">
                                Todas las prioridades
                              </option>
                              {["Alta", "Media", "Baja"].map((p) => (
                                <option key={p}>{p}</option>
                              ))}
                            </select>
                          </label>
                          <button onClick={clearFilters}>
                            Restablecer filtros
                          </button>
                        </div>
                      )}
                      <div className="category-tabs">
                        {["Todas", ...categories].map((c) => {
                          const Icon = categoryIcons[c];
                          return (
                            <button
                              key={c}
                              className={category === c ? "active" : ""}
                              onClick={() => setCategory(c)}
                            >
                              {Icon ? (
                                <Icon size={15} />
                              ) : (
                                <Grid2X2 size={14} />
                              )}{" "}
                              {c}
                            </button>
                          );
                        })}
                      </div>
                      <div className="results-bar">
                        <span>
                          {hasFilters ? (
                            <>
                              {filtered.length} resultados{" "}
                              <button onClick={clearFilters}>
                                Limpiar filtros <X size={12} />
                              </button>
                            </>
                          ) : (
                            "Tu comunidad, un reporte a la vez."
                          )}
                        </span>
                        <label className="demo-check">
                          <input
                            type="checkbox"
                            checked={showDemo}
                            onChange={(e) => setShowDemo(e.target.checked)}
                          />{" "}
                          Mostrar ejemplos
                        </label>
                      </div>
                      {(page === "Mis reportes" || page === "Guardados") &&
                      !user ? (
                        <Empty
                          Icon={UserRound}
                          title="Un espacio para tus reportes."
                          text="Inicia sesión para publicar, guardar y seguir los reportes que te importan."
                          action={
                            <button
                              className="button primary"
                              onClick={() => auth()}
                            >
                              Iniciar sesión <ArrowRight size={16} />
                            </button>
                          }
                        />
                      ) : page === "Mapa" ? (
                        <div className="map-explorer">
                          <MapView
                            reports={filtered}
                            onSelect={openReport}
                            height={520}
                            locate
                          />
                          <div className="map-legend">
                            <span>
                              <i className="coral" />
                              Reportado
                            </span>
                            <span>
                              <i className="amber" />
                              En proceso
                            </span>
                            <span>
                              <i className="green" />
                              Resuelto
                            </span>
                          </div>
                          <div className="map-results">
                            {filtered.slice(0, limit).map((r) => (
                              <button
                                className="map-result"
                                key={r.id}
                                onClick={() => openReport(r)}
                              >
                                <span
                                  className={`category-icon ${categoryTone[r.category]}`}
                                >
                                  {React.createElement(
                                    categoryIcons[r.category],
                                    { size: 19 },
                                  )}
                                </span>
                                <div>
                                  <strong>{r.title}</strong>
                                  <small>{r.address}</small>
                                </div>
                                <Badge status={r.status} />
                                <ArrowUpRight size={16} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : filtered.length ? (
                        <div
                          className={`report-grid ${view === "list" ? "list-view" : ""}`}
                        >
                          {filtered.slice(0, limit).map((r) => {
                            const Icon = categoryIcons[r.category];
                            return (
                              <article className="report-card" key={r.id}>
                                <div className="card-media">
                                  <button
                                    className="card-image-button"
                                    onClick={() => openReport(r)}
                                    aria-label={`Ver reporte: ${r.title}`}
                                  >
                                    <ReportImage report={r} />
                                  </button>
                                  <Badge status={r.status} />
                                  <button
                                    className={`card-save ${r.saved ? "saved" : ""}`}
                                    aria-label={`${r.saved ? "Quitar de guardados" : "Guardar"}: ${r.title}`}
                                    disabled={!!pending}
                                    onClick={() => participate(r, "save")}
                                  >
                                    <Bookmark
                                      size={17}
                                      fill={r.saved ? "currentColor" : "none"}
                                    />
                                  </button>
                                  {r.demo && (
                                    <span className="example-tag">EJEMPLO</span>
                                  )}
                                  {r.photos.length > 1 && !r.demo && (
                                    <span className="photo-count">
                                      +{r.photos.length - 1} fotos
                                    </span>
                                  )}
                                </div>
                                <div className="card-content">
                                  <div className="card-category-row">
                                    <span
                                      className={`category-label ${categoryTone[r.category]}`}
                                    >
                                      <Icon size={14} />
                                      {r.category}
                                    </span>
                                    <span
                                      className={`priority-label ${r.priority}`}
                                    >
                                      <i />
                                      {r.priority}
                                    </span>
                                  </div>
                                  <button
                                    className="card-title"
                                    onClick={() => openReport(r)}
                                  >
                                    {r.title}
                                  </button>
                                  <p className="card-address">
                                    <MapPin size={13} />
                                    {r.address}
                                  </p>
                                  <div className="card-meta">
                                    <span>{r.author}</span>
                                    <i /> <time>{dateLabel(r.date)}</time>
                                  </div>
                                  <div className="card-footer">
                                    <button
                                      className={`support-button ${r.supported ? "active" : ""}`}
                                      aria-label={`${r.supported ? "Retirar apoyo" : "Apoyar"}: ${r.title}`}
                                      disabled={!!pending}
                                      onClick={() => participate(r, "support")}
                                    >
                                      <Heart
                                        size={16}
                                        fill={
                                          r.supported ? "currentColor" : "none"
                                        }
                                      />
                                      <strong>{r.votes}</strong>
                                      <span>apoyos</span>
                                    </button>
                                    <button
                                      className="comment-button"
                                      aria-label={`Ver comentarios: ${r.title}`}
                                      onClick={() => openReport(r)}
                                    >
                                      <MessageCircle size={15} />
                                      {r.comments.length}
                                    </button>
                                    <button
                                      className="card-details"
                                      aria-label={`Ver detalles: ${r.title}`}
                                      onClick={() => openReport(r)}
                                    >
                                      Ver <ArrowUpRight size={15} />
                                    </button>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty
                          Icon={page === "Guardados" ? Bookmark : Search}
                          title={
                            page === "Mis reportes"
                              ? "Tu primer reporte puede cambiar algo."
                              : page === "Guardados"
                                ? "Dale seguimiento a lo que importa."
                                : "No encontramos reportes."
                          }
                          text={
                            page === "Mis reportes"
                              ? "Comparte un problema de tu barrio y sigue cada avance."
                              : page === "Guardados"
                                ? "Toca el marcador de cualquier reporte para encontrarlo aquí."
                                : "Prueba otra búsqueda, cambia los filtros o crea un nuevo reporte."
                          }
                          action={
                            <button
                              className="button primary"
                              onClick={() =>
                                hasFilters ? clearFilters() : newReport()
                              }
                            >
                              {hasFilters
                                ? "Limpiar filtros"
                                : "Crear un reporte"}{" "}
                              <ArrowRight size={16} />
                            </button>
                          }
                        />
                      )}
                      {filtered.length > limit && (
                        <button
                          className="load-more button secondary"
                          onClick={() => setLimit(limit + 9)}
                        >
                          Ver más reportes <ChevronDown size={17} />
                        </button>
                      )}
                    </section>
                    {page === "Inicio" && (
                      <aside className="right-column">
                        <section className="panel nearby-panel">
                          <div className="panel-heading">
                            <h3>El barrio en el mapa</h3>
                            <Navigation size={17} />
                          </div>
                          <MapView
                            reports={visibleReports}
                            onSelect={openReport}
                            height={220}
                          />
                          <div className="map-legend">
                            <span>
                              <i className="coral" />
                              Reportado
                            </span>
                            <span>
                              <i className="amber" />
                              En proceso
                            </span>
                            <span>
                              <i className="green" />
                              Resuelto
                            </span>
                          </div>
                          <button
                            onClick={() => navigate("Mapa")}
                            className="explore-link"
                          >
                            Explorar el mapa <ArrowUpRight size={16} />
                          </button>
                        </section>
                        <section className="how-panel">
                          <span className="eyebrow">ASÍ DE SIMPLE</span>
                          <h3>
                            De una foto
                            <br />a un cambio.
                          </h3>
                          {[
                            {
                              number: "01",
                              title: "Comparte lo que ves",
                              text: "Describe el problema y agrega fotos.",
                            },
                            {
                              number: "02",
                              title: "Ponlo en el mapa",
                              text: "Indica el lugar exacto con tu GPS.",
                            },
                            {
                              number: "03",
                              title: "Sigue cada avance",
                              text: "Participa y consulta el seguimiento.",
                            },
                          ].map((item) => (
                            <div className="how-step" key={item.number}>
                              <span>{item.number}</span>
                              <div>
                                <strong>{item.title}</strong>
                                <p>{item.text}</p>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => setModal("help")}>
                            Conoce cómo funciona <ArrowRight size={15} />
                          </button>
                        </section>
                        <div className="community-note">
                          <ShieldCheck size={21} />
                          <p>
                            Construyamos con respeto.
                            <br />
                            <strong>Tu comunidad también es tu hogar.</strong>
                          </p>
                        </div>
                      </aside>
                    )}
                  </div>
                </>
              )}
              <footer>
                <span>
                  <MapPin size={15} /> AlertaVecinal <i /> Hecho para cuidar lo
                  que compartimos.
                </span>
                <button onClick={() => setModal("privacy")}>
                  Privacidad y datos
                </button>
              </footer>
            </>
          )}
        </main>
        <nav className="mobile-bottom-nav">
          {navigation.slice(0, 4).map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name === "Mis reportes" ? "Mis reportes" : name}</span>
            </button>
          ))}
          <button
            className="mobile-create"
            onClick={newReport}
            aria-label="Crear reporte"
          >
            <Plus size={22} />
            <span>Reportar</span>
          </button>
        </nav>
      </div>
      {modal && (
        <Dialog
          title={
            modal === "auth"
              ? "Mi cuenta"
              : modal === "new"
                ? "Nuevo reporte"
                : "Información de AlertaVecinal"
          }
          wide={modal === "new"}
          onClose={() => {
            setModal(null);
            setIntent(null);
          }}
        >
          {modal === "auth" ? (
            <AuthForm
              onSuccess={(u) => {
                setUser(u);
                load();
                setModal(intent === "new" ? "new" : null);
                setIntent(null);
                notify(`¡Hola, ${u.name.split(" ")[0]}!`);
              }}
            />
          ) : modal === "new" ? (
            <ReportForm
              onClose={() => setModal(null)}
              onCreated={(r) => {
                replace(r);
                setModal(null);
                navigate("Mis reportes");
                notify(
                  "Tu reporte ya está en la comunidad. ¡Gracias por participar!",
                );
              }}
            />
          ) : modal === "profile" ? (
            <Profile
              user={user}
              reports={reports}
              onLogout={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  setUser(null);
                  setModal(null);
                  load();
                  notify("Cerraste sesión. Hasta pronto.");
                } catch (e) {
                  notify(e.message);
                }
              }}
            />
          ) : modal === "activity" ? (
            <>
              <div className="dialog-heading">
                <span className="eyebrow">TU PARTICIPACIÓN IMPORTA</span>
                <h2>Actividad de tus reportes</h2>
                <p>Las últimas actualizaciones registradas por ti.</p>
              </div>
              {owned.length ? (
                owned.map((r) => (
                  <button
                    className="activity-item"
                    key={r.id}
                    onClick={() => {
                      setModal(null);
                      openReport(r);
                    }}
                  >
                    <span
                      className={`category-icon ${categoryTone[r.category]}`}
                    >
                      {React.createElement(categoryIcons[r.category], {
                        size: 20,
                      })}
                    </span>
                    <div>
                      <strong>{r.title}</strong>
                      <small>{dateLabel(r.history.at(-1).date)}</small>
                    </div>
                    <Badge status={r.status} />
                  </button>
                ))
              ) : (
                <Empty
                  Icon={Bell}
                  title="Tu actividad empieza con un reporte."
                  text="Publica tu primer reporte para consultar su seguimiento aquí."
                />
              )}
            </>
          ) : modal === "privacy" ? (
            <div className="info-dialog">
              <span className="auth-brand">
                <ShieldCheck size={27} />
              </span>
              <h2>Tus datos, con claridad.</h2>
              <p>
                Los reportes, fotografías y comentarios se guardan en la base de
                datos SQLite del servidor. Otros usuarios de esta misma app
                pueden verlos.
              </p>
              <p>
                Tu correo y contraseña no se muestran en los reportes. Las
                contraseñas se guardan como hashes; la sesión usa una cookie
                protegida.
              </p>
              <p>
                El GPS se solicita solo cuando tú lo eliges. Puedes seleccionar
                una ubicación manualmente. Los mapas usan OpenStreetMap.
              </p>
              <p>
                Evita subir rostros, documentos, placas e información personal.
                Los estados son registros de vecinos, sin integración municipal.
              </p>
              <p>
                Los datos de la versión anterior permanecen en el navegador; no
                se importan ni se eliminan automáticamente.
              </p>
            </div>
          ) : (
            <div className="info-dialog">
              <span className="auth-brand">
                <Heart size={27} />
              </span>
              <span className="eyebrow">
                PEQUEÑAS ACCIONES, GRANDES CAMBIOS
              </span>
              <h2>Tu barrio mejora cuando participas.</h2>
              <div className="help-steps">
                <div>
                  <span>1</span>
                  <h3>Crea tu cuenta</h3>
                  <p>
                    Regístrate para publicar, comentar, apoyar y guardar
                    reportes.
                  </p>
                </div>
                <div>
                  <span>2</span>
                  <h3>Comparte el problema</h3>
                  <p>
                    Agrega una descripción, hasta tres fotos y el lugar exacto.
                  </p>
                </div>
                <div>
                  <span>3</span>
                  <h3>Mantén viva la conversación</h3>
                  <p>
                    Consulta los comentarios y registra el avance de tus propios
                    reportes.
                  </p>
                </div>
              </div>
              <div className="info-callout">
                <Info size={20} />
                <p>
                  Los ejemplos están identificados. La app guarda reportes
                  compartidos en su servidor, pero no los envía a la
                  municipalidad ni es un canal de emergencias.
                </p>
              </div>
              <button className="button primary" onClick={newReport}>
                Hacer mi primer reporte <ArrowRight size={16} />
              </button>
            </div>
          )}
        </Dialog>
      )}
      {selectedId &&
        !modal &&
        (current ? (
          <Dialog
            title={current.title}
            wide
            className="detail-dialog"
            onClose={closeReport}
          >
            <ReportDetail
              report={current}
              user={user}
              onUpdate={replace}
              onDelete={(id) => {
                request.current++;
                setRefreshing(false);
                setReports((items) => items.filter((r) => r.id !== id));
                closeReport();
              }}
              onAuth={() => auth()}
              notify={notify}
            />
          </Dialog>
        ) : (
          !loading && (
            <Dialog title="Reporte no disponible" onClose={closeReport}>
              <Empty
                title="Este reporte no está disponible."
                text="Puede haber sido eliminado. Vuelve a la comunidad para explorar los reportes actuales."
              />
            </Dialog>
          )
        ))}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
function Profile({ user, reports, onLogout }) {
  if (!user)
    return (
      <Empty
        Icon={UserRound}
        title="Tu sesión terminó."
        text="Cierra esta ventana e inicia sesión nuevamente."
      />
    );
  return (
    <div className="profile-dialog">
      <span className="profile-avatar">{user.name[0].toUpperCase()}</span>
      <span className="eyebrow">MI CUENTA</span>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <div className="profile-stats">
        <div>
          <strong>{reports.filter((r) => r.own).length}</strong>
          <span>Mis reportes</span>
        </div>
        <div>
          <strong>{reports.filter((r) => r.saved).length}</strong>
          <span>Guardados</span>
        </div>
        <div>
          <strong>{reports.filter((r) => r.supported).length}</strong>
          <span>Apoyados</span>
        </div>
      </div>
      <div className="info-callout">
        <ShieldCheck size={20} />
        <p>
          Tu participación está vinculada a tu cuenta. Los reportes se conservan
          al cerrar sesión.
        </p>
      </div>
      <button className="button secondary" onClick={onLogout}>
        <LogOut size={17} /> Cerrar sesión
      </button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
