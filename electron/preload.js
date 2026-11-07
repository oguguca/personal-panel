// Ponte segura entre o Electron e a interface React.
// A interface NUNCA importa nada do Electron: ela só usa src/platform.js,
// que por sua vez verifica se window.electronAPI existe.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
  getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
});
