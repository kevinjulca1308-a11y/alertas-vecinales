import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Map, FileText, Bookmark, Plus, Search, ArrowUpRight, ArrowRight, Heart, MessageCircle, CheckCircle2, Clock3, Construction, Download, RefreshCw, LoaderCircle, Menu, X, LogOut, UserRound, ShieldCheck, SlidersHorizontal, MapPin, Users, Settings, ChevronRight, AlertTriangle, Check, Eye, Palette, Phone } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import './design.css';
import { categories, statuses, filterReports } from './data';
import { community } from './community';
import { api, downloadReports } from './api';
import { isNative } from './native';
import { Badge, MapView, ReportImage, Dialog, Empty, dateLabel, categoryIcons, categoryTone } from './ui';
import ReportForm from './ReportForm';
import AuthForm from './AuthForm';
import ReportDetail from './ReportDetail';
import ServerSettings from './ServerSettings';
import AppearancePanel, { ThemePicker, useAppearance } from './Appearance';
import EmergencyHelp, { EmergencyStrip } from './EmergencyHelp';
import NeighborhoodArt from './NeighborhoodArt';

const neighborNav = [['Inicio', LayoutDashboard], ['Mapa', Map], ['Mis reportes', FileText], ['Guardados', Bookmark]];
const adminNav = [['Resumen', LayoutDashboard], ['Reportes', FileText], ['Usuarios', Users]];
const pageInfo = {
  Inicio: ['Tu comunidad, al día', 'Reporta, participa y sigue lo que cambia en tu barrio.'],
  Mapa: ['Tu barrio en el mapa', 'Encuentra reportes y consulta su ubicación.'],
  'Mis reportes': ['Mis reportes', 'Consulta el avance de lo que has publicado.'],
  Guardados: ['Reportes guardados', 'Los casos que quieres seguir de cerca.'],
  Resumen: ['Una comunidad mejor atendida', 'Prioriza los pendientes y acompaña cada solución.'],
  Reportes: ['Gestión de reportes', 'Revisa los casos, registra avances y modera el contenido.'],
  Usuarios: ['Personas de tu comunidad', 'Consulta las cuentas y administra su acceso.'],
  Cuenta: ['Tu espacio', 'Ajusta la apariencia y administra tu sesión.'],
};
function authRoute() { return location.hash === '#/login' ? 'login' : location.hash === '#/registro' ? 'register' : null; }
function App() {
  const [reports, setReports] = useState([]), [user, setUser] = useState(null), [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const [page, setPage] = useState('Inicio'), [workspace, setWorkspace] = useState('neighbor');
  const [modal, setModal] = useState(null), [intent, setIntent] = useState(false), [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('Todas'), [status, setStatus] = useState('Todos'), [priority, setPriority] = useState('Todas'), [sort, setSort] = useState('recent');
  const [filters, setFilters] = useState(false), [menu, setMenu] = useState(false), [limit, setLimit] = useState(9);
  const [showExamples, setShowExamples] = useState(false), [toast, setToast] = useState(''), [busy, setBusy] = useState(''), [userAction, setUserAction] = useState(null);
  const appearance = useAppearance();
  const { theme, setTheme, motion } = appearance;
  const [authMode, setAuthMode] = useState(authRoute);
  const authTrigger = useRef(null), authReturnHash = useRef('');
  const generation = useRef(0), menuButton = useRef(null);
  const isAdmin = user?.role === 'admin', managing = isAdmin && workspace === 'admin';
  const nav = managing ? adminNav : neighborNav;
  const notify = (message) => setToast(message);
  const load = async () => {
    const current = ++generation.current;
    try {
      const [data, identity] = await Promise.all([api('/reports'), api('/me')]);
      if (current !== generation.current) return;
      setReports(data.reports); setUser(identity.user); setError('');
      if (identity.user?.role === 'admin') {
        const result = await api('/admin/users');
        if (current === generation.current) setAccounts(result.users);
      } else { setAccounts([]); setWorkspace('neighbor'); }
    } catch (e) { if (current === generation.current) setError(e.message); }
    finally { if (current === generation.current) { setLoading(false); setRefreshing(false); } }
  };
  useEffect(() => {
    load();
    const refresh = () => { if (!document.hidden) load(); };
    const timer = setInterval(refresh, 120000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); generation.current++; };
  }, []);
  useEffect(() => {
    const hash = () => {
      setSelectedId(location.hash.match(/^#reporte\/(AV-[a-zA-Z0-9-]+)$/)?.[1] || null);
      setAuthMode(authRoute());
    };
    hash(); window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => { setLimit(9); }, [page, search, category, status, priority, sort, showExamples]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e) => { if (e.key === 'Escape') { setMenu(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [menu]);
  useEffect(() => {
    if (!isAdmin && adminNav.some(([label]) => label === page)) setPage('Inicio');
  }, [isAdmin, page]);
  const navigate = (next) => {
    setPage(next); setMenu(false); setSearch(''); setCategory('Todas'); setStatus('Todos'); setPriority('Todas'); setFilters(false);
    window.scrollTo({ top: 0, behavior: motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const switchWorkspace = () => { const next = managing ? 'neighbor' : 'admin'; setWorkspace(next); navigate(next === 'admin' ? 'Resumen' : 'Inicio'); };
  const authenticate = (create = false) => {
    authTrigger.current = document.activeElement;
    authReturnHash.current = location.hash;
    setIntent(create); setMenu(false); setModal(null);
    location.hash = '/login'; setAuthMode('login');
    window.scrollTo({ top: 0 });
  };
  const changeAuthMode = (mode) => { location.hash = mode === 'register' ? '/registro' : '/login'; setAuthMode(mode); };
  const leaveAuth = () => {
    history.replaceState(null, '', location.pathname + location.search + authReturnHash.current);
    setAuthMode(null); setIntent(false);
    requestAnimationFrame(() => {
      const target = authTrigger.current?.isConnected ? authTrigger.current : document.querySelector('#main-content h1');
      if (target?.tagName === 'H1') target.tabIndex = -1;
      target?.focus({ preventScroll: true });
    });
  };
  const newReport = () => user ? setModal('new') : authenticate(true);
  const openReport = (report) => { location.hash = `reporte/${report.id}`; setSelectedId(report.id); };
  const closeReport = () => { history.replaceState(null, '', location.pathname + location.search); setSelectedId(null); };
  const replace = (report) => {
    generation.current++;
    setReports((items) => items.some((r) => r.id === report.id) ? items.map((r) => r.id === report.id ? report : r) : [report, ...items]);
    setRefreshing(false);
  };
  const participate = async (report, action) => {
    if (!user) return authenticate();
    if (busy) return;
    setBusy(`${action}-${report.id}`);
    try {
      const result = await api(`/reports/${report.id}/${action}`, { method: 'PUT', body: { active: action === 'save' ? !report.saved : !report.supported } });
      replace(result.report);
      if (action === 'save') notify(result.report.saved ? 'Reporte guardado.' : 'Reporte retirado de guardados.');
    } catch (e) { notify(e.message); } finally { setBusy(''); }
  };
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); setUser(null); setAccounts([]); setWorkspace('neighbor'); navigate('Inicio'); await load(); }
    catch (e) { notify(e.message); }
  };
  const communityReports = useMemo(() => reports.filter((r) => showExamples || !r.demo), [reports, showExamples]);
  const filtered = useMemo(() => filterReports(communityReports, { search, category, status, priority, sort, mine: page === 'Mis reportes', saved: page === 'Guardados' }), [communityReports, search, category, status, priority, sort, page]);
  const current = reports.find((r) => r.id === selectedId);
  const realReports = reports.filter((r) => !r.demo);
  const metrics = [
    { label: 'Por atender', value: realReports.filter((r) => r.status === 'Reportado').length, Icon: Clock3, tone: 'amber', status: 'Reportado' },
    { label: 'En proceso', value: realReports.filter((r) => r.status === 'En proceso').length, Icon: Construction, tone: 'blue', status: 'En proceso' },
    { label: 'Resueltos', value: realReports.filter((r) => r.status === 'Resuelto').length, Icon: CheckCircle2, tone: 'green', status: 'Resuelto' },
  ];
  const pending = realReports.filter((r) => r.status !== 'Resuelto').sort((a, b) => (b.priority === 'Alta') - (a.priority === 'Alta') || a.date.localeCompare(b.date));
  const matchingAccounts = accounts.filter((u) => `${u.name} ${u.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const activeFilters = category !== 'Todas' || status !== 'Todos' || priority !== 'Todas';
  const clearFilters = () => { setSearch(''); setCategory('Todas'); setStatus('Todos'); setPriority('Todas'); };
  const exportData = async () => { try { await downloadReports(filtered); notify('Archivo listo.'); } catch (e) { notify(e.message); } };
  const moderateUser = async () => {
    if (busy || !userAction) return;
    setBusy('user');
    try {
      await api(`/admin/users/${userAction.id}/status`, { method: 'PATCH', body: { status: userAction.status === 'suspended' ? 'active' : 'suspended' } });
      setUserAction(null); await load(); notify('Acceso del usuario actualizado.');
    } catch (e) { notify(e.message); } finally { setBusy(''); }
  };
  const renderReport = (r) => {
    const Icon = categoryIcons[r.category] || FileText;
    return <article className="report-card" key={r.id}>
      <button className={`card-image ${!r.photos?.length ? 'illustrated' : ''}`} onClick={() => openReport(r)} aria-label={`Ver reporte: ${r.title}`}><ReportImage report={r} /><Badge status={r.status} />{r.demo && <span className="example-label">Ejemplo</span>}</button>
      <div className="card-content"><div className="card-meta"><span className={`category-label ${categoryTone[r.category]}`}><Icon size={14} />{r.category}</span><span className={`priority-label ${r.priority}`}><i />{r.priority}</span></div>
        <button className="card-title" onClick={() => openReport(r)}>{r.title}</button>
        <p className="card-description">{r.description}</p><div className="card-address"><MapPin size={14} /><span>{r.address}</span></div>
        <div className="card-footer"><button className={r.supported ? 'supported' : ''} aria-label={`${r.supported ? 'Retirar apoyo a' : 'Apoyar'} ${r.title}`} aria-pressed={r.supported} disabled={!!busy} onClick={() => participate(r, 'support')}><Heart size={16} fill={r.supported ? 'currentColor' : 'none'} />{r.votes}</button>
          <button onClick={() => openReport(r)} aria-label={`Comentarios de ${r.title}`}><MessageCircle size={16} />{r.comments.length}</button><time>{dateLabel(r.date)}</time><button aria-label={`${r.saved ? 'Quitar de guardados' : 'Guardar'} ${r.title}`} aria-pressed={r.saved} disabled={!!busy} onClick={() => participate(r, 'save')}><Bookmark size={17} fill={r.saved ? 'currentColor' : 'none'} /></button></div>
      </div></article>;
  };
  const renderTable = (items) => <div className="report-table" role="list">{items.map((r) => <button key={r.id} className="report-row" role="listitem" onClick={() => openReport(r)}><span className={`category-icon ${categoryTone[r.category]}`}>{React.createElement(categoryIcons[r.category] || FileText, { size: 21 })}</span><span className="row-title"><strong>{r.title}</strong><small>{r.author} · {dateLabel(r.date)}</small></span><span className={`priority-label ${r.priority}`}><i />{r.priority}</span><Badge status={r.status} /><ChevronRight size={18} /></button>)}</div>;

  const utilityDialog = modal === 'appearance' ? <Dialog title="Personalizar apariencia" className="appearance-dialog" onClose={() => setModal(null)}><AppearancePanel appearance={appearance} /></Dialog> : modal === 'emergency' ? <Dialog title="Llamadas de emergencia" wide className="emergency-dialog" onClose={() => setModal(null)}><EmergencyHelp /></Dialog> : null;

  if (authMode) return <><AuthForm mode={authMode} onModeChange={changeAuthMode} onBack={leaveAuth} appearance={<ThemePicker theme={theme} setTheme={setTheme} />} connection={<div className="auth-utility-links"><button className="text-button" onClick={() => setModal('emergency')}><Phone size={15} />Emergencias</button>{isNative() && <button className="text-button auth-connection" onClick={() => setModal('server')}><Settings size={15} />Configurar conexión</button>}</div>} onSuccess={async (identity) => {
    generation.current++;
    setUser(identity); leaveAuth(); setModal(intent ? 'new' : null);
    if (identity.role === 'admin' && !intent) { setWorkspace('admin'); navigate('Resumen'); }
    await load();
  }} />{modal === 'server' && <Dialog title="Conexión de la comunidad" onClose={() => setModal(null)}><ServerSettings onSaved={() => setModal(null)} /></Dialog>}{utilityDialog}</>;

  return <div className="app-shell">
    {menu && <div className="menu-overlay" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'open' : ''}`} id="community-navigation">
      <button className="sidebar-close icon-button" aria-label="Cerrar navegación" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><X size={21} /></button>
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate(managing ? 'Resumen' : 'Inicio'); }}><span className="brand-mark"><img src="/logo.png" alt="" width="48" height="48" /></span><span>Alerta<span>Vecinal</span><small>HOGAR CONECTADO</small></span></a>
      <div className={`workspace-label ${managing ? 'admin' : ''}`}><span className="workspace-symbol">{managing ? <ShieldCheck size={19} /> : <MapPin size={19} />}</span><div><strong>{managing ? 'Administración' : community.name}</strong><small>{managing ? 'Gestión y moderación' : `${community.province} · ${community.region}`}</small></div></div>
      <span className="nav-caption">{managing ? 'GESTIONAR' : 'EXPLORAR'}</span>
      <nav aria-label="Navegación principal">{nav.map(([label, Icon]) => <button key={label} className={page === label ? 'active' : ''} aria-current={page === label ? 'page' : undefined} onClick={() => navigate(label)}><Icon size={19} /><span>{label}</span>{label === 'Reportes' && <span className="nav-count">{pending.length}</span>}{label === 'Guardados' && reports.some((r) => r.saved) && <span className="nav-count">{reports.filter((r) => r.saved).length}</span>}</button>)}</nav>
      {!managing && <button className="button primary sidebar-create" onClick={newReport}><Plus size={18} />Nuevo reporte</button>}
      <button className="sidebar-help" onClick={() => { setMenu(false); setModal('emergency'); }}><span><Phone size={20} /></span><div><strong>Estamos más cerca.</strong><small>Contactos de emergencia</small></div><ArrowUpRight size={16} /></button>
      <div className="sidebar-bottom"><button className="sidebar-personalize" onClick={() => { setMenu(false); setModal('appearance'); }}><Palette size={18} />Personalizar<ChevronRight size={16} /></button>{isAdmin && <button className="workspace-switch" onClick={switchWorkspace}>{managing ? <UserRound size={18} /> : <ShieldCheck size={18} />}<span>{managing ? 'Vista de vecino' : 'Administración'}</span><ArrowRight size={16} /></button>}
        <button className="profile-button" onClick={() => user ? navigate('Cuenta') : authenticate()}><span className="avatar">{user ? user.name[0].toUpperCase() : <UserRound size={20} />}</span><span><strong>{user?.name || 'Bienvenido'}</strong><small>{user ? isAdmin ? 'Administrador' : 'Vecino' : 'Inicia sesión para participar'}</small></span><Settings size={17} /></button>
      </div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-location"><button className="mobile-menu icon-button" ref={menuButton} aria-label="Abrir navegación" aria-controls="community-navigation" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={22} /></button><span>{managing ? 'Administración' : community.name}</span><ChevronRight size={14} /><img className="mobile-brand-logo" src="/logo.png" alt="AlertaVecinal" width="33" height="33" /><strong>{page}</strong></div><div className="topbar-actions"><ThemePicker theme={theme} setTheme={setTheme} /><button className="icon-button personalize-trigger" aria-label="Personalizar apariencia" onClick={() => setModal('appearance')}><Palette size={19} /></button><button className="emergency-trigger" aria-label="Abrir llamadas de emergencia" onClick={() => setModal('emergency')}><Phone size={16} /><span>Emergencias</span><b>SOS</b></button><button className="icon-button refresh-button" aria-label="Actualizar reportes" disabled={refreshing} onClick={() => { setRefreshing(true); load(); }}><RefreshCw size={18} className={refreshing ? 'spin' : ''} /></button><button className="avatar topbar-avatar" aria-label={user ? 'Abrir mi cuenta' : 'Iniciar sesión'} onClick={() => user ? navigate('Cuenta') : authenticate()}>{user?.name[0].toUpperCase() || <UserRound size={18} />}</button></div></header>
      <main id="main-content"><div className="page-heading"><div><span className="eyebrow">{managing ? 'PANEL DE ADMINISTRACIÓN' : community.label.toUpperCase()}</span><h1>{pageInfo[page]?.[0]}</h1><p>{pageInfo[page]?.[1]}</p></div>{!['Cuenta', 'Usuarios'].includes(page) && <button className="button primary heading-action" onClick={managing ? exportData : newReport}>{managing ? <Download size={17} /> : <Plus size={18} />}{managing ? 'Exportar reportes' : 'Nuevo reporte'}</button>}</div>
        {error && <div className="error-banner" role="alert"><AlertTriangle size={19} /><span>{error}</span><button onClick={load}>Reintentar</button>{isNative() && <button onClick={() => setModal('server')}>Configurar conexión</button>}</div>}
        {loading ? <div className="loading-state" role="status"><img src="/logo.png" alt="AlertaVecinal" width="110" height="110" /><LoaderCircle size={24} className="spin" /><p>Conectando con tu comunidad...</p><small>La primera conexión puede tardar hasta 90 segundos.</small></div> : <>
          {page === 'Cuenta' ? <section className="account-layout"><div className="panel account-card"><span className="avatar large">{user?.name[0].toUpperCase() || <UserRound />}</span><h2>{user?.name || 'Forma parte de tu comunidad'}</h2><p>{user?.email || 'Crea una cuenta para publicar y seguir tus reportes.'}</p>{user && <span className="role-tag">{isAdmin ? <ShieldCheck size={14} /> : <UserRound size={14} />}{isAdmin ? 'Administrador' : 'Vecino'}</span>}{user ? <button className="button secondary" onClick={logout}><LogOut size={17} />Cerrar sesión</button> : <button className="button primary" onClick={() => authenticate()}>Iniciar sesión</button>}</div><div className="panel preferences"><AppearancePanel appearance={appearance} />{reports.some((r) => r.demo) && <label className="preference-row"><div><strong>Reportes de ejemplo</strong><p>Explora la app con datos de demostración.</p></div><input type="checkbox" checked={showExamples} onChange={(e) => setShowExamples(e.target.checked)} /></label>}{isNative() && <button className="preference-row preference-button" onClick={() => setModal('server')}><div><strong>Conexión de la comunidad</strong><p>Configura la dirección del servidor.</p></div><ChevronRight size={18} /></button>}{isAdmin && <button className="button secondary" onClick={switchWorkspace}><ShieldCheck size={17} />{managing ? 'Ir a la comunidad' : 'Abrir administración'}</button>}</div></section>
          : page === 'Usuarios' && managing ? <><div className="user-summary"><span><Users size={18} /><strong>{accounts.length}</strong> cuentas</span><span><i className="status-dot" />{accounts.filter((u) => u.status !== 'suspended').length} activas</span></div><div className="panel users-panel"><div className="section-heading"><h2>Usuarios registrados</h2><label className="search-field"><Search size={17} /><input placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><div className="users-list">{matchingAccounts.length ? matchingAccounts.map((u) => <div className="user-row" key={u.id}><span className="avatar">{u.name[0].toUpperCase()}</span><div className="user-identity"><strong>{u.name}{u.id === user.id && <small> · Tú</small>}</strong><span>{u.email}</span></div><span className="user-report-count">{u.report_count} reportes</span><span className={`user-status ${u.status === 'suspended' ? 'suspended' : ''}`}>{u.role === 'admin' ? 'Administrador' : u.status === 'suspended' ? 'Suspendido' : 'Activo'}</span>{u.role !== 'admin' && <button className="button small secondary" onClick={() => setUserAction(u)}>{u.status === 'suspended' ? 'Reactivar' : 'Suspender'}</button>}</div>) : <Empty Icon={Users} title="Sin resultados" text="Prueba con otro nombre o correo." />}</div></div></>
          : page === 'Resumen' && managing ? <><div className="metrics-grid">{metrics.map(({ label, value, Icon, tone, status: next }) => <button className={`metric-card ${tone}`} key={label} onClick={() => { navigate('Reportes'); setStatus(next); }}><span className="metric-icon"><Icon size={21} /></span><div><span>{label}</span><strong>{value}</strong></div><ArrowUpRight size={18} /></button>)}</div><div className="admin-overview"><section className="panel"><div className="section-heading"><div><h2>Necesitan atención</h2><p>Primero los casos de prioridad alta.</p></div><button className="text-button" onClick={() => navigate('Reportes')}>Ver todos<ArrowRight size={16} /></button></div>{pending.length ? renderTable(pending.slice(0, 5)) : <Empty Icon={CheckCircle2} title="Todo al día" text="No hay reportes pendientes de atención." />}</section><section className="panel community-summary"><div className="section-heading"><h2>Tu comunidad</h2><Users size={19} /></div><strong className="community-total">{accounts.filter((u) => u.status !== 'suspended').length}</strong><p>personas con acceso activo</p><div className="summary-line"><span>Reportes publicados</span><strong>{realReports.length}</strong></div><div className="summary-line"><span>Casos resueltos</span><strong>{realReports.filter((r) => r.status === 'Resuelto').length}</strong></div><button className="button secondary" onClick={() => navigate('Usuarios')}>Gestionar usuarios<ArrowRight size={16} /></button></section></div><section className="panel category-summary"><div className="section-heading"><h2>Reportes por categoría</h2></div><div className="category-bars">{categories.map((c) => { const count = realReports.filter((r) => r.category === c).length; return <div key={c}><span>{c}</span><div><i style={{ width: `${realReports.length ? count / realReports.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>; })}</div></section></>
          : <>
            {page === 'Inicio' && <><div className="community-intro"><div className="hero-copy"><span className="intro-label"><span className="status-dot" />VECINOS QUE HACEN LA DIFERENCIA</span><h2>Un barrio conectado.<br /><span>Una comunidad que cuida.</span></h2><p>Tu voz pone el cambio en marcha. Comparte lo que sucede y acompaña cada solución.</p><div className="hero-actions"><button className="button primary" onClick={newReport}>Crear un reporte<ArrowUpRight size={18} /></button><button className="text-button" onClick={() => navigate('Mapa')}><MapPin size={16} />Explorar el mapa</button></div></div><NeighborhoodArt /><div className="intro-stats">{metrics.map(({ label, value, Icon, tone, status: next }) => <button key={label} onClick={() => { setStatus(next); setFilters(true); }}><span className={`category-icon ${tone}`}><Icon size={20} /></span><strong>{value}</strong><span>{label}</span><ArrowUpRight className="stat-arrow" size={16} /></button>)}</div></div><EmergencyStrip onOpen={() => setModal('emergency')} /></>}
            {['Mis reportes', 'Guardados'].includes(page) && !user ? <Empty Icon={UserRound} title="Tu comunidad te espera" text="Inicia sesión para consultar tus reportes y guardados." action={<button className="button primary" onClick={() => authenticate()}>Iniciar sesión</button>} /> : <>
              <section className="report-section"><div className="section-heading"><div><h2>{page === 'Inicio' ? 'Reportes de la comunidad' : page === 'Reportes' ? 'Todos los reportes' : page === 'Mapa' ? 'Explorar reportes' : 'Tus reportes'}</h2><p>{filtered.length} {filtered.length === 1 ? 'reporte' : 'reportes'}{showExamples ? ' · Incluye ejemplos' : ''}</p></div>{!managing && <button className="icon-button" aria-label="Exportar reportes filtrados" onClick={exportData}><Download size={18} /></button>}</div>
                <div className="report-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Buscar reportes" placeholder="Buscar en tu comunidad..." value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button aria-label="Borrar búsqueda" onClick={() => setSearch('')}><X size={16} /></button>}</label><button className={`button secondary ${activeFilters ? 'filter-active' : ''}`} aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={17} />Filtros{activeFilters && <i className="filter-dot" />}</button><select aria-label="Ordenar reportes" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Más recientes</option><option value="popular">Más apoyados</option><option value="priority">Mayor prioridad</option></select></div>
                {filters && <div className="filter-panel"><label>Categoría<select aria-label="Filtrar por categoría" value={category} onChange={(e) => setCategory(e.target.value)}>{['Todas', ...categories].map((c) => <option key={c}>{c}</option>)}</select></label><label>Estado<select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)}>{['Todos', ...statuses].map((s) => <option key={s}>{s}</option>)}</select></label><label>Prioridad<select aria-label="Filtrar por prioridad" value={priority} onChange={(e) => setPriority(e.target.value)}>{['Todas', 'Alta', 'Media', 'Baja'].map((p) => <option key={p}>{p}</option>)}</select></label><button className="text-button" onClick={clearFilters}>Limpiar filtros<X size={14} /></button></div>}
                {showExamples && <div className="demo-note"><Eye size={15} />Los ejemplos no representan incidencias reales.<button onClick={() => setShowExamples(false)}>Ocultar ejemplos</button></div>}
                {page === 'Mapa' ? <div className="map-explorer"><MapView reports={filtered} onSelect={openReport} height={460} locate /><div className="map-results">{filtered.map((r) => <button className="map-result" key={r.id} onClick={() => openReport(r)}><span className={`category-icon ${categoryTone[r.category]}`}><MapPin size={17} /></span><div><strong>{r.title}</strong><small>{r.address}</small></div><ChevronRight size={17} /></button>)}{!filtered.length && <p className="map-empty">No hay reportes para mostrar en el mapa.</p>}</div></div>
                : filtered.length ? <>{managing ? renderTable(filtered.slice(0, limit)) : <div className="report-grid">{filtered.slice(0, limit).map(renderReport)}</div>}{filtered.length > limit && <div className="load-more"><button className="button secondary" onClick={() => setLimit(limit + 9)}>Ver más reportes<ArrowRight size={16} /></button></div>}</>
                : <Empty Icon={page === 'Guardados' ? Bookmark : FileText} title={search || activeFilters ? 'No encontramos coincidencias' : page === 'Guardados' ? 'Guarda lo que te importa' : 'Aquí empieza el cambio'} text={search || activeFilters ? 'Prueba con otra búsqueda o ajusta los filtros.' : page === 'Guardados' ? 'Toca el marcador de un reporte para seguirlo desde aquí.' : 'Publica el primer reporte y ayuda a mejorar tu comunidad.'} action={search || activeFilters ? <button className="button secondary" onClick={clearFilters}>Limpiar filtros</button> : <div className="empty-actions"><button className="button primary" onClick={newReport}><Plus size={17} />Nuevo reporte</button>{reports.some((r) => r.demo) && !showExamples && <button className="text-button" onClick={() => setShowExamples(true)}>Explorar ejemplos<ArrowRight size={16} /></button>}</div>} />}
              </section>
            </>}
          </>}
        </>}
        <footer className="app-footer"><span>AlertaVecinal<span> · </span>Hogar conectado</span><span>Construimos comunidad, reporte a reporte.</span></footer>
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">{(managing ? adminNav : neighborNav).map(([label, Icon], i) => <React.Fragment key={label}>{!managing && i === 2 && <button className="mobile-new" aria-label="Crear nuevo reporte" onClick={newReport}><Plus size={24} /></button>}<button className={page === label ? 'active' : ''} onClick={() => navigate(label)}><Icon size={20} /><span>{label}</span></button></React.Fragment>)}{managing && <button className={page === 'Cuenta' ? 'active' : ''} onClick={() => navigate('Cuenta')}><Settings size={20} /><span>Cuenta</span></button>}</nav>
    {utilityDialog}
    {modal === 'new' && <Dialog title="Nuevo reporte" wide onClose={() => setModal(null)}><ReportForm onClose={() => setModal(null)} onCreated={(r) => { replace(r); setModal(null); navigate('Mis reportes'); notify('Tu reporte ya está publicado.'); }} /></Dialog>}
    {modal === 'server' && <Dialog title="Conexión de la comunidad" onClose={() => setModal(null)}><ServerSettings onSaved={() => { setModal(null); load(); }} /></Dialog>}
    {selectedId && <Dialog title={current?.title || 'Reporte'} wide className="detail-dialog" onClose={closeReport}>{current ? <ReportDetail key={current.id} report={current} user={user} onUpdate={replace} onDelete={(id) => { generation.current++; setReports((items) => items.filter((r) => r.id !== id)); closeReport(); }} onAuth={() => { closeReport(); authenticate(); }} notify={notify} /> : <Empty title={loading ? 'Cargando reporte' : 'Reporte no disponible'} text={loading ? 'Un momento, por favor.' : 'El reporte pudo haber sido eliminado.'} />}</Dialog>}
    {userAction && <Dialog title="Cambiar acceso del usuario" onClose={() => !busy && setUserAction(null)}><div className="confirm-dialog"><span className="confirm-icon"><Users size={25} /></span><h2>{userAction.status === 'suspended' ? '¿Reactivar esta cuenta?' : '¿Suspender esta cuenta?'}</h2><p><strong>{userAction.name}</strong>{userAction.status === 'suspended' ? ' podrá volver a participar en la comunidad.' : ' no podrá publicar ni participar mientras dure la suspensión. Sus reportes se conservarán.'}</p><div className="confirm-actions"><button className="button secondary" disabled={!!busy} onClick={() => setUserAction(null)}>Cancelar</button><button className={`button ${userAction.status === 'suspended' ? 'primary' : 'danger'}`} disabled={!!busy} onClick={moderateUser}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{userAction.status === 'suspended' ? 'Reactivar cuenta' : 'Suspender cuenta'}</button></div></div></Dialog>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{toast}</span><button aria-label="Cerrar aviso" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
