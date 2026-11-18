/* Close the Books — 90-second close with ESSA power buttons. AI unlocks in season 2 (January).
   Plain JavaScript, no build step. Leaderboard on Supabase (public publishable key; all writes go through checked functions).
   URL flags: ?test keeps runs off the real leaderboard; ?s2 previews season 2 (AI unlocked) in test mode. */
(() => {
  'use strict';

  /* ================= config ================= */
  const CFG = {
    url: 'https://evdtpvbacpibeasrczhu.supabase.co',
    key: 'sb_publishable_Y1GmwdTaooG8yqFTTTZApQ_WVwIwyZz',
    version: '3.0.0',
    dur: 90
  };
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.round(n).toLocaleString('en');

  const store = {
    get(k, d){ try { const v = localStorage.getItem('ctb2-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
    set(k, v){ try { localStorage.setItem('ctb2-' + k, JSON.stringify(v)); } catch(e){} }
  };
  function uuid(){
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  let PLAYER = store.get('player', null); if (!PLAYER){ PLAYER = uuid(); store.set('player', PLAYER); }

  const QS = location.search;
  const TEST = /[?&]test\b/.test(QS), PREVIEW_S2 = /[?&]s2\b/.test(QS);
  let SEASON = store.get('season', 's1');
  const modeFor = () => (TEST || PREVIEW_S2) ? 'test' : SEASON;
  const aiUnlocked = () => PREVIEW_S2 || SEASON === 's2';

  /* ================= leaderboard API ================= */
  const api = {
    async rpc(fn, body){
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
      try {
        const r = await fetch(CFG.url + '/rest/v1/rpc/' + fn, {method:'POST', signal:ctl.signal,
          headers:{'apikey':CFG.key, 'Content-Type':'application/json'}, body:JSON.stringify(body || {})});
        if (!r.ok) throw new Error('http ' + r.status);
        return await r.json();
      } finally { clearTimeout(to); }
    },
    board(cat, limit){ const c = CATS[cat]; return this.rpc('leaderboard', {p_mode:modeFor(), p_metric:c.metric, p_ascending:false, p_limit:limit || 10}); },
    submit(run){ return this.rpc('submit_run', run); },
    season(){ return this.rpc('season'); }
  };
  const CATS = {
    score:   {metric:'score',  desc:'Highest score in one 90-second close. Only your best game counts.', show:v => fmt(v)},
    entries: {metric:'posted', desc:'Most entries posted in one game: by hand, by automation and by AI.', show:v => fmt(v)}
  };

  /* ================= audio ================= */
  const AU = {
    el:$('music'), ctx:null, filter:null, gain:null, sfxOut:null, on:store.get('snd', true), routed:false,
    init(){
      if (this.ctx) return;
      try {
        const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
        this.ctx = new A();
        this.sfxOut = this.ctx.createGain(); this.sfxOut.gain.value = .9; this.sfxOut.connect(this.ctx.destination);
        try {
          const src = this.ctx.createMediaElementSource(this.el);
          this.filter = this.ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 700; this.filter.Q.value = .8;
          this.gain = this.ctx.createGain(); this.gain.gain.value = .75;
          src.connect(this.filter); this.filter.connect(this.gain); this.gain.connect(this.ctx.destination); this.routed = true;
        } catch(e){ this.routed = false; }
      } catch(e){}
    },
    start(){
      this.init();
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      this.el.muted = !this.on;
      if (!this.routed) this.el.volume = .6;
      if (this.el.paused){ const p = this.el.play(); if (p && p.catch) p.catch(() => {}); }
    },
    // how "open" the music sounds: low cutoff = muffled, high = full
    mood(hz, vol, tc){
      if (!this.ctx || !this.filter) return;
      const t = this.ctx.currentTime;
      this.filter.frequency.cancelScheduledValues(t); this.filter.frequency.setTargetAtTime(hz, t, tc || .6);
      if (vol != null){ this.gain.gain.cancelScheduledValues(t); this.gain.gain.setTargetAtTime(vol, t, .5); }
    },
    toggle(){
      this.on = !this.on; store.set('snd', this.on); this.el.muted = !this.on;
      if (this.on) this.start();
      return this.on;
    },
    tone(f, d, type, v, at, to){
      if (!this.ctx || !this.on) return;
      try {
        const t = at || this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(this.sfxOut); o.start(t); o.stop(t + d + .05);
      } catch(e){}
    },
    noise(d, v, f0, f1){
      if (!this.ctx || !this.on) return;
      try {
        const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * d), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), ch = b.getChannelData(0);
        for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
        const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        s.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        s.connect(fl); fl.connect(g); g.connect(this.sfxOut); s.start(t); s.stop(t + d);
      } catch(e){}
    },
    sfx(k){
      if (!this.ctx) return; const t = this.ctx.currentTime;
      switch (k){
        case 'tap':    this.tone(1400, .04, 'sine', .05); break;
        case 'post':   this.tone(880, .09, 'sine', .07); this.tone(1320, .12, 'sine', .05, t + .045); break;
        case 'bot':    this.tone(2200, .05, 'sine', .025); break;
        case 'late':   this.tone(140, .35, 'sine', .22, 0, 60); this.noise(.18, .05, 900, 200); break;
        case 'lock':   this.tone(300, .1, 'triangle', .05, 0, 240); break;
        case 'ready':  this.tone(1568, .12, 'sine', .05); this.tone(2093, .18, 'sine', .04, t + .07); break;
        case 'power':  [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, .35, 'triangle', .07, t + i * .05)); this.noise(.5, .05, 800, 5000); break;
        case 'elim':   this.noise(.6, .12, 5000, 300); this.tone(220, .5, 'sine', .12, 0, 80); break;
        case 'ai':     [392, 587, 784, 1175, 1568, 2349].forEach((f, i) => this.tone(f, .6, 'triangle', .06, t + i * .06)); this.noise(1.4, .08, 300, 8000); break;
        case 'riser':  this.noise(1.6, .06, 300, 6000); break;
        case 'impact': this.tone(55, 1.2, 'sine', .35, 0, 35); this.noise(.8, .08, 3000, 200); break;
        case 'count':  this.tone(880, .12, 'triangle', .07); break;
        case 'go':     [523, 784, 1047].forEach((f, i) => this.tone(f, .5, 'triangle', .07, t + i * .08)); break;
        case 'end':    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, .7, 'triangle', .06, t + i * .1)); break;
      }
    }
  };
  $('snd').setAttribute('aria-pressed', AU.on);
  $('snd').addEventListener('click', e => { e.stopPropagation(); $('snd').setAttribute('aria-pressed', AU.toggle()); });
  // browsers only allow sound after a gesture: start the (muffled) music on the first touch anywhere
  const firstGesture = () => { if (AU.on) AU.start(); else AU.init(); window.removeEventListener('pointerdown', firstGesture, true); window.removeEventListener('keydown', firstGesture, true); };
  window.addEventListener('pointerdown', firstGesture, true); window.addEventListener('keydown', firstGesture, true);

  /* ================= world: wafer, EUV beam, particles ================= */
  const cv = $('world'), g = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, gridC = null;
  const V = {
    t:0, beam:0, flash:0, shake:0, aiGlow:0,
    cur:{y:.5, r:.9, a:1, i:.55}, tgt:{y:.5, r:.9, a:1, i:.55},
    dust:[], parts:[], streaks:[]
  };
  function setScene(y, r, a, i){ V.tgt = {y, r, a, i}; }
  const waferR = () => Math.min(W * .62, H * .4, 430) * V.cur.r;
  const waferC = () => ({x:W / 2, y:H * V.cur.y});

  function buildGrid(){
    const S = 512; gridC = document.createElement('canvas'); gridC.width = gridC.height = S;
    const c = gridC.getContext('2d'), R = S / 2, step = 21;
    c.save(); c.beginPath(); c.arc(R, R, R - 2, 0, TAU); c.clip();
    for (let x = 0; x < S; x += step) for (let y = 0; y < S; y += step){
      const dx = x + step / 2 - R, dy = y + step / 2 - R; if (dx * dx + dy * dy > (R - 14) ** 2) continue;
      const h = 200 + ((x * 7 + y * 13) % 80), l = 18 + ((x * 3 + y * 5) % 13);
      c.fillStyle = 'hsla(' + h + ',70%,' + l + '%,.9)'; c.fillRect(x + 1.5, y + 1.5, step - 3, step - 3);
      if ((x + y) % 5 === 0){ c.fillStyle = 'rgba(160,200,255,.12)'; c.fillRect(x + 4, y + 4, step - 8, 3); }
    }
    c.strokeStyle = 'rgba(150,180,255,.28)'; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= S; x += step){ c.moveTo(x + .5, 0); c.lineTo(x + .5, S); }
    for (let y = 0; y <= S; y += step){ c.moveTo(0, y + .5); c.lineTo(S, y + .5); }
    c.stroke(); c.restore();
    c.fillStyle = '#040716'; c.beginPath(); c.arc(R, S - 4, 9, 0, TAU); c.fill();   // the notch
  }
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!gridC) buildGrid();
    V.dust = []; const n = reduced ? 0 : Math.round(W * H / 14000);
    for (let i = 0; i < n; i++) V.dust.push({x:Math.random() * W, y:Math.random() * H, r:rand(.4, 1.4), v:rand(3, 12), p:Math.random() * TAU});
    layout(); sprites.clear();
    if (G) for (const it of G.items) it.x = clamp(it.x, L.x0, L.x1 - CW);
  }
  window.addEventListener('resize', resize);

  function drawBackground(dt){
    const C = waferC(), R = waferR(), I = V.cur.i;
    const bg = g.createRadialGradient(C.x, C.y - R * .3, 0, C.x, C.y, Math.max(W, H) * .9);
    bg.addColorStop(0, '#101c62'); bg.addColorStop(.45, '#070d33'); bg.addColorStop(1, '#03050f');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (!reduced){
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++){
        const x = W * (.2 + .3 * k) + Math.sin(V.t * .1 + k * 2) * W * .08, w = W * .18;
        const sg = g.createLinearGradient(x - w, 0, x + w, 0);
        sg.addColorStop(0, 'rgba(90,110,255,0)'); sg.addColorStop(.5, 'rgba(90,110,255,' + (.025 + .015 * I) + ')'); sg.addColorStop(1, 'rgba(90,110,255,0)');
        g.fillStyle = sg; g.fillRect(x - w, 0, w * 2, H);
      }
      g.restore();
    }
    g.fillStyle = '#cfe0ff';
    for (const d of V.dust){
      d.y -= d.v * dt; if (d.y < -4){ d.y = H + 4; d.x = Math.random() * W; }
      g.globalAlpha = .25 + .25 * Math.sin(V.t * 2 + d.p); g.fillRect(d.x, d.y, d.r, d.r);
    }
    g.globalAlpha = 1;
  }

  function drawWafer(){
    const C = waferC(), R = waferR(), a = V.cur.a, I = V.cur.i, tilt = .36, rot = reduced ? .4 : V.t * (.06 + V.aiGlow * .5);
    g.save(); g.globalAlpha = a;
    g.save(); g.globalCompositeOperation = 'lighter';
    const halo = g.createRadialGradient(C.x, C.y, R * .2, C.x, C.y, R * 1.5);
    halo.addColorStop(0, 'rgba(120,140,255,' + (.18 + .2 * I) + ')'); halo.addColorStop(1, 'rgba(60,40,160,0)');
    g.fillStyle = halo; g.beginPath(); g.ellipse(C.x, C.y, R * 1.5, R * 1.5 * tilt * 1.4, 0, 0, TAU); g.fill(); g.restore();
    g.save(); g.translate(C.x, C.y); g.scale(1, tilt);
    g.beginPath(); g.arc(0, 0, R, 0, TAU);
    const body = g.createRadialGradient(-R * .3, -R * .5, R * .1, 0, 0, R);
    body.addColorStop(0, '#24357f'); body.addColorStop(1, '#070b26'); g.fillStyle = body; g.fill();
    g.save(); g.clip();
    g.save(); g.rotate(rot); g.drawImage(gridC, -R, -R, R * 2, R * 2); g.restore();
    if (g.createConicGradient){
      const cg = g.createConicGradient(rot * 2.2, 0, 0), hs = [190, 260, 320, 30, 90, 160, 190];
      hs.forEach((h, i) => cg.addColorStop(i / (hs.length - 1), 'hsla(' + h + ',95%,62%,1)'));
      g.globalCompositeOperation = 'screen'; g.globalAlpha = a * (.22 + .18 * I + .3 * V.aiGlow); g.fillStyle = cg; g.fillRect(-R, -R, R * 2, R * 2);
    }
    const sx = Math.sin(V.t * .35) * R * 1.4, sp = g.createLinearGradient(sx - R * .5, -R, sx + R * .5, R);
    sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(.5, 'rgba(255,255,255,.16)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.fillStyle = sp; g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    g.lineWidth = 2.5; const rim = g.createLinearGradient(-R, 0, R, 0);
    rim.addColorStop(0, 'rgba(95,214,245,.9)'); rim.addColorStop(.5, 'rgba(255,255,255,.7)'); rim.addColorStop(1, 'rgba(167,139,250,.9)');
    g.strokeStyle = rim; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.restore(); g.restore();
  }

  function drawBeam(){
    if (V.beam <= 0) return;
    const C = waferC(), R = waferR(), I = Math.min(1.4, V.cur.i + V.aiGlow), len = C.y * Math.min(1, V.beam), pulse = reduced ? 0 : Math.sin(V.t * 9) * 1.5;
    const w = 5 + I * 9 + pulse;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [k, col] of [[5, 'rgba(140,90,255,.10)'], [2.2, 'rgba(150,110,255,.28)'], [1, 'rgba(170,230,255,.75)'], [.35, 'rgba(255,255,255,.95)']]){
      const ww = w * k, gr = g.createLinearGradient(C.x - ww, 0, C.x + ww, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(C.x - ww, 0, ww * 2, len);
    }
    if (V.beam >= 1){
      const fr = R * (.35 + .35 * I) * (1 + .06 * Math.sin(V.t * 5));
      const ig = g.createRadialGradient(C.x, C.y, 0, C.x, C.y, fr);
      ig.addColorStop(0, 'rgba(255,255,255,.95)'); ig.addColorStop(.12, 'rgba(180,230,255,.7)'); ig.addColorStop(.4, 'rgba(140,100,255,.25)'); ig.addColorStop(1, 'rgba(80,40,200,0)');
      g.fillStyle = ig; g.beginPath(); g.ellipse(C.x, C.y, fr, fr * .55, 0, 0, TAU); g.fill();
      const sw = Math.min(W * .9, R * 3.2), st = g.createLinearGradient(C.x - sw / 2, 0, C.x + sw / 2, 0);
      st.addColorStop(0, 'rgba(95,214,245,0)'); st.addColorStop(.5, 'rgba(200,240,255,' + Math.min(1, .35 + .25 * I) + ')'); st.addColorStop(1, 'rgba(167,139,250,0)');
      g.fillStyle = st; g.fillRect(C.x - sw / 2, C.y - 1.5, sw, 3);
    }
    g.restore();
  }

  function drawParticles(dt){
    const C = waferC();
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = V.parts.length - 1; i >= 0; i--){
      const p = V.parts[i]; p.life -= dt;
      if (p.home){ const dx = C.x - p.x, dy = C.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 1400 * dt; p.vy += dy / d * 1400 * dt; p.vx *= .96; p.vy *= .96; if (d < 14) p.life = 0; }
      else { p.vy += 300 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0){ V.parts.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = p.col; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    g.lineCap = 'round';
    for (let i = V.streaks.length - 1; i >= 0; i--){
      const s = V.streaks[i]; s.k += dt * s.v; if (s.k >= 1){ V.streaks.splice(i, 1); continue; }
      const e = s.k * s.k, x = lerp(s.x, C.x, e), y = lerp(s.y, C.y, e), e2 = Math.max(0, s.k - .14) ** 2;
      const x2 = lerp(s.x, C.x, e2), y2 = lerp(s.y, C.y, e2);
      g.globalAlpha = .95; g.strokeStyle = s.col; g.lineWidth = 2; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke();
    }
    g.restore(); g.globalAlpha = 1;
  }
  function burst(x, y, n, col, home){
    if (reduced) return;
    for (let i = 0; i < n; i++){ const a = Math.random() * TAU, v = rand(60, 220); V.parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:home ? 1.6 : .6, col, home}); }
    if (V.parts.length > 600) V.parts.splice(0, V.parts.length - 600);
  }
  function streak(x, y){
    if (reduced || V.streaks.length > 180) return;
    V.streaks.push({x, y, k:0, v:rand(1, 1.6), col:Math.random() < .5 ? 'rgba(95,214,245,.9)' : 'rgba(167,139,250,.9)'});
  }

  /* ================= layout & cards ================= */
  const L = {x0:0, x1:0, top:0, line:0};
  let CW = 176, CH = 56;
  function layout(){
    const colW = Math.min(560, W) - 16; L.x0 = (W - colW) / 2; L.x1 = L.x0 + colW;
    L.top = 92; L.line = H - 128;
    CW = Math.min(184, Math.floor(colW * .47)); CH = 56;
  }
  const KIND = {
    R: {label:'Journal entry', col:'#5fd6f5', subs:['Accrual · €12,400','Reclass · €3,950','Prepayment · €8,200','Payroll · €41,000','Freight · €6,730','Rent · €18,500','Depreciation · €9,100']},
    C: {label:'Complex deal',  col:'#a78bfa', subs:['Revenue split · €4.1M','Deferred to acceptance','Multi-element · €2.7M','Lease · €1.3M']},
    X: {label:'AI-ready',      col:'#8d98c9', subs:['Bank match · 412 lines','Invoice matching','IC reconciliation','Variance commentary','Accrual proposal']}
  };

  const sprites = new Map(), PAD = 22;
  function rr(c, x, y, w, h, r){ c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function sprite(it){
    const hit = it.hit > 0, open = it.k === 'X' && aiUnlocked(), key = [it.k, it.sub, it.taps, hit ? 1 : 0, open ? 1 : 0].join('|');
    let s = sprites.get(key); if (s) return s;
    if (sprites.size > 300) sprites.clear();
    s = document.createElement('canvas'); s.width = Math.ceil((CW + PAD * 2) * DPR); s.height = Math.ceil((CH + PAD * 2) * DPR);
    const c = s.getContext('2d'), K = KIND[it.k], col = open ? '#4fe0a0' : K.col;
    c.scale(DPR, DPR); c.translate(PAD, PAD);
    c.shadowColor = col; c.shadowBlur = hit ? 26 : it.k === 'X' ? 8 : 16;
    rr(c, 0, 0, CW, CH, 12); c.fillStyle = hit ? 'rgba(30,44,110,.97)' : it.k === 'X' && !open ? 'rgba(14,18,44,.82)' : 'rgba(10,16,48,.94)'; c.fill();
    c.shadowBlur = 0;
    const hl = c.createLinearGradient(0, 0, 0, CH); hl.addColorStop(0, 'rgba(255,255,255,.10)'); hl.addColorStop(.5, 'rgba(255,255,255,0)');
    rr(c, 0, 0, CW, CH, 12); c.fillStyle = hl; c.fill();
    c.lineWidth = 1; c.strokeStyle = hit ? col : 'rgba(190,205,255,.22)';
    if (it.k === 'X' && !open) c.setLineDash([4, 4]);
    rr(c, .5, .5, CW - 1, CH - 1, 12); c.stroke(); c.setLineDash([]);
    c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col; rr(c, 0, 10, 3, CH - 20, 2); c.fill(); c.shadowBlur = 0;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const right = it.k === 'X' ? 30 : 14 + it.taps * 12;
    c.fillStyle = it.k === 'X' && !open ? '#c3c9ea' : '#f4f6ff'; c.font = '600 13px "IBM Plex Sans", sans-serif';
    c.fillText(it.k === 'X' ? (open ? 'AI agent' : 'AI-ready') : K.label, 14, 23, CW - 20 - right);
    c.font = '500 11px "IBM Plex Mono", monospace'; c.fillStyle = it.k === 'X' ? (open ? '#4fe0a0' : '#8d98c9') : '#a3acd9';
    c.fillText(it.sub, 14, 41, CW - 20 - right);
    if (it.k === 'X'){
      c.font = '13px sans-serif'; c.textAlign = 'center'; c.fillText(open ? '✦' : '🔒', CW - 17, 34);
    } else {
      for (let i = 0; i < it.taps; i++){ c.beginPath(); c.arc(CW - 14 - i * 12, 34, 4, 0, TAU); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6; c.fill(); }
      c.shadowBlur = 0;
    }
    sprites.set(key, s); return s;
  }

  /* ================= game ================= */
  const POWERS = {
    elim: {name:'Eliminate',   charge:.075, dur:8, hint:'Eliminate: work that adds no value disappears'},
    simp: {name:'Simplify',    charge:.11,  dur:8, hint:'Simplify: complex deals need one tap'},
    std:  {name:'Standardize', charge:.10,  dur:8, hint:'Standardize: neat lanes, everything slows down'},
    auto: {name:'Automate',    charge:.09,  dur:8, hint:'Automate: a bot posts routine entries for you'},
    ai:   {name:'AI',          charge:.06,  dur:6, hint:'AI: the full toolkit clears the screen'}
  };
  const TIPS = [
    'Ask your AI assistant to explain a variance in three bullets (volume, price, one-offs) and to say what it is unsure about.',
    'Paste a long email thread and ask: "What is being asked of me, by when, and what is still open?"',
    'Let AI draft the reminder to business controllers: give it the audience, the deadline and the list of what is missing.',
    'Ask AI to turn your close checklist into a table with owner, due day and status. Then check it, don’t just trust it.',
    'Before you post an AI suggestion, ask it to show its calculation and the source it used.',
    'Use AI to summarise a contract for revenue recognition: obligations, payment terms, acceptance clauses, with clause numbers.',
    'Give AI an example of a good commentary and ask it to write this month’s in the same style. Context beats clever prompts.',
    'Only put confidential or personal data into the AI tools your company has approved.',
    'Ask AI: "Which of these 20 reconciling items look unusual compared with last month, and why?"',
    'Stuck on an Excel formula? Describe what you want in plain words and ask AI for the formula and an explanation.'
  ];

  let G = null, last = 0;

  function newGame(name){
    const pw = {}; for (const k of Object.keys(POWERS)) pw[k] = {f:0, active:0, ready:false};
    G = {name, t:-2.6, score:0, items:[], fx:[], pw, playing:true, paused:false,
      st:{manual:0, bot:0, ai:0, elim:0, missed:0, powers:0},
      acc:.3, bot:0, aiTick:0, aiOffer:false, aiPreviewUsed:false, aiPreview:0, hints:{}, banner:null, xMsg:0, lineFlash:0, count:3};
  }

  function startGame(){
    try { startGameInner(); }
    catch(e){ console.error(e); const f = $('fatal'); f.hidden = false; f.textContent = 'The game could not start (' + e.message + '). Please reload the page with Ctrl+F5 / Cmd+Shift+R, or try another browser.'; }
  }
  function startGameInner(){
    const name = $('name').value.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!name){ show('s-home'); $('err').textContent = 'Enter your name so we can find you on the leaderboard.'; $('name').focus(); return; }
    $('err').textContent = ''; store.set('name', name);
    AU.start(); newGame(name);
    show('s-play'); $('pause').hidden = false; setScene(.5, .8, .55, .35);
    AU.mood(1500, .75); AU.sfx('riser');
    renderPowers(true); hud(true);
  }

  const mult = () => 1 + 2 * clamp(G.t / CFG.dur, 0, 1);
  function addScore(p, x, y, col, txt){
    G.score = Math.max(0, G.score + p);
    if (txt !== false) G.fx.push({x, y, txt:txt || '+' + fmt(p), col, life:.9});
  }
  function banner(txt, col, dur){ G.banner = {txt, col:col || '#5fd6f5', t:dur || 2.6}; }
  function hint(key, txt, col){ if (G.hints[key]) return; G.hints[key] = 1; banner(txt, col); }
  function remove(it){ const i = G.items.indexOf(it); if (i >= 0) G.items.splice(i, 1); }
  const lanes = () => [L.x0 + 6, (L.x0 + L.x1 - CW) / 2, L.x1 - CW - 6];

  function spawnCard(k){
    const std = G.pw.std.active > 0;
    let x, tries = 0;
    do { x = std ? pick(lanes()) : rand(L.x0 + 6, L.x1 - CW - 6); tries++; }
    while (tries < 8 && G.items.some(o => o.y < L.top + CH * 1.3 && Math.abs(o.x - x) < CW * .9));
    const it = {k, x, tx:x, y:L.top - CH - 6, hit:0};
    it.taps = k === 'C' ? (G.pw.simp.active > 0 ? 1 : 3) : 1;
    it.sub = pick(KIND[k].subs);
    if (G.t < 8 && !G.hints.tut && k === 'R') it.tut = true;
    G.items.push(it);
  }

  function postBy(it, who){
    const m = mult(), cx = it.x + CW / 2, cy = it.y + CH / 2;
    if (who === 'hand'){
      const p = Math.round((it.k === 'C' ? 30 : 10) * m); G.st.manual++;
      addScore(p, cx, it.y, KIND[it.k].col); burst(cx, cy, 14, KIND[it.k].col, true); AU.sfx('post');
      for (const k of Object.keys(POWERS)){
        if (k === 'ai' && !aiUnlocked()) continue;
        const P = G.pw[k]; if (P.active > 0) continue;
        P.f = Math.min(1, P.f + POWERS[k].charge * (it.k === 'C' ? 1.6 : 1));
      }
      if (it.tut){ G.hints.tut = 1; }
    } else if (who === 'bot'){
      G.st.bot++; addScore(Math.round(5 * m), cx, it.y, '#4fe0a0', 'BOT +' + Math.round(5 * m)); burst(cx, cy, 6, '#4fe0a0', true); AU.sfx('bot');
    } else {
      G.st.ai++; addScore(Math.round(10 * m), cx, it.y, '#c4b5fd', false); streak(cx, cy); burst(cx, cy, 4, '#c4b5fd', true);
    }
    remove(it);
  }

  /* ---------- powers ---------- */
  function usePower(k){
    if (!G || !G.playing || G.paused || G.t < 0) return;
    if (k === 'ai'){
      if (G.aiOffer && !aiUnlocked()) return aiPreview();
      if (!aiUnlocked()){ AU.sfx('lock'); hint('ailock', 'AI unlocks in January 🔒', '#a78bfa'); return; }
    }
    const P = G.pw[k]; if (!P || P.f < 1 || P.active > 0) return;
    P.f = 0; P.active = POWERS[k].dur; G.st.powers++;
    AU.sfx(k === 'elim' ? 'elim' : k === 'ai' ? 'ai' : 'power'); V.flash = Math.max(V.flash, .25);
    banner(POWERS[k].hint, k === 'ai' ? '#a78bfa' : '#4fe0a0', 2.2);
    if (k === 'elim'){
      const pool = G.items.filter(it => it.k !== 'X' && it.y > L.top - CH).sort(() => Math.random() - .5);
      const n = Math.ceil(pool.length * .45);
      for (const it of pool.slice(0, n)){
        G.st.elim++; addScore(Math.round(5 * mult()), it.x + CW / 2, it.y, '#ffffff', 'ELIMINATED');
        burst(it.x + CW / 2, it.y + CH / 2, 18, '#ffffff', false); remove(it);
      }
      V.shake = .25;
    } else if (k === 'simp'){
      for (const it of G.items) if (it.k === 'C') it.taps = Math.min(it.taps, 1);
    } else if (k === 'std'){
      const ln = lanes(); for (const it of G.items) it.tx = ln.reduce((a, b) => Math.abs(b - it.x) < Math.abs(a - it.x) ? b : a);
    } else if (k === 'ai'){
      V.aiGlow = 1;
    }
    renderPowers(true);
  }
  function aiPreview(){
    G.aiOffer = false; G.aiPreviewUsed = true; G.aiPreview = 3; V.aiGlow = 1; V.flash = .6; G.st.powers++;
    AU.sfx('ai'); AU.mood(20000, .9, .2);
    banner('AI PREVIEW · 3 seconds of the full toolkit', '#a78bfa', 3);
    renderPowers(true);
  }

  function update(dt){
    // countdown before the clock starts
    if (G.t < 0){
      const before = Math.ceil(-G.t); G.t += dt;
      if (G.t >= 0){ AU.sfx('go'); AU.mood(2000, .78); hint('tut0', 'Tap entries before they hit the close line', '#5fd6f5'); }
      else if (Math.ceil(-G.t) !== before) AU.sfx('count');
      return;
    }
    G.t += dt;
    const p = clamp(G.t / CFG.dur, 0, 1), m = mult();
    // music opens up as the pressure builds
    if (!G.aiPreview && Math.floor(G.t) !== Math.floor(G.t - dt)) AU.mood(1800 + 16000 * p * p, .78);
    setScene(.5, .8, .55, .35 + .65 * p);

    // spawning
    let rate = 1.0 + 3.2 * Math.pow(p, 1.25);
    if (G.pw.elim.active > 0) rate *= .6;
    G.acc += rate * dt;
    while (G.acc >= 1){
      G.acc--; const r = Math.random();
      spawnCard(G.t > 20 && r < .1 ? 'X' : G.t > 8 && r < .32 ? 'C' : 'R');
    }

    // power timers
    for (const k of Object.keys(POWERS)){
      const P = G.pw[k];
      if (P.active > 0){ P.active -= dt; if (P.active <= 0){ P.active = 0; if (k === 'ai') V.aiGlow = 0; } }
      const ready = P.f >= 1 && P.active === 0 && (k !== 'ai' || aiUnlocked());
      if (ready && !P.ready){ AU.sfx('ready'); hint('ready', POWERS[k].name + ' is charged: tap it!', '#5fd6f5'); }
      P.ready = ready;
    }
    // the one-time AI preview offer during the busiest part of season 1
    if (!aiUnlocked() && !G.aiPreviewUsed && !G.aiOffer && ((G.t > 48 && G.items.length >= 7) || G.t > 68)){
      G.aiOffer = true; banner('AI PREVIEW AVAILABLE · tap the AI button', '#a78bfa', 3.2); AU.sfx('ready');
    }
    // nudge when manual work alone isn't enough
    if (G.st.missed >= 3 && !G.st.powers) hint('nudge', 'Manual alone can’t keep up. Use your ESSA powers.', '#ff5d73');

    // movement
    const fallT = (4.6 - 1.4 * p) * (G.pw.std.active > 0 ? 1.6 : 1);
    const vy = (L.line - L.top + CH) / fallT;
    for (let i = G.items.length - 1; i >= 0; i--){
      const it = G.items[i];
      it.y += vy * dt; it.hit = Math.max(0, it.hit - dt);
      if (G.pw.std.active > 0 && it.tx != null) it.x = lerp(it.x, it.tx, 1 - Math.pow(.001, dt));
      // in season 2 an AI agent processes AI-ready work by itself
      if (it.k === 'X' && aiUnlocked() && it.y > L.top + (L.line - L.top) * .35){ postBy(it, 'ai'); continue; }
      if (it.y + CH < L.line) continue;
      G.items.splice(i, 1);
      if (it.k === 'X'){
        if (G.t - G.xMsg > 6){ G.xMsg = G.t; G.fx.push({x:it.x + CW / 2, y:L.line - 12, txt:'AI could do this · January', col:'#a78bfa', life:1.2}); }
        burst(it.x + CW / 2, L.line, 6, '#8d98c9', false);
      } else {
        G.st.missed++; V.shake = .2; G.lineFlash = .5;
        G.fx.push({x:it.x + CW / 2, y:L.line - 12, txt:'MISSED', col:'#ff5d73', life:.8});
        AU.sfx('late'); burst(it.x + CW / 2, L.line, 10, '#ff5d73', false);
      }
    }

    // Automate: bot posts routine entries
    if (G.pw.auto.active > 0){
      G.bot += 3 * dt;
      while (G.bot >= 1){
        let best = null; for (const it of G.items) if (it.k === 'R' && it.y > L.top - 10 && (!best || it.y > best.y)) best = it;
        if (!best){ G.bot = 1; break; }
        G.bot--; postBy(best, 'bot');
      }
    } else G.bot = 0;

    // AI (preview in season 1, the real power in season 2): posts everything, fast
    const aiOn = G.aiPreview > 0 || G.pw.ai.active > 0;
    if (G.aiPreview > 0){
      G.aiPreview -= dt;
      if (G.aiPreview <= 0){
        G.aiPreview = 0; V.aiGlow = 0; AU.mood(1800 + 16000 * p * p, .78, .8);
        banner('That was 3 seconds of AI. The full toolkit unlocks in January.', '#a78bfa', 4);
        renderPowers(true);
      }
    }
    if (aiOn){
      G.aiTick -= dt;
      while (G.aiTick <= 0){
        G.aiTick += .07;
        let best = null; for (const it of G.items) if (it.y > L.top - CH && (!best || it.y > best.y)) best = it;
        if (best) postBy(best, 'ai'); else { G.aiTick = .07; break; }
      }
      if (Math.random() < .6) streak(rand(0, W), rand(-20, H * .3));
    }

    for (let i = G.fx.length - 1; i >= 0; i--){ const f = G.fx[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) G.fx.splice(i, 1); }
    G.lineFlash = Math.max(0, G.lineFlash - dt);
    if (G.banner){ G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    V.aiGlow = Math.max(aiOn ? 1 : 0, V.aiGlow - dt);

    if (G.t >= CFG.dur) finish();
  }

  function drawGame(){
    const lf = G.lineFlash || 0;
    g.save(); g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(0, L.line - 18, 0, L.line + 18);
    lg.addColorStop(0, 'rgba(255,60,90,0)'); lg.addColorStop(.5, 'rgba(255,70,100,' + Math.min(1, .35 + lf) + ')'); lg.addColorStop(1, 'rgba(255,60,90,0)');
    g.fillStyle = lg; g.fillRect(0, L.line - 18, W, 36);
    g.fillStyle = 'rgba(255,170,185,' + Math.min(1, .85 + lf * .3) + ')'; g.fillRect(0, L.line - .75, W, 1.5);
    g.restore();
    g.fillStyle = 'rgba(255,120,140,.75)'; g.font = '600 10px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText('P E R I O D - E N D   C L O S E', W / 2, L.line + 20);

    if (G.pw.std.active > 0){
      g.save(); g.strokeStyle = 'rgba(79,224,160,.18)'; g.setLineDash([6, 8]); g.lineWidth = 1;
      for (const x of lanes()){ g.strokeRect(x, L.top, CW, L.line - L.top); }
      g.restore();
    }
    for (const it of G.items){
      g.drawImage(sprite(it), it.x - PAD, it.y - PAD, CW + PAD * 2, CH + PAD * 2);
      if (it.tut && !G.hints.tut){
        const pr = (V.t * 1.4) % 1;
        g.strokeStyle = 'rgba(95,214,245,' + (1 - pr) + ')'; g.lineWidth = 2;
        rr(g, it.x - pr * 10, it.y - pr * 10, CW + pr * 20, CH + pr * 20, 14); g.stroke();
        g.fillStyle = '#5fd6f5'; g.font = '700 12px "IBM Plex Sans", sans-serif'; g.textAlign = 'center';
        g.fillText('TAP TO POST', it.x + CW / 2, it.y + CH + 18);
      }
    }
    g.textAlign = 'center';
    for (const f of G.fx){ g.globalAlpha = clamp(f.life * 1.6, 0, 1); g.fillStyle = f.col; g.font = '600 13px "IBM Plex Mono", monospace'; g.fillText(f.txt, f.x, f.y); }
    g.globalAlpha = 1;

    if (G.banner){
      const b = G.banner, a = clamp(b.t * 2, 0, 1), y = L.top + 14;
      g.globalAlpha = a; g.font = '600 13px "IBM Plex Sans", sans-serif';
      const w = Math.min(W - 24, g.measureText(b.txt).width + 32);
      g.fillStyle = 'rgba(6,10,34,.88)'; rr(g, W / 2 - w / 2, y, w, 32, 16); g.fill();
      g.strokeStyle = b.col; g.lineWidth = 1; rr(g, W / 2 - w / 2 + .5, y + .5, w - 1, 31, 16); g.stroke();
      g.fillStyle = b.col; g.textBaseline = 'middle'; g.fillText(b.txt, W / 2, y + 16.5, w - 20); g.textBaseline = 'alphabetic';
      g.globalAlpha = 1;
    }
    if (G.t < 0){
      const n = Math.ceil(-G.t), k = -G.t - (n - 1);
      g.globalAlpha = clamp(k * 1.5, 0, 1); g.textAlign = 'center';
      g.fillStyle = '#5fd6f5'; g.font = '600 13px "IBM Plex Mono", monospace'; g.fillText('9 0 - S E C O N D   C L O S E', W / 2, H * .36);
      g.shadowColor = 'rgba(95,214,245,.8)'; g.shadowBlur = 30; g.fillStyle = '#fff';
      g.font = '800 ' + Math.round(Math.min(110, W * .26)) + 'px "Sora", sans-serif'; g.fillText(String(n), W / 2, H * .36 + 100);
      g.shadowBlur = 0; g.globalAlpha = 1;
    }
  }

  let hudCache = {};
  function hud(force){
    if (force) hudCache = {};
    const left = Math.max(0, Math.ceil(CFG.dur - Math.max(0, G.t)));
    const clock = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (hudCache.clock !== clock){ hudCache.clock = clock; $('h-clock').textContent = clock; }
    if (hudCache.score !== G.score){ hudCache.score = G.score; $('h-score').textContent = fmt(G.score); }
    $('h-time').style.transform = 'scaleX(' + clamp(1 - Math.max(0, G.t) / CFG.dur, 0, 1) + ')';
    const s = G.st, posted = s.manual + s.bot + s.ai;
    const html = '<span>Posted <b>' + fmt(posted) + '</b></span><span class="' + (s.missed ? 'bad' : '') + '">Missed <b>' + s.missed + '</b></span><span>×<b>' + mult().toFixed(1) + '</b></span>';
    if (hudCache.stats !== html){ hudCache.stats = html; $('h-stats').innerHTML = html; }
    renderPowers();
  }
  function renderPowers(force){
    if (!G) return;
    document.querySelectorAll('.pw').forEach(b => {
      const k = b.dataset.p, P = G.pw[k], D = POWERS[k];
      const f = P.active > 0 ? P.active / D.dur : P.f;
      const state = (P.active > 0 ? 'a' : P.ready ? 'r' : '') + (k === 'ai' ? (G.aiOffer ? 'o' : '') + (G.aiPreview > 0 ? 'p' : '') : '') + Math.round(f * 40);
      if (!force && b._st === state) return; b._st = state;
      b.style.setProperty('--f', f.toFixed(3));
      b.classList.toggle('active', P.active > 0 || (k === 'ai' && G.aiPreview > 0));
      b.classList.toggle('ready', !!P.ready);
      if (k === 'ai'){
        b.classList.toggle('locked', !aiUnlocked() && !G.aiOffer && !(G.aiPreview > 0));
        b.classList.toggle('offer', !!G.aiOffer);
        $('pw-ai-t').textContent = aiUnlocked() ? 'Agent' : G.aiOffer ? 'Preview' : G.aiPreview > 0 ? 'Live' : 'Jan';
      }
    });
  }
  document.querySelectorAll('.pw').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); usePower(b.dataset.p); }));
  document.addEventListener('keydown', e => {
    if (!G || !G.playing) return;
    const map = {'1':'elim', '2':'simp', '3':'std', '4':'auto', '5':'ai'};
    if (map[e.key]) usePower(map[e.key]);
    else if (e.key === 'Escape' || e.key === 'p') G.paused ? resume() : pause();
  });

  /* ---------- input ---------- */
  cv.addEventListener('pointerdown', e => {
    if (!G || !G.playing || G.paused || G.t < 0) return;
    e.preventDefault();
    const px = e.clientX, py = e.clientY, pad = 12; let best = null;
    for (const it of G.items) if (px >= it.x - pad && px <= it.x + CW + pad && py >= it.y - pad && py <= it.y + CH + pad && (!best || it.y > best.y)) best = it;
    if (!best) return;
    if (best.k === 'X'){
      AU.sfx('lock'); best.hit = .12;
      G.fx.push({x:best.x + CW / 2, y:best.y - 4, txt:'🔒 AI unlocks in January', col:'#a78bfa', life:1});
      return;
    }
    best.taps--; best.hit = .12;
    if (best.taps <= 0) postBy(best, 'hand'); else AU.sfx('tap');
  });

  /* ---------- pause ---------- */
  function pause(){ if (!G || !G.playing || G.paused) return; G.paused = true; $('pausebox').hidden = false; if (!AU.el.paused) AU.el.pause(); }
  function resume(){ if (!G || !G.paused) return; G.paused = false; $('pausebox').hidden = true; if (AU.on) AU.start(); }
  $('pause').addEventListener('click', pause);
  $('resume').addEventListener('click', resume);
  $('quit').addEventListener('click', () => { $('pausebox').hidden = true; goHome(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ================= main loop ================= */
  function frame(now){
    const dt = clamp((now - last) / 1000 || 0, 0, .05); last = now;
    V.t += dt;
    const k = 1 - Math.pow(.02, dt);
    for (const p of ['y', 'r', 'a', 'i']) V.cur[p] = lerp(V.cur[p], V.tgt[p], k);
    if (V.beam > 0 && V.beam < 1){ V.beam = Math.min(1, V.beam + dt / 1.1); if (V.beam >= 1){ V.flash = 1; AU.sfx('impact'); } }
    V.flash = Math.max(0, V.flash - dt * 1.4); V.shake = Math.max(0, V.shake - dt);

    if (G && G.playing && !G.paused) update(dt);

    const sh = V.shake > 0 && !reduced;
    g.save(); if (sh) g.translate(rand(-1, 1) * V.shake * 12, rand(-1, 1) * V.shake * 12);
    drawBackground(dt); drawWafer(); drawBeam(); drawParticles(dt);
    if (G && G.playing) drawGame();
    g.restore();
    if (V.flash > 0){ g.fillStyle = 'rgba(200,235,255,' + V.flash * .5 + ')'; g.fillRect(0, 0, W, H); }
    if (G && G.playing) hud();
    requestAnimationFrame(frame);
  }

  /* ================= screens ================= */
  function show(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    const s = $(id); if (s && s.scrollTo) s.scrollTo(0, 0);
  }
  function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function goHome(){
    G = null; $('pause').hidden = true; show('s-home'); setScene(.5, .9, 1, .55); AU.mood(700, .75); V.aiGlow = 0; loadBoard('home');
  }

  /* ================= end & leaderboard ================= */
  function finish(){
    G.playing = false; $('pause').hidden = true; V.streaks.length = 0;
    const s = G.st, posted = s.manual + s.bot + s.ai;
    const run = {p_player:PLAYER, p_name:G.name, p_mode:modeFor(), p_score:Math.round(G.score), p_version:CFG.version,
      p_stats:{duration_ms:CFG.dur * 1000, posted, manual:s.manual, bot:s.bot, ai:s.ai, eliminated:s.elim, missed:s.missed, powers:s.powers, preview:G.aiPreviewUsed ? 1 : 0}};
    AU.sfx('end'); AU.mood(3200, .7); setScene(.7, 1, 1, .8);

    $('e-eyebrow').textContent = G.name + ' · ' + (aiUnlocked() ? 'Season 2 · AI unlocked' : 'Season 1 · ESSA');
    $('e-title').textContent = s.missed === 0 ? 'Flawless close.' : s.missed <= 5 ? 'Books closed.' : 'Closed, just about.';
    const bd = $('e-breakdown'); bd.textContent = '';
    [[s.manual, 'by hand'], [s.bot + s.elim, 'by automation & eliminate'], [s.ai, 'by AI']].forEach(([v, l]) => {
      const d = el('div'); d.append(el('b', '', fmt(v)), el('span', '', l)); bd.appendChild(d); });
    const rk = $('e-ranks'); rk.textContent = '';
    [['score', '🏆 Score', fmt(run.p_score)], ['entries', '📒 Entries', fmt(posted) + ' posted']].forEach(([c, t, v]) => {
      const d = el('div'); d.dataset.cat = c; d.append(el('small', '', t), el('b', '', '–'), el('span', '', v)); rk.appendChild(d); });
    $('e-tip').textContent = pick(TIPS);
    if (aiUnlocked()){
      $('e-lede').innerHTML = 'You closed <b>' + fmt(posted) + '</b> entries in 90 seconds, <b>' + fmt(s.ai) + '</b> of them with AI. ESSA fixes the process; AI multiplies what the team can do.';
      $('e-tbc').firstChild.textContent = 'The future of the close';
    } else {
      $('e-lede').innerHTML = 'You closed <b>' + fmt(posted) + '</b> entries in 90 seconds. ESSA made the difference. ' + (G.aiPreviewUsed ? 'You saw three seconds of AI. ' : '') + 'In January, <b>AI</b> joins the team.';
      $('e-tbc').firstChild.textContent = 'To be continued';
    }
    show('s-end'); countUp($('e-score'), run.p_score);
    submitRun(run);
  }
  function countUp(node, to){
    if (reduced){ node.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 1400;
    const step = now => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3); node.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  async function submitRun(run){
    const st = $('e-status'); st.textContent = 'Saving your score…';
    try {
      const r = await api.submit(run);
      if (r && r.ok) st.textContent = TEST || PREVIEW_S2 ? 'Test game saved (not on the real leaderboard).' : 'Score saved on the leaderboard.';
      else if (r && r.reason === 'season_closed') st.textContent = 'The season has closed: this score is not on the leaderboard.';
      else if (r && r.reason === 'wrong_season') st.textContent = 'A new season has started. Reload the page to play it.';
      else if (r && r.reason === 'too_fast') st.textContent = 'Saved too quickly after your last game. Play again in a moment.';
      else st.textContent = 'This score could not be saved (' + ((r && r.reason) || 'unknown') + ').';
    } catch(e){
      const q = store.get('pending', []); q.push(run); store.set('pending', q.slice(-5));
      st.textContent = 'The leaderboard is offline. Your score is kept on this device and sent next time.';
    }
    loadRanks(); loadBoard('end');
  }
  async function flushPending(){
    const q = store.get('pending', []); if (!q.length) return;
    const left = [];
    for (const run of q){ try { const r = await api.submit(run); if (r && r.reason === 'too_fast') left.push(run); } catch(e){ left.push(run); } }
    store.set('pending', left);
  }
  async function loadRanks(){
    for (const c of Object.keys(CATS)){
      const box = document.querySelector('#e-ranks [data-cat="' + c + '"] b'); if (!box) continue;
      try {
        const rows = await api.board(c, 200), i = rows.findIndex(r => r.player_id === PLAYER);
        box.textContent = i >= 0 ? '#' + (i + 1) + ' of ' + rows.length : '–';
      } catch(e){ box.textContent = '–'; }
    }
  }
  const boardCat = {home:'score', end:'score'};
  async function loadBoard(where){
    const cat = boardCat[where], ol = $('board-' + where), C = CATS[cat];
    $(where + '-cat-desc').textContent = C.desc;
    document.querySelectorAll('.tabs[data-board="' + where + '"] button').forEach(b => b.setAttribute('aria-selected', b.dataset.cat === cat));
    ol.textContent = ''; ol.appendChild(el('li', 'empty', 'Loading…'));
    try {
      const rows = await api.board(cat, 200);
      if (boardCat[where] !== cat) return;
      ol.textContent = '';
      if (!rows.length){ ol.appendChild(el('li', 'empty', 'No scores yet. Be the first.')); return; }
      const me = rows.findIndex(r => r.player_id === PLAYER);
      const showRow = (r, i) => { const li = el('li', r.player_id === PLAYER ? 'me' : ''); const nm = el('span', 'nm'); nm.textContent = r.name;
        li.append(el('span', 'rk', String(i + 1)), nm, el('span', 'vl', C.show(Number(r.value)))); ol.appendChild(li); };
      rows.slice(0, 10).forEach(showRow);
      if (me >= 10){ ol.appendChild(el('li', 'gap', '⋯')); showRow(rows[me], me); }
    } catch(e){
      ol.textContent = ''; ol.appendChild(el('li', 'empty', 'Leaderboard is offline right now.'));
    }
  }
  document.querySelectorAll('.tabs').forEach(t => t.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; boardCat[t.dataset.board] = b.dataset.cat; loadBoard(t.dataset.board);
  }));
  function applySeason(){
    const s2 = aiUnlocked();
    $('h-eyebrow').textContent = 'Finance Operations · ' + (s2 ? 'Season 2 · AI unlocked' : 'Season 1') + (TEST || PREVIEW_S2 ? ' · test' : '');
    $('pi-ai').classList.toggle('open', s2); $('pi-ai-t').textContent = s2 ? 'Unlocked' : 'January';
  }
  async function loadSeason(){
    try {
      const s = await api.season();
      if (s.season && s.season !== SEASON){ SEASON = s.season; store.set('season', SEASON); applySeason(); loadBoard('home'); }
      const end = new Date(s.season_end), days = Math.ceil((end - Date.now()) / 864e5);
      const date = end.toLocaleDateString('en-GB', {day:'numeric', month:'long'});
      $('season-left').textContent = days > 0 ? 'Closes in ' + days + ' day' + (days === 1 ? '' : 's') : 'Season closed';
      $('e-season').textContent = aiUnlocked()
        ? 'Season 2 runs until ' + date + '. Play as often as you like: only your best counts.'
        : 'The leaderboard closes on ' + date + '. The winners are announced at the AI event in January, where the AI button unlocks for season 2.';
    } catch(e){ $('e-season').textContent = 'The winners are announced at the AI event in January, where the AI button unlocks.'; }
  }

  /* ================= start ================= */
  $('f-start').addEventListener('submit', e => { e.preventDefault(); startGame(); });
  $('again').addEventListener('click', startGame);
  $('home').addEventListener('click', goHome);
  $('name').value = store.get('name', '');

  resize(); setScene(.5, .9, 1, .55); V.cur = {...V.tgt};
  V.beam = reduced ? 1 : .001;
  applySeason();
  last = performance.now(); requestAnimationFrame(frame);
  loadBoard('home'); loadSeason(); flushPending();
  window.CTB = {state:() => G, view:V, usePower};
})();
