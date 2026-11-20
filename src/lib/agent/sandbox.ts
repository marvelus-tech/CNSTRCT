import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "../db";
import { searchDetailers, searchTradies } from "./directory";
import { orgo } from "./orgo";
import { getAgent, getComputer, upsertComputer } from "../store";

/**
 * Computer backend.
 * grokbot-clone used Orgo only (server/src/computer.ts). CNSTRCT keeps that
 * client, and falls through to Docker or a local folder so the demo runs
 * with no keys. Docker is used only when the daemon already answers.
 * The local folder is the default on this machine.
 */

const ALLOW = new Set(["ls", "cat", "mkdir", "head", "tail", "wc", "find", "printf", "echo", "pwd", "touch", "cp", "mv", "rm"]);

let dockerCache: boolean | null = null;

export type SandboxProvider = "orgo" | "docker" | "local";

export function sandboxRoot(agentId: string) {
  return path.join(dataDir(), "sandboxes", agentId);
}

export function ensureWorkspace(agentId: string) {
  const root = sandboxRoot(agentId);
  fs.mkdirSync(path.join(root, "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, "outbox"), { recursive: true });
  return root;
}

export function configuredProvider(): SandboxProvider {
  if (process.env.ORGO_API_KEY && process.env.ORGO_WORKSPACE_ID) return "orgo";
  if (dockerAvailable()) return "docker";
  return "local";
}

function dockerAvailable() {
  if (dockerCache != null) return dockerCache;
  const result = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { timeout: 1500, encoding: "utf8" });
  dockerCache = result.status === 0;
  return dockerCache;
}

export function providerNote(provider: SandboxProvider) {
  if (provider === "orgo") return "Orgo cloud computer. Sends still wait for approval.";
  if (provider === "docker") return "Docker sandbox with the network off. Sends still wait for approval.";
  return "Local sandbox folder on the CNSTRCT server. Commands cannot open the network.";
}

function safePath(root: string, rel: string) {
  const cleaned = rel.replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("\0") || cleaned.split(/[\\/]/).includes("..")) {
    throw new Error("That path leaves the sandbox.");
  }
  const abs = path.resolve(root, cleaned);
  const base = path.resolve(root);
  if (abs !== base && !abs.startsWith(base + path.sep)) throw new Error("That path leaves the sandbox.");
  return abs;
}

export function writeSandboxFile(agentId: string, rel: string, content: string) {
  const root = ensureWorkspace(agentId);
  const abs = safePath(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  appendTerminal(agentId, `$ write ${rel} (${content.length} chars)`);
  return rel;
}

export function readSandboxFile(agentId: string, rel: string) {
  const abs = safePath(ensureWorkspace(agentId), rel);
  return fs.readFileSync(abs, "utf8");
}

export function listSandboxFiles(agentId: string) {
  const root = ensureWorkspace(agentId);
  const out: { path: string; bytes: number }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name !== "terminal.log") {
        out.push({ path: path.relative(root, abs).split(path.sep).join("/"), bytes: fs.statSync(abs).size });
      }
    }
  };
  walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function readTerminal(agentId: string) {
  const file = path.join(ensureWorkspace(agentId), "terminal.log");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8").split("\n").slice(-40).join("\n").trim();
}

function appendTerminal(agentId: string, line: string) {
  const file = path.join(ensureWorkspace(agentId), "terminal.log");
  fs.appendFileSync(file, `${line}\n`);
}

function blocked(command: string) {
  if (/[\r\n]/.test(command)) return "Newlines are blocked. One command only.";
  if (/[|&;`$<>\\]/.test(command)) return "Chaining, pipes, redirects, and substitution are blocked.";
  if (/\b(curl|wget|nc|ncat|ssh|scp|sudo|python3?|python|node|npm|pnpm|pip|ruby|perl|php|bash|sh|zsh)\b/i.test(command)) {
    return "Network tools and interpreters are blocked. Outbound messages use an approval card instead.";
  }
  return null;
}

/** Exact argv allowlist. Rejects chaining, newlines, and interpreters before any machine sees the string. */
export function planCommand(command: string): { ok: true; argv: string[] } | { ok: false; reason: string } {
  const reason = blocked(command);
  if (reason) return { ok: false, reason };
  const argv = tokenize(command.trim());
  const bin = argv[0];
  if (!bin || !ALLOW.has(bin)) {
    return { ok: false, reason: `Command not allowed: ${bin || command}. Interpreters and network tools are blocked.` };
  }
  if (bin === "rm" && argv.some((token) => token === "/" || token.includes(".."))) {
    return { ok: false, reason: "Refusing to delete outside this folder." };
  }
  return { ok: true, argv };
}

export function commandLine(argv: string[]) {
  return argv.map((token) => `'${token.replaceAll("'", `'"'"'`)}'`).join(" ");
}

function tokenize(segment: string) {
  const tokens: string[] = [];
  const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(segment))) tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  return tokens;
}

function runLocal(root: string, argv: string[]): Promise<{ exitCode: number; output: string }> {
  const bin = argv[0]!;
  return new Promise((resolve) => {
    const child = spawn(bin, argv.slice(1), {
      cwd: root,
      env: { PATH: "/usr/bin:/bin", HOME: root, LANG: "C" } as unknown as NodeJS.ProcessEnv,
      timeout: 8_000,
    });
    let text = "";
    child.stdout.on("data", (chunk) => {
      text += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      text += String(chunk);
    });
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output: text.slice(0, 8000) || "(no output)" }));
    child.on("error", (error) => resolve({ exitCode: 127, output: error.message }));
  });
}

async function runDocker(root: string, argv: string[]) {
  return new Promise<{ exitCode: number; output: string }>((resolve) => {
    const child = spawn(
      "docker",
      ["run", "--rm", "--network", "none", "-v", `${root}:/work`, "-w", "/work", "alpine:3.20", ...argv],
      { timeout: 20_000 },
    );
    let text = "";
    child.stdout.on("data", (chunk) => {
      text += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      text += String(chunk);
    });
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output: text.slice(0, 8000) }));
    child.on("error", (error) => resolve({ exitCode: 127, output: error.message }));
  });
}

export async function execInSandbox(agentId: string, command: string, city = "the area") {
  const root = ensureWorkspace(agentId);
  const trimmed = command.trim();
  appendTerminal(agentId, `$ ${trimmed}`);
  const orgoId = getAgent(agentId)?.orgoComputerId ?? null;
  if (trimmed.startsWith("cnstrct-search")) {
    const output = /detailers/i.test(trimmed) ? searchDetailers(city) : searchTradies(city);
    appendTerminal(agentId, output);
    if (!orgoId) {
      const provider = configuredProvider() === "orgo" ? "local" : configuredProvider();
      upsertComputer(agentId, provider === "docker" ? "docker" : "local", "running", providerNote(provider === "docker" ? "docker" : "local"));
    }
    return { exitCode: 0, output, provider: (orgoId ? "orgo" : "local") as SandboxProvider };
  }
  const plan = planCommand(trimmed);
  if (!plan.ok) {
    appendTerminal(agentId, plan.reason);
    return { exitCode: 126, output: plan.reason, provider: (orgoId ? "orgo" : "local") as SandboxProvider };
  }

  if (orgoId && process.env.ORGO_API_KEY) {
    try {
      const info = await orgo.getComputer(orgoId);
      if ((info.status ?? "").toLowerCase() !== "running") {
        const resumed = await orgo.resume(orgoId);
        if ((resumed.status ?? "").toLowerCase() !== "running") {
          throw new Error("Orgo computer is not running yet.");
        }
      }
      const result = await orgo.bash(orgoId, commandLine(plan.argv));
      const output = result.output || "(no output)";
      appendTerminal(agentId, output);
      upsertComputer(agentId, "orgo", "connected", "Orgo Small computer. App secrets are not on this VM.");
      return { exitCode: result.exit_code ?? 0, output, provider: "orgo" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Orgo failed";
      appendTerminal(agentId, `Orgo command failed (${message}). This computer was not switched to the local sandbox.`);
      return { exitCode: 1, output: message, provider: "orgo" as const };
    }
  }

  const wanted = configuredProvider();
  if (wanted === "docker") {
    const result = await runDocker(root, plan.argv);
    if (result.exitCode === 0 || !result.output.includes("Unable to find image")) {
      appendTerminal(agentId, result.output);
      upsertComputer(agentId, "docker", "running", providerNote("docker"));
      return { ...result, provider: "docker" as const };
    }
    appendTerminal(agentId, "Docker image unavailable. Using the local sandbox.");
  }

  const result = await runLocal(root, plan.argv);
  appendTerminal(agentId, result.output);
  upsertComputer(agentId, "local", "running", providerNote("local"));
  return { ...result, provider: "local" as const };
}

export function removeWorkspace(agentId: string) {
  fs.rmSync(sandboxRoot(agentId), { recursive: true, force: true });
}

export function workspacePreview(agentId: string) {
  const root = sandboxRoot(agentId);
  for (const rel of ["notes/tradies.md", "notes/lead.md", "notes/screen.txt"]) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return { path: rel, body: fs.readFileSync(abs, "utf8").slice(0, 4000) };
  }
  return null;
}

export function computerSnapshot(agentId: string) {
  const saved = getComputer(agentId);
  const provider = (saved?.provider as SandboxProvider | undefined) ?? configuredProvider();
  return {
    provider,
    status: saved?.status ?? "running",
    note: saved?.note || providerNote(provider),
    terminal: readTerminal(agentId),
    files: listSandboxFiles(agentId),
    preview: workspacePreview(agentId),
  };
}
