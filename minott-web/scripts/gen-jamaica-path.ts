// One-off: converts the public-domain Natural Earth 10m outline of Jamaica
// into the SVG path hard-coded in components/sections/JamaicaOutline.tsx.
//
//   npx tsx scripts/gen-jamaica-path.ts [path/to/ne_10m_admin_0_countries.geojson]
//
// Without an argument the ~13 MB file is downloaded (don't commit it). Takes
// the ADM0_A3 === "JAM" feature, keeps the largest polygon (main island; the
// cays are dropped), projects equirectangularly with longitude scaled by
// cos(18.1°) so the island isn't stretched, fits a viewBox 200 units wide and
// simplifies with Douglas–Peucker at 0.3 viewBox units.

import { readFileSync } from "node:fs";

export {}; // module scope (avoids clashing with globals)

const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const WIDTH = 200;
const LAT0 = (18.1 * Math.PI) / 180;
const TOLERANCE = 0.3;

type Pt = [number, number];
type Feature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};

function shoelace(ring: Pt[]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function douglasPeucker(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  let max = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  const left = douglasPeucker(pts.slice(0, idx + 1), tol);
  const right = douglasPeucker(pts.slice(idx), tol);
  return [...left.slice(0, -1), ...right];
}

async function main() {
  const local = process.argv[2];
  const geo = local
    ? JSON.parse(readFileSync(local, "utf8"))
    : await (await fetch(NE_URL)).json();
  const feature = (geo.features as Feature[]).find(
    (f) => f.properties.ADM0_A3 === "JAM",
  );
  if (!feature) throw new Error("JAM feature not found");
  const g = feature.geometry;
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Pt[][][];
  // Outer ring of the largest polygon = the main island.
  const ring = polys
    .map((p) => p[0])
    .sort((a, b) => shoelace(b) - shoelace(a))[0];

  const proj = ring.map(([lon, lat]): Pt => [lon * Math.cos(LAT0), lat]);
  const xs = proj.map((p) => p[0]);
  const ys = proj.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys);
  const scale = WIDTH / (maxX - minX);
  const height = (maxY - minY) * scale;
  const pts = proj.map(([x, y]): Pt => [(x - minX) * scale, (maxY - y) * scale]);

  const simplified = douglasPeucker(pts, TOLERANCE);
  const r = (n: number) => Math.round(n * 10) / 10;
  const body = simplified
    .slice(0, -1) // closing point duplicates the first; Z closes the path
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`)
    .join("");

  console.error(`source points ${ring.length}, simplified ${simplified.length - 1}`);
  console.log(`viewBox="0 0 ${WIDTH} ${r(height)}"`);
  console.log(`d="${body}Z"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
