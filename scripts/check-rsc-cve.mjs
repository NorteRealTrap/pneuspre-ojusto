import fs from "node:fs";
import path from "node:path";

const vulnerableByPackage = {
  "react-server-dom-webpack": new Set(["19.0.0", "19.1.0", "19.1.1", "19.2.0"]),
  "react-server-dom-parcel": new Set(["19.0.0", "19.1.0", "19.1.1", "19.2.0"]),
  "react-server-dom-turbopack": new Set(["19.0.0", "19.1.0", "19.1.1", "19.2.0"]),
};

const remediationHint =
  "Atualize para versoes corrigidas (ex.: 19.0.1+, 19.1.2+ ou 19.2.1+), conforme CVE-2025-55182.";

function maybePushFinding(findings, pkg, version, location) {
  const vulnerableVersions = vulnerableByPackage[pkg];
  if (!vulnerableVersions || !vulnerableVersions.has(version)) return;

  findings.push({ pkg, version, location });
}

function scanLockfileV3(lock, findings) {
  if (!lock || typeof lock !== "object" || !lock.packages || typeof lock.packages !== "object") {
    return;
  }

  for (const [location, meta] of Object.entries(lock.packages)) {
    if (!meta || typeof meta !== "object") continue;
    const version = typeof meta.version === "string" ? meta.version : "";
    if (!version) continue;

    for (const pkg of Object.keys(vulnerableByPackage)) {
      const marker = `node_modules/${pkg}`;
      const matchesByPath = location === marker || location.endsWith(`/${marker}`);
      const matchesByName = meta.name === pkg;
      if (matchesByPath || matchesByName) {
        maybePushFinding(findings, pkg, version, location || "(root)");
      }
    }
  }
}

function scanLockfileV1Dependencies(dependencies, findings, trail = "") {
  if (!dependencies || typeof dependencies !== "object") return;

  for (const [pkg, meta] of Object.entries(dependencies)) {
    if (!meta || typeof meta !== "object") continue;

    const version = typeof meta.version === "string" ? meta.version : "";
    const location = trail ? `${trail}>${pkg}` : pkg;
    if (version) {
      maybePushFinding(findings, pkg, version, location);
    }

    if (meta.dependencies && typeof meta.dependencies === "object") {
      scanLockfileV1Dependencies(meta.dependencies, findings, location);
    }
  }
}

function dedupeFindings(findings) {
  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.pkg}|${finding.version}|${finding.location}`;
    if (!unique.has(key)) unique.set(key, finding);
  }
  return [...unique.values()];
}

const lockPath = path.resolve(process.cwd(), "package-lock.json");
if (!fs.existsSync(lockPath)) {
  console.log("security:check-rsc: package-lock.json nao encontrado. Check ignorado.");
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
} catch (error) {
  console.error("security:check-rsc: erro lendo/parsing package-lock.json.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const findings = [];
scanLockfileV3(lock, findings);
scanLockfileV1Dependencies(lock.dependencies, findings);

const uniqueFindings = dedupeFindings(findings);
if (uniqueFindings.length > 0) {
  console.error("ERRO DE SEGURANCA: versoes vulneraveis de React Server Components detectadas.");
  for (const finding of uniqueFindings) {
    console.error(`- ${finding.pkg}@${finding.version} em ${finding.location}`);
  }
  console.error(remediationHint);
  process.exit(1);
}

console.log("security:check-rsc: ok. Nenhuma versao vulneravel de react-server-dom-* encontrada.");
