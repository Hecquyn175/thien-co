import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');
const fontsDir = path.join(publicDir, 'fonts');

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(fontsDir, { recursive: true });

// 1. Create SVG icons
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#f6efe0"/>
  <rect x="28" y="28" width="456" height="456" rx="76" fill="none" stroke="#b8332a" stroke-width="12"/>
  <circle cx="256" cy="256" r="168" fill="#b8332a"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#f6efe0" stroke-width="6" stroke-dasharray="12 8"/>
  <text x="256" y="235" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="bold" fill="#f6efe0">天機</text>
  <text x="256" y="330" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="bold" fill="#f5d076" letter-spacing="4">THIÊN CƠ</text>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#b8332a"/>
  <circle cx="256" cy="256" r="164" fill="none" stroke="#f6efe0" stroke-width="10"/>
  <text x="256" y="240" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="bold" fill="#f6efe0">天機</text>
  <text x="256" y="325" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="bold" fill="#f5d076" letter-spacing="3">THIÊN CƠ</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvg, 'utf-8');
fs.writeFileSync(path.join(iconsDir, 'maskable-icon.svg'), maskableSvg, 'utf-8');

// 2. Generate valid RGBA PNG files (192x192 and 512x512) with seal-red circle on Do-paper background
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateSealPng(size: number, maskable: boolean): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.36;
  const ringR = size * 0.31;
  const innerR = size * 0.12;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = maskable ? 0xb8 : 0xf6;
      let g = maskable ? 0x33 : 0xef;
      let b = maskable ? 0x2a : 0xe0;

      if (!maskable && dist <= outerR) {
        // Vermilion seal circle
        r = 0xb8;
        g = 0x33;
        b = 0x2a;
      }
      if (Math.abs(dist - ringR) <= size * 0.014) {
        // Gold ring
        r = 0xf5;
        g = 0xd0;
        b = 0x76;
      }
      // Bagua / Taiji inspired inner emblem
      if (dist <= innerR) {
        r = 0xf6;
        g = 0xef;
        b = 0xe0;
      }
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', iend),
  ]);
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateSealPng(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateSealPng(512, false));
fs.writeFileSync(path.join(iconsDir, 'maskable-512.png'), generateSealPng(512, true));

// 3. Create self-hosted font CSS manifest in public/fonts/fonts.css (100% offline, zero external CDN)
const fontsCss = `/* Self-hosted & Offline-first Typography Stack for Thiên Cơ */
/* Zero external network requests; uses local metrics-compatible system glyphs with full Vietnamese & CJK coverage */
@font-face {
  font-family: 'ThienCoSans';
  src: local('Be Vietnam Pro'), local('Inter'), local('Segoe UI'), local('Roboto'), local('Helvetica Neue'), local('Arial');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'ThienCoSerif';
  src: local('Noto Serif'), local('Playfair Display'), local('Georgia'), local('Times New Roman'), local('Palatino Linotype');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'ThienCoCJK';
  src: local('Noto Serif CJK SC'), local('PingFang SC'), local('Hiragino Sans GB'), local('Microsoft YaHei'), local('SimSun'), local('PMingLiU');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
`;
fs.writeFileSync(path.join(fontsDir, 'fonts.css'), fontsCss, 'utf-8');

console.log('Generated PWA icons and offline font rules in public/');
