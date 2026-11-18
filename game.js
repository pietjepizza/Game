/* Close the Books — season 2026
   Plain JavaScript, no build step. Leaderboard on Supabase (public publishable key; all writes go through checked functions). */
(() => {
  'use strict';

  /* ================= config ================= */
  const CFG = {
    url: 'https://evdtpvbacpibeasrczhu.supabase.co',
    key: 'sb_publishable_Y1GmwdTaooG8yqFTTTZApQ_WVwIwyZz',
    mode: /[?&]test\b/.test(location.search) ? 'test' : 'v2',   // ?test keeps trial runs off the real leaderboard
    version: '2.0.0'
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
    board(cat, limit){ const c = CATS[cat]; return this.rpc('leaderboard', {p_mode:CFG.mode, p_metric:c.metric, p_ascending:c.asc, p_limit:limit || 10}); },
    submit(run){ return this.rpc('submit_run', run); },
    season(){ return this.rpc('season'); }
  };
  const CATS = {
    score:  {metric:'score',  asc:false, desc:'Highest total score over all three acts.', show:v => fmt(v)},
    speed:  {metric:'avg_ms', asc:true,  desc:'Fastest average time to post an entry by hand (at least 30 entries).', show:v => (v / 1000).toFixed(2) + ' s'},
    review: {metric:'review', asc:false, desc:'AI errors caught in Act 3, minus correct AI drafts you rejected.', show:v => fmt(v) + ' net'}
  };

  /* ================= audio ================= */
  const AU = {
    el:$('music'), ctx:null, filter:null, gain:null, sfxOut:null, on:store.get('snd', true), started:false, routed:false,
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
      this.started = true;
    },
    // how "open" the music sounds: low cutoff = muffled, high = full
    mood(hz, vol){
      if (!this.ctx || !this.filter) return;
      const t = this.ctx.currentTime;
      this.filter.frequency.cancelScheduledValues(t); this.filter.frequency.setTargetAtTime(hz, t, .6);
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
        case 'caught': this.tone(988, .1, 'triangle', .08); this.tone(1480, .16, 'triangle', .07, t + .06); break;
        case 'misstate': this.noise(.3, .12, 2400, 300); this.tone(110, .3, 'square', .05, 0, 70); break;
        case 'reject': this.tone(420, .12, 'triangle', .06, 0, 300); break;
        case 'riser':  this.noise(1.6, .06, 300, 6000); break;
        case 'impact': this.tone(55, 1.2, 'sine', .35, 0, 35); this.noise(.8, .08, 3000, 200); break;
        case 'act':    [523, 784, 1047].forEach((f, i) => this.tone(f, .5, 'triangle', .06, t + i * .09)); break;
        case 'pick':   this.tone(1175, .08, 'sine', .06); break;
        case 'right':  [784, 988, 1319].forEach((f, i) => this.tone(f, .3, 'triangle', .07, t + i * .07)); break;
        case 'wrong':  this.tone(330, .25, 'triangle', .07, 0, 220); break;
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
    t:0, beam:0, flash:0, shake:0, glitch:0,
    cur:{y:.66, r:1, a:1, i:.55}, tgt:{y:.66, r:1, a:1, i:.55},
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
    // slow light shafts
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
    // dust (rises slowly, twinkles)
    g.fillStyle = '#cfe0ff';
    for (const d of V.dust){
      d.y -= d.v * dt; if (d.y < -4){ d.y = H + 4; d.x = Math.random() * W; }
      g.globalAlpha = .25 + .25 * Math.sin(V.t * 2 + d.p); g.fillRect(d.x, d.y, d.r, d.r);
    }
    g.globalAlpha = 1;
  }

  function drawWafer(){
    const C = waferC(), R = waferR(), a = V.cur.a, I = V.cur.i, tilt = .36, rot = reduced ? .4 : V.t * .06;
    g.save(); g.globalAlpha = a;
    // halo under the wafer
    g.save(); g.globalCompositeOperation = 'lighter';
    const halo = g.createRadialGradient(C.x, C.y, R * .2, C.x, C.y, R * 1.5);
    halo.addColorStop(0, 'rgba(120,140,255,' + (.18 + .2 * I) + ')'); halo.addColorStop(1, 'rgba(60,40,160,0)');
    g.fillStyle = halo; g.beginPath(); g.ellipse(C.x, C.y, R * 1.5, R * 1.5 * tilt * 1.4, 0, 0, TAU); g.fill(); g.restore();
    // body
    g.save(); g.translate(C.x, C.y); g.scale(1, tilt);
    g.beginPath(); g.arc(0, 0, R, 0, TAU);
    const body = g.createRadialGradient(-R * .3, -R * .5, R * .1, 0, 0, R);
    body.addColorStop(0, '#24357f'); body.addColorStop(1, '#070b26'); g.fillStyle = body; g.fill();
    g.save(); g.clip();
    g.save(); g.rotate(rot); g.drawImage(gridC, -R, -R, R * 2, R * 2); g.restore();
    // iridescent diffraction sheen
    if (g.createConicGradient){
      const cg = g.createConicGradient(rot * 2.2, 0, 0), hs = [190, 260, 320, 30, 90, 160, 190];
      hs.forEach((h, i) => cg.addColorStop(i / (hs.length - 1), 'hsla(' + h + ',95%,62%,1)'));
      g.globalCompositeOperation = 'screen'; g.globalAlpha = a * (.22 + .18 * I); g.fillStyle = cg; g.fillRect(-R, -R, R * 2, R * 2);
    }
    // specular sweep
    const sx = Math.sin(V.t * .35) * R * 1.4, sp = g.createLinearGradient(sx - R * .5, -R, sx + R * .5, R);
    sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(.5, 'rgba(255,255,255,.16)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.fillStyle = sp; g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    // rim
    g.lineWidth = 2.5; const rim = g.createLinearGradient(-R, 0, R, 0);
    rim.addColorStop(0, 'rgba(95,214,245,.9)'); rim.addColorStop(.5, 'rgba(255,255,255,.7)'); rim.addColorStop(1, 'rgba(167,139,250,.9)');
    g.strokeStyle = rim; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.restore(); g.restore();
  }

  function drawBeam(){
    if (V.beam <= 0) return;
    const C = waferC(), R = waferR(), I = V.cur.i, len = C.y * Math.min(1, V.beam), pulse = reduced ? 0 : Math.sin(V.t * 9) * 1.5;
    const w = 5 + I * 9 + pulse;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [k, col] of [[5, 'rgba(140,90,255,.10)'], [2.2, 'rgba(150,110,255,.28)'], [1, 'rgba(170,230,255,.75)'], [.35, 'rgba(255,255,255,.95)']]){
      const ww = w * k, gr = g.createLinearGradient(C.x - ww, 0, C.x + ww, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(C.x - ww, 0, ww * 2, len);
    }
    if (V.beam >= 1){
      // impact glow and horizontal lens streak
      const fr = R * (.35 + .35 * I) * (1 + .06 * Math.sin(V.t * 5));
      const ig = g.createRadialGradient(C.x, C.y, 0, C.x, C.y, fr);
      ig.addColorStop(0, 'rgba(255,255,255,.95)'); ig.addColorStop(.12, 'rgba(180,230,255,.7)'); ig.addColorStop(.4, 'rgba(140,100,255,.25)'); ig.addColorStop(1, 'rgba(80,40,200,0)');
      g.fillStyle = ig; g.beginPath(); g.ellipse(C.x, C.y, fr, fr * .55, 0, 0, TAU); g.fill();
      const sw = Math.min(W * .9, R * 3.2), st = g.createLinearGradient(C.x - sw / 2, 0, C.x + sw / 2, 0);
      st.addColorStop(0, 'rgba(95,214,245,0)'); st.addColorStop(.5, 'rgba(200,240,255,' + (.35 + .25 * I) + ')'); st.addColorStop(1, 'rgba(167,139,250,0)');
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
    // AI throughput streaks flowing into the wafer
    g.lineCap = 'round';
    for (let i = V.streaks.length - 1; i >= 0; i--){
      const s = V.streaks[i]; s.k += dt * s.v; if (s.k >= 1){ V.streaks.splice(i, 1); continue; }
      const e = s.k * s.k, x = lerp(s.x, C.x, e), y = lerp(s.y, C.y, e), e2 = Math.max(0, s.k - .12) ** 2;
      const x2 = lerp(s.x, C.x, e2), y2 = lerp(s.y, C.y, e2);
      g.globalAlpha = .9; g.strokeStyle = s.col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke();
    }
    g.restore(); g.globalAlpha = 1;
  }
  function burst(x, y, n, col, home){
    if (reduced) return;
    for (let i = 0; i < n; i++){ const a = Math.random() * TAU, v = rand(60, 220); V.parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:home ? 1.6 : .6, col, home}); }
    if (V.parts.length > 500) V.parts.splice(0, V.parts.length - 500);
  }

  /* ================= game layout & cards ================= */
  const L = {x0:0, x1:0, top:0, line:0};
  let CW = 176, CH = 58;
  function layout(){
    const colW = Math.min(560, W) - 16; L.x0 = (W - colW) / 2; L.x1 = L.x0 + colW;
    L.top = 96; L.line = H - 64;
    CW = Math.min(184, Math.floor(colW * .47)); CH = 58;
  }
  const KIND = {
    R:   {label:'Journal entry', col:'#5fd6f5', subs:['Accrual · €12,400','Reclass · €3,950','Prepayment · €8,200','Payroll · €41,000','Freight · €6,730','Rent · €18,500']},
    C:   {label:'Complex deal',  col:'#a78bfa', subs:['Revenue split · €4.1M','Deferred to acceptance','Multi-element · €2.7M','Lease · €1.3M']},
    OK:  {label:'AI draft',      col:'#4fe0a0'},
    ERR: {label:'AI draft',      col:'#ffb84d'}
  };
  const AI_WHAT = ['Accrual','Reclass','Invoice match','IC elimination','FX revaluation','Bank match','Provision'];
  const AI_FLAG = ['VAT code?','Wrong period?','Duplicate?','Amount ×10?','Wrong entity?','No source doc'];

  const sprites = new Map(), PAD = 22;
  function rr(c, x, y, w, h, r){ c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function sprite(it){
    const hit = it.hit > 0, key = [it.k, it.what || '', it.sub, it.taps, hit ? 1 : 0].join('|');
    let s = sprites.get(key); if (s) return s;
    if (sprites.size > 300) sprites.clear();
    s = document.createElement('canvas'); s.width = Math.ceil((CW + PAD * 2) * DPR); s.height = Math.ceil((CH + PAD * 2) * DPR);
    const c = s.getContext('2d'), K = KIND[it.k], col = K.col;
    c.scale(DPR, DPR); c.translate(PAD, PAD);
    c.shadowColor = col; c.shadowBlur = hit ? 26 : 16;
    rr(c, 0, 0, CW, CH, 12); c.fillStyle = hit ? 'rgba(30,44,110,.97)' : 'rgba(10,16,48,.94)'; c.fill();
    c.shadowBlur = 0;
    const hl = c.createLinearGradient(0, 0, 0, CH); hl.addColorStop(0, 'rgba(255,255,255,.10)'); hl.addColorStop(.5, 'rgba(255,255,255,0)');
    rr(c, 0, 0, CW, CH, 12); c.fillStyle = hl; c.fill();
    c.lineWidth = 1; c.strokeStyle = hit ? col : 'rgba(190,205,255,.22)'; rr(c, .5, .5, CW - 1, CH - 1, 12); c.stroke();
    c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col; rr(c, 0, 10, 3, CH - 20, 2); c.fill(); c.shadowBlur = 0;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const isAI = it.k === 'OK' || it.k === 'ERR', right = isAI ? 34 : 14 + it.taps * 12;
    c.fillStyle = '#f4f6ff'; c.font = '600 13px "IBM Plex Sans", sans-serif';
    c.fillText(isAI ? 'AI draft · ' + it.what : K.label, 14, 24, CW - 20 - right);
    c.font = '500 11px "IBM Plex Mono", monospace';
    c.fillStyle = it.k === 'ERR' ? '#ffb84d' : it.k === 'OK' ? '#4fe0a0' : '#a3acd9';
    c.fillText(it.sub, 14, 43, CW - 20 - right);
    if (isAI){
      rr(c, CW - 30, 16, 20, 14, 4); c.fillStyle = col; c.fill();
      c.fillStyle = '#040716'; c.font = '700 9px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.fillText('AI', CW - 20, 26.5);
      if (it.k === 'ERR'){ c.fillStyle = '#ffb84d'; c.font = '700 13px "IBM Plex Sans", sans-serif'; c.fillText('⚠', CW - 20, 46); }
    } else {
      for (let i = 0; i < it.taps; i++){ c.beginPath(); c.arc(CW - 14 - i * 12, 36, 4, 0, TAU); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6; c.fill(); }
      c.shadowBlur = 0;
    }
    sprites.set(key, s); return s;
  }

  /* ================= game ================= */
  const ACTS = [
    {n:'ACT 1', name:'Manual',    dur:40, mult:1, rule:'Tap every entry before it hits the close line.', mood:2200},
    {n:'ACT 2', name:'ESSA',      dur:40, mult:2, rule:'Your process improvements are live. Keep closing.', mood:6000},
    {n:'ACT 3', name:'AI-native', dur:50, mult:3, rule:'AI posts the volume. You handle complex deals and catch AI errors.', mood:20000}
  ];
  const ESSA = [
    {k:'elim', L:'E', name:'Eliminate',   d:'35% of the entries are never created: stop work that adds no value.'},
    {k:'simp', L:'S', name:'Simplify',    d:'Complex deals need 2 taps instead of 3.'},
    {k:'std',  L:'S', name:'Standardize', d:'Entries arrive in fixed lanes and fall 15% slower.'},
    {k:'auto', L:'A', name:'Automate',    d:'A bot posts 1.5 routine journal entries per second.'}
  ];
  const QUESTIONS = [
    {q:'You need an explanation for a €2.4M freight variance versus budget for the month-end pack. Which prompt works best?',
      o:['Explain the freight variance for October.',
         'You are a cost controller. Using the attached GL extract and budget, explain the €2.4M October freight variance in 3 bullets: volume, rate and one-offs. Say what you are unsure about.',
         'Write a detailed report about freight costs and why they are high.'], a:1,
      tip:'Give the AI a role, the data, the exact question and the format you want, and ask it to flag doubts.'},
    {q:'You want to match 300 bank statement lines to open items. Which instruction gets you a result you can trust?',
      o:['Match these and give me the result.',
         'Match as many lines as you can, and fill in the most likely invoice when you are not sure.',
         'Match each bank line to an open item on amount, date and reference. Return a table with your confidence, and list unmatched lines separately. Do not guess.'], a:2,
      tip:'Tell the AI how to match, what to return and what to do when it is unsure. "Do not guess" matters in finance.'},
    {q:'The AI gives you an accrual of €1.2M for unbilled services. What do you do before you post it?',
      o:['Post it: the AI is usually right.',
         'Ask the AI to show its calculation and sources, and check them against the purchase orders.',
         'Round it to €1M to be safe.'], a:1,
      tip:'You stay accountable. Ask the AI to show its work, and verify it against the source.'},
    {q:'You want to summarise a 40-page customer contract for revenue recognition. Which prompt is best?',
      o:['Summarise this contract.',
         'From this contract, list the performance obligations, payment terms, acceptance clauses and anything unusual that affects revenue timing. Quote the clause numbers.',
         'Is this a good contract?'], a:1,
      tip:'Be specific about what you need and ask for clause references, so you can check the answer quickly.'},
    {q:'You want help analysing a spreadsheet with employee salary data. What is the right move?',
      o:['Paste it into any free AI website. It is faster.',
         'Remove the names and use it anyway in a public tool.',
         'Use only the AI tools your company has approved for this kind of data.'], a:2,
      tip:'Confidential and personal data only goes into approved company tools.'},
    {q:'You need to chase a business controller for missing accruals before Day 2. Which prompt drafts the best email?',
      o:['Write an email asking for accruals.',
         'Draft a short, friendly email to a business controller asking for missing October accruals by Day 2, 12:00. List what we need in bullets and explain why the deadline matters.',
         'Write an angry email about late accruals.'], a:1,
      tip:'Audience, tone, deadline and structure: the more context, the less rewriting.'}
  ];

  let G = null, raf = 0, last = 0;

  function newGame(name){
    G = {name, act:-1, score:0, actScore:[0, 0, 0], items:[], up:{}, correct:0, playMs:0,
      st:{posted:0, missed:0, bot:0, aiPosted:0, stream:0, caught:0, missedErr:0, falseRej:0, manualMs:[], actMissed:[0, 0, 0], actPosted:[0, 0, 0]},
      fx:[], tutDone:false, paused:false, playing:false};
  }

  function startAct(i){
    const A = ACTS[i];
    Object.assign(G, {act:i, el:-2.6, items:[], acc:.4, accC:0, accAI:0, accS:0, bot:0, playing:true, paused:false, fx:[], streamPts:0, lineFlash:0});
    $('h-act').textContent = A.n; $('h-actname').textContent = A.name;
    show('s-play'); setScene(.56, .82, i === 2 ? .7 : .5, [.35, .6, 1][i]);
    AU.mood(A.mood, i === 2 ? .85 : .75); AU.sfx('act'); AU.sfx('riser');
    hud(true);
  }

  function spawnCard(k){
    const up = G.up;
    let x, tries = 0;
    const lanes = up.std ? [L.x0 + 6, (L.x0 + L.x1 - CW) / 2, L.x1 - CW - 6] : null;
    do {
      x = lanes ? pick(lanes) : rand(L.x0 + 6, L.x1 - CW - 6);
      tries++;
    } while (tries < 8 && G.items.some(o => o.y < L.top + CH * 1.3 && Math.abs(o.x - x) < CW * .9));
    const it = {k, x, y:L.top - CH - 6, born:performance.now(), hit:0, sp:1};
    if (k === 'R'){ it.taps = 1; it.sub = pick(KIND.R.subs); }
    else if (k === 'C'){ it.taps = up.simp ? 2 : 3; it.sub = pick(KIND.C.subs); }
    else {
      it.taps = 1; it.what = pick(AI_WHAT);
      if (k === 'OK'){ it.conf = Math.round(rand(91, 99)); it.sub = it.conf + '% confident'; }
      else { it.conf = Math.round(rand(48, 76)); it.sub = it.conf + '% · ' + pick(AI_FLAG); }
    }
    if (G.act === 0 && !G.tutDone && !G.items.some(o => o.tut)) it.tut = true;
    G.items.push(it);
  }

  function addScore(p, x, y, col, txt){
    G.score = Math.max(0, G.score + p); G.actScore[G.act] += p;
    G.fx.push({x, y, txt:txt || ((p >= 0 ? '+' : '') + fmt(p)), col, life:.9});
  }
  function remove(it){ const i = G.items.indexOf(it); if (i >= 0) G.items.splice(i, 1); }
  function postManual(it){
    const A = ACTS[G.act], p = (it.k === 'C' ? 30 : 10) * A.mult;
    G.st.posted++; G.st.actPosted[G.act]++; G.st.manualMs.push(performance.now() - it.born);
    addScore(p, it.x + CW / 2, it.y, KIND[it.k].col);
    burst(it.x + CW / 2, it.y + CH / 2, 14, KIND[it.k].col, true); AU.sfx('post'); remove(it);
    if (it.tut) G.tutDone = true;
  }

  function update(dt){
    const A = ACTS[G.act], up = G.up;
    G.el += dt;
    if (G.el < 0) return;                       // act intro running
    G.playMs += dt * 1000;
    const p = clamp(G.el / A.dur, 0, 1);
    let rate = 0, fall = 4, cShare = 0;
    if (G.act === 0){ rate = .9 + 2.6 * Math.pow(p, 1.3); fall = 4.6 - 1.0 * p; cShare = .18; }
    else if (G.act === 1){ rate = (2.6 + 1.6 * p) * (up.elim ? .65 : 1); fall = 4.2 - .7 * p; cShare = .28; }
    else { fall = 4.4 - .6 * p; }
    if (up.std) fall *= 1.15;

    if (G.act < 2){
      G.acc += rate * dt;
      while (G.acc >= 1){ spawnCard(Math.random() < cShare ? 'C' : 'R'); G.acc--; }
    } else {
      const cRate = (.45 + .35 * p) * (up.elim ? .8 : 1), aiRate = 1.2 + 1.2 * p, errShare = [.38, .3, .22][G.correct], sRate = 8 + 22 * p;
      G.accC += cRate * dt; while (G.accC >= 1){ spawnCard('C'); G.accC--; }
      G.accAI += aiRate * dt; while (G.accAI >= 1){ spawnCard(Math.random() < errShare ? 'ERR' : 'OK'); G.accAI--; }
      G.accS += sRate * dt;
      while (G.accS >= 1){
        G.accS--; G.st.stream++;
        if (!reduced && V.streaks.length < 160) V.streaks.push({x:rand(0, W), y:rand(-20, H * .25), k:0, v:rand(.9, 1.5), col:Math.random() < .5 ? 'rgba(95,214,245,.8)' : 'rgba(167,139,250,.8)'});
        const acc = (G.st.caught + 1) / (G.st.caught + G.st.missedErr + 1);
        G.streamPts += 2 * A.mult * acc;
      }
      if (G.streamPts >= 1){ const w = Math.floor(G.streamPts); G.streamPts -= w; G.score += w; G.actScore[2] += w; }
    }

    // movement & close line
    const vy = (L.line - L.top + CH) / fall;
    for (let i = G.items.length - 1; i >= 0; i--){
      const it = G.items[i]; it.y += vy * it.sp * dt; it.hit = Math.max(0, it.hit - dt);
      if (it.y + CH < L.line) continue;
      G.items.splice(i, 1);
      if (it.k === 'OK'){
        G.st.aiPosted++; addScore(15 * A.mult, it.x + CW / 2, L.line - 10, KIND.OK.col, 'AI ✓');
        burst(it.x + CW / 2, L.line - 10, 8, KIND.OK.col, true);
      } else if (it.k === 'ERR'){
        G.st.missedErr++; addScore(-150, it.x + CW / 2, L.line - 12, '#ff5d73', 'MISSTATEMENT −150');
        V.glitch = .35; V.shake = .3; AU.sfx('misstate'); burst(it.x + CW / 2, L.line, 16, '#ff5d73', false);
      } else {
        G.st.missed++; G.st.actMissed[G.act]++; V.shake = .25; G.lineFlash = .5;
        G.fx.push({x:it.x + CW / 2, y:L.line - 12, txt:'MISSED', col:'#ff5d73', life:.8});
        AU.sfx('late'); burst(it.x + CW / 2, L.line, 10, '#ff5d73', false);
        if (it.tut) G.tutDone = true;
      }
    }
    // Automate: bot posts routine entries
    if (up.auto){
      G.bot += 1.5 * dt;
      while (G.bot >= 1){
        let best = null; for (const it of G.items) if (it.k === 'R' && it.y > L.top - 10 && (!best || it.y > best.y)) best = it;
        if (!best){ G.bot = 1; break; }
        G.bot--; G.st.bot++; addScore(5 * A.mult, best.x + CW / 2, best.y, '#4fe0a0', 'BOT +' + 5 * A.mult);
        burst(best.x + CW / 2, best.y + CH / 2, 6, '#4fe0a0', true); AU.sfx('bot'); remove(best);
      }
    }
    for (let i = G.fx.length - 1; i >= 0; i--){ const f = G.fx[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) G.fx.splice(i, 1); }
    G.lineFlash = Math.max(0, G.lineFlash - dt);

    if (G.el >= A.dur) actDone();
  }

  function drawGame(){
    const A = ACTS[G.act];
    // close line (laser)
    const lf = G.lineFlash || 0;
    g.save(); g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(0, L.line - 18, 0, L.line + 18);
    lg.addColorStop(0, 'rgba(255,60,90,0)'); lg.addColorStop(.5, 'rgba(255,70,100,' + Math.min(1, .35 + lf) + ')'); lg.addColorStop(1, 'rgba(255,60,90,0)');
    g.fillStyle = lg; g.fillRect(0, L.line - 18, W, 36);
    g.fillStyle = 'rgba(255,170,185,' + Math.min(1, .85 + lf * .3) + ')'; g.fillRect(0, L.line - .75, W, 1.5);
    g.restore();
    g.fillStyle = 'rgba(255,120,140,.75)'; g.font = '600 10px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText('P E R I O D - E N D   C L O S E', W / 2, L.line + 22);

    for (const it of G.items){
      g.drawImage(sprite(it), it.x - PAD, it.y - PAD, CW + PAD * 2, CH + PAD * 2);
      if (it.tut){
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

    // act intro title
    if (G.el < 0){
      const k = G.el + 2.6, a = clamp(Math.min(k * 2, -G.el * 2), 0, 1);
      g.globalAlpha = a; g.textAlign = 'center';
      g.fillStyle = '#5fd6f5'; g.font = '600 13px "IBM Plex Mono", monospace'; g.fillText(A.n.split('').join(' '), W / 2, H * .36);
      g.shadowColor = 'rgba(95,214,245,.8)'; g.shadowBlur = 24; g.fillStyle = '#ffffff';
      g.font = '800 ' + Math.round(Math.min(64, W * .14)) + 'px "Sora", sans-serif'; g.fillText(A.name, W / 2, H * .36 + 58);
      g.shadowBlur = 0; g.fillStyle = '#c9d2ff'; g.font = '500 14px "IBM Plex Sans", sans-serif';
      wrapText(A.rule, W / 2, H * .36 + 92, Math.min(W - 40, 380), 20);
      g.fillStyle = '#5fd6f5'; g.font = '600 15px "IBM Plex Mono", monospace'; g.fillText(String(Math.ceil(-G.el)), W / 2, H * .36 + 150);
      g.globalAlpha = 1;
    }
  }
  function wrapText(t, x, y, mw, lh){
    const words = t.split(' '); let line = '';
    for (const w of words){ const test = line ? line + ' ' + w : w; if (g.measureText(test).width > mw && line){ g.fillText(line, x, y); line = w; y += lh; } else line = test; }
    if (line) g.fillText(line, x, y);
  }

  let hudCache = {};
  function hud(force){
    if (force) hudCache = {};
    const A = ACTS[G.act], s = G.st;
    if (hudCache.score !== G.score){ hudCache.score = G.score; $('h-score').textContent = fmt(G.score); }
    $('h-time').style.transform = 'scaleX(' + clamp(1 - Math.max(0, G.el) / A.dur, 0, 1) + ')';
    let html;
    if (G.act < 2) html = '<span>Posted <b>' + s.actPosted[G.act] + '</b></span><span class="' + (s.actMissed[G.act] ? 'bad' : '') + '">Missed <b>' + s.actMissed[G.act] + '</b></span>' + (G.up.auto ? '<span class="good">Bot <b>' + s.bot + '</b></span>' : '');
    else html = '<span class="good">AI posted <b>' + fmt(s.stream + s.aiPosted) + '</b></span><span>Caught <b>' + s.caught + '</b></span><span class="' + (s.missedErr ? 'bad' : '') + '">Errors <b>' + s.missedErr + '</b></span>';
    if (hudCache.stats !== html){ hudCache.stats = html; $('h-stats').innerHTML = html; }
  }

  /* ---------- input ---------- */
  cv.addEventListener('pointerdown', e => {
    if (!G || !G.playing || G.paused || G.el < 0) return;
    e.preventDefault();
    const px = e.clientX, py = e.clientY, pad = 12; let best = null;
    for (const it of G.items) if (px >= it.x - pad && px <= it.x + CW + pad && py >= it.y - pad && py <= it.y + CH + pad && (!best || it.y > best.y)) best = it;
    if (!best) return;
    const cx = best.x + CW / 2;
    if (best.k === 'ERR'){
      G.st.caught++; addScore(120, cx, best.y, '#4fe0a0', 'CAUGHT +120'); AU.sfx('caught');
      burst(cx, best.y + CH / 2, 16, '#4fe0a0', false); remove(best); return;
    }
    if (best.k === 'OK'){
      G.st.falseRej++; addScore(-40, cx, best.y, '#ffb84d', 'REWORK −40'); AU.sfx('reject');
      burst(cx, best.y + CH / 2, 8, '#ffb84d', false); remove(best); return;
    }
    best.taps--; best.hit = .12;
    if (best.taps <= 0) postManual(best); else AU.sfx('tap');
  });

  /* ---------- pause ---------- */
  function pause(){ if (!G || !G.playing || G.paused) return; G.paused = true; $('pausebox').hidden = false; if (!AU.el.paused) AU.el.pause(); }
  function resume(){ if (!G || !G.paused) return; G.paused = false; $('pausebox').hidden = true; if (AU.on) AU.start(); }
  $('pause').addEventListener('click', pause);
  $('resume').addEventListener('click', resume);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('keydown', e => { if ((e.key === 'Escape' || e.key === 'p') && G && G.playing) G.paused ? resume() : pause(); });

  /* ================= main loop ================= */
  function frame(now){
    const dt = clamp((now - last) / 1000 || 0, 0, .05); last = now;
    V.t += dt;
    // ease the scene toward its target
    const k = 1 - Math.pow(.02, dt);
    for (const p of ['y', 'r', 'a', 'i']) V.cur[p] = lerp(V.cur[p], V.tgt[p], k);
    if (V.beam > 0 && V.beam < 1){ V.beam = Math.min(1, V.beam + dt / 1.1); if (V.beam >= 1){ V.flash = 1; AU.sfx('impact'); } }
    V.flash = Math.max(0, V.flash - dt * 1.4); V.shake = Math.max(0, V.shake - dt); V.glitch = Math.max(0, V.glitch - dt);

    if (G && G.playing && !G.paused) update(dt);

    const sh = V.shake > 0 && !reduced;
    g.save(); if (sh) g.translate(rand(-1, 1) * V.shake * 14, rand(-1, 1) * V.shake * 14);
    drawBackground(dt); drawWafer(); drawBeam(); drawParticles(dt);
    if (G && G.playing) drawGame();
    g.restore();
    if (V.flash > 0){ g.fillStyle = 'rgba(200,235,255,' + V.flash * .5 + ')'; g.fillRect(0, 0, W, H); }
    if (V.glitch > 0 && !reduced){
      for (let i = 0; i < 6; i++){ const y = Math.random() * H, h = rand(4, 20);
        g.drawImage(cv, 0, y * DPR, W * DPR, h * DPR, rand(-18, 18), y, W, h); }
      g.fillStyle = 'rgba(255,60,90,' + V.glitch * .25 + ')'; g.fillRect(0, 0, W, H);
    }
    if (G && G.playing) hud();
    raf = requestAnimationFrame(frame);
  }

  /* ================= screens & panels ================= */
  function show(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    const s = $(id); if (s && s.scrollTo) s.scrollTo(0, 0);
  }
  function panel(build){
    const p = $('panel'); p.textContent = ''; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
    build(p); show('s-panel');
  }
  function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function statGrid(items){ const d = el('div', 'stats'); items.forEach(([v, l, c]) => { const x = el('div', c || ''); x.append(el('b', '', String(v)), el('span', '', l)); d.appendChild(x); }); return d; }
  function button(txt, fn, cls){ const b = el('button', 'btn ' + (cls || 'primary'), '<span>' + txt + '</span>'); b.type = 'button'; b.addEventListener('click', fn); return b; }

  function actDone(){
    G.playing = false; const i = G.act, s = G.st;
    const clean = s.actMissed[i] === 0 && i < 2;
    if (clean){ G.score += 250 * ACTS[i].mult; G.actScore[i] += 250 * ACTS[i].mult; }
    G.items = []; V.streaks.length = 0;
    setScene(.62, .92, .8, .55); AU.mood(1200, .7);
    if (i === 0) panelAfter1(clean);
    else if (i === 1) panelAfter2(clean);
    else finish();
  }

  function panelAfter1(clean){
    const s = G.st;
    panel(p => {
      p.append(el('div', 'eyebrow', 'Act 1 closed' + (clean ? ' · clean close bonus' : '')),
        el('h2', '', 'Volume tripled.<br><em>The team didn’t.</em>'),
        statGrid([[s.actPosted[0], 'entries posted by hand'], [s.actMissed[0], 'missed the close', s.actMissed[0] ? 'bad' : 'good'], [fmt(G.actScore[0]), 'points']]),
        el('p', '', 'In 40 seconds the volume grew from one entry a second to more than three. That is the trend we face: you cannot close it by adding people.'),
        el('p', '', '<b>First, fix the process.</b> ESSA: eliminate, simplify, standardize, automate. Pick the two improvements you want for Act 2.'),
        button('Choose your ESSA improvements', panelEssa));
    });
  }
  function panelEssa(){
    const chosen = new Set();
    panel(p => {
      const go = button('Pick 2 improvements', () => { ESSA.forEach(x => { G.up[x.k] = chosen.has(x.k); }); startAct(1); });
      go.disabled = true;
      const list = el('div', 'picks');
      ESSA.forEach(x => {
        const b = el('button', 'pick'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.append(el('span', 'L', x.L), el('strong', '', x.name), el('span', '', x.d));
        b.addEventListener('click', () => {
          if (chosen.has(x.k)) chosen.delete(x.k); else if (chosen.size < 2) chosen.add(x.k); else return;
          AU.sfx('pick');
          list.querySelectorAll('.pick').forEach((pb, j) => { const on = chosen.has(ESSA[j].k); pb.setAttribute('aria-pressed', on); pb.disabled = !on && chosen.size >= 2; });
          go.disabled = chosen.size !== 2; go.querySelector('span').textContent = chosen.size === 2 ? 'Start Act 2' : 'Pick ' + (2 - chosen.size) + ' more';
        });
        list.appendChild(b);
      });
      p.append(el('div', 'eyebrow', 'ESSA'), el('h2', '', 'Fix the process <em>before</em> you speed it up.'), list, go);
    });
  }
  function panelAfter2(clean){
    const s = G.st;
    panel(p => {
      p.append(el('div', 'eyebrow', 'Act 2 closed' + (clean ? ' · clean close bonus' : '')),
        el('h2', '', 'ESSA bought you time.<br><em>Volume keeps growing.</em>'),
        statGrid([[s.actPosted[1], 'posted by hand'], [s.bot, 'posted by the bot', 'good'], [s.actMissed[1], 'missed the close', s.actMissed[1] ? 'bad' : 'good']]),
        el('p', '', 'A better process helps, but the volume will grow several times over in the coming years. The next step: work <b>AI-native</b>. AI does the volume, you direct it and check its work.'),
        el('p', '', 'How well the AI performs depends on how well you instruct it. Two quick questions: every right answer makes the AI more accurate in Act 3.'),
        button('Upskill: 2 questions', () => quiz(0)));
    });
  }
  let quizSet = [];
  function quiz(n){
    if (n === 0){ const pool = QUESTIONS.slice(); quizSet = []; while (quizSet.length < 2) quizSet.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); G.correct = 0; }
    const Q = quizSet[n];
    panel(p => {
      const dots = el('div', 'dots'); for (let i = 0; i < 2; i++) dots.appendChild(el('i', i <= n ? 'on' : ''));
      const opts = el('div', 'opts'), after = el('div', '');
      after.style.display = 'flex'; after.style.flexDirection = 'column'; after.style.gap = '14px';
      Q.o.forEach((t, j) => {
        const b = el('button', 'opt'); b.type = 'button'; b.textContent = t;
        b.addEventListener('click', () => {
          const ok = j === Q.a; if (ok) G.correct++;
          AU.sfx(ok ? 'right' : 'wrong');
          opts.querySelectorAll('.opt').forEach((ob, k) => { ob.disabled = true; if (k === Q.a) ob.classList.add('right'); else if (k === j) ob.classList.add('wrong'); });
          after.append(el('p', 'tip', (ok ? '<b>Right.</b> ' : '<b>Not quite.</b> ') + Q.tip),
            button(n === 0 ? 'Next question' : 'See your AI precision', () => n === 0 ? quiz(1) : panelAct3()));
        });
        opts.appendChild(b);
      });
      p.append(el('div', 'eyebrow', 'Upskill · question ' + (n + 1) + ' of 2'), dots, el('p', 'q', Q.q), opts, after);
    });
  }
  function panelAct3(){
    const prec = [62, 70, 78][G.correct];
    panel(p => {
      const lg = el('div', 'legend');
      [['#a78bfa', 'Complex deal', 'Revenue split · €4.1M', 'Still needs a person. Tap it to post (' + (G.up.simp ? 2 : 3) + ' taps).'],
       ['#4fe0a0', 'AI draft · Accrual', '96% confident', 'Correct. Leave it: the AI posts it at the line.'],
       ['#ffb84d', 'AI draft · Reclass', '58% · VAT code? ⚠', 'An AI error. Tap it to send it back before it is posted.']].forEach(([c, a, b, d]) => {
        const r = el('div', 'row'), m = el('div', 'mini'); m.style.setProperty('--c', c); m.append(el('b', '', a), el('small', '', b)); r.append(m, el('p', '', d)); lg.appendChild(r);
      });
      p.append(el('div', 'eyebrow', 'You answered ' + G.correct + ' of 2 right · AI precision ' + prec + '%'),
        el('h2', '', 'Act 3: <em>AI-native.</em> You direct, AI executes.'),
        el('p', '', 'Thousands of routine entries are now posted by AI. Your job changes: handle what needs judgement, and check the AI’s work. A missed AI error costs you <b>150</b> points; rejecting a correct draft costs <b>40</b>.'),
        lg, button('Start Act 3', () => startAct(2)));
    });
  }

  /* ================= end & leaderboard ================= */
  function finish(){
    const s = G.st, ms = s.manualMs, avg = ms.length >= 30 ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null;
    const review = Math.max(0, s.caught - s.falseRej);
    const posted = s.posted + s.bot + s.aiPosted + s.stream;
    const run = {p_player:PLAYER, p_name:G.name, p_mode:CFG.mode, p_score:Math.round(G.score), p_version:CFG.version,
      p_stats:{duration_ms:Math.round(G.playMs), posted, manual:s.posted, bot:s.bot, ai_posted:s.aiPosted, stream:s.stream, missed:s.missed,
        caught:s.caught, missed_err:s.missedErr, false_rej:s.falseRej, review, avg_ms:avg, quiz:G.correct, essa:Object.keys(G.up).filter(k => G.up[k]).join(',')}};
    store.set('best', Math.max(store.get('best', 0), run.p_score));
    AU.sfx('end'); AU.mood(3200, .7); setScene(.7, 1, 1, .8);

    $('e-eyebrow').textContent = G.name + ' · season 2026';
    $('e-title').textContent = s.missedErr === 0 && s.missed === 0 ? 'Flawless close.' : 'Books closed.';
    const bd = $('e-breakdown'); bd.textContent = '';
    ACTS.forEach((A, i) => { const d = el('div'); d.append(el('b', '', fmt(G.actScore[i])), el('span', '', 'Act ' + (i + 1) + ' · ' + A.name)); bd.appendChild(d); });
    const rk = $('e-ranks'); rk.textContent = '';
    [['score', '🏆 Score', fmt(run.p_score)], ['speed', '⚡ Fastest', avg ? (avg / 1000).toFixed(2) + ' s' : 'needs 30 posts'], ['review', '🔍 Reviewer', review + ' net']].forEach(([c, t, v]) => {
      const d = el('div'); d.dataset.cat = c; d.append(el('small', '', t), el('b', '', '–'), el('span', '', v)); rk.appendChild(d); });
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
      if (r && r.ok){ st.textContent = 'Score saved on the leaderboard.'; }
      else if (r && r.reason === 'season_closed'){ st.textContent = 'The season has closed: this score is not on the leaderboard.'; }
      else if (r && r.reason === 'too_fast'){ st.textContent = 'Saved too quickly after your last game. Play again in a moment.'; }
      else { st.textContent = 'This score could not be saved (' + ((r && r.reason) || 'unknown') + ').'; }
    } catch(e){
      const q = store.get('pending', []); q.push(run); store.set('pending', q.slice(-5));
      st.textContent = 'The leaderboard is offline. Your score is kept on this device and sent next time.';
    }
    loadRanks(); loadBoard('end');
  }
  async function flushPending(){
    const q = store.get('pending', []); if (!q.length) return;
    const left = [];
    for (const run of q){ try { await api.submit(run); } catch(e){ left.push(run); } }
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
  async function loadSeason(){
    try {
      const s = await api.season(), end = new Date(s.season_end), days = Math.ceil((end - Date.now()) / 864e5);
      const date = end.toLocaleDateString('en-GB', {day:'numeric', month:'long'});
      $('season-left').textContent = days > 0 ? 'Closes in ' + days + ' day' + (days === 1 ? '' : 's') : 'Season closed';
      $('e-season').textContent = days > 0
        ? 'The leaderboard closes on ' + date + '. The winners of all three categories are announced at the AI event in January. Play as often as you like: only your best counts.'
        : 'The season has closed. The winners are announced at the AI event in January.';
    } catch(e){ $('e-season').textContent = 'The winners of all three categories are announced at the AI event in January.'; }
  }

  /* ================= start ================= */
  function startGame(){
    const name = $('name').value.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!name){ show('s-home'); $('err').textContent = 'Enter your name so we can find you on the leaderboard.'; $('name').focus(); return; }
    $('err').textContent = ''; store.set('name', name);
    AU.start(); newGame(name); startAct(0);
  }
  $('f-start').addEventListener('submit', e => { e.preventDefault(); startGame(); });
  $('again').addEventListener('click', startGame);
  $('home').addEventListener('click', () => { G = null; show('s-home'); setScene(.5, .9, 1, .55); AU.mood(700, .75); loadBoard('home'); });
  $('name').value = store.get('name', '');

  resize(); setScene(.5, .9, 1, .55); V.cur = {...V.tgt};
  V.beam = reduced ? 1 : .001;
  last = performance.now(); raf = requestAnimationFrame(frame);
  loadBoard('home'); loadSeason(); flushPending();
  window.CTB = {state:() => G, view:V};
})();
