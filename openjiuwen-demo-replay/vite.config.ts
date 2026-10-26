import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_DEMO_PORT = 5174;
const DEFAULT_LIVE_PORT = 5180;
const PORT_KEYS = new Set([
  "OPENJIUWEN_DEMO_PORT",
  "OPENJIUWEN_LIVE_PORT",
  "OPENJIUWEN_LIVE_HOST",
  "OPENJIUWEN_LIVE_CORS",
  "OPENJIUWEN_LIVE_BASE",
  "VITE_LIVE_BASE",
]);

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readDotEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    if (!PORT_KEYS.has(key)) continue;
    out[key] = unquote(line.slice(eq + 1).trim());
  }
  return out;
}

function tcpPort(raw: string | undefined, name: string, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `${name} must be an integer TCP port from 1 to 65535, got ${JSON.stringify(raw)}`
    );
  }
  return port;
}

// Defaults: demo 5174, live API 5180. Shell env wins over .env.
// strictPort stays on so a busy port does not silently move (that would
// desync the browser origin from OPENJIUWEN_LIVE_CORS). Pick another
// OPENJIUWEN_DEMO_PORT instead.
export default defineConfig(({ mode }) => {
  const fileEnv: Record<string, string> = {};
  for (const name of [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]) {
    Object.assign(fileEnv, readDotEnv(path.join(process.cwd(), name)));
  }
  const pick = (key: string) => {
    const fromShell = process.env[key];
    if (fromShell != null && fromShell.trim() !== "") return fromShell.trim();
    const fromFile = fileEnv[key];
    if (fromFile != null && fromFile.trim() !== "") return fromFile.trim();
    return "";
  };
  const demoPort = tcpPort(pick("OPENJIUWEN_DEMO_PORT"), "OPENJIUWEN_DEMO_PORT", DEFAULT_DEMO_PORT);
  const livePort = tcpPort(pick("OPENJIUWEN_LIVE_PORT"), "OPENJIUWEN_LIVE_PORT", DEFAULT_LIVE_PORT);
  const liveBase = (
    pick("VITE_LIVE_BASE") ||
    pick("OPENJIUWEN_LIVE_BASE") ||
    `http://127.0.0.1:${livePort}`
  ).replace(/\/$/, "");
  if (!process.env.VITE_LIVE_BASE) process.env.VITE_LIVE_BASE = liveBase;

  return {
    // Keep Rollup entry paths consistent when the checkout is opened via a Windows junction.
    root: fs.realpathSync(process.cwd()),
    plugins: [react()],
    define: {
      __OPENJIUWEN_LIVE_BASE__: JSON.stringify(liveBase),
    },
    server: {
      host: "127.0.0.1",
      port: demoPort,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: demoPort,
      strictPort: true,
    },
  };
});
