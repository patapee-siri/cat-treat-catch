(function(){
  "use strict";

  function vibrate(pattern){
    try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
  }

  /* ---------------- Sound engine (synthesized, no downloads needed) ---------------- */
  let audioCtx = null;
  function ensureAudio(){
    try{
      if(!audioCtx){
        const AC = window.AudioContext || window.webkitAudioContext;
        if(AC) audioCtx = new AC();
      }
      if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }catch(e){}
  }
  // Schedules a short tone with a pitch sweep and a quick attack/release envelope.
  let muted = false;
  try{ muted = localStorage.getItem('catGameMuted') === '1'; }catch(e){}

  function tone({freq=600, freqEnd=null, duration=0.12, type='sine', gain=0.18, delay=0}){
    if(!audioCtx || muted) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if(freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd,1), t0+duration);
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(gain, t0+0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
    osc.connect(gn).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0+duration+0.02);
  }
  function playClick(){
    ensureAudio();
    tone({freq:520, freqEnd:680, duration:0.06, type:'triangle', gain:0.12});
  }
  function playCatch(streak){
    ensureAudio();
    const pitch = 720 + Math.min(streak,10)*22;
    tone({freq:pitch, freqEnd:pitch*1.5, duration:0.1, type:'sine', gain:0.2});
    tone({freq:pitch*1.5, freqEnd:pitch*2, duration:0.08, type:'sine', gain:0.1, delay:0.03});
  }
  function playBad(){
    ensureAudio();
    tone({freq:320, freqEnd:110, duration:0.35, type:'sawtooth', gain:0.15});
  }
  function playFanfare(){
    ensureAudio();
    [660,880,1100].forEach((f,i)=> tone({freq:f, freqEnd:f*1.15, duration:0.16, type:'triangle', gain:0.16, delay:i*0.11}));
  }

  /* ---------------- Cat avatars: real photos of the 3 actual cats ---------------- */
  const CATS = [
    { name:"ครุกแชงค์ส", pros:["ขี้อ้อนมากกกก!","จำชื่อตัวเองได้"], cons:["ฉี่เหม็น"], src:"img/crookshanks.png" },
    { name:"จินนี่", pros:["ขี้อ้อนบางเวลา","ฉลาด","กลบขี้เก่ง"], cons:["ดื้อมาก","ขี้สงสัยเกินเหตุ"], src:"img/ginny.png" },
    { name:"ลูมอส", pros:["น่ารัก","กอดอุ่น","เสียงหวาน"], cons:["ขี้ผิดที่"], src:"img/lumos.png" },
  ];

  let selectedCat = 0;

  /* Populate the cover badge with the 3 real cat photos */
  const badgeCatsEl = document.getElementById('badgeCats');
  if(badgeCatsEl){
    CATS.forEach(c=>{
      const img = document.createElement('img');
      img.src = c.src;
      img.alt = c.name;
      badgeCatsEl.appendChild(img);
    });
  }

  /* ---------------- Screen navigation ---------------- */
  const screens = {
    intro: document.getElementById('introScreen'),
    select: document.getElementById('selectScreen'),
    game: document.getElementById('gameScreen'),
    over: document.getElementById('overScreen'),
  };
  function show(name){
    Object.values(screens).forEach(s=>s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  /* Build cat select UI */
  const catSelectEl = document.getElementById('catSelect');
  CATS.forEach((c, i)=>{
    const div = document.createElement('div');
    div.className = 'cat-option' + (i===selectedCat ? ' selected':'');
    div.innerHTML = `<img src="${c.src}" alt="${c.name}"><span>${c.name}</span><div class="cat-info-btn">ⓘ</div>`;
    div.addEventListener('click', ()=>{
      selectedCat = i;
      vibrate(10);
      playClick();
      [...catSelectEl.children].forEach((el,idx)=> el.classList.toggle('selected', idx===i));
    });
    div.querySelector('.cat-info-btn').addEventListener('click', (e)=>{
      e.stopPropagation();
      playClick();
      openTrivia(i);
    });
    catSelectEl.appendChild(div);
  });

  /* ---------------- Cat trivia modal ---------------- */
  const triviaModal = document.getElementById('triviaModal');
  function openTrivia(i){
    const c = CATS[i];
    document.getElementById('triviaImg').src = c.src;
    document.getElementById('triviaImg').alt = c.name;
    document.getElementById('triviaName').textContent = c.name;
    document.getElementById('triviaGood').innerHTML = c.pros.map(p=>`<li>${p}</li>`).join('');
    document.getElementById('triviaBad').innerHTML = c.cons.map(p=>`<li>${p}</li>`).join('');
    triviaModal.classList.remove('hidden');
  }
  document.getElementById('triviaCloseBtn').addEventListener('click', ()=>{
    playClick();
    triviaModal.classList.add('hidden');
  });
  triviaModal.addEventListener('click', (e)=>{ if(e.target===triviaModal) triviaModal.classList.add('hidden'); });

  document.getElementById('toSelectBtn').addEventListener('click', ()=>{ ensureAudio(); playClick(); show('select'); });
  document.getElementById('backToIntroBtn').addEventListener('click', ()=>{ playClick(); show('intro'); });
  document.getElementById('startGameBtn').addEventListener('click', ()=>{ playClick(); show('game'); startGame(); });
  document.getElementById('retryBtn').addEventListener('click', ()=>{ playClick(); show('game'); startGame(); });
  document.getElementById('changeCatBtn').addEventListener('click', ()=>{ playClick(); show('select'); });

  /* ---------------- Sound mute toggle ---------------- */
  const soundToggleEl = document.getElementById('soundToggle');
  function updateSoundIcon(){ soundToggleEl.textContent = muted ? '🔇' : '🔊'; }
  updateSoundIcon();
  soundToggleEl.addEventListener('click', ()=>{
    muted = !muted;
    try{ localStorage.setItem('catGameMuted', muted ? '1':'0'); }catch(e){}
    updateSoundIcon();
    if(!muted){ ensureAudio(); playClick(); }
  });

  /* ---------------- Day / night theme ---------------- */
  let currentTheme = 'day';
  function computeAutoTheme(){
    const h = new Date().getHours();
    return (h>=6 && h<18) ? 'day' : 'night';
  }
  function applyTheme(t){
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('themeToggle').textContent = t==='night' ? '🌙' : '☀️';
  }
  let themePref = 'auto';
  try{ themePref = localStorage.getItem('catGameTheme') || 'auto'; }catch(e){}
  applyTheme(themePref==='auto' ? computeAutoTheme() : themePref);
  document.getElementById('themeToggle').addEventListener('click', ()=>{
    playClick();
    const next = currentTheme==='day' ? 'night' : 'day';
    try{ localStorage.setItem('catGameTheme', next); }catch(e){}
    applyTheme(next);
  });

  /* ---------------- Confetti ---------------- */
  function burstConfetti(n){
    const layer = document.getElementById('confettiLayer');
    const colors = ['#ff8fb3','#ffd166','#c9a7ff','#ff6f91','#7fd8be'];
    for(let i=0;i<n;i++){
      const el = document.createElement('div');
      el.className='confetti';
      const size = 6+Math.random()*6;
      el.style.width = size+'px';
      el.style.height = (size*1.3)+'px';
      el.style.left = (Math.random()*100)+'vw';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.animationDuration = (2+Math.random()*1.5)+'s';
      layer.appendChild(el);
      setTimeout(()=> el.remove(), 3600);
    }
  }
  burstConfetti(40);

  /* ---------------- Game ---------------- */
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W=0, H=0, DPR=1;
  let groundH=0, groundTopY=0;
  const groundDots = [];
  let hillFarPts = [], hillNearPts = [];
  const starPts = [];
  const FLOWER_COLORS = ['#ff8fb3','#ffd166','#ffffff','#c9a7ff'];

  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W+'px';
    canvas.style.height = H+'px';
    canvas.width = W*DPR;
    canvas.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);

    // Ground band: ~16% of screen height gives the cat a clear floor
    // to stand on instead of floating in empty gradient.
    groundH = Math.max(70, Math.min(130, H*0.16));
    groundTopY = H - groundH;

    // Precompute rolling cartoon hills (two depth layers) once per resize.
    hillFarPts = []; hillNearPts = [];
    const steps = 24;
    for(let i=0;i<=steps;i++){
      const x = (i/steps)*W;
      hillFarPts.push({ x, y: groundTopY - H*0.05 - Math.sin(i/steps*Math.PI*2.4 + 0.6)*H*0.022 });
      hillNearPts.push({ x, y: groundTopY - H*0.012 - Math.sin(i/steps*Math.PI*2.0 + 2.1)*H*0.03 });
    }

    // Precompute ground texture (tiny cartoon flowers + pebbles) once per resize.
    groundDots.length = 0;
    const dotCount = Math.floor(W/30);
    for(let i=0;i<dotCount;i++){
      groundDots.push({
        x: (i+0.5)*(W/dotCount) + (Math.random()-0.5)*12,
        y: groundTopY + groundH*0.32 + Math.random()*groundH*0.55,
        r: 2.5+Math.random()*2,
        flower: Math.random() < 0.35,
        color: FLOWER_COLORS[Math.floor(Math.random()*FLOWER_COLORS.length)],
      });
    }

    // Precompute twinkling stars for the night theme.
    starPts.length = 0;
    const starCount = Math.floor(W/22);
    for(let i=0;i<starCount;i++){
      starPts.push({
        x: Math.random()*W,
        y: Math.random()*(groundTopY*0.85),
        r: 1+Math.random()*1.8,
        phase: Math.random()*Math.PI*2,
      });
    }
  }
  window.addEventListener('resize', resize);

  function drawHillLayer(pts, color){
    ctx.beginPath();
    ctx.moveTo(0, groundTopY+40);
    ctx.lineTo(pts[0].x, pts[0].y);
    for(const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W, groundTopY+40);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawCartoonCloud(x, y, r){
    // All lobes are filled as ONE path with the same solid color, so the
    // union reads as a single smooth blob — no internal seam lines from
    // overlapping circles (that only happens if each lobe gets stroked).
    const lobes = [
      {dx:-r*0.9, dy:r*0.15, rr:r*0.55},
      {dx:-r*0.25, dy:-r*0.25, rr:r*0.72},
      {dx:r*0.45, dy:-r*0.05, rr:r*0.6},
      {dx:r*0.95, dy:r*0.18, rr:r*0.45},
    ];
    ctx.save();
    ctx.shadowColor = 'rgba(120,90,150,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for(const l of lobes){ ctx.moveTo(x+l.dx+l.rr, y+l.dy); ctx.arc(x+l.dx, y+l.dy, l.rr, 0, Math.PI*2); }
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(x, y, r, color){
    ctx.fillStyle = color;
    for(let a=0;a<4;a++){
      const ang = a*(Math.PI/2) + Math.PI/4;
      ctx.beginPath();
      ctx.arc(x+Math.cos(ang)*r*0.9, y+Math.sin(ang)*r*0.9, r*0.55, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y, r*0.5, 0, Math.PI*2);
    ctx.fill();
  }

  const GOOD_EMOJI = ['🐟','🍗','🍣','🧶','🐾'];
  const BAD_EMOJI = ['🥒','💣'];

  let player, items, particles, clouds, score, best, speedMult, spawnTimer, running, lastTs;
  let combo = 0, lastCatchTime = 0, magnetUntil = 0;
  const COMBO_WINDOW = 1200; // ms between catches to keep the combo alive
  const MAGNET_DURATION = 4000; // ms the magnet power-up stays active

  /* ---------------- Top-5 leaderboard (localStorage) ---------------- */
  function loadTop5(){
    try{
      const raw = localStorage.getItem('catGameTop5');
      if(raw) return JSON.parse(raw);
      // Migrate the old single-best-score key if this is an upgraded save.
      const old = parseInt(localStorage.getItem('catGameBest')||'0',10);
      if(old>0) return [{score:old, date:''}];
    }catch(e){}
    return [];
  }
  function saveTop5(list){
    try{ localStorage.setItem('catGameTop5', JSON.stringify(list)); }catch(e){}
  }
  function addScoreToTop5(score){
    const list = loadTop5();
    const d = new Date();
    list.push({ score, date: `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}` });
    list.sort((a,b)=> b.score - a.score);
    const top5 = list.slice(0,5);
    saveTop5(top5);
    return top5;
  }
  function getBestScore(){
    const list = loadTop5();
    return list.length ? list[0].score : 0;
  }
  function renderLeaderboard(){
    const list = loadTop5();
    const el = document.getElementById('leaderboardList');
    if(!list.length){
      el.innerHTML = '<li style="justify-content:center;">ยังไม่มีสถิติ เล่นเลย!</li>';
      return;
    }
    el.innerHTML = list.map((item,i)=>
      `<li><span><span class="rank">#${i+1}</span>${item.score} คะแนน</span><span class="date">${item.date||''}</span></li>`
    ).join('');
  }
  const leaderboardModal = document.getElementById('leaderboardModal');
  document.getElementById('leaderboardBtn').addEventListener('click', ()=>{
    playClick();
    renderLeaderboard();
    leaderboardModal.classList.remove('hidden');
  });
  document.getElementById('leaderboardCloseBtn').addEventListener('click', ()=>{
    playClick();
    leaderboardModal.classList.add('hidden');
  });
  leaderboardModal.addEventListener('click', (e)=>{ if(e.target===leaderboardModal) leaderboardModal.classList.add('hidden'); });

  function startGame(){
    resize();
    // Player is sized ~13% of viewport height: big enough to read at a
    // glance and meet touch-friendly proportions, small enough not to
    // dominate the play field. Items are ~40% of the player's size so
    // they read clearly as "catchable" objects against the cat.
    const catSize = Math.max(64, Math.min(120, H*0.13));
    player = {
      x: W/2, y: groundTopY + groundH*0.28,
      w: catSize, h: catSize,
      targetX: W/2,
      squash: 1,
    };
    items = [];
    particles = [];
    clouds = [];
    for(let i=0;i<3;i++){
      clouds.push({
        x: (i+0.3)*(W/3) + (Math.random()-0.5)*40,
        y: 30+Math.random()*(H*0.14),
        r: 22+Math.random()*16, speed: 6+Math.random()*8,
      });
    }
    score = 0;
    best = getBestScore();
    speedMult = 1;
    spawnTimer = 0;
    running = true;
    lastTs = performance.now();
    combo = 0;
    lastCatchTime = 0;
    magnetUntil = 0;
    document.getElementById('scoreLabel').textContent = '0';
    document.getElementById('bestLabel').textContent = String(best);
    document.getElementById('magnetGlow').classList.remove('on');
    document.getElementById('comboPill').classList.remove('show');
    showFirstTimeHint();
    requestAnimationFrame(loop);
  }

  function showFirstTimeHint(){
    let shown = false;
    try{ shown = localStorage.getItem('catGameHintShown') === '1'; }catch(e){}
    if(shown) return;
    try{ localStorage.setItem('catGameHintShown', '1'); }catch(e){}
    const el = document.createElement('div');
    el.className = 'hint-overlay';
    el.textContent = '👆 ลากนิ้วซ้าย-ขวาเพื่อขยับแมว';
    document.getElementById('gameScreen').appendChild(el);
    setTimeout(()=> el.remove(), 2700);
  }

  function itemSize(){
    // Items sized relative to the player's footprint, not the screen,
    // so the proportion stays consistent across devices.
    return Math.max(24, Math.min(46, player.h*0.4)) + Math.random()*8;
  }

  function spawnItem(){
    const roll = Math.random();
    let isBad = false, isMagnet = false, emoji;
    if(roll < 0.05 && score >= 2){
      isMagnet = true;
      emoji = '🧲';
    } else if(roll < 0.05 + 0.26){
      isBad = true;
      emoji = BAD_EMOJI[Math.floor(Math.random()*BAD_EMOJI.length)];
    } else {
      emoji = GOOD_EMOJI[Math.floor(Math.random()*GOOD_EMOJI.length)];
    }
    items.push({
      x: 20 + Math.random()*(W-40),
      y: -30,
      size: itemSize(),
      vy: (120 + Math.random()*70) * speedMult,
      emoji,
      bad: isBad,
      magnet: isMagnet,
      rot: Math.random()*Math.PI*2,
    });
  }

  // Pre-load each cat's real photo once for canvas drawing
  const catImageCache = {};
  function getCatImage(i){
    if(catImageCache[i]) return catImageCache[i];
    const img = new Image();
    img.src = CATS[i].src;
    catImageCache[i] = img;
    return img;
  }

  // Draws a cat photo as a circular sprite with a soft badge behind it,
  // so the real face reads cleanly against any background layer.
  function drawCatSprite(img, w, h){
    // The source PNG already has a transparent background and a natural
    // (non-circular) fur silhouette — draw it as-is, no opaque backdrop
    // or circular clip, so it blends into the scene instead of looking
    // like a badge/sticker.
    ctx.drawImage(img, -w/2, -h/2, w, h);
  }

  function spawnParticles(x,y,color,count){
    for(let i=0;i<count;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = 40+Math.random()*70;
      particles.push({
        x, y,
        vx: Math.cos(ang)*spd,
        vy: Math.sin(ang)*spd - 40,
        life: 0.5+Math.random()*0.3,
        maxLife: 0.5+Math.random()*0.3,
        r: 2+Math.random()*2.5,
        color,
      });
    }
  }

  function drawBackground(t){
    // Sky
    const sky = ctx.createLinearGradient(0,0,0,groundTopY+20);
    const skyTop = getComputedStyle(document.documentElement).getPropertyValue('--sky-top').trim() || '#ffe1ef';
    const skyBottom = getComputedStyle(document.documentElement).getPropertyValue('--sky-bottom').trim() || '#b79bf0';
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,W,groundTopY+20);

    const isNight = currentTheme === 'night';

    if(isNight){
      // Twinkling stars
      for(const s of starPts){
        const a = 0.3 + 0.6*Math.abs(Math.sin(t*1.5 + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // Cute cartoon sun/moon mascot (gentle bob + soft glow, top-right)
    const sunX = W*0.8, sunY = H*0.13 + Math.sin(t*0.8)*6, sunR = Math.max(30, Math.min(52, W*0.11));
    const glow = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*3.2);
    glow.addColorStop(0, isNight ? 'rgba(210,200,255,0.35)' : 'rgba(255,255,255,0.5)');
    glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,W,groundTopY+20);

    if(isNight){
      // Crescent moon with a sleepy face
      ctx.fillStyle = '#f5f0ff';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--sky-top').trim() || '#1c1436';
      ctx.beginPath(); ctx.arc(sunX+sunR*0.42, sunY-sunR*0.15, sunR*0.85, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#5b3a52'; ctx.lineWidth = sunR*0.05; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(sunX-sunR*0.28, sunY-sunR*0.02, sunR*0.1, 0.1*Math.PI, 0.9*Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(sunX-sunR*0.02, sunY-sunR*0.02, sunR*0.1, 0.1*Math.PI, 0.9*Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(sunX-sunR*0.15, sunY+sunR*0.16, sunR*0.14, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(t*0.06);
      ctx.fillStyle = 'rgba(255,214,102,0.9)';
      for(let i=0;i<8;i++){
        const ang = i*(Math.PI/4);
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang)*sunR*1.35, Math.sin(ang)*sunR*1.35, sunR*0.32, sunR*0.12, ang, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5b3a52';
      ctx.beginPath(); ctx.arc(sunX-sunR*0.28, sunY-sunR*0.08, sunR*0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sunX+sunR*0.28, sunY-sunR*0.08, sunR*0.08, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#5b3a52'; ctx.lineWidth = sunR*0.06; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(sunX, sunY+sunR*0.05, sunR*0.32, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
    }

    // Sticker-style fluffy clouds
    for(const c of clouds){
      c.x += c.speed*(1/60);
      if(c.x - c.r*2 > W) c.x = -c.r*2;
      drawCartoonCloud(c.x, c.y, c.r);
    }

    // Layered cartoon hills for depth, just above the ground band
    drawHillLayer(hillFarPts, getComputedStyle(document.documentElement).getPropertyValue('--hill-far').trim() || '#d9c3f5');
    drawHillLayer(hillNearPts, getComputedStyle(document.documentElement).getPropertyValue('--hill-near').trim() || '#c9a7ff');

    // Ground band — gives the cat a clear floor to stand on
    const groundTop = getComputedStyle(document.documentElement).getPropertyValue('--ground-top').trim() || '#e8a6c9';
    const groundBottom = getComputedStyle(document.documentElement).getPropertyValue('--ground-bottom').trim() || '#c884b0';
    const groundGrad = ctx.createLinearGradient(0,groundTopY,0,H);
    groundGrad.addColorStop(0, groundTop);
    groundGrad.addColorStop(1, groundBottom);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundTopY, W, groundH);

    // Highlight edge on the horizon line
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, groundTopY, W, 3);

    // Ground texture: tiny cartoon flowers + soft pebbles
    for(const d of groundDots){
      if(d.flower) drawFlower(d.x, d.y, d.r, d.color);
      else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function loop(ts){
    if(!running) return;
    const dt = Math.min((ts-lastTs)/1000, 0.05);
    lastTs = ts;

    // smooth follow
    player.x += (player.targetX - player.x) * Math.min(dt*10, 1);
    player.x = Math.max(player.w/2, Math.min(W-player.w/2, player.x));
    player.squash += (1-player.squash) * Math.min(dt*8, 1);

    spawnTimer -= dt;
    if(spawnTimer <= 0){
      spawnItem();
      spawnTimer = Math.max(0.35, 0.9 - speedMult*0.05);
    }
    speedMult += dt*0.012;

    ctx.clearRect(0,0,W,H);
    drawBackground(ts/1000);

    const magnetActive = ts < magnetUntil;
    document.getElementById('magnetGlow').classList.toggle('on', magnetActive);

    // items
    for(let i=items.length-1; i>=0; i--){
      const it = items[i];
      it.y += it.vy*dt;
      it.rot += dt*2;
      if(magnetActive && !it.bad){
        it.x += (player.x - it.x) * Math.min(dt*3, 1);
      }

      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.rot)*0.18);

      ctx.font = it.size+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor = it.bad ? 'rgba(180,30,30,0.5)' : (it.magnet ? 'rgba(255,214,102,0.6)' : 'rgba(40,20,50,0.4)');
      ctx.shadowBlur = it.magnet ? 12 : 6;
      ctx.shadowOffsetY = 2;
      // Reset to a fully opaque fill before drawing the glyph — leaving the
      // backdrop disc's translucent color active here made emoji fall back
      // to a washed-out tinted silhouette on renderers without a true
      // full-color emoji font.
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 1;
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();

      // collision with player (simple box, scaled by squash)
      const px1 = player.x - player.w/2, px2 = player.x + player.w/2;
      const py1 = player.y - (player.h/2)*player.squash, py2 = player.y + (player.h/2)*player.squash + player.h*0.15;
      if(it.y+it.size*0.3 > py1 && it.y < py2 && it.x > px1 && it.x < px2){
        if(it.bad){
          spawnParticles(it.x, it.y, '255,90,90', 10);
          vibrate([40,30,60]);
          playBad();
          endGame();
          return;
        } else {
          // Combo: catches landing within COMBO_WINDOW of each other chain up.
          if(ts - lastCatchTime < COMBO_WINDOW) combo += 1; else combo = 1;
          lastCatchTime = ts;
          const bonus = combo>=3 ? Math.floor(combo/3) : 0;
          score += 1 + bonus;
          document.getElementById('scoreLabel').textContent = String(score);
          spawnFloatText(it.x, it.y, bonus>0 ? `+${1+bonus}` : '+1');
          spawnParticles(it.x, it.y, '255,214,102', 8);
          player.squash = 0.78;
          vibrate(10);
          playCatch(score);

          if(combo>=2){
            const pill = document.getElementById('comboPill');
            pill.textContent = `🔥 COMBO x${combo}`;
            pill.classList.add('show');
            clearTimeout(pill._hideTimer);
            pill._hideTimer = setTimeout(()=> pill.classList.remove('show'), 1000);
          }

          if(it.magnet){
            magnetUntil = ts + MAGNET_DURATION;
            spawnFloatText(it.x, it.y-24, '🧲 แม่เหล็ก!');
            spawnParticles(it.x, it.y, '255,214,102', 14);
          }
        }
        items.splice(i,1);
        continue;
      }
      if(it.y - it.size > H+20){
        items.splice(i,1);
      }
    }

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.life -= dt;
      if(p.life<=0){ particles.splice(i,1); continue; }
      p.x += p.vx*dt;
      p.y += p.vy*dt;
      p.vy += 90*dt;
      const alpha = Math.max(0, p.life/p.maxLife);
      ctx.fillStyle = `rgba(${p.color},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }

    // shadow under cat (grounds it visually; squashes wider on catch)
    const shadowScale = 2 - player.squash;
    ctx.fillStyle = 'rgba(91,58,82,0.22)';
    ctx.beginPath();
    ctx.ellipse(player.x, groundTopY + groundH*0.22, player.w*0.32*shadowScale, player.h*0.1*shadowScale, 0, 0, Math.PI*2);
    ctx.fill();

    // draw player cat with squash/stretch
    const img = getCatImage(selectedCat);
    const scaleY = player.squash;
    const scaleX = 2 - player.squash;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(scaleX, scaleY);
    drawCatSprite(img, player.w, player.h);
    ctx.restore();

    requestAnimationFrame(loop);
  }

  function spawnFloatText(x,y,text){
    const el = document.createElement('div');
    el.className='heart-burst';
    el.textContent = text;
    el.style.left = x+'px';
    el.style.top = y+'px';
    el.style.color = '#ff6f91';
    document.getElementById('gameScreen').appendChild(el);
    setTimeout(()=>el.remove(), 1000);
  }

  // Toast that works regardless of which screen is currently visible
  // (spawnFloatText targets #gameScreen, which is hidden on other screens).
  function showToast(text){
    const el = document.createElement('div');
    el.className='heart-burst';
    el.textContent = text;
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%,-50%)';
    el.style.color = '#ff6f91';
    el.style.fontSize = '16px';
    document.getElementById('app').appendChild(el);
    setTimeout(()=>el.remove(), 1400);
  }

  function flashScreen(){
    const el = document.createElement('div');
    el.className='flash-overlay';
    document.getElementById('gameScreen').appendChild(el);
    setTimeout(()=>el.remove(), 400);
  }

  const END_MESSAGES = [
    'พวกเรารักแม่นะ! 💕',
    'แมวๆ ขอบใจที่มาเล่นด้วยนะ 🐾',
    'เก่งมาก! ไปเล่นกับแมวตัวจริงมั้ย? 😹',
    'ของว่างหมดแล้ว มาเติมใหม่กันเถอะ 🍣',
    'หิวจัง เล่นอีกตาได้ป่ะ? 🥺',
  ];

  function endGame(){
    running = false;
    flashScreen();
    const isNewBest = score > best;
    addScoreToTop5(score);
    if(isNewBest) best = score;
    document.getElementById('finalScore').textContent = String(score);
    document.getElementById('bestMsg').textContent = isNewBest ? '🎉 สถิติใหม่!' : ('สถิติสูงสุด: '+best);
    document.getElementById('overMsg').textContent = END_MESSAGES[Math.floor(Math.random()*END_MESSAGES.length)];
    if(isNewBest){ burstConfetti(50); setTimeout(playFanfare, 300); }
    setTimeout(()=> show('over'), 220);
  }

  /* ---------------- Share score ---------------- */
  document.getElementById('shareBtn').addEventListener('click', async ()=>{
    playClick();
    const text = `ฉันได้ ${score} คะแนนใน Cat Treat Catch! 🐱 มาเล่นกันเถอะ`;
    try{
      if(navigator.share){
        await navigator.share({ title:'Cat Treat Catch', text, url: location.href });
      } else if(navigator.clipboard){
        await navigator.clipboard.writeText(text + ' ' + location.href);
        showToast('คัดลอกแล้ว! 📋');
      }
    }catch(e){ /* user cancelled share sheet — ignore */ }
  });

  // Touch / mouse control
  function pointerMove(clientX){
    if(!running) return;
    const rect = canvas.getBoundingClientRect();
    player.targetX = clientX - rect.left;
  }
  canvas.addEventListener('touchstart', e=>{ pointerMove(e.touches[0].clientX); }, {passive:true});
  canvas.addEventListener('touchmove', e=>{ pointerMove(e.touches[0].clientX); }, {passive:true});
  canvas.addEventListener('mousedown', e=>{ pointerMove(e.clientX); });
  canvas.addEventListener('mousemove', e=>{ if(e.buttons===1) pointerMove(e.clientX); });

  resize();
})();
