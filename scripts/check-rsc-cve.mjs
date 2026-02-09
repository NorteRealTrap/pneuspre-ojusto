import fs from "node:fs";
import path from "node:path";

const vulnerableRscPackages = new Set([
  "react-server-dom-webpack",
  "react-server-dom-parcel",
  "react-server-dom-turbopack",
]);

const vulnerableRscVersions = new Set(["19.0.0", "19.1.0", "19.1.1", "19.2.0"]);

const packagesToInspect = [...vulnerableRscPackages, "next"];

function parseVersion(version) {
  const clean = String(version).trim();
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(clean);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] || "",
  };
}

function parseCanaryNumber(preRelease) {
  const match = /^canary\.(\d+)$/i.exec(preRelease);
  if (!match) return null;
  return Number(match[1]);
}

function isVulnerableNext(version) {
  const parsed = parseVersion(version);
  if (!parsed) return false;

  const isStable = parsed.pre.length === 0;
  if (isStable) {
    if (parsed.major === 15) {
      if (parsed.minor === 0 && parsed.patch < 5) return true;
      if (parsed.minor === 1 && parsed.patch < 9) return true;
      if (parsed.minor === 2 && parsed.patch < 6) return true;
      if (parsed.minor === 3 && parsed.patch < 6) return true;
      if (parsed.minor === 4 && parsed.patch < 8) return true;
      if (parsed.minor === 5 && parsed.patch < 7) return true;
    }

    if (parsed.major === 16 && parsed.minor === 0 && parsed.patch < 7) return true;
    return false;
  }

  const canaryNumber = parseCanaryNumber(parsed.pre);
  if (canaryNumber === null) return false;

  if (parsed.major === 14 && parsed.minor === 3 && parsed.patch === 0 && canaryNumber >= 77) {
    return true;
  }

  if (parsed.major === 15) {
    if (parsed.minor < 6) return true;
    if (parsed.minor === 6 && parsed.patch === 0 && canaryNumber < 58) return true;
    return false;
  }

  if (parsed.major === 16) {
    if (parsed.minor < 1) return true;
    if (parsed.minor === 1 && parsed.patch === 0 && canaryNumber < 12) return true;
    return false;
  }

  return false;
}

function maybePushFinding(findings, pkg, version, location) {
  if (vulnerableRscPackages.has(pkg) && vulnerableRscVersions.has(version)) {
    findings.push({
      pkg,
      version,
      location,
      advisory: "CVE-2025-55182",
      hint: "Atualize react-server-dom-* para 19.0.1+, 19.1.2+ ou 19.2.1+.",
    });
    return;
  }

  if (pkg === "next" && isVulnerableNext(version)) {
    findings.push({
      pkg,
      version,
      location,
      advisory: "GHSA-9qr9-h5gf-34mp",
      hint: "Atualize next para uma versao corrigida (ex.: 15.5.7+ ou 16.0.7+).",
    });
  }
}

function scanLockfileV3(lock, findings) {
  if (!lock || typeof lock !== "object" || !lock.packages || typeof lock.packages !== "object") {
    return;
  }

  for (const [location, meta] of Object.entries(lock.packages)) {
    if (!meta || typeof meta !== "object") continue;
    const version = typeof meta.version === "string" ? meta.version : "";
    if (!version) continue;

    for (const pkg of packagesToInspect) {
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
  console.error("ERRO DE SEGURANCA: dependencias vulneraveis detectadas.");
  for (const finding of uniqueFindings) {
    console.error(`- ${finding.pkg}@${finding.version} em ${finding.location} [${finding.advisory}]`);
    console.error(`  -> ${finding.hint}`);
  }
  process.exit(1);
}

console.log("security:check-rsc: ok. Nenhuma versao vulneravel de react-server-dom-* ou next encontrada.");
