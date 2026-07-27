// One-off icon generator — not part of the app build. Run with:
//   npm install --no-save sharp && node scripts/generate-icons.mjs
// Produces static PNGs for the PWA manifest plus the browser/iOS icon
// conventions. Uses pure SVG shapes (no text/font rendering) so output is
// identical across platforms regardless of installed system fonts.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BRAND = "#F4623A";
const BRAND_DARK = "#D94F2B";

/**
 * A simple speech-bubble mark on the brand gradient, filled edge-to-edge
 * (required for maskable icons — no transparent corners for the OS to
 * reveal when it applies its own mask shape).
 *
 * @param {number} size - canvas size in px (square)
 * @param {number} scale - 0-1, how much of the canvas the bubble occupies.
 *   Maskable icons need this smaller so the glyph stays inside the ~80%
 *   safe zone after OS masking.
 */
function bubbleSvg(size, scale) {
  const s = size / 512; // base geometry authored at a 512 viewBox, then scaled
  const bubbleScale = s * scale;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND}" />
      <stop offset="100%" stop-color="${BRAND_DARK}" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bg)" />
  <g transform="translate(${cx}, ${cy}) scale(${bubbleScale}) translate(-256, -256)">
    <rect x="128" y="140" width="256" height="180" rx="52" fill="white" />
    <path d="M 195 310 L 235 310 L 175 372 Z" fill="white" />
  </g>
</svg>`;
}

async function main() {
  await mkdir("public", { recursive: true });

  const targets = [
    { path: "app/icon.png", size: 256, scale: 0.72 },
    { path: "app/apple-icon.png", size: 180, scale: 0.72 },
    { path: "public/icon-192.png", size: 192, scale: 0.72 },
    { path: "public/icon-512.png", size: 512, scale: 0.72 },
    // Maskable: smaller scale keeps the bubble inside Android's safe zone.
    { path: "public/icon-512-maskable.png", size: 512, scale: 0.58 },
  ];

  for (const { path, size, scale } of targets) {
    const svg = bubbleSvg(size, scale);
    await sharp(Buffer.from(svg)).png().toFile(path);
    console.log(`Wrote ${path} (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
