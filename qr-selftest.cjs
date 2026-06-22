// Offline self-test for src/qrcode.js. Not shipped (lives outside src/).
// Validates structure (finders, timing, dark module), reads back the
// BCH-protected format info, and round-trips the data region so encoding,
// block interleaving, zig-zag placement and masking are all exercised.
//
//   node qr-selftest.cjs
const fs = require('fs');

// Load the IIFE with a fake `self` so it exposes URLCopierQR.
const code = fs.readFileSync(__dirname + '/src/qrcode.js', 'utf8');
const sandbox = {};
new Function('self', 'TextEncoder', code)(sandbox, TextEncoder);
const QR = sandbox.URLCopierQR;

const VERSIONS_L = {
  1: [26, 7, 1], 2: [44, 10, 1], 3: [70, 15, 1], 4: [100, 20, 1],
  5: [134, 26, 1], 6: [172, 18, 2], 7: [196, 20, 2], 8: [242, 24, 2],
  9: [292, 30, 2], 10: [346, 18, 4]
};
const ALIGN_POS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};
const charCountBits = (v) => (v <= 9 ? 8 : 16);
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];
const bitLength = (n) => { let l = 0; while (n) { l++; n >>>= 1; } return l; };
function formatInfo(mask) {
  const data = (0b01 << 3) | mask;
  let d = data << 10;
  const g = 0b10100110111;
  while (bitLength(d) - bitLength(g) >= 0) d ^= g << (bitLength(d) - bitLength(g));
  return ((data << 10) | d) ^ 0b101010000010010;
}

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.log('  ✗ ' + label); }
};

function isFunction(size, version, r, c) {
  if (r <= 7 && c <= 7) return true; // top-left finder + separator
  if (r <= 7 && c >= size - 8) return true; // top-right
  if (r >= size - 8 && c <= 7) return true; // bottom-left
  if (r === 6 || c === 6) return true; // timing
  if (r === size - 8 && c === 8) return true; // dark module
  // format reserves
  if (r === 8 && (c <= 8 || c >= size - 8)) return true;
  if (c === 8 && (r <= 8 || r >= size - 8)) return true;
  // version info
  if (version >= 7) {
    if (r <= 5 && c >= size - 11 && c <= size - 9) return true;
    if (c <= 5 && r >= size - 11 && r <= size - 9) return true;
  }
  // alignment
  for (const ar of ALIGN_POS[version]) {
    for (const ac of ALIGN_POS[version]) {
      if (ar === 6 || ac === 6) continue;
      if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
    }
  }
  return false;
}

function readFormatMask(m, size) {
  let bits = 0;
  for (let i = 0; i < 15; i++) {
    let cell;
    if (i < 6) cell = m[i][8];
    else if (i < 8) cell = m[i + 1][8];
    else cell = m[size - 15 + i][8];
    bits |= cell << i;
  }
  for (let mask = 0; mask < 8; mask++) if (formatInfo(mask) === bits) return mask;
  return -1;
}

function roundTrip(m, size, version, mask) {
  const maskFn = MASKS[mask];
  const bitstream = [];
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (isFunction(size, version, row, cc)) continue;
        let bit = m[row][cc];
        if (maskFn(row, cc)) bit ^= 1;
        bitstream.push(bit);
      }
    }
    upward = !upward;
  }
  const words = [];
  for (let i = 0; i + 8 <= bitstream.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bitstream[i + j];
    words.push(b);
  }

  const [total, ecPer, numBlocks] = VERSIONS_L[version];
  const dataCount = total - ecPer * numBlocks;
  const shortLen = Math.floor(dataCount / numBlocks);
  const longCount = dataCount % numBlocks;
  const sizes = [];
  for (let b = 0; b < numBlocks; b++) {
    sizes.push(shortLen + (b >= numBlocks - longCount ? 1 : 0));
  }
  const dataResult = words.slice(0, dataCount);
  const blocks = sizes.map(() => []);
  let idx = 0;
  const maxData = Math.max(...sizes);
  for (let i = 0; i < maxData; i++) {
    for (let b = 0; b < numBlocks; b++) if (i < sizes[b]) blocks[b].push(dataResult[idx++]);
  }
  const dataWords = [].concat(...blocks);

  // Parse byte-mode payload.
  const bits = [];
  dataWords.forEach((w) => { for (let k = 7; k >= 0; k--) bits.push((w >> k) & 1); });
  let p = 0;
  const take = (n) => { let v = 0; for (let k = 0; k < n; k++) v = (v << 1) | bits[p++]; return v; };
  const mode = take(4);
  const len = take(charCountBits(version));
  const out = [];
  for (let i = 0; i < len; i++) out.push(take(8));
  return { mode, text: new TextDecoder().decode(Uint8Array.from(out)) };
}

const CASES = [
  'HELLO',
  'https://www.inbati.ch/',
  'https://addons.mozilla.org/fr/firefox/addon/url-copier/?utm_source=test&x=1',
  'https://café.example/résumé?q=accentué',
  'https://example.com/' + 'a'.repeat(180)
];

console.log('QR self-test\n');
for (const text of CASES) {
  const label = text.length > 40 ? text.slice(0, 37) + '…' : text;
  const qr = QR.generate(text);
  if (!qr) { check(`${label} — generated`, false); continue; }
  const { size, version, modules } = qr;

  check(`${label} — size`, size === version * 4 + 17);
  // Finder cores dark, centres of the three corners.
  check(`${label} — finder TL`, modules[3][3] === 1);
  check(`${label} — finder TR`, modules[3][size - 4] === 1);
  check(`${label} — finder BL`, modules[size - 4][3] === 1);
  // Timing alternation on row 6.
  let timingOk = true;
  for (let c = 8; c < size - 8; c++) if (modules[6][c] !== (c % 2 === 0 ? 1 : 0)) timingOk = false;
  check(`${label} — timing`, timingOk);
  // Dark module.
  check(`${label} — dark module`, modules[size - 8][8] === 1);

  const mask = readFormatMask(modules, size);
  check(`${label} — format/level/mask readback`, mask >= 0);

  if (mask >= 0) {
    const rt = roundTrip(modules, size, version, mask);
    check(`${label} — payload mode = byte`, rt.mode === 0b0100);
    check(`${label} — data round-trip`, rt.text === text);
  }
  console.log(`  v${version} (${size}×${size}), mask ${mask} — "${label}"`);
}

console.log('\n' + (failures ? `❌ ${failures} check(s) failed` : '✅ all checks passed'));
process.exit(failures ? 1 : 0);
