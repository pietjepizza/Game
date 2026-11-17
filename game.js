/* Close the Books: Extended
   Plain JavaScript, no build step, no external libraries. Everything (sound included) is generated in the browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= storage ================= */
  const store = {
    get(k, d){ try { const v = localStorage.getItem('ctbx-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
    set(k, v){ try { localStorage.setItem('ctbx-' + k, JSON.stringify(v)); } catch(e){} }
  };

  /* ================= random ================= */
  function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let rng = Math.random;
  const pick = a => a[Math.floor(rng() * a.length)];
  function weighted(w){ let sum = 0; for (const k in w) sum += w[k]; let r = rng() * sum; for (const k in w){ r -= w[k]; if (r <= 0) return k; } return Object.keys(w)[0]; }
  const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

  /* ================= content ================= */
  const TYPES = {
    je: {label:'Manual JE', subs:['journal entry','accrual','reclass','prepayment'], pts:10, col:'#1e3fd8', guide:'Routine manual journal entry.', how:'1 tap'},
    cx: {label:'Complex transaction', subs:['deferred to acceptance','multi-element deal','FAT not proven'], pts:30, col:'#9b6cf0', guide:'Revenue deferred to site acceptance and similar.', how:'3 taps'},
    nb: {label:'New business flow', subs:['module delivery','upgrade package','no standard yet'], pts:20, col:'#f08a3c', guide:'New delivery models. Drifts sideways until standardized.', how:'2 taps'},
    fx: {label:'Correction', vars:[['IC revenue reversal','intercompany'],['Consolidation error','elimination mismatch'],['Reclass to fixed asset','booked as inventory']], pts:20, col:'#e0559f', guide:'Something posted wrong earlier, now fix it.', how:'2 taps'},
    uq: {label:'Treatment unclear', subs:['awaiting guidance'], pts:40, col:'#8d98c9', guide:'Locked until the decision lands, late in the fall. Then post fast.', how:'wait, 2 taps'},
    ic: {label:'Intercompany', subs:['match the partner'], pts:25, col:'#2bb3ff', guide:'Comes in linked pairs. Tap one, then its partner within 3 seconds.', how:'pair, 1 + 1'},
    un: {label:'Unstructured case', subs:['contract','email thread','side letter'], pts:50, col:'#0fa3a3', guide:'Contracts, emails, one-offs. Only AI makes these easier.', how:'4 taps'},
    au: {label:'Audit request', subs:['hold to respond'], pts:60, col:'#e6a100', guide:'Press and hold until the ring closes. Missing one counts double.', how:'hold'},
    ur: {label:'Urgent: CFO ask', subs:['needed before the call','board deck number'], pts:45, col:'#ff3d7f', guide:'Falls almost twice as fast.', how:'1 tap, fast'},
    dup:{label:'Duplicate?', subs:['same amount, same day','already posted'], pts:0, col:'#ff6b5e', guide:'Do NOT post it. Let it fall: it is rejected at the close line for a small bonus.', how:'don’t tap', trap:true}
  };
  const GUIDE_ORDER = ['je','cx','nb','fx','uq','ic','un','au','ur','dup'];

  const YEARS = [
    {y:2026, dur:30, rate:1.25, fall:4.4, w:{je:62, cx:20, fx:18}, fresh:['je','cx','fx'],
      short:'Volume up, team flat', hint:'Tap slips to post them before the red line',
      news:'Net sales are expected to grow strongly. The close has to keep up.', events:[{at:15, k:'crunch'}]},
    {y:2027, dur:30, rate:1.6, fall:4.0, w:{je:40, cx:18, nb:20, fx:14, uq:8}, fresh:['nb','uq'],
      short:'Capacity plan: +30%', hint:'New: fast shipments and unclear treatments',
      news:'About 30% more production capacity is planned. Every extra system means more entries, and systems now ship before the factory test.',
      events:[{at:7, k:'wave'}, {at:18, k:'wave'}, {at:24, k:'crunch'}]},
    {y:2028, dur:30, rate:1.95, fall:3.7, w:{je:34, cx:15, nb:16, fx:11, uq:8, ic:10, dup:6}, fresh:['ic','dup','au'],
      short:'Audit season, new legal entities', hint:'New: intercompany pairs, duplicates, audit requests',
      news:'Two new legal entities go live and the external auditor moves to continuous auditing. Expect requests mid-close.',
      events:[{at:5, k:'audit'}, {at:12, k:'wave'}, {at:16, k:'audit'}, {at:25, k:'audit'}]},
    {y:2029, dur:30, rate:2.4, fall:3.35, w:{je:30, cx:14, nb:14, fx:10, uq:7, ic:10, dup:6, un:9}, fresh:['un','ur'],
      short:'Flow factory opens', hint:'New: unstructured cases and urgent CFO asks',
      news:'A new flow factory changes how modules are built and installed. Contracts and side letters multiply, and the CFO wants numbers faster.',
      events:[{at:6, k:'urgent'}, {at:11, k:'wave'}, {at:17, k:'audit'}, {at:22, k:'urgent'}, {at:26, k:'crunch'}]},
    {y:2030, dur:34, rate:2.9, fall:3.05, w:{je:28, cx:13, nb:13, fx:10, uq:7, ic:10, dup:7, un:12}, fresh:[], ramp:1.2,
      short:'The 2030 scenario', hint:'System cutover mid-close. Hold on.',
      news:'The 2030 scenario: much higher revenue in a chip market above $1 trillion. Halfway through the close, the ERP cutover takes the bots offline.',
      events:[{at:5, k:'wave'}, {at:10, k:'audit'}, {at:14, k:'cutover'}, {at:20, k:'urgent'}, {at:24, k:'audit'}, {at:28, k:'wave'}]}
  ];

  const UPS = [
    {k:'elim', g:'ESSA', name:'Eliminate', max:3, d:['20% of entries disappear for good','35% of entries disappear for good','50% of entries disappear for good']},
    {k:'simp', g:'ESSA', name:'Simplify', max:2, d:['Complex transactions need 2 taps, not 3','Complex transactions need 1 tap']},
    {k:'std',  g:'ESSA', name:'Standardize', max:2, d:['New business flows stop drifting sideways','New business flows need 1 tap, not 2']},
    {k:'auto', g:'ESSA', name:'Automate', max:4, d:['A bot posts 1 one-tap entry per second','The bot posts 2 per second','The bot posts 3 per second','The bot posts 4 per second']},
    {k:'team', g:'People', name:'Cross-training', max:2, d:['Late limit rises by 2','Late limit rises by 2 more']},
    {k:'deep', g:'People', name:'Deep work', max:2, d:['Focus charges 35% faster','Overtime lasts 9 s instead of 6 s']},
    {k:'match',g:'AI', from:2, name:'Smart matching', max:1, d:['Tap one intercompany slip and both post. Bots can match too.']},
    {k:'dupd', g:'AI', from:2, name:'Duplicate detection', max:1, d:['Duplicates are rejected automatically']},
    {k:'copi', g:'AI', from:2, name:'Copilot', max:1, d:['Unlocks Copilot: posts every open slip that needs 2 taps or fewer']},
    {k:'agent',g:'AI', from:3, name:'AI agent', max:2, d:['Unstructured cases need 2 taps, not 4','The agent also closes one unstructured case every 2.5 s']}
  ];
  const ELIM = [0, .2, .35, .5], BOT = [0, 1, 2, 3, 4];

  const DIFF = {easy:{rate:.8, fall:1.18, late:2, mult:.75, name:'Easy'}, normal:{rate:1, fall:1, late:0, mult:1, name:'Normal'}, hard:{rate:1.2, fall:.88, late:-2, mult:1.5, name:'Hard'}};

  const MODS = [
    {k:'audit', name:'Audit week', d:'Audit requests come twice as often.'},
    {k:'nobot', name:'Bots on strike', d:'No automation today, whatever you own.'},
    {k:'fast',  name:'Hard deadline', d:'Everything falls 20% faster.'},
    {k:'dups',  name:'Duplicate storm', d:'Three times as many duplicates.'},
    {k:'flow',  name:'Flow state', d:'Combo builds twice as fast.'},
    {k:'ic',    name:'Reorg day', d:'Intercompany everywhere.'}
  ];

  const ACH = [
    ['first','First close','Close 2026 in the campaign'],
    ['clean','Clean close','Finish a campaign year with zero late entries'],
    ['c25','In the flow','Reach a 25 combo'],
    ['c50','Unstoppable','Reach a 50 combo'],
    ['essa','Full ESSA','Max out Eliminate, Simplify, Standardize and Automate in one run'],
    ['y2030','2030 closed','Survive the full campaign'],
    ['stars','Flawless','Get 3 stars in every campaign year'],
    ['hard','Hard close','Survive the campaign on Hard'],
    ['audit','Audit ready','Respond to 5 audit requests in one run'],
    ['dup','Eagle eye','Let 10 duplicates pass in one run without posting one'],
    ['ic','Matchmaker','Match 15 intercompany pairs in one run'],
    ['q4','Going concern','Survive 4 quarters in Endless'],
    ['q8','Perpetual close','Survive 8 quarters in Endless'],
    ['daily','Daily driver','Finish a Daily Close'],
    ['k1','Volume','Post 1,000 entries in total'],
    ['ot','Burning the midnight oil','Use Overtime 10 times in one run']
  ];

  const C = {ink:'#0b1a6e', rule:'#1c309f', paper:'#ffffff', red:'#ff6b5e', green:'#4fe0a0', gold:'#5fd6f5', muted:'#b3bef0', amber:'#ffc23d'};

  /* ================= sound (all synthesised) ================= */
  function silentWav(){
    const n = 2205, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 22050, true); dv.setUint32(28, 22050, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
    return URL.createObjectURL(new Blob([b], {type:'audio/wav'}));
  }
  const AU = {
    ctx:null, out:null, mus:null, nz:null, el:null, on:true, timer:0, step:0, next:0, bpm:112,
    init(){ try {
        if (!this.ctx){ const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
          this.ctx = new A(); this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination);
          this.mus = this.ctx.createGain(); this.mus.gain.value = .8; this.mus.connect(this.out);
          const b = this.ctx.createBuffer(1, this.ctx.sampleRate * .2, this.ctx.sampleRate), d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.nz = b; }
        this.out.gain.value = this.on ? .8 : 0; this.ctx.resume();
        if (!this.el){ this.el = new Audio(silentWav()); this.el.loop = true; this.el.setAttribute('playsinline', ''); }
        if (this.on){ const pr = this.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } catch(e){} },
    tone(f, d, type, v, at, to, dest){ if (!this.ctx || !this.on) return; try {
        const t = at || this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
        g.gain.setValueAtTime(v || .15, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g); g.connect(dest || this.out); o.start(t); o.stop(t + d + .02);
      } catch(e){} },
    bell(t, v){ if (!this.ctx || !this.on) return; try {
        const n = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        n.buffer = this.nz; f.type = 'highpass'; f.frequency.value = 6500;
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
        n.connect(f); f.connect(g); g.connect(this.mus); n.start(t); n.stop(t + .12);
      } catch(e){} },
    seq(notes, gap, type, v){ if (!this.ctx) return; const t = this.ctx.currentTime; notes.forEach((f, i) => this.tone(f, gap * 1.8, type, v, t + i * gap)); },
    sfx(k){ const t = this;
      switch (k){
        case 'tap': t.tone(520, .05, 'square', .06); break;
        case 'post': t.seq([660, 990], .06, 'triangle', .14); break;
        case 'bot': t.tone(1320, .05, 'sine', .05); break;
        case 'late': t.tone(150, .28, 'sawtooth', .16, 0, 60); break;
        case 'lock': t.tone(190, .09, 'square', .06); break;
        case 'open': t.seq([880, 1175], .07, 'square', .07); break;
        case 'wave': t.seq([880, 660, 880, 660], .13, 'square', .08); break;
        case 'buy': t.seq([784, 1175], .08, 'triangle', .14); break;
        case 'year': t.seq([523, 659, 784, 1047], .11, 'triangle', .16); break;
        case 'over': t.seq([392, 330, 262, 196], .2, 'sawtooth', .12); break;
        case 'tbc': t.seq([330, 330, 330, 262], .28, 'triangle', .16); break;
        case 'bad': t.seq([300, 200], .1, 'sawtooth', .14); break;
        case 'link': t.tone(990, .08, 'triangle', .1); break;
        case 'audit': t.seq([523, 784, 1047, 1568], .07, 'triangle', .15); break;
        case 'hold': t.tone(440 + Math.random() * 40, .04, 'sine', .04); break;
        case 'ability': t.seq([392, 523, 659, 784, 1047], .05, 'square', .09); break;
        case 'combo': t.seq([1047, 1319, 1568], .05, 'triangle', .1); break;
        case 'ach': t.seq([784, 988, 1175, 1568], .09, 'triangle', .13); break;
        case 'alarm': t.seq([440, 330, 440, 330, 440], .12, 'square', .09); break;
      } },
    LEAD:[76,79,84,79, 76,79,81,79, 74,77,81,77, 72,76,79,76], BASS:[45,0,0,45, 0,0,52,0, 41,0,0,41, 43,0,0,47],
    hz(m){ return 440 * Math.pow(2, (m - 69) / 12); },
    music(bpm){ this.stop(); if (!this.ctx) return; this.bpm = bpm; this.step = 0; this.next = this.ctx.currentTime + .1;
      this.timer = setInterval(() => { if (!this.ctx) return; const sp = 30 / this.bpm;
        while (this.next < this.ctx.currentTime + .15){ const i = this.step % 16;
          this.tone(this.hz(this.LEAD[i]), sp * .95, 'triangle', .17, this.next, 0, this.mus);
          if (this.BASS[i]) this.tone(this.hz(this.BASS[i] + 12), sp * 2.6, 'triangle', .2, this.next, 0, this.mus);
          this.bell(this.next, i % 2 ? .05 : .11);
          this.next += sp; this.step++; } }, 50); },
    stop(){ clearInterval(this.timer); this.timer = 0; },
    toggle(){ this.on = !this.on; if (this.out) this.out.gain.value = this.on ? .8 : 0;
      if (this.el){ if (this.on){ const pr = this.el.play(); if (pr && pr.catch) pr.catch(() => {}); } else this.el.pause(); }
      store.set('snd', this.on); return this.on; }
  };
  AU.on = store.get('snd', true);
  $('snd').setAttribute('aria-pressed', AU.on);
  $('snd').addEventListener('click', () => { AU.init(); $('snd').setAttribute('aria-pressed', AU.toggle()); });

  /* ================= profile: scores, achievements, stats ================= */
  const prof = {
    scores: store.get('scores', {campaign:[], endless:[], daily:[]}),
    ach: store.get('ach', {}),
    stats: store.get('stats', {runs:0, posted:0, combo:0, played:0}),
    daily: store.get('daily', {}),
    save(){ store.set('scores', this.scores); store.set('ach', this.ach); store.set('stats', this.stats); store.set('daily', this.daily); }
  };
  ['campaign','endless','daily'].forEach(m => { if (!Array.isArray(prof.scores[m])) prof.scores[m] = []; });

  let toastQ = [], toastBusy = false;
  function toast(title, sub){
    toastQ.push([title, sub]); if (toastBusy) return;
    const nextT = () => { const n = toastQ.shift(); if (!n){ toastBusy = false; return; } toastBusy = true;
      const el = $('toast'); el.textContent = n[0]; if (n[1]){ const s = document.createElement('small'); s.textContent = n[1]; el.appendChild(s); }
      el.classList.add('on'); setTimeout(() => { el.classList.remove('on'); setTimeout(nextT, 400); }, 2400); };
    nextT();
  }
  function unlock(k){
    if (prof.ach[k]) return; const a = ACH.find(x => x[0] === k); if (!a) return;
    prof.ach[k] = Date.now(); prof.save(); if (S) S.newAch.push(k);
    AU.sfx('ach'); toast('Achievement: ' + a[1], a[2]);
  }

  /* ================= menus ================= */
  function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); const s = $(id); if (s) s.scrollTop = 0; }
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.go; if (id === 's-ach') renderAch(); if (id === 's-scores') renderScores(); if (id === 's-menu') renderMenu(); show(id); }));

  let diff = store.get('diff', 'normal'); if (!DIFF[diff]) diff = 'normal';
  function renderDiff(){ document.querySelectorAll('#diff button').forEach(b => b.setAttribute('aria-checked', b.dataset.d === diff)); }
  document.querySelectorAll('#diff button').forEach(b => b.addEventListener('click', () => { diff = b.dataset.d; store.set('diff', diff); renderDiff(); }));

  function dailySetup(){
    const seed = todayKey(), r = mulberry(seed), mod = MODS[Math.floor(r() * MODS.length)], up = {};
    const pool = ['elim','simp','std','auto','team','deep','match','dupd','copi'];
    for (let i = 0; i < 3; i++){ const k = pool.splice(Math.floor(r() * pool.length), 1)[0]; up[k] = 1; }
    return {seed, mod, up};
  }
  function upNames(up){ return Object.keys(up).map(k => UPS.find(u => u.k === k).name).join(', '); }
  function renderMenu(){
    const best = m => { const a = prof.scores[m]; return a.length ? a[0].s : 0; };
    $('best-campaign').textContent = best('campaign') ? 'Best: ' + best('campaign').toLocaleString('en') : '';
    $('best-endless').textContent = best('endless') ? 'Best: ' + best('endless').toLocaleString('en') : '';
    const D = dailySetup(), today = prof.daily[D.seed];
    $('daily-desc').textContent = 'Today: ' + D.mod.name + '. ' + D.mod.d + ' You start with ' + upNames(D.up) + '. Same entries for everyone.';
    $('best-daily').textContent = today ? 'Your best today: ' + today.toLocaleString('en') : '';
    $('ach-count').textContent = Object.keys(prof.ach).length + '/' + ACH.length;
    renderDiff();
  }
  function renderLegend(){
    const ul = $('legend'); ul.textContent = '';
    GUIDE_ORDER.forEach(k => { const T = TYPES[k], li = document.createElement('li'); li.style.setProperty('--c', T.col); if (T.trap) li.className = 'trap';
      const d = document.createElement('div'); d.textContent = T.label; const sm = document.createElement('small'); sm.textContent = T.guide; d.appendChild(sm);
      const tp = document.createElement('span'); tp.className = 'taps'; tp.textContent = T.how;
      li.append(d, tp); ul.appendChild(li); });
  }
  function renderAch(){
    const ul = $('achs'); ul.textContent = '';
    ACH.forEach(([k, n, d]) => { const li = document.createElement('li'); if (prof.ach[k]) li.className = 'got';
      const i = document.createElement('i'); i.textContent = prof.ach[k] ? '✓' : '?'; const b = document.createElement('b'); b.textContent = n;
      const s = document.createElement('span'); s.textContent = d; li.append(i, b, s); ul.appendChild(li); });
    const f = $('lifetime'); f.textContent = '';
    [[prof.stats.posted, 'entries posted'], [prof.stats.runs, 'runs played'], [prof.stats.combo, 'best combo']].forEach(([v, l]) => {
      const d = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span'); b.textContent = (v || 0).toLocaleString('en'); s.textContent = l; d.append(b, s); f.appendChild(d); });
  }
  let scoreTab = 'campaign';
  function renderScores(){
    document.querySelectorAll('#score-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.m === scoreTab));
    renderBoard($('board-scores'), scoreTab);
  }
  document.querySelectorAll('#score-tabs button').forEach(b => b.addEventListener('click', () => { scoreTab = b.dataset.m; renderScores(); }));
  function renderBoard(el, mode, meId){
    let a = prof.scores[mode] || [];
    if (mode === 'daily') a = a.filter(e => e.day === todayKey());
    a = a.slice(0, 10); el.textContent = '';
    if (!a.length){ const li = document.createElement('li'); li.style.display = 'block'; li.className = 'muted';
      li.textContent = mode === 'daily' ? 'No Daily Close played today yet.' : 'No scores yet. Set the first one.'; el.appendChild(li); return; }
    a.forEach((e, i) => { const li = document.createElement('li'); if (e.id === meId) li.className = 'me';
      [['rk', (i + 1) + '.'], ['', e.n], ['yr', e.r + (e.d && e.d !== 'normal' ? ' · ' + DIFF[e.d].name : '')], ['sc', e.s.toLocaleString('en')]].forEach(([c, t]) => {
        const s = document.createElement('span'); if (c) s.className = c; s.textContent = t; li.appendChild(s); });
      el.appendChild(li); });
  }

  /* ================= game state ================= */
  const cv = $('cv'), ctx = cv.getContext('2d');
  let DPR = 1, bg = null; const sprites = new Map();
  let W = 0, H = 0, DL = 0, CW = 0, CH = 52, S = null, raf = 0, last = 0, clock = 0;
  const snow = [];

  function resize(){
    const r = cv.getBoundingClientRect(), dpr = DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); DL = H - 42; CW = Math.min(176, W * .46);
    sprites.clear(); paintBg();
    snow.length = 0;
    if (!reduced) for (let i = 0; i < 26; i++) snow.push({x:Math.random() * W, y:Math.random() * H, r:.8 + Math.random() * 1.6, v:10 + Math.random() * 18, p:Math.random() * 6});
    if (S) for (const it of S.items) it.x0 = Math.min(it.x0, W - CW - 8), it.x = Math.min(it.x, W - CW - 6);
  }
  window.addEventListener('resize', () => { if ($('s-game').classList.contains('on')) resize(); });

  function newRun(name, mode){
    const D = DIFF[diff];
    S = {name, mode, diff, yi:0, score:0, posted:0, pts:0, up:{elim:0, simp:0, std:0, auto:0, team:0, deep:0, match:0, dupd:0, copi:0, agent:0},
      items:[], fx:[], parts:[], stars:[], newAch:[], combo:0, bestCombo:0, focus:0, slow:0, otUses:0, quarter:0,
      run:{audit:0, dupPass:0, dupHit:0, ic:0}, id:Date.now() + '-' + Math.random().toString(36).slice(2, 7), playing:false, paused:false, D, mod:null, seen:{}};
    if (mode === 'daily'){ const ds = dailySetup(); S.mod = ds.mod.k; S.modName = ds.mod.name; Object.assign(S.up, ds.up); S.seed = ds.seed; rng = mulberry(ds.seed); }
    else rng = Math.random;
    prof.stats.runs++; prof.save();
  }
  const lateMax = () => Math.max(4, 8 + 2 * S.up.team + S.D.late);
  function tapsFor(t){
    switch (t){
      case 'cx': return 3 - S.up.simp;
      case 'nb': return S.up.std >= 2 ? 1 : 2;
      case 'un': return S.up.agent >= 1 ? 2 : 4;
      case 'fx': case 'uq': return 2;
      default: return 1;
    }
  }
  const comboMult = () => S.combo >= 50 ? 3 : S.combo >= 25 ? 2 : S.combo >= 10 ? 1.5 : 1;
  const stageMult = () => S.mode === 'campaign' ? S.yi + 1 : 1 + S.quarter * .5;

  /* level parameters: campaign uses YEARS, endless & daily ramp per quarter */
  function level(){
    if (S.mode === 'campaign'){
      const Y = YEARS[S.yi], el = Y.dur - S.left;
      let rate = Y.rate; if (Y.ramp) rate *= 1 + el / Y.dur * Y.ramp;
      return {rate, fall:Y.fall, w:Y.w};
    }
    const q = S.elapsed / 30, w = {je:40, cx:18, fx:14};
    if (q >= 1){ w.nb = 16; w.uq = 8; }
    if (q >= 2){ w.ic = 10; w.dup = 6; }
    if (q >= 3){ w.un = 9; }
    if (S.mod === 'dups' && w.dup) w.dup *= 3; else if (S.mod === 'dups') w.dup = 12;
    if (S.mod === 'ic') w.ic = 22;
    return {rate:1.25 + q * .42, fall:Math.max(2.3, 4.4 - q * .3), w};
  }

  function startStage(){
    Object.assign(S, {items:[], fx:[], parts:[], shake:0, acc:.6, bot:0, agentT:0, backlog:S.mode === 'campaign' ? 0 : S.backlog || 0, flash:0, intro:2.6,
      waveQ:0, waveT:0, banner:null, crunch:0, botOff:0, hold:null, evI:0, nextEv:9, playing:true, paused:false});
    hideOverlays();
    if (S.mode === 'campaign'){
      const Y = YEARS[S.yi]; S.left = Y.dur; S.elapsed = 0;
      $('h-year').textContent = Y.y; $('h-vol').textContent = 'Close ' + (S.yi + 1) + '/5 · ×' + stageMult() + ' points';
      S.introTitle = String(Y.y); S.introSub = Y.short; S.introHint = Y.hint;
      AU.music(108 + S.yi * 13);
    } else {
      if (S.elapsed == null){ S.elapsed = 0; S.left = S.mode === 'daily' ? 120 : Infinity; }
      $('h-year').textContent = S.mode === 'daily' ? 'Daily' : 'Q' + (S.quarter + 1);
      $('h-vol').textContent = S.mode === 'daily' ? S.modName : 'Beyond 2030 · ×' + stageMult() + ' points';
      S.introTitle = S.mode === 'daily' ? 'Daily Close' : 'Quarter ' + (S.quarter + 1);
      S.introSub = S.mode === 'daily' ? S.modName : (S.quarter ? 'Volume keeps rising' : 'The volume never stops');
      S.introHint = S.mode === 'daily' ? MODS.find(m => m.k === S.mod).d : 'Survive as many quarter closes as you can';
      AU.music(Math.min(170, 112 + S.quarter * 8));
    }
    if (S.introTitle) S.intro = S.mode !== 'campaign' && S.quarter > 0 ? 1.6 : 2.6;
    updateAbilities(); hud(true); AU.init(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function spawn(force, sp, sub){
    const L = level(); let t = force || weighted(L.w);
    const n = tapsFor(t), T = TYPES[t], v = T.vars ? pick(T.vars) : null, subs = v ? [v[1]] : T.subs;
    if (t === 'ic'){
      const pid = Math.floor(rng() * 1e9), half = (W - 2 * CW) / 3, y = -CH - rng() * 20;
      const xa = Math.max(6, half * .5 + rng() * half * .6), xb = Math.min(W - CW - 6, W - CW - half * .5 - rng() * half * .6);
      const ent = pick(['NL01','US02','KR05','TW03','CN07','DE04']), ent2 = pick(['NL01','US02','KR05','TW03','CN07','DE04'].filter(e => e !== ent));
      const a = mk(t, xa, y, 1, ent + ' → ' + ent2), b = mk(t, xb, y - 10 - rng() * 30, 1, ent2 + ' ← ' + ent);
      a.pair = b; b.pair = a; a.pid = b.pid = pid; S.items.push(a, b); seen(t); return;
    }
    const x = 8 + rng() * Math.max(1, W - CW - 16);
    const it = mk(t, x, -CH, n, sub || pick(subs)); if (v) it.label = v[0]; if (sp) it.sp = sp;
    S.items.push(it); seen(t);
  }
  function mk(t, x, y, taps, sub){
    return {t, x0:x, x, y, taps, ph:rng() * 6.28, hit:0, label:TYPES[t].label, lock:t === 'uq', sp:t === 'ur' ? 1.8 : 1, sub, prog:0, wait:0, born:S.elapsed};
  }
  function seen(t){
    if (S.seen[t]) return; S.seen[t] = 1;
    if (S.mode === 'campaign' && S.yi > 0 && ['nb','uq','ic','dup','un','au','ur'].includes(t))
      banner('NEW: ' + TYPES[t].label + ' · ' + TYPES[t].how, TYPES[t].col, 2.6);
  }
  function banner(txt, col, dur){ S.banner = {txt, col, t:dur || 2.4}; }

  function gain(it, byBot){
    const base = TYPES[it.t].pts, p = Math.round(base * stageMult() * comboMult() * S.D.mult);
    S.score += p; S.posted++; prof.stats.posted++;
    if (!byBot){
      const before = comboMult(); S.combo += S.mod === 'flow' ? 2 : 1; if (S.combo > S.bestCombo) S.bestCombo = S.combo;
      if (comboMult() > before){ AU.sfx('combo'); S.fx.push({x:W / 2, y:DL * .45, txt:'COMBO ×' + comboMult(), life:1.1, col:C.amber, big:1}); }
      if (S.combo >= 25) unlock('c25'); if (S.combo >= 50) unlock('c50');
      S.focus = Math.min(1, S.focus + .055 * (S.up.deep ? 1.35 : 1));
    }
    return p;
  }
  function post(it, byBot, quiet){
    const p = gain(it, byBot);
    S.fx.push({x:it.x + CW / 2, y:it.y + CH / 2, txt:(byBot ? (byBot === true ? 'BOT +' : byBot + ' +') : '+') + p, life:.8, col:byBot ? C.green : C.gold});
    if (!quiet) AU.sfx(byBot ? 'bot' : 'post');
    burst(it.x + CW / 2, it.y + CH / 2, byBot ? 3 : 6, byBot ? C.green : TYPES[it.t].col);
    remove(it);
    if (it.t === 'au'){ S.run.audit++; if (S.run.audit >= 5) unlock('audit'); }
  }
  function burst(x, y, n, col){
    if (reduced) return;
    for (let i = 0; i < n; i++){ const a = Math.random() * 6.28, v = 60 + Math.random() * 140; S.parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 40, life:.5, col}); }
  }
  function remove(it){ const i = S.items.indexOf(it); if (i >= 0) S.items.splice(i, 1); if (S.hold && S.hold.it === it) S.hold = null; }
  function postPair(a, byBot){
    const b = a.pair; a.pair = null; if (b) b.pair = null;
    post(a, byBot, true); if (b && S.items.includes(b)) post(b, byBot, true);
    AU.sfx(byBot ? 'bot' : 'post'); S.run.ic++; if (S.run.ic >= 15) unlock('ic');
  }
  function late(it, n){
    S.backlog += n; S.flash = .35; S.shake = .3; AU.sfx('late');
    S.fx.push({x:it.x + CW / 2, y:DL - 14, txt:n > 1 ? 'LATE ×' + n : 'LATE', life:.7, col:C.red});
    if (S.combo >= 10) S.fx.push({x:W / 2, y:DL * .45, txt:'COMBO LOST', life:.9, col:C.red, big:1});
    S.combo = 0;
  }

  /* ---------- events ---------- */
  function event(k){
    switch (k){
      case 'wave': S.waveQ = 3 + Math.min(4, S.mode === 'campaign' ? S.yi : S.quarter); S.waveT = 0; banner('FAST SHIPMENT · shipped before factory test', '#f08a3c'); AU.sfx('wave'); break;
      case 'audit': spawn('au'); banner('AUDIT REQUEST · press and hold', '#e6a100'); AU.sfx('alarm'); break;
      case 'urgent': spawn('ur'); setTimeout(() => { if (S && S.playing) spawn('ur'); }, 700); banner('CFO ASK · numbers before the call', '#ff3d7f'); AU.sfx('alarm'); break;
      case 'crunch': S.crunch = 4; banner('QUARTER-END CRUNCH · double volume', '#9b6cf0'); AU.sfx('wave'); break;
      case 'cutover': S.botOff = 7; banner('ERP CUTOVER · bots offline for 7 s', C.red); AU.sfx('alarm'); break;
    }
  }
  function randomEvent(){
    const q = S.quarter, pool = ['crunch'];
    if (q >= 1 || S.elapsed > 25) pool.push('wave', 'wave');
    if (q >= 2 || S.elapsed > 50) pool.push('audit', 'audit'); if (S.mod === 'audit') pool.push('audit', 'audit', 'audit', 'audit');
    if (q >= 3 || S.elapsed > 75) pool.push('urgent', 'urgent');
    if (q >= 4 && S.up.auto) pool.push('cutover');
    event(pick(pool));
  }

  /* ---------- update ---------- */
  function update(dt){
    clock += dt; S.intro -= dt; S.flash = Math.max(0, S.flash - dt);
    const slowF = S.slow > 0 ? .45 : 1; S.slow = Math.max(0, S.slow - dt);
    const gdt = dt * slowF;
    S.left -= dt; S.elapsed += dt;
    const L = level(), D = S.D;

    // spawning
    let rate = L.rate * D.rate * (1 - ELIM[S.up.elim]); if (S.crunch > 0){ rate *= 1.9; S.crunch -= dt; }
    S.acc += rate * gdt; while (S.acc >= 1){ spawn(); S.acc--; }
    if (S.waveQ > 0){ S.waveT -= gdt; if (S.waveT <= 0){ spawn('nb', 1.45, 'fast shipment'); S.waveQ--; S.waveT = .24; } }

    // scheduled / random events
    if (S.mode === 'campaign'){ const ev = YEARS[S.yi].events; const el = YEARS[S.yi].dur - S.left;
      while (S.evI < ev.length && el >= ev[S.evI].at) event(ev[S.evI++].k); }
    else { S.nextEv -= dt; if (S.nextEv <= 0){ randomEvent(); S.nextEv = 9 + rng() * 6; } }
    if (S.banner){ S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    // movement
    const vy = DL / (L.fall * D.fall * (S.mod === 'fast' ? .8 : 1));
    for (let i = S.items.length - 1; i >= 0; i--){
      const it = S.items[i]; if (!S.items.includes(it)) continue;
      it.y += vy * (it.t === 'nb' ? 1.15 : it.t === 'au' ? .8 : 1) * it.sp * gdt; it.hit = Math.max(0, it.hit - dt);
      if (it.lock && it.y + CH > DL * .62){ it.lock = false; it.sub = 'decided: post now'; it.hit = .15; AU.sfx('open'); }
      if (it.t === 'nb' && S.up.std < 1) it.x = Math.max(6, Math.min(W - CW - 6, it.x0 + Math.sin(clock * 2.6 + it.ph) * W * .13));
      if (it.wait > 0){ it.wait -= dt; if (it.wait <= 0){ it.sub = it.sub0; it.hit = .1; } }
      if (it.t === 'dup' && S.up.dupd && it.y > DL * .18){ remove(it); S.run.dupPass++; S.fx.push({x:it.x + CW / 2, y:it.y + CH / 2, txt:'AUTO-REJECTED', life:.8, col:C.green}); burst(it.x + CW / 2, it.y + CH / 2, 4, C.green); dupCheck(); continue; }
      if (it.y + CH >= DL){
        remove(it);
        if (it.t === 'dup'){ S.run.dupPass++; S.score += 10; S.fx.push({x:it.x + CW / 2, y:DL - 14, txt:'REJECTED +10', life:.8, col:C.green}); dupCheck(); continue; }
        if (it.pair){ it.pair.pair = null; it.pair.sub = 'partner missing'; it.pair.wait = 0; }
        late(it, it.t === 'au' ? 2 : 1);
      }
    }

    // audit hold
    if (S.hold){ const it = S.hold.it;
      if (!S.items.includes(it)) S.hold = null;
      else { it.prog += dt / .9; if (Math.random() < .3) AU.sfx('hold'); if (it.prog >= 1){ S.hold = null; post(it, false, true); AU.sfx('audit'); } } }

    // bots
    S.botOff = Math.max(0, S.botOff - dt);
    const botRate = S.mod === 'nobot' || S.botOff > 0 ? 0 : BOT[S.up.auto];
    S.bot += botRate * dt;
    while (S.bot >= 1){
      let best = null;
      for (const it of S.items) if (botCan(it) && it.y > 4 && (!best || it.y > best.y)) best = it;
      if (!best){ S.bot = 1; break; }
      if (best.t === 'ic' && best.pair) postPair(best, true); else post(best, true);
      S.bot--;
    }
    if (S.up.agent >= 2 && S.mod !== 'nobot' && S.botOff <= 0){ S.agentT += dt; if (S.agentT >= 2.5){
      let best = null; for (const it of S.items) if (it.t === 'un' && it.y > 4 && (!best || it.y > best.y)) best = it;
      if (best){ post(best, 'AI'); S.agentT = 0; } else S.agentT = 2.5; } }

    // effects
    S.shake = Math.max(0, S.shake - dt);
    for (let i = S.parts.length - 1; i >= 0; i--){ const q = S.parts[i]; q.life -= dt; q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life <= 0) S.parts.splice(i, 1); }
    for (let i = S.fx.length - 1; i >= 0; i--){ const f = S.fx[i]; f.life -= dt; f.y -= (f.big ? 16 : 34) * dt; if (f.life <= 0) S.fx.splice(i, 1); }
    for (const s of snow){ s.y += s.v * dt; s.x += Math.sin(clock + s.p) * 6 * dt; if (s.y > H){ s.y = -4; s.x = Math.random() * W; } }

    // end conditions
    if (S.backlog >= lateMax()) return endRun(false);
    if (S.mode === 'campaign' && S.left <= 0) return yearDone();
    if (S.mode === 'daily' && S.left <= 0) return endRun(true);
    if (S.mode === 'endless' && S.elapsed >= (S.quarter + 1) * 30) return quarterDone();
  }
  function botCan(it){
    if (it.lock || it.t === 'dup' || it.t === 'au' || it.taps !== 1) return false;
    if (it.t === 'ic') return !!S.up.match || !it.pair;
    return true;
  }
  function dupCheck(){ if (S.run.dupPass >= 10 && S.run.dupHit === 0) unlock('dup'); }

  /* ================= drawing ================= */
  function rr(g, x, y, w, h, r){ g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function paintBg(){
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const g = bg.getContext('2d'); g.scale(DPR, DPR);
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    const R = Math.min(W * .62, DL * .46), wx = W / 2, wy = DL * .5;
    g.strokeStyle = C.rule; g.lineWidth = 1;
    g.save(); g.beginPath(); g.arc(wx, wy, R, 0, 6.3); g.clip(); g.beginPath();
    for (let x = wx - R; x <= wx + R; x += 24){ g.moveTo(x, wy - R); g.lineTo(x, wy + R); }
    for (let y = wy - R; y <= wy + R; y += 24){ g.moveTo(wx - R, y); g.lineTo(wx + R, y); }
    g.stroke(); g.restore();
    g.lineWidth = 2; g.beginPath(); g.arc(wx, wy, R, 0, 6.3); g.stroke();
    g.fillStyle = 'rgba(255,107,94,.12)'; g.fillRect(0, DL, W, H - DL);
    g.strokeStyle = C.red; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(0, DL); g.lineTo(W, DL); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.red; g.font = '700 11px "IBM Plex Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('PERIOD-END CLOSE', W / 2, DL + (H - DL) / 2 + 1);
  }
  const PAD = 5;
  function sprite(it){
    const hit = it.hit > 0, waiting = it.wait > 0;
    const key = [it.t, it.label, it.sub, it.taps, it.lock ? 1 : 0, hit ? 1 : 0, waiting ? 1 : 0, it.pair ? 1 : 0].join('|');
    let c = sprites.get(key); if (c) return c;
    if (sprites.size > 400) sprites.clear();
    c = document.createElement('canvas'); c.width = Math.ceil((CW + 2 * PAD) * DPR); c.height = Math.ceil((CH + 2 * PAD) * DPR);
    const g = c.getContext('2d'), T = TYPES[it.t], k = hit ? 3 : 0, col = it.t === 'uq' && !it.lock ? '#ffb400' : T.col;
    g.scale(DPR, DPR); g.translate(PAD, PAD);
    let fill = C.paper; if (it.lock) fill = '#c5cdf0'; else if (hit) fill = '#d9f4ff'; else if (waiting) fill = '#dff3ff'; else if (it.t === 'dup') fill = '#ffe9e7'; else if (it.t === 'au') fill = '#fff6dc';
    g.fillStyle = fill; rr(g, -k, -k, CW + 2 * k, CH + 2 * k, 6); g.fill();
    if (it.t === 'dup'){ g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([5, 4]); rr(g, 1, 1, CW - 2, CH - 2, 5); g.stroke(); g.setLineDash([]); }
    if (waiting){ g.strokeStyle = T.col; g.lineWidth = 3; rr(g, -1, -1, CW + 2, CH + 2, 7); g.stroke(); }
    g.fillStyle = col; rr(g, -k, -k, 7, CH + 2 * k, [6, 0, 0, 6]); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '700 12px "IBM Plex Sans", sans-serif'; g.fillText(it.label, 15, 22, CW - 24);
    g.font = '400 10px "IBM Plex Sans", sans-serif'; g.fillText(it.sub, 15, 38, CW - 30 - Math.min(it.taps, 4) * 13);
    if (it.lock){ g.font = '700 20px "IBM Plex Sans", sans-serif'; g.fillStyle = '#5a66a8'; g.fillText('?', CW - 20, 42); }
    else if (it.t === 'dup'){ g.font = '800 16px "IBM Plex Sans", sans-serif'; g.fillStyle = C.red; g.fillText('✕', CW - 22, 40); }
    else if (it.t === 'au'){ /* progress ring drawn live */ }
    else if (it.t === 'ic' && it.pair){ g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(CW - 22, 35, 5, 0, 6.3); g.stroke(); g.beginPath(); g.arc(CW - 13, 35, 5, 0, 6.3); if (waiting){ g.fillStyle = col; g.fill(); } g.stroke(); }
    else for (let i = 0; i < it.taps; i++){ g.fillStyle = col; g.beginPath(); g.arc(CW - 12 - i * 13, 35, 4.5, 0, 6.3); g.fill(); }
    sprites.set(key, c); return c;
  }
  function draw(){
    const sh = S.shake > 0 && !reduced;
    if (sh){ ctx.save(); ctx.translate((Math.random() - .5) * S.shake * 36, (Math.random() - .5) * S.shake * 36); }
    drawScene(); if (sh) ctx.restore();
  }
  function drawScene(){
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (const s of snow) ctx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
    if (S.slow > 0){ ctx.fillStyle = 'rgba(255,194,61,' + Math.min(.12, S.slow * .05) + ')'; ctx.fillRect(0, 0, W, H); }
    if (S.flash > 0){ ctx.fillStyle = 'rgba(255,107,94,' + S.flash + ')'; ctx.fillRect(0, DL, W, H - DL); }
    // intercompany links
    ctx.setLineDash([4, 5]); ctx.lineWidth = 2;
    for (const it of S.items) if (it.t === 'ic' && it.pair && it.x < it.pair.x){
      ctx.strokeStyle = 'rgba(43,179,255,.7)'; ctx.beginPath(); ctx.moveTo(it.x + CW, it.y + CH / 2); ctx.lineTo(it.pair.x, it.pair.y + CH / 2); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const it of S.items){
      ctx.drawImage(sprite(it), it.x - PAD, it.y - PAD, CW + 2 * PAD, CH + 2 * PAD);
      if (it.t === 'au'){ const cx = it.x + CW - 18, cy = it.y + CH / 2 + 2;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(230,161,0,.25)'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 6.3); ctx.stroke();
        ctx.strokeStyle = '#e6a100'; ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, it.prog)); ctx.stroke(); }
      if (it.t === 'ur' && !reduced && Math.sin(clock * 14) > 0){ ctx.strokeStyle = '#ff3d7f'; ctx.lineWidth = 2; rr(ctx, it.x - 2, it.y - 2, CW + 4, CH + 4, 7); ctx.stroke(); }
    }
    for (const q of S.parts){ ctx.globalAlpha = Math.max(0, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const f of S.fx){ ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); ctx.fillStyle = f.col;
      ctx.font = f.big ? '800 22px "Sora", sans-serif' : '700 13px "IBM Plex Sans", sans-serif'; ctx.fillText(f.txt, f.x, f.y); }
    ctx.globalAlpha = 1;
    // status line
    ctx.textAlign = 'left'; ctx.font = '700 10px "IBM Plex Sans", sans-serif'; let sx = 10;
    const tag = (txt, col) => { ctx.fillStyle = col; ctx.fillText(txt, sx, 16); sx += ctx.measureText(txt).width + 12; };
    if (S.up.auto && S.mod !== 'nobot') tag(S.botOff > 0 ? 'BOTS OFFLINE ' + Math.ceil(S.botOff) + 's' : 'BOT LVL ' + S.up.auto, S.botOff > 0 ? C.red : C.green);
    if (S.up.agent >= 2) tag('AI AGENT', C.green);
    if (S.slow > 0) tag('OVERTIME ' + Math.ceil(S.slow) + 's', C.amber);
    if (S.mode === 'daily') tag(Math.max(0, Math.ceil(S.left)) + 's LEFT', C.paper);

    if (S.banner){
      ctx.globalAlpha = Math.min(1, S.banner.t * 2); ctx.fillStyle = S.banner.col; ctx.fillRect(0, 26, W, 30);
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 12px "IBM Plex Sans", sans-serif';
      ctx.fillText(S.banner.txt, W / 2, 41, W - 16); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }
    if (S.intro > 0){
      ctx.globalAlpha = Math.min(1, S.intro); ctx.textAlign = 'center';
      ctx.fillStyle = C.paper; ctx.font = '800 ' + (S.introTitle.length > 6 ? 40 : 64) + 'px "Sora", sans-serif'; ctx.fillText(S.introTitle, W / 2, H * .4, W - 24);
      ctx.fillStyle = C.gold; ctx.font = '700 13px "IBM Plex Sans", sans-serif'; ctx.fillText(S.introSub, W / 2, H * .4 + 30, W - 24);
      ctx.fillStyle = C.muted; ctx.font = '500 12px "IBM Plex Sans", sans-serif'; ctx.fillText(S.introHint, W / 2, H * .4 + 52, W - 24);
      ctx.globalAlpha = 1;
    }
  }

  /* ================= HUD & abilities ================= */
  let hudScore = -1, hudLate = -1, hudMax = -1, hudCombo = -1, hudFocus = -1;
  function hud(force){
    if (force){ hudScore = hudLate = hudMax = hudCombo = hudFocus = -1; }
    if (S.score !== hudScore){ hudScore = S.score; $('h-score').textContent = S.score.toLocaleString('en'); }
    let frac = 1;
    if (S.mode === 'campaign') frac = S.left / YEARS[S.yi].dur;
    else if (S.mode === 'daily') frac = S.left / 120;
    else frac = 1 - (S.elapsed - S.quarter * 30) / 30;
    $('h-time').style.transform = 'scaleX(' + Math.max(0, Math.min(1, frac)) + ')';
    const mx = lateMax();
    if (S.backlog !== hudLate || mx !== hudMax){ hudLate = S.backlog; hudMax = mx; const b = $('h-backlog');
      if (b.childElementCount !== mx + 1){ b.textContent = ''; const sp = document.createElement('span'); sp.textContent = 'Late'; b.appendChild(sp);
        for (let i = 0; i < mx; i++) b.appendChild(document.createElement('b')); }
      for (let i = 0; i < mx; i++) b.children[i + 1].className = i < S.backlog ? 'on' : ''; }
    if (S.combo !== hudCombo){ hudCombo = S.combo; const c = $('h-combo'); c.textContent = S.combo ? 'Combo ' + S.combo + ' · ×' + comboMult() : '';
      c.classList.toggle('hot', comboMult() > 1); }
    const f = Math.round(S.focus * 100);
    if (f !== hudFocus){ hudFocus = f; $('h-focus').style.transform = 'scaleX(' + S.focus + ')'; updateAbilities(); }
  }
  function updateAbilities(){
    const ready = S && S.focus >= 1 && S.playing;
    const ot = $('ab-ot'), cp = $('ab-cp');
    ot.disabled = !ready; ot.classList.toggle('ready', !!ready);
    const hasCp = S && S.up.copi;
    cp.disabled = !(ready && hasCp); cp.classList.toggle('ready', !!(ready && hasCp));
    $('cp-sub').textContent = hasCp ? 'sweep · 2' : 'needs AI upgrade';
  }
  function overtime(){
    if (!S || !S.playing || S.paused || S.focus < 1) return;
    S.focus = 0; S.slow = S.up.deep >= 2 ? 9 : 6; S.otUses++; if (S.otUses >= 10) unlock('ot');
    AU.sfx('ability'); banner('OVERTIME · everything slows down', C.amber, 1.6); hud();
  }
  function copilot(){
    if (!S || !S.playing || S.paused || S.focus < 1 || !S.up.copi) return;
    S.focus = 0; let n = 0;
    for (const it of S.items.slice()){ if (!S.items.includes(it)) continue;
      if (it.lock || it.t === 'dup' || it.t === 'au' || it.taps > 2) continue;
      if (it.t === 'ic' && it.pair) postPair(it, 'CP'); else post(it, 'CP', true); n++; }
    AU.sfx('ability'); banner('COPILOT · ' + n + ' slips posted', C.green, 1.6); hud();
  }
  $('ab-ot').addEventListener('click', overtime);
  $('ab-cp').addEventListener('click', copilot);

  function loop(now){
    if (!S || !S.playing) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!S.paused){ update(dt); if (!S.playing) return; draw(); hud(); }
    raf = requestAnimationFrame(loop);
  }

  /* ================= input ================= */
  function itemAt(px, py){
    const pad = 10; let best = null;
    for (const it of S.items)
      if (px >= it.x - pad && px <= it.x + CW + pad && py >= it.y - pad && py <= it.y + CH + pad && (!best || it.y > best.y)) best = it;
    return best;
  }
  cv.addEventListener('pointerdown', e => {
    if (!S || !S.playing || S.paused) return; e.preventDefault();
    const r = cv.getBoundingClientRect(), it = itemAt(e.clientX - r.left, e.clientY - r.top);
    if (!it) return;
    if (it.lock){ AU.sfx('lock'); S.fx.push({x:it.x + CW / 2, y:it.y - 4, txt:'NOT DECIDED YET', life:.6, col:C.muted}); return; }
    if (it.t === 'au'){ S.hold = {it, id:e.pointerId}; it.hit = .1; try { cv.setPointerCapture(e.pointerId); } catch(_){} return; }
    if (it.t === 'dup'){
      remove(it); S.run.dupHit++; S.score = Math.max(0, S.score - 50); S.combo = 0; S.backlog++; S.flash = .35; S.shake = .3; AU.sfx('bad');
      S.fx.push({x:it.x + CW / 2, y:it.y + CH / 2, txt:'DUPLICATE POSTED −50', life:1, col:C.red}); return;
    }
    if (it.t === 'ic' && it.pair){
      if (S.up.match || it.pair.wait > 0){ postPair(it, false); return; }
      it.wait = 3; it.sub0 = it.sub0 || it.sub; it.sub = 'waiting for partner'; it.hit = .1; AU.sfx('link'); return;
    }
    it.taps--; it.hit = .1;
    if (it.taps <= 0) post(it, false); else AU.sfx('tap');
  });
  const endHold = e => { if (S && S.hold && (e.pointerId === S.hold.id || e.type === 'blur')) S.hold = null; };
  cv.addEventListener('pointerup', endHold); cv.addEventListener('pointercancel', endHold); window.addEventListener('blur', endHold);

  document.addEventListener('keydown', e => {
    if (!S || !S.playing || !$('s-game').classList.contains('on')) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape'){ e.preventDefault(); S.paused ? resume() : pause(); }
    else if (e.key === '1') overtime();
    else if (e.key === '2') copilot();
  });
  function pause(){ if (!S || !S.playing || S.paused) return; S.paused = true; AU.stop(); S.hold = null;
    $('pause-info').textContent = (S.mode === 'campaign' ? YEARS[S.yi].y : S.mode === 'daily' ? 'Daily Close' : 'Quarter ' + (S.quarter + 1)) + ' · ' + S.score.toLocaleString('en') + ' points';
    $('pausebox').classList.add('on'); }
  function resume(){ if (!S || !S.paused) return; S.paused = false; $('pausebox').classList.remove('on'); last = performance.now();
    AU.init(); AU.music(S.mode === 'campaign' ? 108 + S.yi * 13 : Math.min(170, 112 + S.quarter * 8)); }
  $('pause').addEventListener('click', pause);
  $('resume').addEventListener('click', resume);
  $('quit').addEventListener('click', () => { if (!S) return; S.playing = false; S.paused = false; cancelAnimationFrame(raf); AU.stop(); hideOverlays(); renderMenu(); show('s-menu'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  function hideOverlays(){ ['shop', 'draft', 'pausebox'].forEach(id => $(id).classList.remove('on')); }

  /* ================= between stages ================= */
  function starsFor(lateN){ return lateN === 0 ? 3 : lateN <= 2 ? 2 : 1; }
  function starStr(n){ return '★'.repeat(n) + '☆'.repeat(3 - n); }
  function yearDone(){
    S.playing = false; cancelAnimationFrame(raf); AU.stop(); AU.sfx('year'); S.hold = null;
    const st = starsFor(S.backlog); S.stars.push(st);
    S.score += Math.round((100 * (S.yi + 1) + (S.backlog === 0 ? 75 : 0)) * S.D.mult);
    if (S.yi === 0) unlock('first'); if (S.backlog === 0) unlock('clean');
    hud();
    if (S.yi === YEARS.length - 1) return endRun(true);
    S.pts += 2 + (st === 3 ? 1 : 0); openShop(st);
  }
  function openShop(st){
    const Y = YEARS[S.yi], N = YEARS[S.yi + 1];
    $('shop-eyebrow').textContent = Y.y + ' closed · ' + (S.backlog === 0 ? 'clean close bonus' : S.backlog + ' late') + (st === 3 ? ' · +1 bonus point' : '');
    const se = $('shop-stars'); se.textContent = ''; for (let i = 0; i < 3; i++){ const s = document.createElement('span'); s.textContent = '★'; if (i >= st) s.className = 'off'; se.appendChild(s); }
    $('shop-title').textContent = 'Next: ' + N.y + '. ' + N.short + '. What do you improve?';
    $('shop-news').textContent = N.news;
    $('shop-go').textContent = 'Start ' + N.y;
    renderShop(); $('shop').classList.add('on'); $('shop').scrollTop = 0;
  }
  function renderShop(){
    $('shop-pts').textContent = S.pts;
    const box = $('ups'); box.textContent = ''; let grp = '';
    UPS.forEach(u => {
      if (u.g !== grp){ grp = u.g; const h = document.createElement('div'); h.className = 'grp'; h.textContent = grp === 'ESSA' ? 'ESSA · eliminate, simplify, standardize, automate' : grp; box.appendChild(h); }
      const locked = u.from != null && S.yi + 1 < u.from;
      box.appendChild(upButton(u, locked ? 'Unlocks in ' + YEARS[u.from].y : null, () => {
        if (S.pts < 1 || S.up[u.k] >= u.max || locked) return; S.up[u.k]++; S.pts--; AU.sfx('buy'); checkEssa(); renderShop(); }, locked || S.pts < 1));
    });
  }
  function upButton(u, lockTxt, onClick, disabled, card){
    const lvl = S.up[u.k], b = document.createElement('button'); b.type = 'button'; b.className = 'up' + (card ? ' card' : '');
    b.disabled = !!disabled || lvl >= u.max;
    const st = document.createElement('strong'); st.textContent = u.name;
    const pips = document.createElement('div'); pips.className = 'pips';
    for (let i = 0; i < u.max; i++){ const p = document.createElement('i'); if (i < lvl) p.className = 'on'; pips.appendChild(p); }
    const d = document.createElement('span'); d.textContent = lockTxt || (lvl >= u.max ? 'Fully done' : u.d[lvl]);
    b.append(st, pips, d); b.addEventListener('click', onClick); return b;
  }
  function checkEssa(){ if (S.up.elim >= 3 && S.up.simp >= 2 && S.up.std >= 2 && S.up.auto >= 4) unlock('essa'); }
  $('shop-go').addEventListener('click', () => { S.yi++; S.seen = {}; startStage(); });

  function quarterDone(){
    S.playing = false; cancelAnimationFrame(raf); AU.stop(); AU.sfx('year'); S.hold = null;
    S.quarter++; S.score += Math.round(150 * S.quarter * S.D.mult);
    if (S.quarter >= 4) unlock('q4'); if (S.quarter >= 8) unlock('q8');
    S.backlog = Math.max(0, S.backlog - 2); hud();
    const pool = UPS.filter(u => S.up[u.k] < u.max);
    const choices = []; while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    $('draft-eyebrow').textContent = 'Q' + S.quarter + ' closed · ' + S.score.toLocaleString('en') + ' points';
    const box = $('cards'); box.textContent = '';
    if (!choices.length){ const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Everything is maxed. Just keep closing.'; box.appendChild(p);
      const go = document.createElement('button'); go.className = 'btn'; go.type = 'button'; go.textContent = 'Next quarter'; go.addEventListener('click', startStage); box.appendChild(go); }
    choices.forEach(u => box.appendChild(upButton(u, null, () => { S.up[u.k]++; AU.sfx('buy'); checkEssa(); startStage(); }, false, true)));
    $('draft').classList.add('on'); $('draft').scrollTop = 0;
  }

  /* ================= end ================= */
  function endRun(survived){
    S.playing = false; cancelAnimationFrame(raf); AU.stop(); if (!survived) AU.sfx('over'); S.hold = null;
    setTimeout(() => AU.sfx('tbc'), 1300);
    if (S.bestCombo > (prof.stats.combo || 0)) prof.stats.combo = S.bestCombo;
    if (prof.stats.posted >= 1000) unlock('k1');
    let reached;
    if (S.mode === 'campaign'){
      reached = String(YEARS[S.yi].y);
      if (survived){ unlock('y2030'); if (S.diff === 'hard') unlock('hard'); if (S.stars.length === 5 && S.stars.every(s => s === 3)) unlock('stars'); }
    } else if (S.mode === 'endless') reached = 'Q' + (S.quarter + 1);
    else { reached = survived ? '2:00' : Math.floor(S.elapsed) + 's'; if (survived) unlock('daily');
      prof.daily[S.seed] = Math.max(prof.daily[S.seed] || 0, S.score); }
    const entry = {id:S.id, n:S.name, s:S.score, r:reached, d:S.diff, day:S.mode === 'daily' ? S.seed : undefined};
    prof.scores[S.mode] = prof.scores[S.mode].concat([entry]).sort((a, b) => b.s - a.s).slice(0, 60);
    prof.save();

    const modeName = {campaign:'Campaign', endless:'Endless', daily:'Daily Close'}[S.mode];
    $('e-eyebrow').textContent = S.name + ' · ' + modeName + ' · ' + DIFF[S.diff].name + ' · reached ' + reached;
    let title, text;
    if (S.mode === 'campaign'){
      if (survived){ title = 'You closed 2030.'; text = 'ESSA, people and AI got you through with almost the same team. Imagine what you could do with more of it.'; }
      else if (S.yi === YEARS.length - 1){ title = '2030. The entries kept coming.'; text = 'Your improvements carried you all the way to 2030. The contracts, emails and one-off cases need something more.'; }
      else { title = 'Close missed in ' + YEARS[S.yi].y + '.'; text = 'Volume and complexity grew faster than the team. Scaling manual work is not sustainable. Eliminate, simplify, standardize, automate.'; }
    } else if (S.mode === 'endless'){
      title = S.quarter ? 'You survived ' + S.quarter + ' quarter' + (S.quarter > 1 ? 's' : '') + '.' : 'The first quarter got you.';
      text = 'The volume beyond 2030 never stops. Every improvement you picked bought time; the ones that remove work entirely bought the most.';
    } else {
      title = survived ? 'Daily Close done.' : 'Daily Close missed.';
      text = 'Today: ' + S.modName + '. Everyone gets the same entries today, so compare scores with your colleagues. A new twist tomorrow.';
    }
    $('e-title').textContent = title; $('e-text').textContent = text;
    $('e-score').textContent = S.score.toLocaleString('en');
    $('e-posted').textContent = S.posted.toLocaleString('en');
    $('e-combo').textContent = S.bestCombo;
    const ys = $('e-stars'); ys.textContent = '';
    S.stars.forEach((s, i) => { const d = document.createElement('div'), b = document.createElement('b'); b.textContent = starStr(s); d.append(String(YEARS[i].y), b); ys.appendChild(d); });
    const ea = $('e-ach'); ea.textContent = '';
    S.newAch.forEach(k => { const a = ACH.find(x => x[0] === k), d = document.createElement('div'), b = document.createElement('b'); b.textContent = 'Unlocked: ' + a[1]; d.append(b, document.createElement('br'), a[2]); ea.appendChild(d); });
    $('e-board-title').textContent = S.mode === 'daily' ? 'Today’s Daily Close' : modeName + ' high scores';
    renderBoard($('board-end'), S.mode, S.id);
    show('s-end');
  }
  $('again').addEventListener('click', () => startRun(S.mode));
  $('tomenu').addEventListener('click', () => { renderMenu(); show('s-menu'); });

  /* ================= start ================= */
  function startRun(mode){
    const name = $('name').value.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!name){ show('s-menu'); $('err').textContent = 'Enter a name so your score can go on the board.'; $('name').focus(); return; }
    $('err').textContent = ''; store.set('name', name);
    AU.init(); newRun(name, mode); show('s-game'); resize(); startStage();
  }
  document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => startRun(b.dataset.mode)));
  $('f-name').addEventListener('submit', e => { e.preventDefault(); startRun('campaign'); });
  $('name').value = store.get('name', '');

  renderLegend(); renderMenu();
  window.CTB = {state:() => S};
})();
