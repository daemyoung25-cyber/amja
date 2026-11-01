/* Firebase Realtime Database 접속. 설정이 없거나 8초 안에 연결이 안 되면 혼자 모드.
   presence/{uid} = { c, m, p, pt, s, g? }  (데이터 구조는 database.rules.json 참고) */
const SDK = "https://www.gstatic.com/firebasejs/11.10.0/";
const CONNECT_TIMEOUT = 8000, HEARTBEAT = 30000, GREET_COOLDOWN = 10000;
const HOUR = 3600000, CLEANUP_AGE = 7200000, CLEANUP_BATCH = 50, TRACE_READ_MAX = 200;

export async function defaultLoadSdk() {
  const [app, auth, db] = await Promise.all([
    import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-database.js"),
  ]);
  return { app, auth, db };
}

function solo() {
  const noop = () => {};
  return {
    mode: "solo", uid: null, now: () => Date.now(),
    onPeers: noop, sendMove: noop, sendPose: noop, greet: noop, onGreeted: noop, close: noop,
    writeTrace: noop, onTraces: noop, markVisit: noop, onVisits: noop, cleanup: noop,
  };
}

export async function createPresence({ config, loadSdk = defaultLoadSdk, me = { c: 0, m: null, p: "stand" }, onLate = null }) {
  if (!config || !config.apiKey) return solo();
  let timer, gaveUp = false;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), CONNECT_TIMEOUT); });
  const shared = connect(config, loadSdk, me).catch((e) => { console.warn("같이 있기 연결 실패, 혼자 모드로", e); return null; });
  // 혼자 모드로 넘어간 뒤에 연결이 붙으면: 받아 줄 곳이 있으면 넘기고, 없으면 바로 정리한다
  // (남들 화면에 멈춘 사람이 남지 않게)
  shared.then((p) => { if (gaveUp && p) (onLate ? onLate(p) : p.close()); });
  const result = await Promise.race([shared, timeout]);
  clearTimeout(timer);
  if (!result) { gaveUp = true; console.warn("같이 있기 연결이 늦어 혼자 모드로"); }
  return result || solo();
}

async function connect(config, loadSdk, me) {
  const { app, auth, db } = await loadSdk();
  const fbApp = app.initializeApp(config, "amja");
  const fbAuth = auth.getAuth(fbApp);
  const database = db.getDatabase(fbApp);
  if (config.emulator) {                       // 로컬 점검용 (?emu=1)
    auth.connectAuthEmulator(fbAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    db.connectDatabaseEmulator(database, "127.0.0.1", 9000);
  }
  const cred = await auth.signInAnonymously(fbAuth);
  const uid = cred.user.uid;
  const mine = db.ref(database, `presence/${uid}`);

  let offset = 0;
  db.onValue(db.ref(database, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });
  const now = () => Date.now() + offset;

  const state = { c: me.c, m: me.m, p: me.p, pt: now(), s: now() };
  let present = false;
  async function appear() {
    await db.onDisconnect(mine).remove();
    state.s = now();
    await db.set(mine, state);
    present = true;
  }
  const disappear = () => { present = false; return db.remove(mine); };
  await appear();
  // 연결이 끊겼다 붙으면 서버가 노드를 지웠으므로 처음처럼 다시 쓴다
  let wasConnected = true;
  const stopConn = db.onValue(db.ref(database, ".info/connected"), (snap) => {
    const on = snap.val() === true;
    if (on && !wasConnected && (typeof document === "undefined" || !document.hidden)) appear();
    wasConnected = on;
  });

  const beat = setInterval(() => { if (present) { state.s = now(); db.update(mine, { s: state.s }); } }, HEARTBEAT);
  const onVis = () => (document.hidden ? disappear() : appear());
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);

  const peerCbs = [], greetCbs = [], lastGreet = new Map();
  const stopPeers = db.onValue(db.ref(database, "presence"), (snap) => {
    const val = snap.val();
    for (const cb of peerCbs) cb(val);
    if (!val) return;
    for (const [from, v] of Object.entries(val)) {
      const g = v && v.g;
      if (!g || g.to !== uid || typeof g.at !== "number" || now() - g.at > GREET_COOLDOWN) continue;
      if ((lastGreet.get(from) || 0) >= g.at) continue;
      if (g.at - (lastGreet.get(from) || 0) < GREET_COOLDOWN) { lastGreet.set(from, g.at); continue; }
      lastGreet.set(from, g.at);
      for (const cb of greetCbs) cb(from);
    }
  });

  return {
    mode: "shared", uid, now,
    onPeers: (cb) => peerCbs.push(cb),
    onGreeted: (cb) => greetCbs.push(cb),
    sendMove(m) { state.m = m; state.s = now(); if (present) db.update(mine, { m, s: state.s }); },
    sendPose(p) { state.p = p; state.pt = now(); if (present) db.update(mine, { p, pt: state.pt }); },
    greet(to) { const g = { to, at: now() }; state.g = g; if (present) db.update(mine, { g }); },
    close() {
      clearInterval(beat);
      stopPeers();
      stopConn();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
      disappear();
    },
    // 다녀간 흔적과 방문 기록
    writeTrace({ x, z, k }) { db.push(db.ref(database, "traces"), { x, z, k, at: now() }); },
    onTraces(cb) {
      const q = db.query(db.ref(database, "traces"), db.orderByChild("at"), db.startAt(now() - HOUR), db.limitToLast(TRACE_READ_MAX));
      db.onValue(q, (snap) => cb(Object.values(snap.val() || {})));
    },
    markVisit() { db.set(db.ref(database, `visits/${uid}`), { at: now() }); },
    onVisits(cb) {
      const q = db.query(db.ref(database, "visits"), db.orderByChild("at"), db.startAt(now() - HOUR));
      db.onValue(q, (snap) => cb(snap.val() || {}));
    },
    async cleanup() {                // 들어올 때 한 번: 두 시간 넘은 기록을 조금씩 지운다
      for (const path of ["traces", "visits"]) {
        try {
          const q = db.query(db.ref(database, path), db.orderByChild("at"), db.endAt(now() - CLEANUP_AGE), db.limitToFirst(CLEANUP_BATCH));
          const snap = await db.get(q);
          await Promise.all(Object.keys(snap.val() || {}).map((id) => db.remove(db.ref(database, `${path}/${id}`))));
        } catch (e) { console.warn("오래된 기록 정리 실패", e); }
      }
    },
  };
}
