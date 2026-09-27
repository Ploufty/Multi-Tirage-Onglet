#!/usr/bin/env node
// Normalises the "Doigts" dice drawings in assets/dice-hands/1.png … 6.png, in place:
//   - crops each drawing to its content and centres it in a 600x600 square with the same
//     margin, so all six hands appear at the same scale in the dice;
//   - measures the stroke width and thickens drawings whose stroke is thinner than the others,
//     so all six read with the same line weight;
//   - writes a grey+alpha PNG (the drawings are black/white/transparent), max compression.
// Uses Chromium's canvas for the image work (no ImageMagick/Pillow in the container).
//
//   NODE_PATH="$(npm root -g)" node .claude/skills/run-multi-tirage-onglet/prepare-hands.cjs
//
// Images already at SIZE×SIZE are skipped (re-processing would resample and blur them).
// To redo them, restore the originals first, e.g. `git show <commit>:assets/dice-hands/1.png > assets/dice-hands/1.png`.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('playwright');

const DIR = path.resolve(__dirname, '../../../assets/dice-hands');
const SIZE = 600;         // 300 px max die × 2 for high-density screens
const MARGIN = 0.06;      // empty border around the drawing, per side
const STROKE = 0.026;     // target stroke width, as a fraction of SIZE (≈ 16 px)

// Minimal PNG encoder: 8-bit grey + alpha (colour type 4), per-row adaptive filter.
function encodePngGreyAlpha(w, h, rgba) {
  const bpp = 2, stride = w * bpp;
  const raw = Buffer.alloc(w * h * bpp);
  for (let i = 0; i < w * h; i++) { raw[i * 2] = rgba[i * 4]; raw[i * 2 + 1] = rgba[i * 4 + 3]; }
  const out = Buffer.alloc((stride + 1) * h);
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const up = y ? raw.subarray((y - 1) * stride, y * stride) : prev;
    let best = null, bestSum = Infinity, bestType = 0;
    for (let t = 0; t < 5; t++) {
      const f = Buffer.alloc(stride);
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0, b = up[x], c = x >= bpp ? up[x - bpp] : 0;
        let p = a;
        if (t === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        f[x] = (row[x] - [0, a, b, (a + b) >> 1, p][t]) & 255;
      }
      let sum = 0; for (let x = 0; x < stride; x++) sum += f[x] < 128 ? f[x] : 256 - f[x];
      if (sum < bestSum) { bestSum = sum; best = f; bestType = t; }
    }
    out[y * (stride + 1)] = bestType;
    best.copy(out, y * (stride + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 4;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(out, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Runs in the page: returns the normalised RGBA pixels of one drawing.
async function normalise({ dataUrl, SIZE, MARGIN, STROKE }) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const W = img.width, H = img.height;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sx = src.getContext('2d'); sx.drawImage(img, 0, 0);
  const d = sx.getImageData(0, 0, W, H).data;
  const isInk = (k) => d[k * 4 + 3] > 128 && d[k * 4] < 110;

  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > 20) {
    const x = k % W, y = (k / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const scale = (SIZE * (1 - 2 * MARGIN)) / Math.max(bw, bh);

  // Median horizontal run of ink = stroke width in source pixels.
  const runs = [];
  for (let y = minY; y <= maxY; y += 5) {
    let run = 0;
    for (let x = minX; x <= maxX + 1; x++) { if (x <= maxX && isInk(y * W + x)) run++; else if (run) { runs.push(run); run = 0; } }
  }
  runs.sort((a, b) => a - b);
  const stroke = runs[runs.length >> 1] || 0;
  const radius = Math.max(0, Math.round((STROKE * SIZE / scale - stroke) / 2));

  let source = src;
  if (radius > 0) {
    // Ink layer (dark pixels only), stamped around a disc to widen the lines, drawn over the original.
    const ink = document.createElement('canvas'); ink.width = W; ink.height = H;
    const ix = ink.getContext('2d'); const id = ix.createImageData(W, H);
    for (let k = 0; k < W * H; k++) if (isInk(k)) { id.data[k * 4 + 3] = 255; }
    ix.putImageData(id, 0, 0);
    const fat = document.createElement('canvas'); fat.width = W; fat.height = H;
    const fx = fat.getContext('2d');
    fx.drawImage(src, 0, 0);
    for (let a = 0; a < 360; a += 10) for (const r of [radius, radius / 2]) fx.drawImage(ink, Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r);
    source = fat;
  }

  const out = document.createElement('canvas'); out.width = SIZE; out.height = SIZE;
  const ox = out.getContext('2d');
  ox.imageSmoothingQuality = 'high';
  const dw = bw * scale, dh = bh * scale;
  ox.drawImage(source, minX, minY, bw, bh, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
  const px = ox.getImageData(0, 0, SIZE, SIZE).data;
  // Drawings are black on white: force pure grey so the grey+alpha encoding is lossless.
  for (let i = 0; i < px.length; i += 4) { const g = Math.round((px[i] + px[i + 1] + px[i + 2]) / 3); px[i] = px[i + 1] = px[i + 2] = g; }
  return { rgba: Array.from(px), stroke, radius, box: `${bw}x${bh}`, scale: +scale.toFixed(3) };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  for (let n = 1; n <= 6; n++) {
    const file = path.join(DIR, `${n}.png`);
    const before = fs.statSync(file).size;
    const head = fs.readFileSync(file).subarray(16, 24);
    if (head.readUInt32BE(0) === SIZE && head.readUInt32BE(4) === SIZE) { console.log(`${n}.png  already ${SIZE}x${SIZE}, skipped`); continue; }
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    const r = await page.evaluate(normalise, { dataUrl, SIZE, MARGIN, STROKE });
    const png = encodePngGreyAlpha(SIZE, SIZE, Uint8ClampedArray.from(r.rgba));
    fs.writeFileSync(file, png);
    console.log(`${n}.png  content ${r.box} → scale ${r.scale}, stroke ${r.stroke}px${r.radius ? ` thickened +${2 * r.radius}px` : ''}, ${Math.round(before / 1024)} KB → ${Math.round(png.length / 1024)} KB`);
  }
  await browser.close();
})();
