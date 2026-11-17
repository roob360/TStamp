// Logika inti TStamp (tanpa UI): format teks, jam acak, dan penggambaran overlay.
(function (root) {
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const pad = (n) => String(n).padStart(2, '0');

  // "2026-09-16", "16:22:41" -> "16 Sep 2026 16.22.41"
  function formatStamp(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm, ss] = timeStr.split(':').map(Number);
    return `${pad(d)} ${BULAN[m - 1]} ${y} ${pad(hh)}.${pad(mm)}.${pad(ss || 0)}`;
  }

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

  // Gambar foto + overlay ke canvas pada resolusi asli foto.
  // opts: { lines: [teks...], logo: Image|null, logoScale: 1, textScale: 1 }
  function drawStamp(canvas, img, opts) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Logo kanan atas (hasil ukur foto contoh: lebar 18%, margin kanan 3,4%, margin atas 3,9%)
    if (opts.logo && (opts.logo.naturalWidth || opts.logo.width)) {
      const lw = w * 0.18 * (opts.logoScale || 1);
      const lh = lw * ((opts.logo.naturalHeight || opts.logo.height) / (opts.logo.naturalWidth || opts.logo.width));
      ctx.drawImage(opts.logo, w - lw - w * 0.034, w * 0.039, lw, lh);
    }

    // Teks tengah bawah. Angka di bawah adalah rasio terhadap lebar foto, hasil ukur foto contoh.
    // size = ukuran font, gap = jarak baseline baris ini ke baseline baris di bawahnya.
    const SPEC = [
      { size: 0.0300, gap: 0.0358 }, // tanggal dan jam
      { size: 0.0280, gap: 0.0273 }, // lokasi
      { size: 0.0265, gap: 0 },      // hashtag
    ];
    const BASELINE = 0.0418; // jarak baseline baris terbawah ke tepi bawah foto
    const ts = opts.textScale || 1;
    const lines = opts.lines || [];
    const present = [];
    lines.forEach((t, i) => { if (t) present.push(i); });
    if (present.length) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      let y = h - w * BASELINE;
      for (let k = present.length - 1; k >= 0; k--) {
        const i = present[k];
        const sp = SPEC[Math.min(i, SPEC.length - 1)];
        const fs = w * sp.size * ts;
        ctx.font = `400 ${fs}px "TSFont", Roboto, "Segoe UI", Arial, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = fs * 0.25;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = fs * 0.03;
        ctx.fillText(lines[i], w / 2, y);
        if (k > 0) y -= w * SPEC[Math.min(present[k - 1], SPEC.length - 1)].gap * ts;
      }
      ctx.shadowColor = 'transparent';
    }
  }

  const api = { BULAN, pad, formatStamp, timeToSec, secToTime, randomTime, drawStamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TSCore = api;
})(typeof window !== 'undefined' ? window : this);
