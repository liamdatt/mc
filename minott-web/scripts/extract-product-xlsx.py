#!/usr/bin/env python3
"""
Extract MEC product listings (6 columns + in-cell images) from the client's
Excel files into a Prisma seed module + servable images.

The client supplies products in `.xlsx` files where column F holds an image
embedded via Excel's "Place in Cell" rich-value feature (NOT a floating
drawing). Each image is bound to its row's cell through this chain:
  cell vm="N"  →  xl/metadata.xml (futureMetadata, 1-based)
               →  xl/richData/rdrichvalue.xml  (rich value, 0-based)
               →  xl/richData/richValueRel.xml (<rel> order)
               →  xl/richData/_rels/richValueRel.xml.rels  (media target)

Columns: ITEM CODE | DESCRIPTION | SUGGESTED DESCRIPTION | UOM | Product Details | Image

Usage:
  python3 scripts/extract-product-xlsx.py \
      "/path/to/MEC Product Listing 2026 (Chemicals).xlsx" \
      --out-data prisma/data/chemicals-2026.ts \
      --export-name CHEMICALS_2026 \
      --img-dir public/images/products \
      --img-url /images/products

Pure stdlib — no openpyxl/pandas needed (openpyxl can't read in-cell images).
"""
import argparse, csv, html, json, os, re, shutil, sys, tempfile, zipfile


def slugify(s: str) -> str:
    s = s.lower().strip().replace("&", " and ")
    s = re.sub(r"['\"]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)


def title_case(s: str) -> str:
    return " ".join(
        w if (w.isupper() and len(w) > 1 and w not in ("OF", "AND")) else w.capitalize()
        for w in s.split()
    )


def first_sentence(d: str) -> str:
    d = d.strip()
    if not d:
        return ""
    m = re.match(r"(.{30,200}?\.)\s", d)
    return m.group(1) if m else (d[:180].rstrip() + "…" if len(d) > 180 else d)


def volume_from(uom: str, name: str):
    m = re.match(r"([\d.]+)\s*LITRE", uom, re.I)
    if m:
        return f"{m.group(1)}L"
    m = re.search(r"\(([\d.]+)\s*(L|LITRE|KG)\)", name, re.I)
    if m:
        unit = "L" if m.group(2).lower().startswith("l") else "kg"
        return f"{m.group(1)}{unit}"
    return None


def extract(xlsx_path: str):
    tmp = tempfile.mkdtemp(prefix="xlsx_")
    with zipfile.ZipFile(xlsx_path) as z:
        z.extractall(tmp)
    e = lambda p: os.path.join(tmp, p)

    ss = open(e("xl/sharedStrings.xml"), encoding="utf-8").read()
    strings = [
        html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"</si>.*", "", s, flags=re.S)))
        for s in re.split(r"<si>", ss, flags=re.S)[1:]
    ]

    meta = open(e("xl/metadata.xml"), encoding="utf-8").read()
    rvb = [int(m) for m in re.findall(r'<xlrd:rvb i="(\d+)"/>', meta)]
    rv = open(e("xl/richData/rdrichvalue.xml"), encoding="utf-8").read()
    rv_imgid = [
        int(re.search(r"<v>(\d+)</v>", b).group(1))
        for b in re.findall(r"<rv [^>]*>(.*?)</rv>", rv, flags=re.S)
    ]
    rvr = open(e("xl/richData/richValueRel.xml"), encoding="utf-8").read()
    relids = re.findall(r'<rel r:id="([^"]+)"/>', rvr)
    rels = open(e("xl/richData/_rels/richValueRel.xml.rels"), encoding="utf-8").read()
    rid_to_target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

    def vm_to_image(vm):
        rid = relids[rv_imgid[rvb[int(vm) - 1]]]
        return os.path.basename(rid_to_target[rid].replace("../", ""))

    data = open(e("xl/worksheets/sheet1.xml"), encoding="utf-8").read()
    rows = re.findall(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', data, flags=re.S)
    out = []
    for _rn, body in rows:
        cells = {}
        for m in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)(?:/>|>(.*?)</c>)', body, flags=re.S):
            col, attrs, inner = m.group(1), m.group(2), (m.group(3) or "")
            t = (re.search(r't="([^"]+)"', attrs) or [None, "n"])[1]
            vm = re.search(r'vm="(\d+)"', attrs)
            v = re.search(r"<v>(.*?)</v>", inner, flags=re.S)
            v = v.group(1) if v else ""
            if col == "F" and vm:
                cells["F"] = vm_to_image(vm.group(1))
            elif t == "s" and v != "":
                cells[col] = strings[int(v)]
            else:
                cells[col] = html.unescape(v)
        out.append(cells)
    return out, os.path.join(tmp, "xl/media")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--out-data", required=True)
    ap.add_argument("--export-name", required=True)
    ap.add_argument("--img-dir", required=True, help="filesystem dir to copy images into")
    ap.add_argument("--img-url", required=True, help="public URL prefix for images")
    ap.add_argument("--csv", help="optional CSV dump path")
    args = ap.parse_args()

    rows, media_dir = extract(args.xlsx)
    header, data = rows[0], rows[1:]
    os.makedirs(args.img_dir, exist_ok=True)

    products, used, notes = [], set(), []
    csv_rows = []
    for r in data:
        item = (r.get("A") or "").strip()
        desc = (r.get("B") or "").strip()
        sugg = (r.get("C") or "").strip()
        uom = (r.get("D") or "").strip()
        details = (r.get("E") or "").strip()
        img = (r.get("F") or "").strip()
        csv_rows.append([item, desc, sugg, uom, details, img])

        name = sugg
        if not name or re.fullmatch(r"[\d.\s]+", name) or len(re.sub(r"[^A-Za-z]", "", name)) < 3:
            name = title_case(desc) if desc else item
            notes.append(f"{item}: junk suggested-desc '{sugg}' → used '{name}'")
        slug = slugify(name)
        if slug in used:
            slug = f"{slug}-{slugify(item)}"
        used.add(slug)

        uom = "1 LITRE" if uom.upper() == "I LITRE" else uom
        pack = uom
        if not pack:
            m = re.search(r"\(([^)]+)\)", name) or re.search(r"\(([^)]+)\)", desc)
            pack = m.group(1) if m else ""
            notes.append(f"{item}: empty UOM → packSize '{pack}' inferred")
        vol = volume_from(uom, f"{name} {desc}")
        short = first_sentence(details) or (
            f"{name} — commercial-grade chemical product from Minott Equipment & Chemicals."
        )
        if not details:
            notes.append(f"{item}: empty Product Details")

        image_path = None
        src = os.path.join(media_dir, img)
        if img and os.path.exists(src):
            dest = f"{slug}{os.path.splitext(img)[1]}"
            shutil.copy(src, os.path.join(args.img_dir, dest))
            image_path = f"{args.img_url}/{dest}"
        else:
            notes.append(f"{item}: no image → placeholder")

        p = {
            "name": name,
            "shortDescription": short,
            "sku": item,
            "packSize": pack,
            "specLabel": "Pack Size",
            "specValue": pack or "—",
            "isChemical": True,
        }
        if details:
            p["description"] = details
        if vol:
            p["volume"] = vol
        if image_path:
            p["imagePath"] = image_path
        products.append(p)

    order = ["name", "shortDescription", "description", "sku", "packSize",
             "specLabel", "specValue", "isChemical", "volume", "imagePath"]

    def ts_obj(p):
        lines = []
        for k in order:
            if k in p:
                v = p[k]
                vs = ("true" if v else "false") if isinstance(v, bool) else json.dumps(v, ensure_ascii=False)
                lines.append(f"    {k}: {vs},")
        return "  {\n" + "\n".join(lines) + "\n  }"

    src_name = os.path.basename(args.xlsx)
    ts = (
        f'// AUTO-GENERATED from "{src_name}" by scripts/extract-product-xlsx.py — do not edit by hand.\n'
        f"// Regenerate when the client supplies an updated listing. {len(products)} products.\n"
        '// SeedProduct type is defined in ../seed.ts.\n'
        'import type { SeedProduct } from "../seed";\n\n'
        f"export const {args.export_name}: SeedProduct[] = [\n"
        + ",\n".join(ts_obj(p) for p in products)
        + ",\n];\n"
    )
    os.makedirs(os.path.dirname(args.out_data), exist_ok=True)
    open(args.out_data, "w", encoding="utf-8").write(ts)

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([header.get(c, "") for c in "ABCDEF"])
            w.writerows(csv_rows)

    print(f"Wrote {len(products)} products → {args.out_data}")
    print(f"Copied images → {args.img_dir}/ ({len(os.listdir(args.img_dir))} files)")
    print(f"\n{len(notes)} data notes (gaps to flag with the client):", file=sys.stderr)
    for n in notes:
        print("  -", n, file=sys.stderr)


if __name__ == "__main__":
    main()
