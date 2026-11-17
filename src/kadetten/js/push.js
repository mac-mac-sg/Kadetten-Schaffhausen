// Push-Mitteilungen zu Kadetten-Spielen über den bestehenden Dienst /api/push (server/push-subscriptions.mjs).
// Das ist der einzige Schreibweg der App; er gehört dem Gerät (zufälliger Schlüssel) und enthält keine Personendaten.
// Gleicher Geräteeintrag wie in der bisherigen V2, damit bestehende Abos weiterlaufen.
export const PUSH_DEVICE_KEY = 'match-push-device-v1';
export const PUSH_TYPES = [
  ['reminder', '30 Minuten vor Anpfiff'],
  ['start', 'Anpfiff'],
  ['half', 'Halbzeitstand'],
  ['final', 'Endresultat'],
  ['favourite', 'Tore deines Lieblingsspielers (QHL)']
];

const storage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};

export function readDevice(s = storage()) {
  try {
    const d = JSON.parse(s?.getItem(PUSH_DEVICE_KEY) || 'null');
    return d && typeof d.token === 'string' && d.subscription ? d : null;
  } catch {
    return null;
  }
}
function saveDevice(device, s = storage()) {
  try {
    device ? s?.setItem(PUSH_DEVICE_KEY, JSON.stringify(device)) : s?.removeItem(PUSH_DEVICE_KEY);
  } catch {}
}

export function pushSupported() {
  return Boolean(globalThis.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in globalThis && 'Notification' in globalThis);
}

export function createPush({origin = '', fetchImpl = globalThis.fetch} = {}) {
  async function call(path, method = 'GET', body, token) {
    const response = await fetchImpl(origin + '/api/push/' + path, {
      method,
      credentials: 'omit',
      mode: origin ? 'cors' : 'same-origin',
      cache: 'no-store',
      headers: {...(body ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: 'Bearer ' + token} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    let data = {};
    try {
      data = await response.json();
    } catch {}
    if (!response.ok) throw Error(data.error || 'Der Benachrichtigungsdienst ist gerade nicht erreichbar.');
    return data;
  }
  async function registration() {
    let timer;
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error('Bitte die App neu laden und erneut versuchen.')), 15000);
        })
      ]);
      if (new URL(reg.scope).pathname !== new URL('./', location.href).pathname)
        throw Error('Bitte die App neu laden und erneut versuchen.');
      return reg;
    } finally {
      clearTimeout(timer);
    }
  }
  async function registerDevice(device, types, favourite) {
    const player = favourite === undefined ? device.favourite : favourite;
    const selected = (Array.isArray(types) ? types : PUSH_TYPES.map(([id]) => id)).filter(
      type => PUSH_TYPES.some(([id]) => id === type) && (type !== 'favourite' || Number.isInteger(player))
    );
    await call(
      'device',
      'PUT',
      {subscription: device.subscription, clubs: ['kadetten'], types: selected, ...(player ? {favourite: {shv: player}} : {})},
      device.token
    );
    saveDevice({...device, types: selected, favourite: player || null, active: true});
  }
  async function restoreDevice(favourite) {
    const device = readDevice();
    if (!device?.active) return false;
    if (Notification.permission !== 'granted') {
      saveDevice({...device, active: false});
      throw Error('Benachrichtigungen sind auf diesem Gerät nicht erlaubt. Bitte erneut einschalten.');
    }
    const reg = await registration();
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      saveDevice({...device, active: false});
      throw Error('Die Geräteverbindung ist abgelaufen. Bitte Benachrichtigungen erneut einschalten.');
    }
    await registerDevice({...device, subscription: subscription.toJSON()}, device.types, favourite);
    return true;
  }

  let restoring = null;
  function restore(favourite) {
    restoring ||= restoreDevice(favourite).finally(() => {
      restoring = null;
    });
    return restoring;
  }
  const token = () =>
    btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
  return {
    device: readDevice,
    /** Erlaubnis wird nur als direkte Folge eines Tipps angefragt. */
    async enable(types, favourite) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted')
        throw Error('Mitteilungen wurden nicht erlaubt. Du kannst sie später in den Einstellungen des Geräts aktivieren.');
      const config = await call('config');
      if (!config.enabled || !config.publicKey) throw Error('Benachrichtigungen werden noch eingerichtet. Bitte später erneut versuchen.');
      const reg = await registration();
      const key = Uint8Array.from(atob(config.publicKey.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
      const subscription =
        (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key}));
      const previous = readDevice();
      const device = {token: previous?.token || token(), subscription: subscription.toJSON(), types, active: false};
      saveDevice(device);
      await registerDevice(device, types, favourite);
    },
    async update(types, favourite) {
      const device = readDevice();
      if (!device) throw Error('Bitte Benachrichtigungen zuerst einschalten.');
      await registerDevice(device, types, favourite);
    },
    restore,
    async disable() {
      const device = readDevice();
      if (device) await call('device', 'DELETE', {subscription: device.subscription}, device.token);
      const reg = await registration();
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      saveDevice(null);
    },
    async test(favourite) {
      if (!(await restore(favourite))) throw Error('Bitte Benachrichtigungen zuerst einschalten.');
      const device = readDevice();
      await call('test', 'POST', {subscription: device.subscription}, device.token);
    }
  };
}
