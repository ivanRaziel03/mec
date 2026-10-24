// ============================================================
// MEC — MULTIVERSAL ECHOES CLASH  — motor v0.1 (1v1, SF/MvC-style)
// ============================================================
const W = 960, H = 540, FLOOR = 470;
const GRAV = 0.55, JUMP_V = -12.5;
const ROUND_TIME = 60 * 60; // 60s @60fps
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

const State = { TITLE: 'title', VS: 'vs', FIGHT: 'fight', OVER: 'over' };
let state = State.TITLE;
let fightersData = [];

// ---------- input ----------
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });
function bindTouch(id, code) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); keys[code] = true; });
  ['pointerup','pointercancel','pointerleave'].forEach(t =>
    el.addEventListener(t, e => { e.preventDefault(); keys[code] = false; }));
}
bindTouch('left','left'); bindTouch('right','right'); bindTouch('up','up');
bindTouch('block','block'); bindTouch('atk-a','a'); bindTouch('atk-b','b');
bindTouch('atk-c','c'); bindTouch('atk-h','h');

const pressed = k => keys[k] === true;

// ---------- Fighter ----------
class Fighter {
  constructor(data, x, facing, isCPU) {
    this.d = data; this.x = x; this.y = FLOOR; this.vy = 0;
    this.facing = facing; this.hp = data.health; this.meter = 0;
    this.state = 'idle'; this.frame = 0; this.move = null;
    this.hasHit = false; this.isCPU = isCPU; this.aiTimer = 0;
    this.projectiles = []; this.wins = 0;
  }
  get other() { return fighters[0] === this ? fighters[1] : fighters[0]; }
  get hitbox() { // hurtbox simple
    return { x: this.x - 26, y: this.y - 96, w: 52, h: 96 };
  }
  startMove(key) {
    const m = this.d.moves[key]; if (!m) return false;
    if (m.hyper && this.meter < 100) return false;
    if (m.meterCost && this.meter < m.meterCost) return false;
    if (this.state === 'hitstun' || this.state === 'ko') return false;
    this.move = key; this.state = 'attack'; this.frame = 0; this.hasHit = false;
    if (m.meterCost) this.meter -= m.meterCost;
    return true;
  }
  update() {
    const m = this.move ? this.d.moves[this.move] : null;
    if (this.state === 'hitstun') {
      this.frame++; if (this.frame > 16) { this.state = 'idle'; this.frame = 0; }
    } else if (this.state === 'attack') {
      if (m.projectile && !this.hasHit && this.frame === m.startup) {
        this.hasHit = true;
        this.projectiles.push({ x: this.x + this.facing * 30, y: this.y - 60,
          vx: this.facing * 9, dmg: m.dmg, owner: this, life: 60 });
      } else if (!m.projectile && !m.throw && !m.counter_hit && !this.hasHit &&
                 this.frame >= m.startup && this.frame < m.startup + m.active) {
        // melee hit test
        const hx = this.facing === 1 ? this.x + 20 : this.x - 20 - m.reach;
        const box = { x: hx, y: this.y - 90, w: m.reach, h: 80 };
        const o = this.other;
        if (overlap(box, o.hitbox) && !this.hasHit) {
          this.hasHit = true; resolveHit(this, o, m);
        }
      }
      this.frame++; const total = m.startup + m.active + m.recovery;
      if (this.frame > total) { this.state = 'idle'; this.move = null; this.frame = 0; }
    }
    if (this.isCPU) this.thinkCPU();
    // movement
    if (this.state === 'idle' || this.state === 'walk') {
      let dx = 0;
      const K = this.isCPU
        ? { left: this.cpuKeys.left, right: this.cpuKeys.right }
        : { left: pressed('left'), right: pressed('right') };
      if (K.left && !K.right) { dx = -this.d.speed; this.facing = -1; this.state = 'walk'; }
      else if (K.right && !K.left) { dx = this.d.speed; this.facing = 1; this.state = 'walk'; }
      else if (this.state !== 'jump') this.state = 'idle';
      this.x += dx;
      if (dx !== 0 && Math.abs(this.x - this.other.x) < 60) {
        if (this.facing !== Math.sign(this.other.x - this.x) )
          this.facing = Math.sign(this.other.x - this.x);
      }
      // jump
      if ((this.isCPU ? this.cpuKeys.up : pressed('up')) && this.state !== 'jump' && Math.abs(this.y - this.other.y) < 1) {
        this.vy = JUMP_V; this.state = 'jump';
      }
    }
    if (this.state === 'jump') {
      this.vy += GRAV; this.y += this.vy;
      if (this.y >= FLOOR) { this.y = FLOOR; this.vy = 0; this.state = 'idle'; }
    }
    // attack trig (not cpu; cpu triggtriggem within thinkCPU)
    if (!this.isCPU && (this.state === 'idle' || this.state === 'walk')) {
      for (const k of ['a','b','c','h']) if (pressed(k)) { if (this.startMove(k)) break; }
    }
    // block
    if (!this.isCPU && pressed('block') && this.state === 'idle') this.state = 'block';
    if (this.isCPU && this.cpuKeys.block && this.state === 'idle') this.state = 'block';
    // projectiles
    this.projectiles.forEach(p => {
      p.x += p.vx; p.life--;
      if (overlap({ x: p.x - 12, y: p.y - 12, w: 24, h: 24 }, this.other.hitbox))
        { resolveHit(this, this.other, { dmg: p.dmg, name: 'proyectil', meterGain: 8 }); p.life = 0; }
    });
    this.projectiles = this.projectiles.filter(p => p.life > 0 && p.x > -60 && p.x < W + 60);
    // bundle start round clamp
    this.x = Math.max(40, Math.min(W - 40, this.x));
  }
  thinkCPU() {
    this.cpuKeys = this.cpuKeys || { left:false,right:false,up:false,block:false };
    if (this.state !== 'idle' && this.state !== 'walk') { this.cpuKeys.block = false; return; }
    if (this.aiTimer-- > 0) return;
    this.aiTimer = 10 + Math.random() * 18;
    const o = this.other, dist = Math.abs(o.x - this.x);
    const toward = o.x > this.x ? 'right' : 'left';
    const away  = o.x > this.x ? 'left' : 'right';
    Object.keys(this.cpuKeys).forEach(k => this.cpuKeys[k] = false);
    const aggression = this.hp < o.hp ? 0.75 : 0.55;
    if (dist > 180) { this.cpuKeys[toward] = true; }
    else if (dist > 90) {
      if (Math.random() < 0.5) this.cpuKeys[toward] = true;
      else if (this.meter >= 25 && Math.random() < 0.4) this.startMove('c');
    } else {
      if (Math.random() > aggression) this.cpuKeys.block = true;
      else if (this.meter >= 100 && Math.random() < 0.5) this.startMove('hyper');
      else if (Math.random() < 0.6) this.startMove(Math.random() < 0.6 ? 'a' : 'b');
      else this.cpuKeys[away] = true;
      if (Math.random() < 0.08) this.cpuKeys.up = true;
    }
  }
}

function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function resolveHit(attacker, defender, m) {
  const blocked = defender.state === 'block';
  const dmg = blocked ? Math.max(1, Math.round(m.dmg * 0.15)) : m.dmg;
  defender.hp = Math.max(0, defender.hp - dmg);
  attacker.meter = Math.min(100, attacker.meter + (m.meterGain || 10));
  defender.meter = Math.min(100, defender.meter + 6);
  if (!blocked) { defender.state = 'hitstun'; defender.frame = 0; defender.move = null; }
  fx.push({ x: defender.x, y: defender.y - 60, txt: '-' + dmg, life: 30, col: blocked ? '#8fa2ff' : '#ff4343' });
  shake = 6;
  beep(blocked ? 220 : 120, 0.08);
}

// ---------- FX / audio ----------
const fx = [];
let shake = 0;
let audioCtx = null;
function beep(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; g.gain.value = 0.06;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

// ---------- Match ----------
let fighters = [];
let roundNum = 1, timer = ROUND_TIME, freeze = 0;
const roundWins = { p1: 0, p2: 0 };

function newMatch() {
  const d1 = fightersData[Math.floor(Math.random() * fightersData.length)];
  let d2 = fightersData[Math.floor(Math.random() * fightersData.length)];
  while (d2.id === d1.id && fightersData.length > 1) d2 = fightersData[Math.floor(Math.random() * fightersData.length)];
  fighters = [
    new Fighter(d1, W * 0.32, 1, false),
    new Fighter(d2, W * 0.68, -1, true),
  ];
  timer = ROUND_TIME; freeze = 90;
}
function nextRound() {
  roundNum++;
  newMatch();
  fighters[0].wins = roundWins.p1; fighters[1].wins = roundWins.p2;
}

// ---------- render ----------
function drawFighter(f, boxColor) {
  const c = f.d.colors;
  ctx.save(); ctx.translate(f.x, f.y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 30, 8, 0, 0, 6.3); ctx.fill();
  ctx.scale(f.facing, 1);
  // legs
  ctx.fillStyle = c.suit;
  ctx.fillRect(-18, -34, 14, 34); ctx.fillRect(4, -34, 14, 34);
  // torso
  ctx.fillRect(-22, -74, 44, 42);
  // head
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, -86, 14, 0, 6.3); ctx.fill();
  // accent combos
  ctx.fillStyle = c.accent; ctx.fillRect(-22, -60, 44, 6);
  // attack overlay
  if (f.state === 'attack' && f.move && !f.d.moves[f.move].projectile) {
    const m = f.d.moves[f.move];
    if (f.frame >= m.startup && f.frame < m.startup + m.active) {
      ctx.fillStyle = m.hyper ? '#ffd23c' : '#ff5a5a';
      ctx.fillRect(18, -80, m.reach, 60);
    }
  }
  // block shield
  if (f.state === 'block') {
    ctx.strokeStyle = '#8fa2ff'; ctx.lineWidth = 3;
    ctx.strokeRect(-30, -94, 60, 94);
  }
  ctx.restore();
  // projectiles
  f.projectiles.forEach(p => {
    ctx.fillStyle = f.d.colors.accent;
    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.stroke();
  });
  // nameplate handled in HUD
}
function drawHUD() {
  const [p1, p2] = fighters;
  ctx.font = 'bold 14px monospace';
  // health bars
  bar(30, 24, W / 2 - 90, 22, p1.hp / p1.d.health, '#4ade80', p1.d.name, 30);
  bar(W - 30 - (W / 2 - 90), 24, W / 2 - 90, 22, p2.hp / p2.d.health, '#4ade80', p2.d.name, null, true);
  // meter
  bar(30, 54, W / 2 - 90, 10, p1.meter / 100, '#38bdf8', null, 30);
  bar(W - 30 - (W / 2 - 90), 54, W / 2 - 90, 10, p2.meter / 100, '#38bdf8', null, null, true);
  // wins markers
  ctx.fillStyle = '#ffd23c';
  for (let i = 0; i < roundWins.p1; i++) ctx.fillText('★', 34 + i * 20, 86);
  for (let i = 0; i < roundWins.p2; i++) { ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.fillText('★', 34 + i * 20, 86); ctx.restore(); }
  // timer
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace';
  ctx.fillText(Math.ceil(timer / 60), W / 2 - 12, 50);
}
function bar(x, y, w, h, pct, color, label, lx, rtl) {
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  const ww = Math.round(w * Math.max(0, pct));
  ctx.fillRect(rtl ? x + w - ww : x, y, ww, h);
  if (label) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
    ctx.fillText(label, (lx ?? x), y - 4);
  }
}

// ---------- loop ----------
let last = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const ok = state === State.FIGHT && freeze <= 0;
  if (ok && !last) last = t; // noop
  // update
  if (state === State.FIGHT) {
    if (freeze > 0) freeze--;
    if (!freeze) {
      timer--;
      fighters.forEach(f => f.update());
      // resolve between-round finish
      if (fighters[0].hp <= 0 || fighters[1].hp <= 0) {
        const winner = fighters[0].hp > fighters[1].hp ? fighters[0] : fighters[1];
        if (winner === fighters[0]) roundWins.p1++; else roundWins.p2++;
        if (roundWins.p1 === 2 || roundWins.p2 === 2) {
          state = State.OVER;
          setTimeout(() => { state = State.TITLE; overlay.style.display = 'flex'; }, 2600);
        } else nextRound();
      } else if (timer <= 0) {
        const winner = fighters[0].hp >= fighters[1].hp ? fighters[0] : fighters[1];
        winner === fighters[0] ? roundWins.p1++ : roundWins.p2++;
        if (roundWins.p1 === 2 || roundWins.p2 === 2) state = State.OVER; else nextRound();
        if (state === State.OVER) setTimeout(() => { state = State.TITLE; overlay.style.display = 'flex'; }, 2600);
      }
    }
  }
  // draw
  ctx.save();
  if (shake > 0) { shake--; ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2); }
  // bg
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1140'); g.addColorStop(0.6, '#2d1b4e'); g.addColorStop(1, '#4a2440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d0a1a'; ctx.fillRect(0, FLOOR + 8, W, H - FLOOR);
  ctx.strokeStyle = 'rgba(255,210,60,.35)';
  ctx.beginPath(); ctx.moveTo(0, FLOOR + 8); ctx.lineTo(W, FLOOR + 8); ctx.stroke();
  if (state === State.FIGHT) {
    fighters.forEach(f => drawFighter(f));
    drawHUD();
  }
  // fx numbers
  fx.forEach(p => { p.life--; ctx.fillStyle = p.col; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(p.txt, p.x - 10, p.y - (30 - p.life)); });
  fx.filter(p => p.life <= 0);
  ctx.restore();
}
requestAnimationFrame(loop);

// ---------- boot ----------
const overlay = document.getElementById('title-overlay');
document.getElementById('start-btn').addEventListener('click', async () => {
  if (!fightersData.length) {
    fightersData = (await (await fetch('./js/fighters.json')).json()).fighters;
  }
  roundWins.p1 = 0; roundWins.p2 = 0; roundNum = 1;
  newMatch();
  overlay.style.display = 'none';
  state = State.FIGHT;
});
