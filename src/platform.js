// Camada de plataforma: o ÚNICO ponto da interface que sabe se está no Electron.
// No Electron usa window.electronAPI (exposto por electron/preload.js).
// No navegador / PWA (iPhone) usa as APIs web equivalentes.

const api = typeof window !== 'undefined' ? window.electronAPI : undefined;

export const isElectron = !!api;

/** Permissão de notificação: 'granted' | 'denied' | 'default' | 'unsupported' */
export function notificationPermission() {
  if (isElectron) return 'granted';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isElectron) return 'granted';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

/** Mostra uma notificação do sistema (Windows no Electron, navegador na web). */
export async function notify(title, body) {
  try {
    if (isElectron) return await api.notify(title, body);
    if (notificationPermission() !== 'granted') return false;
    // Em PWA instalado o service worker é o caminho mais confiável.
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) {
      await reg.showNotification(title, { body, icon: './icon-192.png' });
    } else {
      new Notification(title, { body, icon: './icon-192.png' });
    }
    return true;
  } catch (err) {
    console.warn('Falha ao notificar:', err);
    return false;
  }
}

/** Iniciar junto com o sistema: só existe no app de Windows instalado. */
export async function getAutoLaunch() {
  if (!isElectron) return { supported: false, enabled: false };
  return api.getAutoLaunch();
}

export async function setAutoLaunch(enabled) {
  if (!isElectron) return { supported: false, enabled: false };
  return api.setAutoLaunch(enabled);
}

/** Salva um arquivo de texto (backup). Funciona igual no Electron e no navegador. */
export function saveTextFile(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre o seletor de arquivos e devolve o texto do arquivo escolhido (ou null). */
export function pickTextFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
