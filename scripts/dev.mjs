import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--watch", "server/index.js"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "0.0.0.0",
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 200).unref();
}
for (const child of children) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
