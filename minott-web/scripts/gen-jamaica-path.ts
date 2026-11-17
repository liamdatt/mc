// One-off: converts the public-domain Natural Earth outline of Jamaica
// (via johan/world.geo.json) into the SVG path hard-coded in
// components/sections/JamaicaOutline.tsx.
//
//   npx tsx scripts/gen-jamaica-path.ts
//
// Equirectangular projection with longitude scaled by cos(18.1°) so the
// island isn't stretched; output fills a viewBox 200 units wide.

export {}; // module scope (avoids clashing with the global URL type)

const GEOJSON_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/JAM.geo.json";
const WIDTH = 200;
const LAT0 = (18.1 * Math.PI) / 180;

type Ring = [number, number][];

async function main() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const geo = await res.json();
  const geom = geo.features[0].geometry;
  const polys: Ring[][] =
    geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const rings = polys.map((p) => p[0]);

  const pts = rings.flat().map(([lon, lat]) => [lon * Math.cos(LAT0), lat]);
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const scale = WIDTH / (maxX - minX);
  const height = (maxY - minY) * scale;

  const r = (n: number) => Math.round(n * 10) / 10;
  const d = rings
    .map((ring) => {
      const seg = ring.map(([lon, lat], i) => {
        const x = (lon * Math.cos(LAT0) - minX) * scale;
        const y = (maxY - lat) * scale;
        return `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`;
      });
      return seg.join("") + "Z";
    })
    .join("");

  console.log(`viewBox="0 0 ${WIDTH} ${r(height)}"`);
  console.log(`d="${d}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
