/* presence.js 테스트용 가짜 Firebase SDK. 쓴 내용과 걸린 리스너를 기록한다. */
export function fakeSdk() {
  const log = { set: [], update: [], remove: [], onDisconnect: [] };
  const listeners = new Map();          // path -> [cb]
  const ref = (_db, path = "") => ({ path });
  const fire = (path, val) => (listeners.get(path) || []).forEach((cb) => cb({ val: () => val }));
  const sdk = {
    app: { initializeApp: () => ({}) },
    auth: { getAuth: () => ({}), signInAnonymously: async () => ({ user: { uid: "me" } }), connectAuthEmulator() {} },
    db: {
      getDatabase: () => ({}), connectDatabaseEmulator() {}, ref,
      onValue(r, cb) { const p = r.path; listeners.set(p, [...(listeners.get(p) || []), cb]); return () => {}; },
      onDisconnect: (r) => ({ remove: async () => { log.onDisconnect.push(r.path); } }),
      set: async (r, v) => { log.set.push({ path: r.path, v }); },
      update: async (r, v) => { log.update.push({ path: r.path, v }); },
      remove: async (r) => { log.remove.push(r.path); },
      push: async () => {}, get: async () => ({ val: () => null }), limits: [],
      query: (r) => r, orderByChild: () => ({}), startAt: () => ({}), endAt: () => ({}), limitToFirst: () => ({}), limitToLast: (n) => { sdk.db.limits.push(n); return {}; },
    },
  };
  return { sdk, log, fire };
}
