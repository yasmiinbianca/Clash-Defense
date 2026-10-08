'use strict';
/* ===== CLASH DEFENSE ===== */
const $ = id => document.getElementById(id), cv = $('c'), cx = cv.getContext('2d');
const MAXW = 20;

// ---- Mapa: pontos do caminho (começa à esquerda no topo, termina nas torres embaixo)
const PATH = [[0,90],[480,90],[480,200],[110,200],[110,320],[490,320],[490,420],[120,420],[120,490],[300,490]];
const SEG = []; let TOT = 0;
for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0]-PATH[i-1][0], PATH[i][1]-PATH[i-1][1]); SEG.push(l); TOT += l; }
// posição (x,y) após andar a distância d pelo caminho
function posAt(d) {
  for (let i = 0; i < SEG.length; i++) {
    if (d <= SEG[i]) { const t = d / SEG[i], a = PATH[i], b = PATH[i+1]; return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }
    d -= SEG[i];
  }
  return PATH[PATH.length-1];
}
function dseg(px, py, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1], t = Math.max(0, Math.min(1, ((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(px-a[0]-t*dx, py-a[1]-t*dy);
}
const onPath = (x, y, m) => PATH.some((p, i) => i && dseg(x, y, PATH[i-1], p) < m);
// plataformas onde o jogador coloca defesas
const PADS = [[150,145],[300,145],[420,145],[200,45],[400,45],[60,260],[230,260],[380,260],[200,370],[350,370],[550,370],[60,450],[220,455],[400,455]];
const KING = [300,560], PRIN = [[190,555],[410,555]];
// decoração aleatória fixa (árvores, pedras...)
const DECO = []; let sd = 7; const rnd = () => (sd = sd*16807 % 2147483647) / 2147483647;
for (let i = 0; i < 90 && DECO.length < 40; i++) {
  const x = rnd()*580+10, y = rnd()*580+10;
  if (onPath(x,y,45) || PADS.some(p => Math.hypot(p[0]-x,p[1]-y) < 32) || (y > 515 && x > 140 && x < 460)) continue;
  DECO.push([x, y, ['🌳','🌲','🪨','🌿','🍄','🏠'][Math.floor(rnd()*6)]]);
}

// ---- Defesas (g = só ataca terrestres, sp = raio de área, slow/stun = efeitos)
// Troque as imagens em assets/personagens/<id>.png
const DEF = {
  arq:  {n:'Arqueira', e:'🏹', c:150, d:10, r:110, s:1.6, col:'#a0522d', i:'Rápida, dano baixo'},
  cav:  {n:'Cavaleiro', e:'🛡️', c:200, d:35, r:70, s:1.2, col:'#ccc', g:1, i:'Corpo a corpo, só terra'},
  mago: {n:'Mago', e:'🧙', c:300, d:30, r:140, s:1, col:'#ff6a00', sp:45, i:'Bola de fogo em área'},
  gelo: {n:'Mago de Gelo', e:'❄️', c:350, d:12, r:130, s:1, col:'#7df', slow:1, sp:35, i:'Desacelera inimigos'},
  mosq: {n:'Mosqueteira', e:'🔫', c:250, d:40, r:170, s:.8, col:'#fc6', i:'Longo alcance'},
  bruxa:{n:'Bruxa', e:'🧙‍♀️', c:450, d:22, r:130, s:1.3, col:'#c0f', sp:40, i:'Magia em área rápida'},
  elet: {n:'Mago Elétrico', e:'⚡', c:600, d:18, r:120, s:1.5, col:'#8ff', stun:1, i:'Paralisa inimigos'},
  princ:{n:'Princesa', e:'👸', c:500, d:28, r:240, s:.7, col:'#f9a', sp:30, i:'Alcance muito grande'},
  bomb: {n:'Bombardeiro', e:'💣', c:400, d:45, r:100, s:.6, col:'#555', sp:60, i:'Bomba em área'},
  cac:  {n:'Caçador', e:'🎯', c:550, d:60, r:95, s:1.3, col:'#fa0', i:'Tiro forte de perto'},
  minip:{n:'Mini P.E.K.K.A', e:'🤖', c:500, d:120, r:60, s:.8, col:'#6af', g:1, i:'Golpe pesado, só terra'},
  pekka:{n:'P.E.K.K.A', e:'🦾', c:900, d:300, r:65, s:.5, col:'#f33', g:1, i:'Dano altíssimo, só terra'},
  spark:{n:'Sparky', e:'🔋', c:1100, d:400, r:150, s:.25, col:'#ff0', sp:40, i:'Raio devastador em área'}
};
// ---- Inimigos (v=velocidade, r=recompensa, w=1ª onda, k=qtd base, air=aéreo)
const ENM = {
  gob: {n:'Goblin', e:'👺', hp:50, v:70, r:5, t:'RÁPIDO', w:1, k:8},
  esq: {n:'Esqueleto', e:'💀', hp:30, v:55, r:3, t:'NORMAL', w:2, k:6},
  barb:{n:'Bárbaro', e:'🪓', hp:160, v:45, r:10, t:'NORMAL', w:3, k:4},
  bal: {n:'Balão', e:'🎈', hp:400, v:40, r:40, t:'AÉREO', w:4, k:3, air:1},
  morc:{n:'Morcego', e:'🦇', hp:60, v:85, r:8, t:'AÉREO', w:6, k:5, air:1},
  gig: {n:'Gigante', e:'🗿', hp:700, v:25, r:50, t:'TANQUE', w:8, k:2},
  bar: {n:'Barril de Goblins', e:'🛢️', hp:120, v:65, r:15, t:'RÁPIDO', w:10, k:4},
  barE:{n:'Bárbaro de Elite', e:'⚔️', hp:400, v:50, r:30, t:'NORMAL', w:12, k:3},
  mega:{n:'Mega Servo', e:'🤖', hp:1000, v:30, r:70, t:'TANQUE', w:14, k:2},
  boss:{n:'Rei Goblin', e:'👑', hp:1500, v:28, r:200, t:'BOSS', w:99, k:0}
};
const MULT = [[500,5],[300,4],[200,3],[100,2],[50,1.5],[25,1.25],[0,1]];
const CLICKP = [1,2,4,8,12,20], CLICKC = [100,300,700,1500,3000];
const AUTOP = [0,1,3,5,10], AUTOC = [150,400,900,2000];

// ---- Salvamento
const SAVE = Object.assign({wave:0, combo:0, kills:0, score:0}, JSON.parse(localStorage.getItem('clashdef') || '{}'));
const save = () => localStorage.setItem('clashdef', JSON.stringify(SAVE));

// ---- Imagens: tenta carregar o PNG, senão usa emoji
const IMG = {};
function spr(path, emo, x, y, s) {
  let im = IMG[path];
  if (!im) { im = IMG[path] = new Image(); im.ok = 0; im.onload = () => im.ok = 1; im.src = path; }
  if (im.ok) cx.drawImage(im, x-s/2, y-s/2, s, s);
  else { cx.font = s*.85 + 'px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(emo, x, y); }
}

let G = null, sel = -1, last = 0;
const fmt = n => Math.floor(n).toLocaleString('pt-BR');

function newGame(inf) {
  G = {coins:150, wave:0, lives:3, en:[], q:[], sp:0, state:'prep', prep:15, tw:[], fx:[], fl:[],
       kills:0, earned:0, combo:0, maxCombo:0, lastClick:0, cl:0, au:0, time:0, inf:false, shake:0};
  sel = -1; $('screen').style.display = 'none'; panel();
}
const gain = a => { G.coins += a; G.earned += a; };

// ---- Ondas
function buildWave(n) {
  const q = [];
  for (const id in ENM) {
    const t = ENM[id];
    if (id === 'boss' || n < t.w || (n - t.w) % 4 === 3) continue;
    const c = t.k + Math.floor((n - t.w) / 2);
    for (let i = 0; i < c; i++) q.push(id);
  }
  q.sort(() => Math.random() - .5);
  if (n % 5 === 0) q.push('boss');
  return q;
}
function startWave() { G.wave++; G.q = buildWave(G.wave); G.state = 'wave'; G.sp = 0; note('ONDA ' + G.wave); }
function endWave() {
  gain(20 + G.wave * 5);
  if (G.wave >= MAXW && !G.inf) return end(true);
  G.state = 'prep'; G.prep = 10;
}
function spawn(id) {
  const t = ENM[id], n = G.wave, hp = t.hp * (1 + .15 * (n - 1)) * (id === 'boss' ? n / 5 : 1);
  G.en.push({id, hp, max:hp, v:t.v, rw:Math.round(t.r * (1 + .05 * (n - 1))), air:t.air, d:0, slow:0, stun:0, x:0, y:90});
}
function hit(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0) { e.dead = 1; G.kills++; gain(e.rw); G.fl.push({x:e.x, y:e.y, t:1, s:'+' + e.rw, c:'#ffe27a'}); G.fx.push({k:'boom', x:e.x, y:e.y, t:.3}); }
}
function loseLife(e) { e.dead = 1; G.lives--; G.shake = .4; if (G.lives <= 0) end(false); }

// ---- Clicker
const mult = () => MULT.find(m => G.combo >= m[0])[1];
function click() {
  if (!G || G.state === 'over' || G.state === 'win') return;
  G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.lastClick = performance.now();
  const g = CLICKP[G.cl] * mult(); gain(g);
  const f = document.createElement('span'); f.className = 'fl'; f.textContent = '+' + (Math.round(g * 100) / 100);
  f.style.left = (20 + Math.random() * 220) + 'px'; f.style.top = '-5px'; $('clk').appendChild(f); setTimeout(() => f.remove(), 800);
}
$('clk').onclick = click;
addEventListener('keydown', e => { if (e.code === 'Space' && G && !e.repeat) { e.preventDefault(); click(); } });

// ---- Defesas: compra, melhoria, venda
const stats = t => { const d = DEF[t.id], l = t.lvl - 1; return {d:d.d * (1 + .5 * l), r:d.r * (1 + .05 * l), s:d.s * (1 + .1 * l)}; };
const upCost = t => Math.round(DEF[t.id].c * .7 * t.lvl);
function buy(id) {
  const d = DEF[id];
  if (sel < 0 || G.coins < d.c || G.tw.some(t => t.p === sel)) return;
  G.coins -= d.c; G.tw.push({p:sel, id, lvl:1, cd:0, spent:d.c}); panel();
}
function upg() { const t = G.tw.find(t => t.p === sel); if (!t || t.lvl >= 5 || G.coins < upCost(t)) return; const c = upCost(t); G.coins -= c; t.spent += c; t.lvl++; G.fx.push({k:'boom', x:PADS[t.p][0], y:PADS[t.p][1], t:.4}); panel(); }
function sell() { const i = G.tw.findIndex(t => t.p === sel); if (i < 0) return; gain(-G.tw[i].spent * 0 ); G.coins += Math.floor(G.tw[i].spent * .6); G.tw.splice(i, 1); panel(); }
function upClick() { if (G.cl < 5 && G.coins >= CLICKC[G.cl]) { G.coins -= CLICKC[G.cl]; G.cl++; } }
function upAuto() { if (G.au < 4 && G.coins >= AUTOC[G.au]) { G.coins -= AUTOC[G.au]; G.au++; } }

function panel() {
  const p = $('panel'); if (!G) return;
  const t = G.tw.find(t => t.p === sel);
  let h = '';
  if (t) {
    const d = DEF[t.id], s = stats(t);
    h = `<h3>${d.e} ${d.n} — Nível ${t.lvl}/5</h3><p>Dano: ${Math.round(s.d)}<br>Alcance: ${Math.round(s.r)}<br>Velocidade: ${s.s.toFixed(2)} ataques/s<br><i>${d.i}</i></p>` +
      (t.lvl < 5 ? `<button class="b" onclick="upg()" ${G.coins < upCost(t) ? 'disabled' : ''}>⬆️ MELHORAR <span>${upCost(t)} 💰</span></button>` : '<p>⭐ Nível máximo!</p>') +
      `<button class="b" onclick="sell()">💸 VENDER <span>${Math.floor(t.spent * .6)} 💰</span></button>`;
  } else {
    h = '<h3>' + (sel < 0 ? 'Clique numa plataforma ⭕ do mapa' : 'ESCOLHA SUA DEFESA') + '</h3>';
    for (const id in DEF) { const d = DEF[id]; h += `<button class="b" onclick="buy('${id}')" ${sel < 0 || G.coins < d.c ? 'disabled' : ''}><div>${d.e} ${d.n}<small>${d.i} · dano ${d.d}</small></div><span>${d.c} 💰</span></button>`; }
  }
  p.innerHTML = h;
}

// ---- Clique no mapa: seleciona plataforma
cv.addEventListener('pointerdown', e => {
  if (!G) return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 600 / r.width, y = (e.clientY - r.top) * 600 / r.height;
  const i = PADS.findIndex(p => Math.hypot(p[0] - x, p[1] - y) < 24);
  sel = i; panel();
});

// ---- Atualização principal
function update(dt) {
  G.time += dt; G.shake = Math.max(0, G.shake - dt);
  if (AUTOP[G.au]) gain(AUTOP[G.au] * dt);
  if (G.combo > 0 && performance.now() - G.lastClick > 3000) { G.combo = 0; note('COMBO RESETADO'); }
  if (G.state === 'prep') { G.prep -= dt; if (G.prep <= 0) startWave(); }
  else if (G.state === 'wave') {
    G.sp -= dt;
    if (G.q.length && G.sp <= 0) { spawn(G.q.shift()); G.sp = Math.max(.3, 1.3 - G.wave * .04); }
    if (!G.q.length && !G.en.length) endWave();
  }
  for (const e of G.en) {
    e.slow -= dt; e.stun -= dt;
    if (e.stun <= 0) e.d += e.v * (e.slow > 0 ? .5 : 1) * dt;
    [e.x, e.y] = posAt(e.d);
    if (e.d >= TOT) loseLife(e);
  }
  // defesas procuram o inimigo mais avançado no alcance
  for (const t of G.tw) {
    t.cd -= dt; const d = DEF[t.id], s = stats(t), [px, py] = PADS[t.p];
    if (t.cd > 0) continue;
    let tg = null;
    for (const e of G.en) if (!e.dead && !(d.g && e.air) && Math.hypot(e.x - px, e.y - py) <= s.r && (!tg || e.d > tg.d)) tg = e;
    if (!tg) continue;
    t.cd = 1 / s.s;
    hit(tg, s.d);
    if (d.sp) for (const e of G.en) if (e !== tg && !e.dead && Math.hypot(e.x - tg.x, e.y - tg.y) < d.sp) hit(e, s.d * .6);
    if (d.slow) for (const e of G.en) if (Math.hypot(e.x - tg.x, e.y - tg.y) < (d.sp || 1)) e.slow = 2;
    if (d.stun && Math.random() < .3) tg.stun = .8;
    G.fx.push({k:'shot', x:px, y:py, x2:tg.x, y2:tg.y, t:.15, c:d.col, sp:d.sp});
  }
  G.en = G.en.filter(e => !e.dead);
  for (const f of G.fx) f.t -= dt; G.fx = G.fx.filter(f => f.t > 0);
  for (const f of G.fl) { f.t -= dt; f.y -= 25 * dt; } G.fl = G.fl.filter(f => f.t > 0);
}
function note(s) { G && G.fl.push({x:300, y:300, t:1.5, s, c:'#fff', big:1}); }

// ---- HUD
function hud() {
  if (!G) return;
  $('coins').textContent = fmt(G.coins);
  $('wave').textContent = G.inf ? G.wave : Math.max(G.wave, 1) + ' / ' + MAXW;
  $('lives').textContent = G.lives + ' ' + '❤️'.repeat(Math.max(0, G.lives));
  $('left').textContent = G.en.length + G.q.length;
  $('timer').textContent = G.state === 'prep' ? `Próxima onda em: ${Math.ceil(G.prep)} segundos (clique p/ pular)` : 'Onda em andamento!';
  $('timer').onclick = () => { if (G.state === 'prep') G.prep = 0; };
  $('cn').textContent = G.combo; $('cm').textContent = 'x' + mult();
  $('ups').innerHTML = `<button class="b" onclick="upClick()" ${G.cl > 4 || G.coins < CLICKC[G.cl] ? 'disabled' : ''}><div>👆 FORÇA DO CLIQUE Nv ${G.cl + 1}<small>${CLICKP[G.cl]} moeda(s)/clique</small></div><span>${G.cl > 4 ? 'MAX' : CLICKC[G.cl] + ' 💰'}</span></button>` +
    `<button class="b" onclick="upAuto()" ${G.au > 3 || G.coins < AUTOC[G.au] ? 'disabled' : ''}><div>⚙️ GERADOR Nv ${G.au}<small>+${AUTOP[G.au]} moeda/s</small></div><span>${G.au > 3 ? 'MAX' : AUTOC[G.au] + ' 💰'}</span></button>`;
}
let psig = '';
setInterval(() => {
  hud(); if (!G) return;
  // só redesenha o painel quando algo ficou (in)acessível, para não atrapalhar o clique
  const t = G.tw.find(t => t.p === sel);
  const sig = sel + '|' + (t ? t.lvl + (G.coins >= upCost(t)) : Object.values(DEF).map(d => G.coins >= d.c ? 1 : 0).join(''));
  if (sig !== psig) { psig = sig; panel(); }
}, 300);

// ---- Desenho
function draw() {
  cx.save(); cx.clearRect(0, 0, 600, 600);
  if (G && G.shake) cx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
  cx.fillStyle = '#4f9a2c'; cx.fillRect(0, 0, 600, 600);
  cx.fillStyle = '#5aa834'; for (let i = 0; i < 600; i += 40) for (let j = 0; j < 600; j += 40) if ((i + j) / 40 % 2) cx.fillRect(i, j, 40, 40);
  // caminho de terra
  cx.lineJoin = 'round'; cx.lineCap = 'round';
  for (const [w, c] of [[50, '#7a5a2c'], [40, '#d9b97a']]) { cx.lineWidth = w; cx.strokeStyle = c; cx.beginPath(); PATH.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.stroke(); }
  for (const d of DECO) spr('assets/mapa/' + d[2].codePointAt(0) + '.png', d[2], d[0], d[1], 28);
  // plataformas
  PADS.forEach((p, i) => { cx.beginPath(); cx.arc(p[0], p[1], 22, 0, 7); cx.fillStyle = i === sel ? '#ffe27a' : '#8a8f98'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#444'; cx.stroke(); });
  // torres do reino (3 vidas)
  const L = G ? G.lives : 3;
  [[KING, L >= 1, 'rei', '👑', 58], [PRIN[0], L >= 3, 'princesa', '🏰', 46], [PRIN[1], L >= 2, 'princesa', '🏰', 46]].forEach(([p, ok, f, em, s]) => {
    if (ok) spr('assets/torres/' + f + '.png', em, p[0], p[1], s); else spr('assets/efeitos/ruina.png', '💥', p[0], p[1], 36);
  });
  if (G) {
    for (const t of G.tw) {
      const [x, y] = PADS[t.p], d = DEF[t.id];
      if (t.p === sel) { cx.beginPath(); cx.arc(x, y, stats(t).r, 0, 7); cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.stroke(); }
      spr('assets/personagens/' + t.id + '.png', d.e, x, y, 24 + t.lvl * 3);
      cx.font = '10px sans-serif'; cx.fillStyle = '#ffe27a'; cx.fillText('★'.repeat(t.lvl), x, y + 24);
    }
    for (const e of G.en) {
      const d = ENM[e.id], s = e.id === 'boss' ? 46 : 26;
      spr('assets/inimigos/' + e.id + '.png', d.e, e.x, e.y - (e.air ? 8 : 0), s);
      if (e.slow > 0) { cx.fillStyle = 'rgba(100,200,255,.4)'; cx.beginPath(); cx.arc(e.x, e.y, s / 2, 0, 7); cx.fill(); }
      if (e.stun > 0) { cx.font = '14px serif'; cx.fillText('💫', e.x, e.y - s / 2 - 10); }
      const w = s + 6, y = e.y - s / 2 - 6;  // barra de vida
      cx.fillStyle = '#300'; cx.fillRect(e.x - w / 2, y, w, 5);
      cx.fillStyle = e.hp / e.max > .5 ? '#3d3' : e.hp / e.max > .25 ? '#fc0' : '#e22'; cx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.max), 5);
    }
    for (const f of G.fx) {
      if (f.k === 'shot') { cx.strokeStyle = f.c; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(f.x2, f.y2); cx.stroke(); if (f.sp) { cx.beginPath(); cx.arc(f.x2, f.y2, f.sp * (1 - f.t / .15 * .5), 0, 7); cx.globalAlpha = .35; cx.fillStyle = f.c; cx.fill(); cx.globalAlpha = 1; } }
      else { cx.font = '22px serif'; cx.globalAlpha = f.t / .4; cx.fillText('✨', f.x, f.y); cx.globalAlpha = 1; }
    }
    for (const f of G.fl) { cx.globalAlpha = Math.min(1, f.t); cx.font = (f.big ? 'bold 34px' : 'bold 14px') + ' sans-serif'; cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.strokeText(f.s, f.x, f.y); cx.fillStyle = f.c; cx.fillText(f.s, f.x, f.y); cx.globalAlpha = 1; }
  }
  cx.restore();
}
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (G && G.state !== 'over' && G.state !== 'win' && $('screen').style.display !== 'flex') update(dt);
  draw(); requestAnimationFrame(loop);
}

// ---- Telas: menu, como jogar, personagens, fim de jogo
function show(h) { const s = $('screen'); s.innerHTML = h; s.style.display = 'flex'; }
const btn = (t, f) => `<button class="b" onclick="${f}">${t}</button>`;
function menu() { G && (G.state = 'over'); show(`<h1>⚔️ CLASH DEFENSE</h1><p>Defenda o reino!</p>${btn('JOGAR', 'newGame()')}${btn('COMO JOGAR', 'how()')}${btn('PERSONAGENS', 'chars()')}<p>🏆 Recorde: onda ${SAVE.wave} · maior combo ${SAVE.combo} · ${SAVE.kills} inimigos derrotados</p>`); }
function how() { show(`<h1>COMO JOGAR</h1><p><b>🎯 OBJETIVO</b><br>Defenda as três torres e impeça os inimigos de chegar ao seu reino.</p><p><b>💰 GANHE MOEDAS</b><br>Clique (ou use ESPAÇO) no gerador para criar combos e multiplicadores. Ficar 3s sem clicar zera o combo.</p><p><b>🛡️ CRIE DEFESAS</b><br>Clique numa plataforma cinza do mapa e escolha um personagem.</p><p><b>⬆️ MELHORE SEU EXÉRCITO</b><br>Clique numa defesa para melhorar (até nível 5) ou vender. Melhore também o clique e o gerador.</p>${btn('VOLTAR', 'menu()')}`); }
function chars() {
  show(`<h1>PERSONAGENS</h1><h3>Defesas</h3><div class="grid">${Object.values(DEF).map(d => `<div>${d.e} <b>${d.n}</b> — ${d.c} 💰<br>Dano ${d.d} · Alcance ${d.r} · ${d.s}/s<br>${d.i}</div>`).join('')}</div><h3>Inimigos</h3><div class="grid">${Object.values(ENM).map(d => `<div>${d.e} <b>${d.n}</b> (${d.t})<br>Vida ${d.hp} · Vel. ${d.v} · ${d.r} 💰</div>`).join('')}</div>${btn('VOLTAR', 'menu()')}`);
}
function end(win) {
  G.state = win ? 'win' : 'over';
  SAVE.wave = Math.max(SAVE.wave, G.wave - (win ? 0 : 1)); SAVE.combo = Math.max(SAVE.combo, G.maxCombo); SAVE.kills += G.kills; SAVE.score = Math.max(SAVE.score, G.kills * 10 + G.wave * 100); save();
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  const st = `<p>Ondas sobrevividas: ${Math.max(0, G.wave - (win ? 0 : 1))}<br>Inimigos derrotados: ${fmt(G.kills)}<br>Moedas obtidas: ${fmt(G.earned)}<br>Maior combo: ${G.maxCombo}<br>Torres restantes: ${G.lives}<br>Tempo: ${m}min ${s}s<br>Pontuação: ${fmt(G.kills * 10 + G.wave * 100)}</p>`;
  show(win ? `<h1>VITÓRIA!</h1><h2>VOCÊ DEFENDEU O REINO!</h2>${st}${btn('JOGAR NOVAMENTE', 'newGame()')}${btn('MODO INFINITO', 'infinite()')}` : `<h1>DERROTA!</h1><h2>O REINO FOI DESTRUÍDO</h2>${st}${btn('RECOMEÇAR PARTIDA', 'newGame()')}${btn('MENU', 'menu()')}`);
}
function infinite() { G.inf = true; G.state = 'prep'; G.prep = 10; $('screen').style.display = 'none'; }

menu(); requestAnimationFrame(loop);
