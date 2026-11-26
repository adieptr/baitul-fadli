// Membuat ikon PWA (PNG) dari SVG. Jalankan: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const dir = new URL("../public/icons/", import.meta.url);
const icon = await readFile(new URL("icon.svg", dir));
const maskable = await readFile(new URL("maskable.svg", dir));

const jobs = [
  [icon, 192, "icon-192.png"],
  [icon, 512, "icon-512.png"],
  [maskable, 192, "maskable-192.png"],
  [maskable, 512, "maskable-512.png"],
  [icon, 180, "apple-touch-icon.png"],
  [icon, 48, "favicon-48.png"],
];
for (const [src, size, name] of jobs) {
  await sharp(src, { density: 400 }).resize(size, size).png().toFile(new URL(name, dir).pathname);
  console.log("✓", name);
}
