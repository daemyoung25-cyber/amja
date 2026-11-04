/* Firebase Realtime Database 접속. 설정이 없거나 8초 안에 연결이 안 되면 혼자 모드.
   presence/{uid} = { c, m, p, pt, s, g? }  (데이터 구조는 database.rules.json 참고) */
const SDK = "https://www.gstatic.com/firebasejs/11.10.0/";
const CONNECT_TIMEOUT = 8000, HEARTBEAT = 30000, GREET_FRESH = 10000;   // 이보다 오래된 인사는 (늦게 들어와서 본 것이라) 알리지 않는다
const HOUR = 3600000, CLEANUP_AGE = 7200000, CLEANUP_BATCH = 50, TRACE_READ_MAX = 200;
const DAY = 86400000, CANDLE_READ_MAX = 96, OFFER_READ_MAX = 240;   // 향·초 공양(네 곳, 곳마다 24칸까지)은 넉넉히   // 촛불은 하루 타고, 공양대 48칸의 두 배까지만 읽는다
const WISH_LIFE = 7 * DAY, WISH_READ_MAX = 120;   // 소원패는 이레, 60자리의 두 배까지만 읽는다

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
    onPeers: noop, sendMove: noop, sendPose: noop, sendCarry: noop, greet: noop, onGreeted: noop, close: noop,
    writeTrace: noop, onTraces: noop, markVisit: noop, onVisits: noop, cleanup: noop, lightCandle: noop, onCandles: noop, offer: noop, onOffers: noop, hangWish: () => null, onWishes: noop, writeNote: async () => false, joinWish: noop, onWishJoins: noop,
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

  const state = { c: me.c, m: me.m, p: me.p, pt: now(), s: now(), ...(me.n ? { n: me.n } : {}), ...(me.h ? { h: me.h } : {}) };
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
      if (!g || g.to !== uid || typeof g.at !== "number" || now() - g.at > GREET_FRESH) continue;
      if ((lastGreet.get(from) || 0) >= g.at) continue;   // 이미 알린 인사 (합장할 때마다 새 시각이라 매번 알린다)
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
    sendCarry(b) { state.b = b; if (present) db.update(mine, { b }); },   // 든 봉송 꾸러미 (보자기 색 번호 0~5)
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
    // 촛불 공양: candles/{id} = { slot, n, h, at }
    lightCandle({ slot, n, h }) { db.push(db.ref(database, "candles"), { slot, n, ...(h ? { h } : {}), at: now() }); },
    onCandles(cb) {
      const q = db.query(db.ref(database, "candles"), db.orderByChild("at"), db.startAt(now() - DAY), db.limitToLast(CANDLE_READ_MAX));
      db.onValue(q, (snap) => cb(Object.values(snap.val() || {})));
    },
    // 향·초 공양: offers/{id} = { k, slot, n, h, at } (k = hall·herm·cave·gwan)
    offer({ k, slot, n, h }) { db.push(db.ref(database, "offers"), { k, slot, n, ...(h ? { h } : {}), at: now() }); },
    onOffers(cb) {
      const q = db.query(db.ref(database, "offers"), db.orderByChild("at"), db.startAt(now() - DAY), db.limitToLast(OFFER_READ_MAX));
      db.onValue(q, (snap) => cb(Object.values(snap.val() || {})));
    },
    // 소원걸이: wishes/{id}
    //   나만 보는 소원 = { slot, n, h, at }  (글은 적은 사람 폰에만)
    //   함께 읽는 소원 = { slot, t, at }     (이름 없이 글만)
    hangWish({ slot, n, h, text, pub }) {
      const v = pub ? { slot, t: text, at: now() } : { slot, n, ...(h ? { h } : {}), at: now() };
      return db.push(db.ref(database, "wishes"), v).key;
    },
    onWishes(cb) {
      const q = db.query(db.ref(database, "wishes"), db.orderByChild("at"), db.startAt(now() - WISH_LIFE), db.limitToLast(WISH_READ_MAX));
      db.onValue(q, (snap) => cb(Object.entries(snap.val() || {}).map(([id, v]) => ({ id, ...v }))));
    },
    // 바라는 점: notes/{id} = { t, at } (읽기는 규칙이 막아 만든 사람만), noteLast/{uid}로 1분에 한 번
    async writeNote(text) {
      const key = db.push(db.ref(database, "notes")).key, at = now();
      try { await db.update(db.ref(database), { [`notes/${key}`]: { t: text, at }, [`noteLast/${uid}`]: at }); return true; } catch { return false; }
    },
    // 함께 빌기: wishJoins/{소원 id}/{내 uid} = 시각. 소원을 건 사람은 제 소원의 수를 듣는다
    joinWish(id) { db.set(db.ref(database, `wishJoins/${id}/${uid}`), now()); },
    onWishJoins(id, cb) { db.onValue(db.ref(database, `wishJoins/${id}`), (snap) => cb(Object.keys(snap.val() || {}).length)); },
    async cleanup() {                // 들어올 때 한 번: 두 시간 넘은 기록(촛불은 하루 넘은 것)을 조금씩 지운다
      for (const [path, age] of [["traces", CLEANUP_AGE], ["visits", CLEANUP_AGE], ["candles", DAY + HOUR], ["offers", DAY + HOUR], ["wishes", WISH_LIFE + HOUR]]) {
        try {
          const q = db.query(db.ref(database, path), db.orderByChild("at"), db.endAt(now() - age), db.limitToFirst(CLEANUP_BATCH));
          const snap = await db.get(q);
          await Promise.all(Object.keys(snap.val() || {}).map((id) => db.remove(db.ref(database, `${path}/${id}`))));
        } catch (e) { console.warn("오래된 기록 정리 실패", e); }
      }
      try {                          // 내려간 소원에 남은 '함께 빌기' 기록
        const [joins, wishes] = await Promise.all([db.get(db.ref(database, "wishJoins")), db.get(db.ref(database, "wishes"))]);
        const hanging = new Set(Object.keys(wishes.val() || {}));
        const gone = Object.keys(joins.val() || {}).filter((id) => !hanging.has(id)).slice(0, CLEANUP_BATCH);
        await Promise.all(gone.map((id) => db.remove(db.ref(database, `wishJoins/${id}`))));
      } catch (e) { console.warn("함께 빌기 기록 정리 실패", e); }
    },
  };
}
