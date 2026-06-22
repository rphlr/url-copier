// Self-contained QR Code generator (model 2, byte mode, error-correction
// level L, versions 1–10, automatic version + mask selection).
//
// Pure vanilla JS, no dependencies, nothing leaves the machine. Implements the
// standard QR algorithm: Reed–Solomon over GF(256), the eight data masks with
// penalty scoring, and BCH-protected format/version information.
//
//   const qr = URLCopierQR.generate('https://example.com');
//   // → { size: 29, modules: [[0|1, ...], ...] }  or  null if the text is
//   //   too long for version 10 at level L (~270 bytes).
(function () {
  'use strict';

  // --- Galois field GF(256), primitive polynomial 0x11d --------------------
  const EXP = new Array(256);
  const LOG = new Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    EXP[255] = EXP[0];
  })();

  const gfMul = (a, b) =>
    a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255];

  function generatorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function ecCodewords(data, ecLen) {
    const gen = generatorPoly(ecLen);
    const res = data.concat(new Array(ecLen).fill(0));
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return res.slice(data.length);
  }

  // --- Per-version characteristics for EC level L --------------------------
  // [total codewords, EC codewords per block, number of blocks]
  const VERSIONS_L = {
    1: [26, 7, 1],
    2: [44, 10, 1],
    3: [70, 15, 1],
    4: [100, 20, 1],
    5: [134, 26, 1],
    6: [172, 18, 2],
    7: [196, 20, 2],
    8: [242, 24, 2],
    9: [292, 30, 2],
    10: [346, 18, 4]
  };
  const MAX_VERSION = 10;

  const ALIGN_POS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50]
  };

  const dataCodewordCount = (version) => {
    const [total, ecPer, blocks] = VERSIONS_L[version];
    return total - ecPer * blocks;
  };

  const charCountBits = (version) => (version <= 9 ? 8 : 16);

  // --- Data stream → final interleaved codewords ---------------------------
  function buildCodewords(bytes, version) {
    const dataCount = dataCodewordCount(version);
    const bits = [];
    const push = (value, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
    };

    push(0b0100, 4); // byte mode
    push(bytes.length, charCountBits(version));
    bytes.forEach((b) => push(b, 8));

    const capacity = dataCount * 8;
    for (let i = 0; i < 4 && bits.length < capacity; i++) bits.push(0); // terminator
    while (bits.length % 8 !== 0) bits.push(0);

    const dataWords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      dataWords.push(byte);
    }
    const pad = [0xec, 0x11];
    for (let i = 0; dataWords.length < dataCount; i++) dataWords.push(pad[i % 2]);

    // Split into blocks (even distribution; last blocks get the extra word).
    const [, ecPer, numBlocks] = VERSIONS_L[version];
    const shortLen = Math.floor(dataCount / numBlocks);
    const longCount = dataCount % numBlocks;
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let b = 0; b < numBlocks; b++) {
      const len = shortLen + (b >= numBlocks - longCount ? 1 : 0);
      const block = dataWords.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(block);
      ecBlocks.push(ecCodewords(block, ecPer));
    }

    // Interleave data then EC codewords.
    const result = [];
    const maxData = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxData; i++) {
      for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecPer; i++) {
      for (const block of ecBlocks) result.push(block[i]);
    }
    return result;
  }

  // --- BCH-protected format / version information --------------------------
  const bitLength = (n) => {
    let len = 0;
    while (n !== 0) {
      len++;
      n >>>= 1;
    }
    return len;
  };

  function formatInfo(mask) {
    const data = (0b01 << 3) | mask; // EC level L = 0b01
    let d = data << 10;
    const g = 0b10100110111;
    while (bitLength(d) - bitLength(g) >= 0) d ^= g << (bitLength(d) - bitLength(g));
    return ((data << 10) | d) ^ 0b101010000010010;
  }

  function versionInfo(version) {
    let d = version << 12;
    const g = 0b1111100100101;
    while (bitLength(d) - bitLength(g) >= 0) d ^= g << (bitLength(d) - bitLength(g));
    return (version << 12) | d;
  }

  // --- Mask conditions ------------------------------------------------------
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

  // --- Matrix construction --------------------------------------------------
  function buildMatrix(version, codewords, mask) {
    const size = version * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(null));

    const setFinder = (row, col) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = row + r;
          const cc = col + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          m[rr][cc] = onBorder || inCore;
        }
      }
    };
    setFinder(0, 0);
    setFinder(0, size - 7);
    setFinder(size - 7, 0);

    // Timing patterns.
    for (let i = 8; i < size - 8; i++) {
      const v = i % 2 === 0;
      if (m[6][i] === null) m[6][i] = v;
      if (m[i][6] === null) m[i][6] = v;
    }

    // Alignment patterns.
    const pos = ALIGN_POS[version];
    for (const r of pos) {
      for (const c of pos) {
        if (m[r][c] !== null) continue; // overlaps a finder
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const ring = Math.max(Math.abs(dr), Math.abs(dc));
            m[r + dr][c + dc] = ring !== 1;
          }
        }
      }
    }

    // Dark module.
    m[size - 8][8] = true;

    // Reserve format areas so data placement skips them.
    const reserveFormat = () => {
      for (let i = 0; i <= 8; i++) {
        if (m[8][i] === null) m[8][i] = false;
        if (m[i][8] === null) m[i][8] = false;
      }
      for (let i = 0; i < 8; i++) {
        if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false;
        if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false;
      }
    };
    reserveFormat();

    // Reserve version info areas (version ≥ 7).
    if (version >= 7) {
      for (let i = 0; i < 18; i++) {
        const a = Math.floor(i / 3);
        const b = i % 3;
        m[a][size - 11 + b] = false;
        m[size - 11 + b][a] = false;
      }
    }

    placeData(m, size, codewords, mask);
    placeFormat(m, size, formatInfo(mask));
    if (version >= 7) placeVersion(m, size, versionInfo(version));
    return m;
  }

  function placeData(m, size, codewords, mask) {
    const maskFn = MASKS[mask];
    let bitIndex = 7;
    let byteIndex = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col = 5; // skip vertical timing column
      for (let i = 0; i < size; i++) {
        const row = upward ? size - 1 - i : i;
        for (let c = 0; c < 2; c++) {
          const cc = col - c;
          if (m[row][cc] !== null) continue;
          let dark = false;
          if (byteIndex < codewords.length) {
            dark = ((codewords[byteIndex] >> bitIndex) & 1) === 1;
          }
          if (maskFn(row, cc)) dark = !dark;
          m[row][cc] = dark;
          bitIndex--;
          if (bitIndex < 0) {
            bitIndex = 7;
            byteIndex++;
          }
        }
      }
      upward = !upward;
    }
  }

  function placeFormat(m, size, bits) {
    for (let i = 0; i < 15; i++) {
      const dark = ((bits >> i) & 1) === 1;
      // Vertical strip by the top-left / bottom-left finders.
      if (i < 6) m[i][8] = dark;
      else if (i < 8) m[i + 1][8] = dark;
      else m[size - 15 + i][8] = dark;
      // Horizontal strip by the top-left / top-right finders.
      if (i < 8) m[8][size - 1 - i] = dark;
      else if (i < 9) m[8][15 - i] = dark;
      else m[8][14 - i] = dark;
    }
  }

  function placeVersion(m, size, bits) {
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      m[a][size - 11 + b] = dark;
      m[size - 11 + b][a] = dark;
    }
  }

  // --- Mask penalty scoring -------------------------------------------------
  function penalty(m, size) {
    let score = 0;

    // Rule 1: runs of 5+ same-colour modules in a row/column.
    for (let i = 0; i < size; i++) {
      for (const line of [
        (j) => m[i][j],
        (j) => m[j][i]
      ]) {
        let run = 1;
        for (let j = 1; j < size; j++) {
          if (line(j) === line(j - 1)) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else run = 1;
        }
      }
    }

    // Rule 2: 2×2 blocks of the same colour.
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) {
          score += 3;
        }
      }
    }

    // Rule 3: finder-like 1:1:3:1:1 patterns.
    const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
    const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
    const matches = (get, i, j) => {
      for (let k = 0; k < 11; k++) {
        const v = get(i, j + k);
        if (v !== pat1[k] && v !== pat2[k]) return 0;
      }
      // both orientations checked together would double count; check each
      let a = true;
      let b = true;
      for (let k = 0; k < 11; k++) {
        const v = get(i, j + k);
        if (v !== pat1[k]) a = false;
        if (v !== pat2[k]) b = false;
      }
      return (a ? 1 : 0) + (b ? 1 : 0);
    };
    for (let r = 0; r < size; r++) {
      for (let c = 0; c <= size - 11; c++) {
        score += 40 * matches((i, j) => m[i][j], r, c);
        score += 40 * matches((i, j) => m[j][i], r, c);
      }
    }

    // Rule 4: overall dark-module balance.
    let dark = 0;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) if (m[r][c]) dark++;
    const ratio = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

    return score;
  }

  function chooseVersion(byteLength) {
    for (let v = 1; v <= MAX_VERSION; v++) {
      const capacity = dataCodewordCount(v);
      const needBits = 4 + charCountBits(v) + byteLength * 8;
      if (Math.ceil(needBits / 8) <= capacity) return v;
    }
    return null;
  }

  function generate(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    const version = chooseVersion(bytes.length);
    if (version === null) return null;

    const codewords = buildCodewords(bytes, version);
    const size = version * 4 + 17;

    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const matrix = buildMatrix(version, codewords, mask);
      const score = penalty(matrix, size);
      if (score < bestScore) {
        bestScore = score;
        best = matrix;
      }
    }

    return {
      size,
      version,
      modules: best.map((row) => row.map((cell) => (cell ? 1 : 0)))
    };
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierQR = { generate };
})();
