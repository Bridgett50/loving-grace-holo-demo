#!/usr/bin/env node
// Lists the licence of every installed npm package and fails on GPL/AGPL or non-commercial terms.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const store = join(process.cwd(), "node_modules", ".pnpm");
if (!existsSync(store)) {
  console.error("Run pnpm install first.");
  process.exit(1);
}

const byLicense = new Map();
const seen = new Set();
for (const entry of readdirSync(store)) {
  const nm = join(store, entry, "node_modules");
  if (!existsSync(nm)) continue;
  for (const name of readdirSync(nm)) {
    const dirs = name.startsWith("@") ? readdirSync(join(nm, name)).map((n) => join(name, n)) : [name];
    for (const d of dirs) {
      const file = join(nm, d, "package.json");
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, "utf8"));
      const key = `${pkg.name}@${pkg.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lic = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? (pkg.licenses?.map((l) => l.type).join(" OR ") || "UNKNOWN");
      if (!byLicense.has(lic)) byLicense.set(lic, new Set());
      byLicense.get(lic).add(pkg.name);
    }
  }
}

const NOTED = /^(MPL-2\.0|LGPL-3\.0-or-later|CC-BY-4\.0)$/;
const BLOCKED = /(^|[^L])GPL|AGPL|NC|Commons-Clause|Elastic|BUSL|SSPL/i;
let failed = false;
for (const [lic, names] of [...byLicense].sort((a, b) => b[1].size - a[1].size)) {
  const flag = BLOCKED.test(lic) && !NOTED.test(lic) ? "BLOCKED" : NOTED.test(lic) || lic === "UNKNOWN" ? "review" : "";
  if (flag === "BLOCKED") failed = true;
  const list = flag ? `: ${[...names].sort().join(", ")}` : "";
  console.log(`${flag ? `[${flag}] ` : ""}${lic} (${names.size})${list}`);
}
process.exit(failed ? 1 : 0);
