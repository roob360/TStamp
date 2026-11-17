(function () {
  const { pad, formatStamp, randomTime, drawStamp } = TSCore;
  const $ = (id) => document.getElementById(id);
  const KEY = 'tstamp.settings.v1';

  // ---------- Pengaturan (disimpan di app) ----------
  const defaults = {
    mode: 'random', rangeStart: '09:00:00', rangeEnd: '17:00:00',
    lokasi: 'Kecamatan Sepaku', hashtag: '#MAPK',
    logoData: null, logoScale: 1, textScale: 1, format: 'jpg', quality: 92,
  };
  const S = Object.assign({}, defaults);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // Tidak disimpan: tanggal default dan jam manual
  let defDate = todayStr();
  let manualTime = '08:00:00';

  // ---------- State ----------
  const items = [];
  let selectedId = null;
  let nextId = 1;
  let pasteCount = 0;
  let logoImg = null;
  const rowEls = new Map();

  const cur = () => items.find((i) => i.id === selectedId) || null;
  const setStatus = (t) => { $('status').textContent = t || ''; };

  function randTime() {
    return randomTime(S.rangeStart || '09:00:00', S.rangeEnd || '17:00:00');
  }
  function newTime() { return S.mode === 'random' ? randTime() : manualTime; }

  // ---------- Render overlay ----------
  function optsFor(it) {
    return {
      lines: [formatStamp(it.date, it.time), S.lokasi, S.hashtag],
      logo: logoImg,
      logoScale: S.logoScale,
      textScale: S.textScale,
    };
  }

  function drawPreview() {
    const it = cur();
    const cv = $('preview');
    if (!it) { cv.hidden = true; $('empty').hidden = false; return; }
    $('empty').hidden = true;
    cv.hidden = false;
    drawStamp(cv, it.img, optsFor(it));
  }
  let rafPending = false;
  function redraw() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; drawPreview(); });
  }

  async function renderBlob(it, type) {
    const c = document.createElement('canvas');
    drawStamp(c, it.img, optsFor(it));
    return new Promise((res) => c.toBlob(res, type, S.quality / 100));
  }
  const outExt = () => (S.format === 'png' ? 'png' : 'jpg');
  const outType = () => (S.format === 'png' ? 'image/png' : 'image/jpeg');
  const outName = (it) => it.name.replace(/\.[^.]+$/, '') + '_ts.' + outExt();

  // ---------- Daftar foto ----------
  function select(id) {
    selectedId = id;
    rowEls.forEach((el, k) => el.classList.toggle('sel', k === id));
    redraw();
  }

  function buildRow(it) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      '<img alt=""><div class="meta"><div class="name"></div>' +
      '<div class="inputs"><input type="date" class="d"><input type="time" step="1" class="t"></div>' +
      '<div class="btns"><button class="btn sm rnd">Acak jam</button><button class="btn sm btn-destructive del">Hapus</button></div></div>';
    row.querySelector('img').src = it.url;
    row.querySelector('.name').textContent = it.name;
    row.querySelector('.name').title = it.name;
    const d = row.querySelector('.d');
    const t = row.querySelector('.t');
    d.value = it.date;
    t.value = it.time;
    d.addEventListener('input', () => { if (d.value) { it.date = d.value; select(it.id); } });
    t.addEventListener('input', () => { if (t.value) { it.time = t.value; select(it.id); } });
    row.querySelector('.rnd').addEventListener('click', (e) => {
      e.stopPropagation();
      it.time = randTime();
      t.value = it.time;
      select(it.id);
    });
    row.querySelector('.del').addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(it.id);
    });
    row.addEventListener('click', () => select(it.id));
    rowEls.set(it.id, row);
    row._d = d; row._t = t;
    return row;
  }

  function refreshRows() {
    items.forEach((it) => {
      const row = rowEls.get(it.id);
      if (row) { row._d.value = it.date; row._t.value = it.time; }
    });
    redraw();
  }

  function removeItem(id) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    URL.revokeObjectURL(items[idx].url);
    items.splice(idx, 1);
    const row = rowEls.get(id);
    if (row) row.remove();
    rowEls.delete(id);
    $('count').textContent = `(${items.length})`;
    if (selectedId === id) {
      const next = items[idx] || items[idx - 1] || null;
      select(next ? next.id : null);
    }
  }

  function addFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) { setStatus('Tidak ada file gambar.'); return; }
    let firstId = null;
    let pending = list.length;
    list.forEach((f) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const it = {
          id: nextId++,
          name: f.name && f.name !== 'image.png' ? f.name : `foto_${++pasteCount}.png`,
          img, url, date: defDate, time: newTime(),
        };
        items.push(it);
        $('rows').appendChild(buildRow(it));
        $('count').textContent = `(${items.length})`;
        if (firstId === null) firstId = it.id;
        if (--pending === 0) { select(firstId); setStatus(`${list.length} foto ditambahkan.`); }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus(`Gagal membaca: ${f.name}`);
        pending--;
      };
      img.src = url;
    });
  }

  // ---------- Input foto: pilih, drag, paste ----------
  $('btnAdd').addEventListener('click', () => $('fileInput').click());
  $('stage').addEventListener('click', () => { if (!items.length) $('fileInput').click(); });
  $('fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

  document.addEventListener('dragover', (e) => { e.preventDefault(); $('stage').classList.add('drag'); });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) $('stage').classList.remove('drag'); });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    $('stage').classList.remove('drag');
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  document.addEventListener('paste', (e) => {
    const files = [];
    for (const it of (e.clipboardData && e.clipboardData.items) || []) {
      if (it.kind === 'file' && it.type.startsWith('image/')) files.push(it.getAsFile());
    }
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  // ---------- Kontrol pengaturan ----------
  function loadLogo() {
    if (!S.logoData) { logoImg = null; return; }
    const im = new Image();
    im.onload = () => { logoImg = im; redraw(); };
    im.src = S.logoData;
  }

  function bindControls() {
    $('setDate').value = defDate;
    $('setManualTime').value = manualTime;
    $('setStart').value = S.rangeStart;
    $('setEnd').value = S.rangeEnd;
    $('setLokasi').value = S.lokasi;
    $('setHashtag').value = S.hashtag;
    $('setTextScale').value = Math.round(S.textScale * 100);
    $('setLogoScale').value = Math.round(S.logoScale * 100);
    document.querySelectorAll('input[name=format]').forEach((r) => { r.checked = r.value === S.format; });
    $('setQuality').value = S.quality;
    document.querySelectorAll('input[name=mode]').forEach((r) => { r.checked = r.value === S.mode; });
    const labels = () => {
      $('valText').textContent = Math.round(S.textScale * 100) + '%';
      $('valLogo').textContent = Math.round(S.logoScale * 100) + '%';
      $('valQuality').textContent = S.quality;
    };
    labels();

    $('setDate').addEventListener('input', (e) => { if (e.target.value) defDate = e.target.value; });
    $('setManualTime').addEventListener('input', (e) => { if (e.target.value) manualTime = e.target.value; });
    $('setStart').addEventListener('input', (e) => { if (e.target.value) { S.rangeStart = e.target.value; saveSettings(); } });
    $('setEnd').addEventListener('input', (e) => { if (e.target.value) { S.rangeEnd = e.target.value; saveSettings(); } });
    document.querySelectorAll('input[name=mode]').forEach((r) =>
      r.addEventListener('change', () => { if (r.checked) { S.mode = r.value; saveSettings(); } }));

    $('setLokasi').addEventListener('input', (e) => { S.lokasi = e.target.value; saveSettings(); redraw(); });
    $('setHashtag').addEventListener('input', (e) => { S.hashtag = e.target.value; saveSettings(); redraw(); });
    $('setTextScale').addEventListener('input', (e) => { S.textScale = e.target.value / 100; labels(); saveSettings(); redraw(); });
    $('setLogoScale').addEventListener('input', (e) => { S.logoScale = e.target.value / 100; labels(); saveSettings(); redraw(); });
    document.querySelectorAll('input[name=format]').forEach((r) =>
      r.addEventListener('change', () => { if (r.checked) { S.format = r.value; saveSettings(); } }));
    $('setQuality').addEventListener('input', (e) => { S.quality = Number(e.target.value); labels(); saveSettings(); });

    $('logoFile').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => { S.logoData = fr.result; saveSettings(); loadLogo(); setStatus('Logo diperbarui.'); };
      fr.readAsDataURL(f);
      e.target.value = '';
    });
    $('btnClearLogo').addEventListener('click', () => { S.logoData = null; logoImg = null; saveSettings(); redraw(); });

    document.querySelectorAll('input[type=range]').forEach((r) => {
      const sync = () => r.style.setProperty('--pct', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      sync();
      r.addEventListener('input', sync);
    });

    $('btnApplyDate').addEventListener('click', () => { items.forEach((i) => { i.date = defDate; }); refreshRows(); });
    $('btnApplyManual').addEventListener('click', () => { items.forEach((i) => { i.time = manualTime; }); refreshRows(); });
    $('btnRandomAll').addEventListener('click', () => { items.forEach((i) => { i.time = randTime(); }); refreshRows(); });
  }

  // ---------- Simpan dan salin ----------
  function browserDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  $('btnSave').addEventListener('click', async () => {
    const it = cur();
    if (!it) { setStatus('Belum ada foto.'); return; }
    const blob = await renderBlob(it, outType());
    if (window.api) {
      const r = await window.api.saveOne(outName(it), await blob.arrayBuffer());
      setStatus(r.ok ? `Tersimpan: ${r.path}` : 'Dibatalkan.');
    } else {
      browserDownload(blob, outName(it));
      setStatus('Diunduh.');
    }
  });

  $('btnSaveAll').addEventListener('click', async () => {
    if (!items.length) { setStatus('Belum ada foto.'); return; }
    let dir = null;
    if (window.api) {
      dir = await window.api.pickFolder();
      if (!dir) { setStatus('Dibatalkan.'); return; }
    }
    for (let i = 0; i < items.length; i++) {
      setStatus(`Menyimpan ${i + 1}/${items.length}...`);
      const blob = await renderBlob(items[i], outType());
      if (window.api) await window.api.saveInDir(dir, outName(items[i]), await blob.arrayBuffer());
      else browserDownload(blob, outName(items[i]));
    }
    setStatus(`Selesai: ${items.length} foto tersimpan${dir ? ' di ' + dir : ''}.`);
  });

  $('btnCopy').addEventListener('click', async () => {
    const it = cur();
    if (!it) { setStatus('Belum ada foto.'); return; }
    const blob = await renderBlob(it, 'image/png');
    try {
      if (window.api) {
        const r = await window.api.copyImage(await blob.arrayBuffer());
        setStatus(r.ok ? 'Foto disalin ke clipboard.' : 'Gagal menyalin.');
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatus('Foto disalin ke clipboard.');
      }
    } catch (err) {
      setStatus('Gagal menyalin: ' + err.message);
    }
  });

  // Ctrl+C: salin foto terpilih (hasil stempel) ke clipboard.
  // Salin teks biasa tetap jalan bila ada teks yang diblok di isian atau halaman.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'c') return;
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && a.type === 'text' && a.selectionStart !== a.selectionEnd) return;
    const sel = window.getSelection();
    if (sel && sel.toString()) return;
    e.preventDefault();
    $('btnCopy').click();
  });

  // ---------- Mulai ----------
  bindControls();
  loadLogo();
  if (document.fonts && document.fonts.load) document.fonts.load('400 20px TSFont').then(redraw).catch(() => {});
  window.__tstamp = { items, S };
})();
