export const categories = [
  "Alumbrado",
  "Limpieza",
  "Vías públicas",
  "Áreas verdes",
  "Otros",
];
export const statuses = ["Reportado", "En proceso", "Resuelto"];
export const seedReports = [
  {
    id: "AV-1048",
    title: "Alumbrado sin funcionar en una calle del barrio",
    category: "Alumbrado",
    status: "Reportado",
    address: "Sector de ejemplo 1 · Guadalupe, Pacasmayo",
    description:
      "Tres postes de luz no encienden por las noches. La zona queda oscura y dificulta el paso de los vecinos.",
    lat: -7.2415,
    lng: -79.4700,
    votes: 24,
    date: "2026-10-12T14:30:00Z",
    author: "María G.",
    demo: true,
    history: [{ status: "Reportado", date: "2026-10-12T14:30:00Z" }],
  },
  {
    id: "AV-1047",
    title: "Residuos acumulados cerca del mercado",
    category: "Limpieza",
    status: "En proceso",
    address: "Sector de ejemplo 2 · Guadalupe, Pacasmayo",
    description:
      "Hay bolsas y residuos en la esquina. Se necesita limpieza y un punto de recolección adecuado.",
    lat: -7.2445,
    lng: -79.4720,
    votes: 18,
    date: "2026-10-11T13:00:00Z",
    author: "Carlos R.",
    demo: true,
    history: [
      { status: "Reportado", date: "2026-10-11T13:00:00Z" },
      { status: "En proceso", date: "2026-10-12T09:00:00Z" },
    ],
  },
  {
    id: "AV-1046",
    title: "Bache en la intersección de dos calles",
    category: "Vías públicas",
    status: "Reportado",
    address: "Sector de ejemplo 3 · Guadalupe, Pacasmayo",
    description:
      "Un bache profundo representa un riesgo para ciclistas y vehículos. Se solicita reparación.",
    lat: -7.2420,
    lng: -79.4685,
    votes: 32,
    date: "2026-10-10T18:00:00Z",
    author: "Lucía P.",
    demo: true,
    history: [{ status: "Reportado", date: "2026-10-10T18:00:00Z" }],
  },
  {
    id: "AV-1045",
    title: "Recuperación de las áreas verdes del parque",
    category: "Áreas verdes",
    status: "Resuelto",
    address: "Parque de ejemplo · Guadalupe, Pacasmayo",
    description:
      "Se completó el mantenimiento de los jardines y la recuperación de las áreas verdes reportadas.",
    lat: -7.2450,
    lng: -79.4690,
    votes: 15,
    date: "2026-10-09T10:00:00Z",
    author: "Diego M.",
    demo: true,
    history: [
      { status: "Reportado", date: "2026-10-09T10:00:00Z" },
      { status: "En proceso", date: "2026-10-10T10:00:00Z" },
      { status: "Resuelto", date: "2026-10-11T16:00:00Z" },
    ],
  },
  {
    id: "AV-1044",
    title: "Luminaria dañada en un paseo vecinal",
    category: "Alumbrado",
    status: "En proceso",
    address: "Paseo de ejemplo · Guadalupe, Pacasmayo",
    description:
      "La luminaria presenta daños y requiere mantenimiento para mejorar la seguridad del paseo.",
    lat: -7.2405,
    lng: -79.4730,
    votes: 11,
    date: "2026-10-08T12:00:00Z",
    author: "Andrea S.",
    demo: true,
    history: [
      { status: "Reportado", date: "2026-10-08T12:00:00Z" },
      { status: "En proceso", date: "2026-10-09T12:00:00Z" },
    ],
  },
  {
    id: "AV-1043",
    title: "Mantenimiento de la vereda finalizado",
    category: "Vías públicas",
    status: "Resuelto",
    address: "Sector de ejemplo 6 · Guadalupe, Pacasmayo",
    description:
      "La vereda ha sido reparada y ya es accesible para las personas que transitan por esta calle.",
    lat: -7.2460,
    lng: -79.4715,
    votes: 9,
    date: "2026-10-07T10:00:00Z",
    author: "José V.",
    demo: true,
    history: [
      { status: "Reportado", date: "2026-10-07T10:00:00Z" },
      { status: "En proceso", date: "2026-10-08T10:00:00Z" },
      { status: "Resuelto", date: "2026-10-10T10:00:00Z" },
    ],
  },
];
const normalize = (value) =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export function filterReports(
  reports,
  {
    search = "",
    category = "Todas",
    status = "Todos",
    priority = "Todas",
    mine = false,
    saved = false,
    sort = "recent",
  } = {},
) {
  const q = normalize(search.trim());
  const priorities = { Alta: 3, Media: 2, Baja: 1 };
  return reports
    .filter(
      (r) =>
        (!mine || r.own) &&
        (!saved || r.saved) &&
        (category === "Todas" || r.category === category) &&
        (status === "Todos" || r.status === status) &&
        (priority === "Todas" || r.priority === priority) &&
        normalize(`${r.title} ${r.address} ${r.id}`).includes(q),
    )
    .sort((a, b) =>
      sort === "popular"
        ? b.votes - a.votes
        : sort === "priority"
          ? (priorities[b.priority] || 0) - (priorities[a.priority] || 0)
          : new Date(b.date) - new Date(a.date),
    );
}
