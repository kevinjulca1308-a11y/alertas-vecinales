import { createApp } from "./app.js";
const port = Number(process.env.API_PORT || 3001);
const server = createApp().listen(
  port,
  process.env.API_HOST || "127.0.0.1",
  () => console.log(`AlertaVecinal API · SQLite · puerto ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
