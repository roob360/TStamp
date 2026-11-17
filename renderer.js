(function () {
  const T = TSCore;
  const $ = (id) => document.getElementById(id);
  const KEYS = ['tstamp.settings.v1', 'tstamp.settings.v2'];
  const KEY = KEYS[1];

  // ---------- Pengaturan umum (disimpan di app) ----------
  const defaults = {
    mode: 'random', rangeStart: '09:00:00', rangeEnd: '17:00:00', ascending: false, autoEvery: 5,
    lokasi: 'Kecamatan Sepaku', hashtag: '#MAPK', extra: '',
    showDate: true, showTime: true, showLokasi: true, showHashtag: true, showExtra: true,
    dateFormat: 'short', timeSep: '.', hour12: false, seconds: true,
    textPos: 'bc', font: 'auto', bold: false, textScale: 1, margin: 1,
    color: '#ffffff', opacity: 100, shadow: 50,
    box: false, boxColor: '#000000', boxOpacity: 40,
    logoData: null, logoPos: 'tr', logoScale: 1, logoOpacity: 100,
    format: 'jpg', quality: 92,
  };
  const S = Object.assign({}, defaults);
  KEYS.forEach((k) => { try { Object.assign(S, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) {} });
  const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${T.pad(d.getMonth() + 1)}-${T.pad(d.getDate())}`;
  }
  // Tidak disimpan: tanggal mulai dan jam manual
  let defDate = todayStr();
  let manualTime = '08:00:00';

  // ---------- State ----------
  const items = [];
  let selectedId = null;
  let nextId = 1;
  let pasteCount = 0;
  let logoImg = null;
  const rowEls = new Map();

  const POS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
  const POS_NAME = {
    tl: 'Atas kiri', tc: 'Atas tengah', tr: 'Atas kanan',
    ml: 'Tengah kiri', mc: 'Tengah', mr: 'Tengah kanan',
    bl: 'Bawah kiri', bc: 'Bawah tengah', br: 'Bawah kanan',
  };

  const cur = () => items.find((i) => i.id === selectedId) || null;
  const setStatus = (t) => { $('status').textContent = t || ''; };
  const randTime = () => T.randomTime(S.rangeStart || '09:00:00', S.rangeEnd || '17:00:00');
  const newTime = () => (S.mode === 'random' ? randTime() : manualTime);

  // ---------- Opsi stempel per foto ----------
  function stampOpts(it) {
    const o = it.o;
    const pick = (own, gen) => (own != null && own !== '' ? own : gen);
    const dt = S.showDate || S.showTime
      ? T.formatDateTime(it.date, it.time, {
        showDate: S.showDate, showTime: S.showTime, dateFormat: S.dateFormat,
        timeSep: S.timeSep, hour12: S.hour12, seconds: S.seconds,
      })
      : '';
    const lines = o.hideText ? [] : [
      dt,
      S.showLokasi ? pick(o.lokasi, S.lokasi) : '',
      S.showHashtag ? pick(o.hashtag, S.hashtag) : '',
      S.showExtra ? S.extra : '',
    ];
    return {
      lines,
      textPos: o.textPos || S.textPos,
      textScale: o.textScale ? o.textScale / 100 : S.textScale,
      margin: S.margin,
      font: S.font,
      bold: S.bold,
      color: S.color,
      opacity: S.opacity / 100,
      shadow: S.shadow / 100,
      box: { on: S.box, color: S.boxColor, opacity: S.boxOpacity / 100 },
      logo: logoImg && !o.hideLogo
        ? { img: logoImg, pos: S.logoPos, scale: S.logoScale, opacity: S.logoOpacity / 100 }
        : null,
    };
  }

  function drawPreview() {
    const it = cur();
    const cv = $('preview');
    if (!it) { cv.hidden = true; $('empty').hidden = false; return; }
    $('empty').hidden = true;
    cv.hidden = false;
    T.drawStamp(cv, it.img, stampOpts(it));
  }
  let rafPending = false;
  function redraw() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; drawPreview(); });
  }

  async function renderBlob(it, type) {
    const c = document.createElement('canvas');
    T.drawStamp(c, it.img, stampOpts(it));
    return new Promise((res) => c.toBlob(res, type, S.quality / 100));
  }
  const outExt = () => (S.format === 'png' ? 'png' : 'jpg');
  const outType = () => (S.format === 'png' ? 'image/png' : 'image/jpeg');
  function autoBase(it) { return it.name.replace(/\.[^.]+$/, '') + '_ts'; }
  function outName(it) {
    const typed = (it.o.outName || '').replace(/[\\/:*?"<>|]/g, '').replace(/\.(jpe?g|png)$/i, '').trim();
    return (typed || autoBase(it)) + '.' + outExt();
  }

  // ---------- Daftar foto ----------
  function select(id) {
    selectedId = id;
    rowEls.forEach((el, k) => el.classList.toggle('sel', k === id));
    redraw();
  }

  function renumber() {
    items.forEach((it, i) => {
      const row = rowEls.get(it.id);
      if (row) row.querySelector('.name').textContent = `${i + 1}. ${it.name}`;
    });
  }

  function updateScope() {
    const n = items.filter((i) => i.checked).length;
    const t = n ? `${n} dicentang` : 'semua foto';
    $('btnApplyDate').textContent = `Terapkan tanggal: ${t}`;
    $('btnAutoDate').textContent = `Tanggal otomatis: ${t}`;
    $('btnRandomAll').textContent = `Acak jam: ${t}`;
    $('btnApplyManual').textContent = `Terapkan jam: ${t}`;
    $('selInfo').textContent = n ? `${n} dipilih` : '';
    $('btnDeleteChecked').disabled = !n;
    const all = $('chkAll');
    all.checked = n > 0 && n === items.length;
    all.indeterminate = n > 0 && n < items.length;
    $('count').textContent = `(${items.length})`;
    $('listEmpty').hidden = items.length > 0;
  }
  const scope = () => { const c = items.filter((i) => i.checked); return c.length ? c : items; };

  function refreshPlaceholders() {
    rowEls.forEach((row, id) => {
      const it = items.find((i) => i.id === id);
      row.querySelector('.o-lokasi').placeholder = S.lokasi || 'Ikuti umum';
      row.querySelector('.o-hashtag').placeholder = S.hashtag || 'Ikuti umum';
      row.querySelector('.o-out').placeholder = it ? autoBase(it) : '';
    });
  }

  const GRIP = '<svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"><g fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="8" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="8" cy="12" r="1.3"/></g></svg>';

  let dragId = null;

  function buildRow(it) {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.id = it.id;
    row.innerHTML =
      '<div class="row-main">' +
        '<span class="grip" title="Geser untuk mengubah urutan">' + GRIP + '</span>' +
        '<input type="checkbox" class="chk" aria-label="Pilih foto">' +
        '<img alt="">' +
        '<div class="meta"><div class="name"></div>' +
          '<div class="inputs"><input type="date" class="d"><input type="time" step="1" class="t"></div></div>' +
        '<button class="chev" aria-label="Detail foto" aria-expanded="false"></button>' +
      '</div>' +
      '<div class="detail" hidden>' +
        '<label class="field">Lokasi<input type="text" class="o-lokasi"></label>' +
        '<label class="field">Hashtag<input type="text" class="o-hashtag"></label>' +
        '<div class="row2">' +
          '<label class="field">Posisi teks<select class="o-pos"></select></label>' +
          '<label class="field">Ukuran teks (%)<input type="number" class="o-scale" min="30" max="300" step="5" placeholder="Umum"></label>' +
        '</div>' +
        '<div class="checks">' +
          '<label class="check"><input type="checkbox" class="o-hidelogo"><span>Sembunyikan logo</span></label>' +
          '<label class="check"><input type="checkbox" class="o-hidetext"><span>Sembunyikan teks</span></label>' +
        '</div>' +
        '<label class="field">Nama file output<input type="text" class="o-out"></label>' +
        '<div class="btns">' +
          '<button class="btn sm rnd">Acak jam</button>' +
          '<button class="btn sm o-reset">Kembalikan ke umum</button>' +
          '<button class="btn sm btn-destructive del">Hapus</button>' +
        '</div>' +
      '</div>';

    const q = (s) => row.querySelector(s);
    q('img').src = it.url;
    q('.name').title = it.name;
    const d = q('.d');
    const t = q('.t');
    d.value = it.date;
    t.value = it.time;

    // Pilihan posisi per foto
    const sel = q('.o-pos');
    sel.add(new Option('Ikuti umum', ''));
    POS.forEach((p) => sel.add(new Option(POS_NAME[p], p)));

    const chk = q('.chk');
    chk.addEventListener('change', () => { it.checked = chk.checked; updateScope(); });
    chk.addEventListener('click', (e) => e.stopPropagation());

    d.addEventListener('input', () => { if (d.value) { it.date = d.value; select(it.id); } });
    t.addEventListener('input', () => { if (t.value) { it.time = t.value; select(it.id); } });

    // Detail per foto
    const setO = (k, v) => { it.o[k] = v; select(it.id); };
    q('.o-lokasi').addEventListener('input', (e) => setO('lokasi', e.target.value));
    q('.o-hashtag').addEventListener('input', (e) => setO('hashtag', e.target.value));
    sel.addEventListener('input', () => setO('textPos', sel.value));
    q('.o-scale').addEventListener('input', (e) => setO('textScale', e.target.value ? Number(e.target.value) : null));
    q('.o-hidelogo').addEventListener('input', (e) => setO('hideLogo', e.target.checked));
    q('.o-hidetext').addEventListener('input', (e) => setO('hideText', e.target.checked));
    q('.o-out').addEventListener('input', (e) => { it.o.outName = e.target.value; });
    q('.rnd').addEventListener('click', () => {
      it.time = randTime();
      t.value = it.time;
      select(it.id);
    });
    q('.o-reset').addEventListener('click', () => {
      it.o = { lokasi: '', hashtag: '', hideLogo: false, hideText: false, textPos: '', textScale: null, outName: '' };
      q('.o-lokasi').value = '';
      q('.o-hashtag').value = '';
      sel.value = '';
      q('.o-scale').value = '';
      q('.o-hidelogo').checked = false;
      q('.o-hidetext').checked = false;
      q('.o-out').value = '';
      select(it.id);
    });
    q('.del').addEventListener('click', () => removeItem(it.id));

    // Buka atau tutup detail
    q('.chev').addEventListener('click', (e) => {
      e.stopPropagation();
      const open = q('.detail').hidden;
      q('.detail').hidden = !open;
      row.classList.toggle('open', open);
      q('.chev').setAttribute('aria-expanded', String(open));
      select(it.id);
    });
    row.addEventListener('click', () => select(it.id));

    // Urutkan ulang dengan drag lewat gagang
    const grip = q('.grip');
    grip.addEventListener('mousedown', () => { row.draggable = true; });
    row.addEventListener('mouseup', () => { if (dragId === null) row.draggable = false; });
    row.addEventListener('dragstart', (e) => {
      dragId = it.id;
      e.dataTransfer.setData('text/x-tstamp-row', String(it.id));
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.draggable = false;
      row.classList.remove('dragging');
      rowEls.forEach((el) => el.classList.remove('drop-before', 'drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if (dragId === null || dragId === it.id) return;
      e.preventDefault();
      const r = row.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      row.classList.toggle('drop-after', after);
      row.classList.toggle('drop-before', !after);
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after'));
    row.addEventListener('drop', (e) => {
      if (dragId === null) return;
      e.preventDefault();
      e.stopPropagation();
      const after = row.classList.contains('drop-after');
      row.classList.remove('drop-before', 'drop-after');
      moveItem(dragId, it.id, after);
    });

    rowEls.set(it.id, row);
    row._d = d;
    row._t = t;
    return row;
  }

  function moveItem(id, targetId, after) {
    const from = items.findIndex((i) => i.id === id);
    if (from < 0 || id === targetId) return;
    const [it] = items.splice(from, 1);
    let to = items.findIndex((i) => i.id === targetId);
    if (to < 0) { items.splice(from, 0, it); return; }
    if (after) to += 1;
    items.splice(to, 0, it);
    const rows = $('rows');
    const el = rowEls.get(id);
    const ref = items[to + 1] ? rowEls.get(items[to + 1].id) : null;
    rows.insertBefore(el, ref);
    renumber();
    setStatus('Urutan diubah.');
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
    renumber();
    updateScope();
    if (selectedId === id) {
      const next = items[idx] || items[idx - 1] || null;
      select(next ? next.id : null);
    }
  }

  // Muat semua gambar dulu, lalu tambahkan sesuai urutan pemilihan (bukan urutan selesai dimuat)
  function loadImage(f) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => resolve({ f, url, img });
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ f, error: true }); };
      img.src = url;
    });
  }

  async function addFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) { setStatus('Tidak ada file gambar.'); return; }
    const loaded = await Promise.all(list.map(loadImage));
    let firstId = null;
    let added = 0;
    loaded.forEach(({ f, url, img, error }) => {
      if (error) { setStatus(`Gagal membaca: ${f.name}`); return; }
      const it = {
        id: nextId++,
        name: f.name && f.name !== 'image.png' ? f.name : `foto_${++pasteCount}.png`,
        img, url, date: defDate, time: newTime(), checked: false,
        o: { lokasi: '', hashtag: '', hideLogo: false, hideText: false, textPos: '', textScale: null, outName: '' },
      };
      items.push(it);
      $('rows').appendChild(buildRow(it));
      if (firstId === null) firstId = it.id;
      added++;
    });
    if (!added) return;
    renumber();
    refreshPlaceholders();
    updateScope();
    select(firstId);
    setStatus(`${added} foto ditambahkan.`);
  }

  // ---------- Input foto: pilih, drag, paste ----------
  $('btnAdd').addEventListener('click', () => $('fileInput').click());
  $('stage').addEventListener('click', () => { if (!items.length) $('fileInput').click(); });
  $('fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (hasFiles(e)) $('stage').classList.add('drag');
  });
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

  // ---------- Pengaturan: pengikat kontrol ----------
  function showLogoPreview() {
    const t = $('logoThumb');
    if (S.logoData) { t.src = S.logoData; t.hidden = false; $('logoEmpty').hidden = true; }
    else { t.removeAttribute('src'); t.hidden = true; $('logoEmpty').hidden = false; }
  }
  function loadLogo() {
    showLogoPreview();
    if (!S.logoData) { logoImg = null; return; }
    const im = new Image();
    im.onload = () => { logoImg = im; redraw(); };
    im.src = S.logoData;
  }

  function updateLabels() {
    $('valText').textContent = Math.round(S.textScale * 100) + '%';
    $('valMargin').textContent = Math.round(S.margin * 100) + '%';
    $('valOpacity').textContent = S.opacity + '%';
    $('valShadow').textContent = S.shadow + '%';
    $('valBoxOpacity').textContent = S.boxOpacity + '%';
    $('valLogo').textContent = Math.round(S.logoScale * 100) + '%';
    $('valLogoOpacity').textContent = S.logoOpacity + '%';
    $('valQuality').textContent = S.quality;
  }

  const BIND = [
    ['setLokasi', 'lokasi', 'text'], ['setHashtag', 'hashtag', 'text'], ['setExtra', 'extra', 'text'],
    ['chkShowDate', 'showDate', 'check'], ['chkShowTime', 'showTime', 'check'],
    ['chkShowLokasi', 'showLokasi', 'check'], ['chkShowHashtag', 'showHashtag', 'check'],
    ['chkShowExtra', 'showExtra', 'check'],
    ['setDateFormat', 'dateFormat', 'select'], ['chkSeconds', 'seconds', 'check'],
    ['setFont', 'font', 'select'], ['setTextScale', 'textScale', 'pct'], ['setMargin', 'margin', 'pct'],
    ['setColor', 'color', 'color'], ['setOpacity', 'opacity', 'num'], ['setShadow', 'shadow', 'num'],
    ['chkBox', 'box', 'check'], ['setBoxColor', 'boxColor', 'color'], ['setBoxOpacity', 'boxOpacity', 'num'],
    ['setLogoScale', 'logoScale', 'pct'], ['setLogoOpacity', 'logoOpacity', 'num'],
    ['setStart', 'rangeStart', 'time'], ['setEnd', 'rangeEnd', 'time'],
    ['chkAscending', 'ascending', 'check'], ['setAutoEvery', 'autoEvery', 'int'],
    ['setQuality', 'quality', 'num'],
  ];

  function bindControls() {
    BIND.forEach(([id, key, kind]) => {
      const el = $(id);
      if (kind === 'check') el.checked = !!S[key];
      else if (kind === 'pct') el.value = Math.round(S[key] * 100);
      else el.value = S[key];
      el.addEventListener('input', () => {
        let v;
        if (kind === 'check') v = el.checked;
        else if (kind === 'pct') v = Number(el.value) / 100;
        else if (kind === 'num') v = Number(el.value);
        else if (kind === 'int') { v = Math.max(1, Math.floor(Number(el.value))); if (!v) return; }
        else { if ((kind === 'time' || kind === 'color') && !el.value) return; v = el.value; }
        S[key] = v;
        saveSettings();
        updateLabels();
        if (key === 'lokasi' || key === 'hashtag') refreshPlaceholders();
        redraw();
      });
    });

    function radios(name, key, fromS, toS) {
      document.querySelectorAll(`input[name=${name}]`).forEach((r) => {
        r.checked = r.value === fromS(S[key]);
        r.addEventListener('change', () => {
          if (r.checked) { S[key] = toS(r.value); saveSettings(); redraw(); }
        });
      });
    }
    const same = (v) => v;
    radios('mode', 'mode', same, same);
    radios('format', 'format', same, same);
    radios('timeSep', 'timeSep', same, same);
    radios('hour', 'hour12', (b) => (b ? '12' : '24'), (v) => v === '12');
    radios('bold', 'bold', (b) => (b ? 'b' : 'n'), (v) => v === 'b');
    radios('textPos', 'textPos', same, same);
    radios('logoPos', 'logoPos', same, same);

    $('setDate').value = defDate;
    $('setManualTime').value = manualTime;
    $('setDate').addEventListener('input', (e) => { if (e.target.value) defDate = e.target.value; });
    $('setManualTime').addEventListener('input', (e) => { if (e.target.value) manualTime = e.target.value; });

    document.querySelectorAll('input[type=range]').forEach((r) => {
      const sync = () => r.style.setProperty('--pct', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      sync();
      r.addEventListener('input', sync);
    });

    $('logoFile').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => { S.logoData = fr.result; saveSettings(); loadLogo(); setStatus('Logo diperbarui.'); };
      fr.readAsDataURL(f);
      e.target.value = '';
    });
    $('btnClearLogo').addEventListener('click', () => { S.logoData = null; logoImg = null; showLogoPreview(); saveSettings(); redraw(); });

    // Aksi massal: berlaku untuk foto yang dicentang, atau semua bila tidak ada yang dicentang
    $('btnApplyDate').addEventListener('click', () => {
      scope().forEach((i) => { i.date = defDate; });
      refreshRows();
    });
    $('btnAutoDate').addEventListener('click', () => {
      const sc = scope();
      const arr = T.autoDates(sc.length, defDate, S.autoEvery);
      sc.forEach((it, i) => { it.date = arr[i]; });
      refreshRows();
    });
    $('btnApplyManual').addEventListener('click', () => {
      scope().forEach((i) => { i.time = manualTime; });
      refreshRows();
    });
    $('btnRandomAll').addEventListener('click', () => {
      const sc = scope();
      if (S.ascending) {
        // Berurutan naik sesuai urutan daftar, dihitung per tanggal
        const groups = new Map();
        sc.forEach((it) => {
          if (!groups.has(it.date)) groups.set(it.date, []);
          groups.get(it.date).push(it);
        });
        groups.forEach((g) => {
          const times = T.sortedRandomTimes(g.length, S.rangeStart, S.rangeEnd);
          g.forEach((it, i) => { it.time = times[i]; });
        });
      } else {
        sc.forEach((it) => { it.time = randTime(); });
      }
      refreshRows();
    });

    // Daftar foto: pilih semua dan hapus dicentang
    $('chkAll').addEventListener('change', () => {
      const on = $('chkAll').checked;
      items.forEach((it) => {
        it.checked = on;
        rowEls.get(it.id).querySelector('.chk').checked = on;
      });
      updateScope();
    });
    $('btnDeleteChecked').addEventListener('click', () => {
      items.filter((i) => i.checked).map((i) => i.id).forEach(removeItem);
    });
  }

  // Pemilih posisi 9 titik
  function buildPos(id, name) {
    const c = $(id);
    POS.forEach((p) => {
      const l = document.createElement('label');
      l.title = POS_NAME[p];
      l.innerHTML = `<input type="radio" name="${name}" value="${p}"><span></span>`;
      c.appendChild(l);
    });
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
  buildPos('posText', 'textPos');
  buildPos('posLogo', 'logoPos');
  bindControls();
  updateLabels();
  updateScope();
  loadLogo();
  if (document.fonts && document.fonts.load) document.fonts.load('400 20px TSFont').then(redraw).catch(() => {});
  window.__tstamp = { items, S };
})();
