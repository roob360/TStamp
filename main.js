const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: 'TStamp',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

function uniquePath(dir, name) {
  const safe = path.basename(name);
  const ext = path.extname(safe);
  const base = path.basename(safe, ext);
  let p = path.join(dir, safe);
  let i = 1;
  while (fs.existsSync(p)) {
    p = path.join(dir, `${base} (${i})${ext}`);
    i++;
  }
  return p;
}

// Simpan satu foto lewat dialog "Save As"
ipcMain.handle('save-one', async (_e, name, bytes) => {
  const ext = path.extname(name).replace('.', '') || 'jpg';
  const r = await dialog.showSaveDialog(win, {
    defaultPath: name,
    filters: [{ name: 'Gambar', extensions: [ext] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, Buffer.from(bytes));
  return { ok: true, path: r.filePath };
});

// Pilih folder untuk simpan banyak foto
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Pilih folder tujuan',
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});

// Simpan satu file ke folder terpilih (nama bentrok diberi nomor, tidak menimpa)
ipcMain.handle('save-in-dir', async (_e, dir, name, bytes) => {
  const p = uniquePath(dir, name);
  fs.writeFileSync(p, Buffer.from(bytes));
  return { ok: true, path: p };
});

// Salin gambar ke clipboard
ipcMain.handle('copy-image', async (_e, bytes) => {
  const img = nativeImage.createFromBuffer(Buffer.from(bytes));
  if (img.isEmpty()) return { ok: false };
  clipboard.writeImage(img);
  return { ok: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
