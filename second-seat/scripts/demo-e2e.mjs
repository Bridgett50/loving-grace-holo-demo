#!/usr/bin/env node
// Headless end-to-end check for the whole `?demo=1` guided flow (T18).
//
// Runs the core package's committed demo e2e suite file with the already
// installed vitest binary (no new dependencies) and prints a short
// PASS/FAIL summary. Exits non-zero on failure.
//
// Exact command: `node second-seat/scripts/demo-e2e.mjs` (from the repo root).
// Narrated version of the same flow: the "Demo walkthrough" section in
// second-seat/README.md.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const coreDir = join(here, "..", "packages", "core");
const vitestBin = join(coreDir, "node_modules", ".bin", "vitest");
const suiteFile = "test/t2-demo-e2e.test.ts";

if (!existsSync(vitestBin)) {
  console.error(
    `FAIL: vitest binary not found at ${vitestBin}. Run pnpm install first, then retry.`,
  );
  process.exit(1);
}

try {
  const out = execFileSync(vitestBin, ["run", suiteFile], {
    cwd: coreDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const passLine = out
    .split("\n")
    .filter((line) => /Test Files|Tests /.test(line))
    .join(" | ");
  console.log(
    `PASS: headless ?demo=1 end-to-end check passed${passLine ? ` (${passLine.trim()})` : ""}. See the "Demo walkthrough" in second-seat/README.md.`,
  );
} catch (err) {
  const stdout = typeof err?.stdout === "string" ? err.stdout : "";
  const stderr = typeof err?.stderr === "string" ? err.stderr : "";
  const tail = `${stdout}\n${stderr}`
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(-15)
    .join("\n");
  console.error(`FAIL: headless ?demo=1 end-to-end check failed (${suiteFile}).`);
  if (tail.length > 0) console.error(tail);
  process.exit(typeof err?.status === "number" ? err.status : 1);
}
