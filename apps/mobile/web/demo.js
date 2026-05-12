const SCENES = [
  { id: 's0', duration: 2800,  enter: enterS0 },
  { id: 's1', duration: 5000,  enter: enterS1 },
  { id: 's2', duration: 7500,  enter: enterS2 },
  { id: 's3', duration: 5500,  enter: enterS3 },
  { id: 's4', duration: 6500,  enter: enterS4 },
  { id: 's5', duration: 6000,  enter: enterS5 },
  { id: 's6', duration: 6500,  enter: enterS6 },
  { id: 's7', duration: 99999, enter: enterS7 },
];
const totalDuration = SCENES.slice(0,-1).reduce((s, sc) => s + sc.duration, 0);

let current = 0;
let sceneTimer = null;
let progressStart = Date.now();
let progressBase = 0;

function el(id) { return document.getElementById(id); }

function show(id, delayMs) {
  setTimeout(() => { const e = el(id); if(e) e.classList.add('shown'); }, delayMs || 0);
}

function enterS0() {
  setTimeout(() => el('logo-icon').classList.add('pop'), 200);
}

function enterS1() { /* handled by CSS on .active */ }

function enterS2() {
  show('s2-caption', 100);
  show('phone', 200);
  ['prod1','prod2','prod3'].forEach((id,i) => show(id, 600 + i*180));
  show('par1', 1400);
  show('par2', 2200);
  show('par3', 3100);
  let secs = 44*60+32;
  const timerEl = el('timer-display');
  const tick = setInterval(() => {
    secs--;
    if(secs < 0 || current !== 2) { clearInterval(tick); return; }
    const m = Math.floor(secs/60), s = secs%60;
    timerEl.textContent = `${m}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

function enterS3() {
  setTimeout(() => { el('ws-label').style.opacity='1'; }, 200);
  show('ws-bubble', 500);
}

function enterS4() {
  setTimeout(() => { el('savings-title').style.opacity='1'; }, 100);
  show('je1', 400);
  show('je2', 1100);
  show('je3', 1800);
  setTimeout(() => {
    const t = el('prog-track'); if(t) t.style.opacity='1';
    setTimeout(() => {
      const f = el('prog-fill'); if(f) f.style.width = '103%';
      setTimeout(() => show('unlock-badge', 0), 1400);
    }, 200);
  }, 2400);
}

function enterS5() {
  const kicker = document.querySelector('#s5 .escrow-kicker');
  const heading = document.querySelector('#s5 .escrow-heading');
  const body = document.querySelector('#s5 .escrow-body');
  setTimeout(() => { if(kicker) kicker.style.opacity='1'; }, 100);
  setTimeout(() => { if(heading) heading.style.opacity='1'; }, 350);
  setTimeout(() => { if(body) body.style.opacity='1'; }, 650);
  show('pc1', 500); show('pc2', 1100); show('pc3', 1700); show('pc4', 2700);
  setTimeout(() => { const e=el('escrow-lock'); if(e) e.style.opacity='1'; }, 1200);
}

function enterS6() {
  const lbl = document.querySelector('#s6 .comm-label');
  const sub = el('comm-sub');
  const ctr = el('comm-counter');
  setTimeout(() => { if(lbl) lbl.style.opacity='1'; }, 100);
  setTimeout(() => { if(ctr) ctr.style.opacity='1'; animateCounter(ctr, 0, 43.5, 1800, '₪', ''); }, 400);
  setTimeout(() => { if(sub) sub.style.opacity='1'; }, 600);
  setTimeout(() => {
    ['sc-b1','sc-b2','sc-b3','sc-b4'].forEach((id,i) => setTimeout(()=>show(id,0), i*200));
    ['sc-n1','sc-n2','sc-n3','sc-n4'].forEach((id,i) => setTimeout(()=>show(id,0), i*200+100));
  }, 2400);
}

function enterS7() {
  const t = el('outro-tagline'), l = el('outro-logo'), c = el('outro-cta');
  setTimeout(() => {
    if(t) { t.style.opacity='1'; t.style.transform='translateY(0)'; }
  }, 300);
  setTimeout(() => { if(l) l.style.opacity='1'; }, 900);
  setTimeout(() => { if(c) c.classList.add('shown'); }, 1400);
}

function animateCounter(el, from, to, duration, prefix, suffix) {
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1-p, 3);
    const val = from + (to - from) * ease;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
    el.textContent = prefix + formatted + suffix;
    if(p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateDots() {
  const container = el('scene-dots');
  if(!container) return;
  container.innerHTML = '';
  SCENES.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'sdot' + (i === current ? ' active' : '');
    d.onclick = (e) => { e.stopPropagation(); goToScene(i); };
    container.appendChild(d);
  });
}

function goToScene(idx) {
  if(sceneTimer) clearTimeout(sceneTimer);
  SCENES.forEach((sc, i) => {
    const e = el(sc.id);
    if(!e) return;
    e.classList.toggle('active', i === idx);
  });
  current = idx;
  progressBase = SCENES.slice(0, idx).reduce((s,sc)=>s+sc.duration,0);
  progressStart = Date.now();
  updateDots();
  SCENES[idx].enter();
  const isLast = idx === SCENES.length - 1;
  const replayBtn = el('replay-btn');
  const skipBtn = el('skip-btn');
  if(replayBtn) replayBtn.style.display = isLast ? 'block' : 'none';
  if(skipBtn) skipBtn.style.display = isLast ? 'none' : 'block';
  if(!isLast) {
    sceneTimer = setTimeout(() => goToScene(idx+1), SCENES[idx].duration);
  }
}

function skipToEnd() {
  if(sceneTimer) clearTimeout(sceneTimer);
  goToScene(SCENES.length - 1);
}

function replayDemo() {
  document.querySelectorAll('.shown').forEach(e => e.classList.remove('shown'));
  document.querySelectorAll('.pop').forEach(e => e.classList.remove('pop'));
  document.querySelectorAll('.active').forEach(e => e.classList.remove('active'));
  const fill = el('prog-fill'); if(fill) fill.style.width='0%';
  const ctr = el('comm-counter'); if(ctr) ctr.textContent='₪0';
  goToScene(0);
}

(function tickProgress() {
  const scDur = SCENES[current]?.duration || 99999;
  const elapsed = progressBase + Math.min(Date.now() - progressStart, scDur);
  const pct = Math.min(elapsed / totalDuration * 100, 100);
  const bar = el('progress-bar');
  if(bar) bar.style.width = pct + '%';
  requestAnimationFrame(tickProgress);
})();

document.addEventListener('keydown', (e) => {
  if(e.key === 'ArrowRight' && current < SCENES.length - 1) goToScene(current + 1);
  if(e.key === 'ArrowLeft' && current > 0) goToScene(current - 1);
  if(e.key === 'Escape') skipToEnd();
  if(e.key === 'r' || e.key === 'R') replayDemo();
});

document.getElementById('stage').addEventListener('click', () => {
  if(current < SCENES.length - 1) goToScene(current + 1);
});

updateDots();
goToScene(0);
