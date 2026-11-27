// Membuat ikon PWA, favicon & logo dari logo kaligrafi (PNG putih transparan).
// Jalankan: node scripts/generate-icons.mjs
import sharp from "sharp";

const dir = new URL("../public/icons/", import.meta.url).pathname;
const NAVY = { r: 31, g: 61, b: 109, alpha: 1 }; // brand-700 #1f3d6d

// Logo dipangkas ke area gambarnya saja.
const logo = await sharp(`${dir}logo-source.png`).trim({ threshold: 1 }).png().toBuffer();

/** Logo putih di tengah kotak navy. scale = porsi lebar kotak yang dipakai logo. */
async function tile(size, scale, { rounded = false } = {}) {
  const inner = Math.round(size * scale);
  const mark = await sharp(logo).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  let img = sharp({ create: { width: size, height: size, channels: 4, background: NAVY } }).composite([{ input: mark, gravity: "center" }]);
  if (rounded) {
    const r = Math.round(size * 0.22);
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]);
  }
  return img.png({ compressionLevel: 9 });
}

const jobs = [
  ["icon-192.png", 192, 0.8, true],        // manifest "any" & logo di header
  ["icon-512.png", 512, 0.8, true],
  ["maskable-192.png", 192, 0.62, false],  // Android adaptive: logo di dalam zona aman 80%
  ["maskable-512.png", 512, 0.62, false],
  ["apple-touch-icon.png", 180, 0.76, false], // iOS membulatkan sudut sendiri; harus opak
  ["favicon-48.png", 48, 0.9, true],       // tab browser: logo dibuat penuh agar terbaca
  ["favicon-32.png", 32, 0.92, true],
  ["favicon-16.png", 16, 0.94, true],
];
for (const [name, size, scale, rounded] of jobs) {
  await (await tile(size, scale, { rounded })).toFile(dir + name);
  console.log("✓", name);
}
// Versi logo putih transparan (untuk latar gelap)
await sharp(logo).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(dir + "logo-white.png");
console.log("✓ logo-white.png");
