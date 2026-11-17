const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveOne: (name, bytes) => ipcRenderer.invoke('save-one', name, bytes),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  saveInDir: (dir, name, bytes) => ipcRenderer.invoke('save-in-dir', dir, name, bytes),
  copyImage: (bytes) => ipcRenderer.invoke('copy-image', bytes),
});
