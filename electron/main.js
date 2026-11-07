// Processo principal do Electron: TUDO que é específico do Windows fica aqui
// (janela, bandeja do sistema, notificações nativas e iniciar com o Windows).
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');

const APP_NAME = 'Painel Pessoal';
const isDev = !app.isPackaged;
const startHidden = process.argv.includes('--hidden');

let win = null;
let tray = null;
let quitting = false;

// Garante uma única instância: abrir de novo só mostra a janela existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

// Necessário para as notificações do Windows aparecerem com o nome do app.
app.setAppUserModelId(isDev ? process.execPath : 'com.oguguca.painelpessoal');

const iconPath = path.join(__dirname, 'icons', 'icon.png');
const trayIconPath = path.join(__dirname, 'icons', 'tray.png');

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 560,
    title: APP_NAME,
    icon: iconPath,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f6fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Mantém os timers dos lembretes rodando mesmo com a janela escondida.
      backgroundThrottling: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    if (!startHidden) win.show();
  });

  // Fechar a janela = esconder na bandeja. Sair de verdade só pelo menu da bandeja.
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });

  // Links externos abrem no navegador padrão.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(trayIconPath));
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir painel', click: showWindow },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

// ---------- IPC: chamado pela interface via src/platform.js ----------

ipcMain.handle('notify', (_e, { title, body }) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, icon: iconPath });
  n.on('click', showWindow);
  n.show();
  return true;
});

const LOGIN_ARGS = ['--hidden'];

ipcMain.handle('autolaunch:get', () => ({
  supported: !isDev,
  enabled: !isDev && app.getLoginItemSettings({ args: LOGIN_ARGS }).openAtLogin,
}));

ipcMain.handle('autolaunch:set', (_e, enabled) => {
  // Em modo de desenvolvimento não registra (registraria o electron.exe de dev).
  if (isDev) return { supported: false, enabled: false };
  app.setLoginItemSettings({ openAtLogin: !!enabled, args: LOGIN_ARGS });
  return { supported: true, enabled: app.getLoginItemSettings({ args: LOGIN_ARGS }).openAtLogin };
});

// ---------- ciclo de vida ----------

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  quitting = true;
});

// Não encerra quando todas as janelas fecham: o app continua na bandeja.
app.on('window-all-closed', () => {});
