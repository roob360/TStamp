// Logika inti TStamp (tanpa UI): format teks, jam acak, tanggal otomatis, dan penggambaran overlay.
(function (root) {
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const pad = (n) => String(n).padStart(2, '0');

  // ---------- Tanggal dan jam ----------

  // f: { showDate, showTime, dateFormat: 'short'|'slash'|'long', timeSep: '.'|':', hour12, seconds }
  // Default menghasilkan "16 Sep 2026 16.22.41" (sama dengan foto contoh).
  function formatDateTime(dateStr, timeStr, f) {
    f = Object.assign({ showDate: true, showTime: true, dateFormat: 'short', timeSep: '.', hour12: false, seconds: true }, f || {});
    const parts = [];
    if (f.showDate) {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (f.dateFormat === 'slash') parts.push(`${pad(d)}/${pad(m)}/${y}`);
      else if (f.dateFormat === 'long') parts.push(`${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${BULAN_PANJANG[m - 1]} ${y}`);
      else parts.push(`${pad(d)} ${BULAN[m - 1]} ${y}`);
    }
    if (f.showTime) {
      let [hh, mm, ss] = timeStr.split(':').map(Number);
      let suffix = '';
      if (f.hour12) { suffix = hh >= 12 ? ' PM' : ' AM'; hh = hh % 12 || 12; }
      const sep = f.timeSep || '.';
      parts.push(`${pad(hh)}${sep}${pad(mm)}${f.seconds ? sep + pad(ss || 0) : ''}${suffix}`);
    }
    return parts.join(' ');
  }

  function formatStamp(dateStr, timeStr) { return formatDateTime(dateStr, timeStr); }

  function timeToSec(t) {
    const [h, m, s] = t.split(':').map(Number);
    return h * 3600 + m * 60 + (s || 0);
  }

  function secToTime(s) {
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  // Jam acak di antara start dan end (inklusif), detik juga acak
  function randomTime(start, end, rng) {
    rng = rng || Math.random;
    let a = timeToSec(start);
    let b = timeToSec(end);
    if (a > b) [a, b] = [b, a];
    return secToTime(a + Math.floor(rng() * (b - a + 1)));
  }

  // n jam acak dalam rentang, diurutkan naik
  function sortedRandomTimes(n, start, end, rng) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(timeToSec(randomTime(start, end, rng)));
    arr.sort((x, y) => x - y);
    return arr.map(secToTime);
  }

  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }

  // Tanggal untuk count foto: tiap "every" foto pindah ke hari berikutnya
  function autoDates(count, startDate, every) {
    every = Math.max(1, Math.floor(every) || 1);
    return Array.from({ length: count }, (_, i) => addDays(startDate, Math.floor(i / every)));
  }

  // ---------- Penggambaran ----------

  const FONTS = {
    auto: '"TSFont", Roboto, "Segoe UI", Arial, sans-serif',
  };
  function fontStack(name) {
    if (!name || FONTS[name]) return FONTS[name || 'auto'];
    return `"${name}", "Segoe UI", Arial, sans-serif`;
  }

  function rgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    const n = m ? parseInt(m[1], 16) : 0xffffff;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // Ukuran dan jarak baris, rasio terhadap lebar foto (hasil ukur foto contoh).
  // size = ukuran font, gap = jarak baseline baris ini ke baseline baris di bawahnya.
  const SPEC = [
    { size: 0.0300, gap: 0.0358 }, // tanggal dan jam
    { size: 0.0280, gap: 0.0273 }, // lokasi
    { size: 0.0265, gap: 0.0273 }, // hashtag
    { size: 0.0265, gap: 0 },      // teks tambahan
  ];
  const M_BOTTOM = 0.0418; // baseline baris terbawah ke tepi bawah
  const M_TOP = 0.039;     // tepi atas ke atas huruf baris pertama (dan logo)
  const M_SIDE = 0.034;    // tepi kiri atau kanan

  // o: {
  //   lines: [tanggal+jam, lokasi, hashtag, tambahan]  (kosong dilewati)
  //   textPos: 'bc' (huruf 1: t/m/b, huruf 2: l/c/r), textScale, margin, font, bold,
  //   color, opacity (0..1), shadow (0..1), box: {on, color, opacity},
  //   logo: {img, pos, scale, opacity} | null
  // }
  function drawStamp(canvas, img, o) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Logo
    const L = o.logo;
    if (L && L.img && (L.img.naturalWidth || L.img.width)) {
      const lw = w * 0.18 * (L.scale || 1);
      const lh = lw * ((L.img.naturalHeight || L.img.height) / (L.img.naturalWidth || L.img.width));
      const pos = L.pos || 'tr';
      const mx = w * M_SIDE;
      const my = w * M_TOP;
      const x = pos[1] === 'l' ? mx : pos[1] === 'c' ? (w - lw) / 2 : w - lw - mx;
      const y = pos[0] === 't' ? my : pos[0] === 'm' ? (h - lh) / 2 : h - lh - my;
      ctx.globalAlpha = L.opacity == null ? 1 : L.opacity;
      ctx.drawImage(L.img, x, y, lw, lh);
      ctx.globalAlpha = 1;
    }

    // Teks
    const lines = o.lines || [];
    const present = [];
    lines.forEach((t, i) => { if (t) present.push(i); });
    if (!present.length) return;

    const ts = o.textScale || 1;
    const ms = o.margin == null ? 1 : o.margin;
    const pos = o.textPos || 'bc';
    const sizeOf = (i) => w * SPEC[Math.min(i, SPEC.length - 1)].size * ts;
    const rel = [0];
    for (let k = 1; k < present.length; k++) {
      rel.push(rel[k - 1] + w * SPEC[Math.min(present[k - 1], SPEC.length - 1)].gap * ts);
    }
    const last = rel[rel.length - 1];
    const cap0 = 0.711 * sizeOf(present[0]);
    const v = pos[0];
    const hz = pos[1];
    let shift;
    if (v === 't') shift = w * M_TOP * ms + cap0;
    else if (v === 'm') shift = (h - (cap0 + last)) / 2 + cap0;
    else shift = h - w * M_BOTTOM * ms - last;

    const mS = w * M_SIDE * ms;
    const x = hz === 'l' ? mS : hz === 'r' ? w - mS : w / 2;
    ctx.textAlign = hz === 'l' ? 'left' : hz === 'r' ? 'right' : 'center';
    ctx.textBaseline = 'alphabetic';
    const weight = o.bold ? 700 : 400;
    const stack = fontStack(o.font);

    // Kotak latar
    if (o.box && o.box.on) {
      let maxW = 0;
      let maxFs = 0;
      present.forEach((i) => {
        const fs = sizeOf(i);
        ctx.font = `${weight} ${fs}px ${stack}`;
        maxW = Math.max(maxW, ctx.measureText(lines[i]).width);
        maxFs = Math.max(maxFs, fs);
      });
      const padX = maxFs * 0.7;
      const padY = maxFs * 0.45;
      const bw = maxW + padX * 2;
      const bx = hz === 'l' ? x - padX : hz === 'r' ? x - maxW - padX : x - maxW / 2 - padX;
      const by = shift - cap0 - padY;
      const bh = cap0 + last + sizeOf(present[present.length - 1]) * 0.25 + padY * 2;
      ctx.fillStyle = rgba(o.box.color || '#000000', o.box.opacity == null ? 0.4 : o.box.opacity);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, maxFs * 0.5);
      else ctx.rect(bx, by, bw, bh);
      ctx.fill();
    }

    ctx.fillStyle = o.color || '#ffffff';
    ctx.globalAlpha = o.opacity == null ? 1 : o.opacity;
    const shadow = o.shadow == null ? 0.5 : o.shadow;
    present.forEach((i, k) => {
      const fs = sizeOf(i);
      ctx.font = `${weight} ${fs}px ${stack}`;
      if (shadow > 0) {
        ctx.shadowColor = `rgba(0,0,0,${shadow})`;
        ctx.shadowBlur = fs * 0.25;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = fs * 0.03;
      } else {
        ctx.shadowColor = 'transparent';
      }
      ctx.fillText(lines[i], x, shift + rel[k]);
    });
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
  }

  const api = {
    BULAN, pad, formatDateTime, formatStamp, timeToSec, secToTime, randomTime,
    sortedRandomTimes, addDays, autoDates, fontStack, drawStamp,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TSCore = api;
})(typeof window !== 'undefined' ? window : this);
