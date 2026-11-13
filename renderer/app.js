'use strict';

/* ============================================================
   四季转盘 · 桌宠渲染核心
   ============================================================ */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const canvas = document.getElementById('stage');
let ctx = canvas.getContext('2d');
const menuEl = document.getElementById('menu');
const tipEl = document.getElementById('tip');

const ipc = (window.pet && window.pet.send) ? window.pet : { send() {}, on() {}, invoke: async () => null };

/* ---------------- 配置 ---------------- */

const SIZES = { s: [380, 268], m: [500, 352], l: [650, 458] };

const CFG = {
  seasonMode: 'auto',      // auto | real | fixed
  fixedSeason: 'spring',
  interval: 60,            // 每种季节停留秒数（含扫动）
  showClock: true,
  showTicks: true,
  size: 'm',
  topmost: true,
  clickThrough: false,
  autoStart: false,
  turbo: false,            // 加速轮转：15 秒一圈，每转到 12 点换季（纯视觉，不影响时间）
  ver: 3
};

let savedCfg = {};
try {
  savedCfg = JSON.parse(localStorage.getItem('fs-turn-cfg') || '{}') || {};
} catch (e) { savedCfg = {}; }
Object.assign(CFG, savedCfg);
function saveCfg() {
  try { localStorage.setItem('fs-turn-cfg', JSON.stringify(CFG)); } catch (e) {}
}
// 旧版本迁移：判定依据必须是「存档里的 ver」，不能看默认值
if (savedCfg.ver !== 3) {
  CFG.clickThrough = false;          // 穿透默认不勾
  CFG.interval = 60;                 // 轮转间隔默认 60s
  CFG.size = 'm';                    // 尺寸档默认「中」
  CFG.seasonMode = 'auto';           // 季节默认「自动轮转」
  delete CFG.starfield;              // 星空背景已取消
  CFG.ver = 3;
  saveCfg();
}

/* ---------------- 季节色板 ---------------- */

const PAL = {
  spring: {
    key: 'spring', cn: '春',
    grd: [[0, '#b7eb84'], [0.45, '#8ad257'], [0.80, '#5ba53a'], [1, '#316d26']],
    patchDark: 'rgba(34,92,30,0.14)', patchLight: 'rgba(210,255,175,0.11)',
    blades: [['#e2ffb2', 0.55], ['#b6ea80', 0.78], ['#84cf4d', 0.88], ['#4f9d33', 0.92]],
    tuft: 'rgba(42,104,34,0.9)',
    wall: ['#1e3d1c', '#122810', '#070d07'],
    rim: 'rgba(205,250,170,',
    glow: 'rgba(150,240,130,',
    deco: 'flower',
    nBlade: 5400,
    sparkle: 'rgba(240,255,220,',
    quotes: [
      '风一暖，种子就醒了',
      '把心事交给新叶',
      '光落在肩上，慢慢发芽',
      '春不急，它一层层地开',
      '抬头是晴，低头是新生',
      '所有等待，都会开花'
    ]
  },
  summer: {
    key: 'summer', cn: '夏',
    // 正午的明青水面：亮青绿，不再是夜色深青
    grd: [[0, '#a6f4e8'], [0.45, '#63dccb'], [0.80, '#2aa89b'], [1, '#16747a']],
    patchDark: 'rgba(12,88,90,0.14)', patchLight: 'rgba(215,255,250,0.17)',
    blades: [['#dcfff6', 0.52], ['#8ef0dc', 0.76], ['#46c4ae', 0.88], ['#21907f', 0.94]],
    tuft: 'rgba(22,96,90,0.9)',
    wall: ['#1a5450', '#0f3230', '#061716'],
    rim: 'rgba(198,255,248,',
    glow: 'rgba(150,255,240,',
    deco: 'lotus',
    nBlade: 5000,
    sparkle: 'rgba(240,255,252,',
    quotes: [
      '蝉鸣把午后拉得很长',
      '晚风替你收好汗',
      '树影挪一寸，日子慢一分',
      '热是热的，心要凉一点',
      '把西瓜最甜的一勺留给自己',
      '水面把光揉碎，洒了一地'
    ]
  },
  autumn: {
    key: 'autumn', cn: '秋',
    grd: [[0, '#dcaa5c'], [0.45, '#bd8434'], [0.80, '#8e5724'], [1, '#563216']],
    patchDark: 'rgba(96,52,16,0.16)', patchLight: 'rgba(255,214,140,0.12)',
    blades: [['#f2d38a', 0.5], ['#d5a252', 0.78], ['#a9702c', 0.9], ['#7a4a1c', 0.94]],
    tuft: 'rgba(108,64,22,0.9)',
    wall: ['#4a2a10', '#2b1708', '#120a04'],
    rim: 'rgba(255,212,140,',
    glow: 'rgba(255,190,110,',
    deco: 'leaf',
    nBlade: 5000,
    sparkle: 'rgba(255,236,190,',
    quotes: [
      '叶子落地，也算回家',
      '把收成装进陶罐',
      '凉一点的风，适合想念',
      '光变薄了，心事变厚',
      '落下的，都是温柔的',
      '秋天把答案写在颜色里'
    ]
  },
  winter: {
    key: 'winter', cn: '冬',
    grd: [[0, '#ffffff'], [0.45, '#f4f8fd'], [0.80, '#e2ebf4'], [1, '#cbd9e6']],
    patchDark: 'rgba(132,160,188,0.16)', patchLight: 'rgba(255,255,255,0.62)',
    blades: [['#b9cad9', 0.30], ['#9db0c1', 0.34], ['#cfdde8', 0.26], ['#8b9dad', 0.30]],
    tuft: 'rgba(120,138,156,0.38)',
    wall: ['#54616d', '#2f3842', '#101519'],
    rim: 'rgba(232,244,255,',
    glow: 'rgba(206,232,252,',
    deco: 'snowdot',
    nBlade: 0,
    sparkle: 'rgba(255,255,255,',
    quotes: [
      '雪落无声，你也可以慢',
      '把手揣暖，把话说轻',
      '白是最安静的答案',
      '冷的时候，靠近一点就暖',
      '等一场雪，也等一个念头',
      '冬天教人把日子过慢'
    ]
  }
};

const ORDER = ['spring', 'summer', 'autumn', 'winter'];

/* ---------------- 几何 ---------------- */

const G = {};

function layout() {
  const R = Math.min(W * 0.365, H * 0.76);
  G.R = R;
  G.cx = W / 2;
  G.cy = H * 0.555;
  G.ry = R * 0.335;
  G.th = Math.max(10, R * 0.072);
  G.hub = R * 0.152;
}

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.max(1, Math.round(W * DPR));
  canvas.height = Math.max(1, Math.round(H * DPR));
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
  buildStars();
  sendHitShape();
}

/* ---------------- 四季地面贴图 ---------------- */

const TEX = {};
let texturesReady = false;

function buildTexture(season) {
  const S = PAL[season];
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  const C = 512, R = 512;

  // 底色
  const rg = g.createRadialGradient(C, C - 70, 30, C, C, 512);
  S.grd.forEach(([p, col]) => rg.addColorStop(p, col));
  g.fillStyle = rg;
  g.beginPath(); g.arc(C, C, 514, 0, TAU); g.fill();

  // 大块色斑，破掉规整感（雪地要极淡：白底上的大白斑会变成"云层"）
  const nPatch = S.key === 'winter' ? 46 : 70;
  const patchDark = S.key === 'winter' ? 'rgba(150,174,198,0.09)' : S.patchDark;
  const patchLight = S.key === 'winter' ? 'rgba(255,255,255,0.10)' : S.patchLight;
  for (let i = 0; i < nPatch; i++) {
    const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 470;
    const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r;
    const rr = S.key === 'winter' ? rnd(40, 120) : rnd(55, 190);
    const p = g.createRadialGradient(x, y, 0, x, y, rr);
    p.addColorStop(0, Math.random() < 0.5 ? patchDark : patchLight);
    p.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = p;
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }

  // 草叶——按颜色分组批量绘制
  const buckets = S.blades.map(() => []);
  const n = Math.round(S.nBlade * 0.62);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU);
    const rr = Math.sqrt(Math.random()) * 500;
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const len = rnd(11, 26) * (0.75 + rr / 560);
    const lean = rnd(-0.42, 0.42);
    const sx = Math.sin(lean), cy2 = Math.cos(lean);
    const bi = Math.floor(Math.random() * S.blades.length);
    buckets[bi].push([
      x, y,
      x + sx * len * 0.6, y - cy2 * len,
      x + sx * len, y - cy2 * len * 0.15
    ]);
  }
  g.filter = 'blur(0.7px)';
  S.blades.forEach(([col, alpha], i) => {
    const list = buckets[i];
    if (!list.length) return;
    g.strokeStyle = col;
    g.globalAlpha = alpha;
    g.lineWidth = 1.9;
    g.beginPath();
    for (const b of list) {
      g.moveTo(b[0], b[1]); g.lineTo(b[2], b[3]); g.lineTo(b[4], b[5]);
    }
    g.stroke();
  });
  g.globalAlpha = 1;

  // 草丛簇
  g.strokeStyle = S.tuft;
  g.lineWidth = 2.4;
  g.beginPath();
  for (let i = 0; i < 380; i++) {
    const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 490;
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const len = rnd(18, 38), lean = rnd(-0.5, 0.5);
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(lean) * len, y - Math.cos(lean) * len);
  }
  g.stroke();
  g.filter = 'none';

  // 云影：大块柔和暗斑，让地面有起伏感（雪地要轻很多，否则像阴天云层）
  const nCloud = S.key === 'winter' ? 5 : 9;
  const cloudA = S.key === 'winter' ? 0.05 : 0.11;
  for (let i = 0; i < nCloud; i++) {
    const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 380;
    const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r;
    const rr = rnd(150, 320);
    const p = g.createRadialGradient(x, y, 0, x, y, rr);
    p.addColorStop(0, `rgba(0,0,0,${cloudA})`);
    p.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = p;
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }

  // 季节装饰
  if (S.deco === 'flower') {
    for (let i = 0; i < 330; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 485;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const rad = rnd(1.6, 3.4);
      g.fillStyle = Math.random() < 0.3 ? 'rgba(255,246,236,0.92)' : 'rgba(255,228,214,0.75)';
      g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
      if (Math.random() < 0.4) {
        g.fillStyle = 'rgba(255,214,150,0.9)';
        g.beginPath(); g.arc(x, y, rad * 0.4, 0, TAU); g.fill();
      }
    }
  } else if (S.deco === 'lotus') {
    // 夏：水面柔光 + 荷叶 + 零星睡莲，和春天的小花瓣彻底区分
    for (let i = 0; i < 14; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 380;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const rw = rnd(80, 200), rh = rnd(26, 70);
      const p = g.createRadialGradient(x, y, 0, x, y, rw);
      p.addColorStop(0, 'rgba(236,255,252,0.15)');
      p.addColorStop(0.55, 'rgba(236,255,252,0.07)');
      p.addColorStop(1, 'rgba(236,255,252,0)');
      g.save();
      g.translate(x, y); g.scale(1, rh / rw); g.translate(-x, -y);
      g.fillStyle = p;
      g.beginPath(); g.arc(x, y, rw, 0, TAU); g.fill();
      g.restore();
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 470;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const rad = rnd(16, 34);
      const rot = rnd(0, TAU);
      g.save();
      g.translate(x, y); g.rotate(rot);
      g.fillStyle = Math.random() < 0.5 ? 'rgba(48,152,126,0.60)' : 'rgba(72,178,144,0.50)';
      g.beginPath(); g.ellipse(0, 0, rad, rad * 0.72, 0, 0, TAU); g.fill();
      // 叶脉缺口
      const notch = rad * 0.92;
      g.fillStyle = 'rgba(24,96,84,0.30)';
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(notch, -1.6); g.lineTo(notch, 1.6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(190,255,238,0.26)';
      g.beginPath(); g.ellipse(-rad * 0.18, -rad * 0.20, rad * 0.5, rad * 0.30, 0, 0, TAU); g.fill();
      g.restore();
    }
    // 几朵睡莲
    for (let i = 0; i < 7; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 420;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      for (let p = 0; p < 6; p++) {
        const pa = p * TAU / 6 + rnd(-0.12, 0.12);
        g.save();
        g.translate(x, y); g.rotate(pa);
        g.fillStyle = p % 2 ? 'rgba(255,242,250,0.72)' : 'rgba(255,214,238,0.66)';
        g.beginPath(); g.ellipse(0, -5, 3.2, 6.4, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.fillStyle = 'rgba(255,232,150,0.85)';
      g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
    }
  } else if (S.deco === 'glint') {
    for (let i = 0; i < 400; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 495;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      g.fillStyle = 'rgba(240,255,180,0.55)';
      g.beginPath(); g.arc(x, y, rnd(0.8, 1.8), 0, TAU); g.fill();
    }
  } else if (S.deco === 'leaf') {
    for (let i = 0; i < 240; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 490;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const rot = rnd(0, TAU), w = rnd(3, 7), h = rnd(1.4, 2.6);
      g.save();
      g.translate(x, y); g.rotate(rot);
      g.fillStyle = Math.random() < 0.5 ? 'rgba(242,196,110,0.8)' : 'rgba(190,120,48,0.75)';
      g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.strokeStyle = 'rgba(120,68,24,0.7)';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let i = 0; i < 360; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 495;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      g.moveTo(x, y); g.lineTo(x + rnd(-5, 5), y - rnd(10, 22));
    }
    g.stroke();
  } else {
    // 雪：细雪粒 + 极淡的雪堆起伏（不做大块白光，避免像云团）
    for (let i = 0; i < 18; i++) {
      const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 460;
      const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r, rr = rnd(60, 150);
      const p = g.createRadialGradient(x, y, 0, x, y, rr);
      p.addColorStop(0, 'rgba(146,172,198,0.11)');
      p.addColorStop(1, 'rgba(146,172,198,0)');
      g.fillStyle = p; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    for (let i = 0; i < 1700; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 500;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const wide = Math.random() < 0.1;
      g.fillStyle = Math.random() < 0.86
        ? 'rgba(255,255,255,0.95)'
        : 'rgba(196,214,232,0.22)';
      g.beginPath(); g.arc(x, y, wide ? rnd(1.8, 3.0) : rnd(0.5, 1.6), 0, TAU); g.fill();
    }
    // 风吹出来的雪纹：短、浅、顺着同一方向
    g.strokeStyle = 'rgba(170,192,214,0.14)';
    g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < 220; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 480;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const len = rnd(8, 20);
      g.moveTo(x, y);
      g.lineTo(x + len, y - len * rnd(-0.25, 0.25));
    }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 130; i++) {
      const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 470;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      const len = rnd(6, 16);
      g.moveTo(x, y);
      g.lineTo(x + len, y - len * rnd(-0.2, 0.2) - 1);
    }
    g.stroke();
  }

  // 边缘泥土环 + 暗角（雪地压得浅，避免像被挖空的坑）
  const rimG = g.createRadialGradient(C, C, 440, C, C, 512);
  const edgeA = S.key === 'winter' ? 0.26 : 0.62;
  const midA = S.key === 'winter' ? 0.05 : 0.14;
  rimG.addColorStop(0, 'rgba(0,0,0,0)');
  rimG.addColorStop(0.72, `rgba(0,0,0,${midA})`);
  rimG.addColorStop(1, `rgba(0,0,0,${edgeA})`);
  g.fillStyle = rimG;
  g.beginPath(); g.arc(C, C, 512, 0, TAU); g.fill();

  return c;
}

function buildAllTextures() {
  for (const s of ORDER) TEX[s] = buildTexture(s);
  buildBeamSprite();
  texturesReady = true;
  baseKey = '';   // 贴图重建后底层缓存作废
}

/* 预渲染的光锥精灵：绕盘心旋转，边缘柔和 */
let beamSprite = null;

function buildBeamSprite() {
  const S = 560, C = S / 2, Rr = S / 2;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.translate(C, C);
  const N = 44;
  const SPREAD = 0.46;
  for (let i = 0; i < N; i++) {
    const a0 = -SPREAD + (i * 2 * SPREAD) / N;
    const a1 = -SPREAD + ((i + 1) * 2 * SPREAD) / N;
    const mid = (a0 + a1) / 2;
    const k = Math.max(0, Math.cos((mid / SPREAD) * Math.PI / 2));
    const al = Math.pow(k, 1.7);
    const grd = g.createRadialGradient(0, 0, Rr * 0.05, 0, 0, Rr);
    grd.addColorStop(0, `rgba(255,230,168,${0.035 * al})`);
    grd.addColorStop(0.45, `rgba(255,238,188,${0.085 * al})`);
    grd.addColorStop(0.86, `rgba(255,246,215,${0.20 * al})`);
    grd.addColorStop(1, `rgba(255,248,220,0)`);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, Rr, a0, a1, false);
    g.closePath();
    g.fill();
  }

  // 统一柔化，消掉扇片接缝
  const c2 = document.createElement('canvas');
  c2.width = S; c2.height = S;
  const g2 = c2.getContext('2d');
  g2.filter = 'blur(7px)';
  g2.drawImage(c, 0, 0);
  beamSprite = c2;
}

/* ---------------- 星尘背景（可选） ---------------- */

let starCanvas = null;

function buildStars() {
  if (!W || !H) return;
  const c = document.createElement('canvas');
  c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
  const g = c.getContext('2d');
  g.scale(DPR, DPR);

  // 星云
  const neb = g.createRadialGradient(W * 0.2, H * 0.16, 0, W * 0.2, H * 0.16, W * 0.55);
  neb.addColorStop(0, 'rgba(48,62,110,0.30)');
  neb.addColorStop(0.5, 'rgba(30,40,78,0.14)');
  neb.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = neb;
  g.fillRect(0, 0, W, H);

  const neb2 = g.createRadialGradient(W * 0.86, H * 0.42, 0, W * 0.86, H * 0.42, W * 0.4);
  neb2.addColorStop(0, 'rgba(70,50,96,0.22)');
  neb2.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = neb2;
  g.fillRect(0, 0, W, H);

  // 星点
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() < 0.85 ? rnd(0.4, 1.1) : rnd(1.2, 2.1);
    const a = rnd(0.25, 0.95);
    g.fillStyle = `rgba(${220 + Math.random() * 35},${228 + Math.random() * 27},255,${a})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  starCanvas = c;
}

/* ---------------- 时间 / 季节 ---------------- */

/* 用太阳视黄经推 24 节气（Meeus 低精度太阳位置，误差约 1–2 分钟） */
const RAD = Math.PI / 180;

const TERM_LONG = [
  ['小寒', 285], ['大寒', 300], ['立春', 315], ['雨水', 330],
  ['惊蛰', 345], ['春分', 0], ['清明', 15], ['谷雨', 30],
  ['立夏', 45], ['小满', 60], ['芒种', 75], ['夏至', 90],
  ['小暑', 105], ['大暑', 120], ['立秋', 135], ['处暑', 150],
  ['白露', 165], ['秋分', 180], ['寒露', 195], ['霜降', 210],
  ['立冬', 225], ['小雪', 240], ['大雪', 255], ['冬至', 270]
];

function sunLong(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * RAD;
  const app = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((app % 360) + 360) % 360;
}

function jdFromUTC(y, m, d, h) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24;
}

function findTermJd(year, targetL) {
  const startJd = jdFromUTC(year, 1, 1, 0) - 0.5;
  let prevJd = startJd, prev = sunLong(startJd) - targetL;
  for (let i = 1; i <= 400; i++) {
    const jd = startJd + i;
    const raw = sunLong(jd) - targetL;
    const cur = ((raw + 540) % 360) - 180;
    const prevN = ((prev + 540) % 360) - 180;
    if (prevN < 0 && cur >= 0 && (cur - prevN) < 30) {
      let lo = prevJd, hi = jd;
      for (let k = 0; k < 34; k++) {
        const mid = (lo + hi) / 2;
        let v = sunLong(mid) - targetL;
        v = ((v + 540) % 360) - 180;
        if (v < 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = raw; prevJd = jd;
  }
  return null;
}

const TERM_CACHE = {};

function yearTerms(y) {
  if (TERM_CACHE[y]) return TERM_CACHE[y];
  const rows = TERM_LONG.map(([name, L]) => {
    const jd = findTermJd(y, L);
    return { name, ts: (jd - 2440587.5) * 86400000 };
  });
  TERM_CACHE[y] = rows;
  return rows;
}

/* 当前所处节气：取「已经到达、且最近」的那个 */
function solarTermOf(date = new Date()) {
  const t = date.getTime();
  const y = date.getFullYear();
  let cur = { name: '冬至', ts: -Infinity };
  for (const yy of [y - 1, y]) {
    for (const r of yearTerms(yy)) {
      if (r.ts <= t && r.ts > cur.ts) cur = r;
    }
  }
  return cur.name;
}

function termTs(year, name) {
  var r = yearTerms(year).find((x) => x.name === name);
  return r ? r.ts : null;
}

/* 以立春 / 立夏 / 立秋 / 立冬 为四季分界 */
function realSeason(date = new Date()) {
  const t = date.getTime();
  const y = date.getFullYear();
  const lichun = termTs(y, '立春');
  const lixia = termTs(y, '立夏');
  const liqiu = termTs(y, '立秋');
  const lidong = termTs(y, '立冬');
  if (t >= lichun && t < lixia) return 'spring';
  if (t >= lixia && t < liqiu) return 'summer';
  if (t >= liqiu && t < lidong) return 'autumn';
  return 'winter';
}

let season = 'spring';
let wipe = null;
let nextChangeAt = 0;
let seasonT0 = 0;          // 本季开始的时间：盘内装饰的「生长」动画用它计时

function startWipe(to, dur, now) {
  if (to === season && !wipe) return;
  if (wipe && wipe.to === to) return;
  const from = wipe ? wipe.to : season;
  // 扫动从当前光束位置开始，边界始终压在光束上（加速轮转时也一样）
  wipe = { from, to, t0: now, dur, a0: -Math.PI / 2 + beamPhaseNow };
}

function wipeProgress(now) {
  if (!wipe) return 1;
  return clamp((now - wipe.t0) / wipe.dur, 0, 1);
}

/* ---------------- 粒子 ---------------- */

/* 落到盘面下方的特效要渐变消失，不能到窗口底边被硬切 */
function discFadeStart() { return G.cy + G.ry * 1.02; }
function discFadeEnd() { return Math.min(H - 2, discFadeStart() + Math.max(26, G.ry * 1.2)); }
function discFade(y) {
  const s = discFadeStart(), e = discFadeEnd();
  if (y <= s) return 1;
  if (y >= e) return 0;
  const t = (y - s) / (e - s);
  return 1 - t * t * (3 - 2 * t);
}

const parts = [];
let partBudget = 44;

function spawnParticle(initial) {
  const a = rnd(0, TAU);
  const rr = Math.sqrt(Math.random()) * G.R * 0.82;
  const type = season === 'winter' ? 'snow'
    : season === 'autumn' ? 'leaf'
      : season === 'summer' ? 'glint' : 'petal';
  const p = {
    type,
    x: G.cx + Math.cos(a) * rr,
    y: G.cy + Math.sin(a) * rr * (G.ry / G.R),
    r: type === 'snow' ? rnd(0.9, 2.4)
      : type === 'glint' ? rnd(0.7, 1.8) : rnd(1, 2.4),
    life: initial ? rnd(0, 1) : 0,
    max: rnd(6, 13),
    vy: type === 'snow' ? rnd(6, 16) : rnd(-26, -10),
    vx: rnd(-8, 8),
    ph: rnd(0, TAU),
    rot: rnd(0, TAU),
    vr: rnd(-1.4, 1.4)
  };
  parts.push(p);
}

function updateParticles(dt, now) {
  while (parts.length < partBudget) {
    spawnParticle(parts.length < 8);
    if (parts.length === 0) break;
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life > p.max) { parts.splice(i, 1); continue; }
    p.x += (p.vx + Math.sin(now * 0.9 + p.ph) * 6) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.type === 'snow') p.x += Math.sin(now * 0.6 + p.ph) * 10 * dt * 3;
  }
}

function drawParticles(now) {
  ctx.save();
  for (const p of parts) {
    const t = p.life / p.max;
    const alpha = Math.sin(Math.min(1, t) * Math.PI) * discFade(p.y);
    if (alpha <= 0.02) continue;
    const py = p.y - t * 6;
    if (p.type === 'glint') {
      // 夏：水面上蹦起来的白光点（正午反光）
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, py, 0, p.x, py, p.r * 3.2);
      g.addColorStop(0, `rgba(255,255,255,${0.85 * alpha})`);
      g.addColorStop(0.45, `rgba(205,255,250,${0.40 * alpha})`);
      g.addColorStop(1, 'rgba(170,245,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, py, p.r * 3.2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, py); ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(238,186,96,${0.75 * alpha})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 2.4, p.r * 1.1, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (p.type === 'snow') {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
      ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255,240,236,${0.7 * alpha})`;
      ctx.beginPath(); ctx.ellipse(p.x, py, p.r * 1.6, p.r * 0.9, p.rot, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------------- 天空天气：雪 / 落叶 / 花瓣 / 萤火 ---------------- */

const sky = [];

const SKY_N = { spring: 46, summer: 26, autumn: 32, winter: 104 };

function skyTypeOf(s) {
  return s === 'winter' ? 'snow' : s === 'autumn' ? 'leaf' : s === 'summer' ? 'glint' : 'petal';
}

function spawnSky(initial) {
  const type = skyTypeOf(season);
  const p = {
    type,
    x: rnd(-30, W + 30),
    y: initial ? rnd(-20, H * 0.9) : rnd(-60, -8),
    r: type === 'snow' ? rnd(0.7, 2.5)
      : type === 'leaf' ? rnd(2.4, 5.0)
        : type === 'glint' ? rnd(1.0, 2.6) : rnd(1.4, 3.2),
    vy: type === 'snow' ? rnd(22, 52)
      : type === 'leaf' ? rnd(26, 56)
        : type === 'glint' ? rnd(-26, -10) : rnd(10, 24),
    sway: type === 'snow' ? rnd(6, 26)
      : type === 'leaf' ? rnd(26, 62)
        : type === 'glint' ? rnd(10, 26) : rnd(14, 34),
    ph: rnd(0, TAU),
    rot: rnd(0, TAU),
    vr: type === 'leaf' ? rnd(-1.5, 1.5) : rnd(-0.35, 0.35),
    a: type === 'snow' ? rnd(0.55, 0.95)
      : type === 'leaf' ? rnd(0.55, 0.9)
        : type === 'glint' ? rnd(0.5, 0.9) : rnd(0.45, 0.8),
    hue: type === 'leaf' ? (Math.random() < 0.55 ? 0 : 1) : 0,
    blink: rnd(0.6, 1.6)
  };
  if (type === 'glint') {
    // 正午水面闪光：从盘面上方缓慢上浮
    p.y = rnd(H * 0.45, H * 1.02);
    p.vy = rnd(-30, -12);
  }
  sky.push(p);
}

function seedSky() {
  const want = SKY_N[season] || 40;
  let guard = 0;
  while (sky.length < want && guard++ < 400) spawnSky(true);
}

function updateSky(dt, now) {
  const want = SKY_N[season] || 40;
  while (sky.length < want) {
    spawnSky(sky.length < 12);
    if (sky.length === 0) break;
  }
  for (let i = sky.length - 1; i >= 0; i--) {
    const p = sky[i];
    p.y += p.vy * dt;
    p.x += Math.sin(now * 0.7 + p.ph) * p.sway * dt;
    p.rot += p.vr * dt;
    if (p.type === 'glint') {
      if (p.y < -40) p.y = H + rnd(10, 60);
    }
    if (p.y > discFadeEnd() || p.y < -120) { sky.splice(i, 1); continue; }
    // 换季时类型对不上的直接重生
    if (p.type !== skyTypeOf(season)) { sky.splice(i, 1); continue; }
  }
}

function drawSky(now) {
  ctx.save();
  for (const p of sky) {
    const fa = p.a * discFade(p.y);      // 落到盘面下方时逐渐淡出
    if (fa <= 0.02) continue;
    if (p.type === 'snow') {
      // 雪花：核心 + 柔光
      ctx.fillStyle = `rgba(255,255,255,${fa})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      if (p.r > 1.7) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
        g.addColorStop(0, `rgba(240,248,255,${0.22 * fa})`);
        g.addColorStop(1, 'rgba(220,236,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, TAU); ctx.fill();
      }
    } else if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.hue
        ? `rgba(206,132,58,${fa})`
        : `rgba(244,196,104,${fa})`;
      // 叶片：一头尖一头圆
      ctx.beginPath();
      ctx.moveTo(0, -p.r * 1.9);
      ctx.quadraticCurveTo(p.r * 1.5, -p.r * 0.3, 0, p.r * 1.5);
      ctx.quadraticCurveTo(-p.r * 1.5, -p.r * 0.3, 0, -p.r * 1.9);
      ctx.fill();
      ctx.strokeStyle = `rgba(120,70,26,${0.45 * fa})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -p.r * 1.6); ctx.lineTo(0, p.r * 1.3); ctx.stroke();
      ctx.restore();
    } else if (p.type === 'petal') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      // 樱花瓣：粉白，带一点深粉芯
      ctx.fillStyle = `rgba(255,226,236,${fa})`;
      ctx.beginPath();
      ctx.moveTo(0, p.r * 1.6);
      ctx.bezierCurveTo(-p.r * 1.7, p.r * 0.4, -p.r * 1.1, -p.r * 1.4, 0, -p.r * 1.2);
      ctx.bezierCurveTo(p.r * 1.1, -p.r * 1.4, p.r * 1.7, p.r * 0.4, 0, p.r * 1.6);
      ctx.fill();
      ctx.fillStyle = `rgba(250,170,196,${0.45 * fa})`;
      ctx.beginPath();
      ctx.ellipse(0, p.r * 0.3, p.r * 0.5, p.r * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'glint') {
      // 正午水面闪光：十字光点，微微呼吸
      const bl = 0.45 + 0.55 * Math.abs(Math.sin(now * p.blink * 1.4 + p.ph));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.6);
      g.addColorStop(0, `rgba(255,255,255,${0.75 * bl})`);
      g.addColorStop(0.35, `rgba(196,255,250,${0.30 * bl})`);
      g.addColorStop(1, 'rgba(160,240,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.6, 0, TAU); ctx.fill();
      // 细十字光芒
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * bl})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x - p.r * 2.4, p.y); ctx.lineTo(p.x + p.r * 2.4, p.y);
      ctx.moveTo(p.x, p.y - p.r * 2.4); ctx.lineTo(p.x, p.y + p.r * 2.4);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* ---------------- 交互状态 ---------------- */

let mouse = { x: -999, y: -999, inside: false };
let ignoreMouse = false;
let hoverT = 0;
let ripples = [];
let introT = 0;

/* ---------------- 绘制：底座 ---------------- */

function drawStarsBG(now) { /* 星空背景已取消：窗口完全透明，直接贴在桌面上 */ }

function drawShadowAndGlow(now) { /* 盘下的椭圆投影已按需求去掉，盘体直接贴桌面 */ }

function drawWall() {
  const pal = PAL[season];
  const R = G.R, ry = G.ry, th = G.th;
  const g = ctx.createLinearGradient(0, G.cy - ry * 0.2, 0, G.cy + ry + th);
  g.addColorStop(0, pal.wall[0]);
  g.addColorStop(0.5, pal.wall[1]);
  g.addColorStop(1, pal.wall[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(G.cx, G.cy + th, R, ry, 0, 0, TAU);
  ctx.fill();

  // 侧壁上沿受光的一道亮边
  ctx.strokeStyle = 'rgba(255,238,196,0.18)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(G.cx, G.cy + th * 0.12, R * 0.985, ry * 0.985, 0, Math.PI * 0.04, Math.PI * 0.96);
  ctx.stroke();

  // 侧壁内部的暗带，做出厚度
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(2, th * 0.42);
  ctx.beginPath();
  ctx.ellipse(G.cx, G.cy + th * 0.95, R * 0.995, ry * 0.995, 0, Math.PI * 0.06, Math.PI * 0.94);
  ctx.stroke();
}

/* ---------------- 绘制：地面 ---------------- */

/* 底层大块（投影 + 侧壁 + 地面贴图 + 暗角）几乎不变，缓存成一张画布，
   每帧只 drawImage，省掉最贵的几次整盘填充 */
let baseCanvas = document.createElement('canvas');
let baseCtx = baseCanvas.getContext('2d');
let baseKey = '';

function drawBaseLayer(now) {
  // 缓存只跟「尺寸 / 季节」有关，扫季进度不再让缓存失效
  const key = `${W}x${H}|${DPR}|${season}`;
  if (baseKey === key) {
    ctx.drawImage(baseCanvas, 0, 0, W, H);
    return;
  }
  baseKey = key;
  if (baseCanvas.width !== canvas.width || baseCanvas.height !== canvas.height) {
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
  }
  const main = ctx;
  ctx = baseCtx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawShadowAndGlow(now);
  drawWall();
  drawSurfaceBase(now);
  ctx = main;
  ctx.drawImage(baseCanvas, 0, 0, W, H);
}

function drawSurfaceBase(now) {
  if (!texturesReady) return;
  const R = G.R, ry = G.ry;
  const baseSeason = wipe ? wipe.from : season;

  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);

  ctx.drawImage(TEX[baseSeason], -R, -R, R * 2, R * 2);

  // 边缘暗角
  const vg = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.80, 'rgba(0,0,0,0.07)');
  vg.addColorStop(1, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = vg;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();

  ctx.restore();
}

function drawSurfaceFx(now) {
  if (!texturesReady) return;
  const R = G.R, ry = G.ry;
  const prog = wipeProgress(now);

  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);

  // 扫过的那块扇形：叠在新季节贴图上（只画扇形面积，不重画整盘）
  if (wipe && prog > 0.001) {
    const a0 = wipe.a0;
    const a1 = a0 + TAU * prog;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R * 1.04, a0, a1, false);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(TEX[wipe.to], -R, -R, R * 2, R * 2);
    // 扇形边缘的暗角也跟着补一层，避免和新旧两季的落差
    const vg2 = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R);
    vg2.addColorStop(0, 'rgba(0,0,0,0)');
    vg2.addColorStop(0.80, 'rgba(0,0,0,0.07)');
    vg2.addColorStop(1, 'rgba(0,0,0,0.36)');
    ctx.fillStyle = vg2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.restore();
  }

  if (wipe && prog > 0.001) {
    // 扫动边界的光
    const a1 = wipe.a0 + TAU * prog;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(
      Math.cos(a1) * R, Math.sin(a1) * R,
      Math.cos(a1 - 0.25) * R, Math.sin(a1 - 0.25) * R
    );
    bg.addColorStop(0, 'rgba(255,240,190,0.55)');
    bg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.strokeStyle = bg;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a1) * R * 1.01, Math.sin(a1) * R * 1.01);
    ctx.stroke();
    ctx.restore();
  }

  // 表面细碎闪光
  const pal = PAL[season];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sp = 70;
  for (let i = 0; i < sp; i++) {
    const a = (i * 2.399963) % TAU;
    const rr = Math.sqrt((i % 37) / 37) * R * 0.94;
    const tw = 0.5 + 0.5 * Math.sin(now * 1.6 + i * 1.7);
    if (tw < 0.55) continue;
    ctx.fillStyle = pal.sparkle + (0.32 * tw) + ')';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // 被光束扫过时，地表被照亮：预渲染光锥 + 笔尖处光池
  const beamA = beamAngle(now);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (beamSprite) {
    ctx.rotate(beamA);
    ctx.drawImage(beamSprite, -R * 1.02, -R * 1.02, R * 2.04, R * 2.04);
    ctx.rotate(-beamA);
  }

  const px = Math.cos(beamA) * R * 0.86;
  const py = Math.sin(beamA) * R * 0.86;
  const pool = ctx.createRadialGradient(px, py, 0, px, py, R * 0.26);
  pool.addColorStop(0, 'rgba(255,250,220,0.26)');
  pool.addColorStop(0.45, 'rgba(255,238,180,0.11)');
  pool.addColorStop(1, 'rgba(255,225,150,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(px, py, R * 0.30, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/* ---------------- 绘制：盘沿刻度 ---------------- */

function drawRim(now) {
  const R = G.R, ry = G.ry;
  const pal = PAL[season];
  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);

  // 外沿，一小圈密集的灯珠
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a = i * TAU / N;
    const x = Math.cos(a) * R * 0.982;
    const y = Math.sin(a) * R * 0.982;
    const front = 0.5 + 0.5 * Math.sin(a);
    const isHour = i % 8 === 0;
    const pulse = 0.55 + 0.45 * Math.sin(now * 1.5 + i * 0.6);
    const alpha = (0.25 + 0.55 * front) * (isHour ? 1 : 0.72) * (0.7 + 0.3 * pulse);
    ctx.fillStyle = pal.rim + alpha + ')';
    const rad = isHour ? 2.9 : 1.55;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }

  // 外缘细线
  ctx.strokeStyle = pal.rim + '0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.972, 0, TAU); ctx.stroke();
  ctx.restore();

  // 十二刻度
  if (CFG.showTicks) {
    const fs = Math.max(9, Math.round(G.R * 0.05));
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const a = -Math.PI / 2 + i * TAU / 60;
      const isFive = i % 5 === 0;
      const x1 = G.cx + Math.cos(a) * R * 0.925;
      const y1 = G.cy + Math.sin(a) * ry * 0.925;
      const x2 = G.cx + Math.cos(a) * R * (isFive ? 0.876 : 0.898);
      const y2 = G.cy + Math.sin(a) * ry * (isFive ? 0.876 : 0.898);
      ctx.strokeStyle = season === 'winter'
        ? `rgba(72,92,112,${isFive ? 0.55 : 0.26})`
        : `rgba(255,242,205,${isFive ? 0.5 : 0.20})`;
      ctx.lineWidth = isFive ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.font = `${fs}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 6;
      const x = G.cx + Math.cos(a) * R * 0.812;
      const y = G.cy + Math.sin(a) * ry * 0.812;
      ctx.fillStyle = season === 'winter' ? 'rgba(66,86,106,0.62)' : 'rgba(255,248,226,0.52)';
      ctx.fillText(i === 0 ? '12' : String(i), x, y);
    }
    ctx.restore();
  }
}

/* 冬季：积雪压在盘沿上，读感更接近「地面有雪」 */
const snowLumps = [];
function buildSnowLumps() {
  snowLumps.length = 0;
  const N = 168;
  for (let i = 0; i < N; i++) {
    const a = i * TAU / N + rnd(-0.01, 0.01);
    snowLumps.push({
      a,
      r: rnd(0.994, 1.032),
      w: rnd(1.6, 3.4),
      h: rnd(1.0, 2.4),
      al: rnd(0.35, 0.85)
    });
  }
}

function drawSnowCap() {
  if (season !== 'winter') return;
  if (!snowLumps.length) buildSnowLumps();
  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, G.ry / G.R);
  // 底带：融雪后的潮边
  ctx.strokeStyle = 'rgba(233,242,252,0.32)';
  ctx.lineWidth = Math.max(3, G.th * 0.5);
  ctx.beginPath(); ctx.arc(0, 0, G.R * 1.004, 0, TAU); ctx.stroke();
  // 雪块
  for (const s of snowLumps) {
    const front = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.a));
    const x = Math.cos(s.a) * G.R * s.r;
    const y = Math.sin(s.a) * G.R * s.r;
    ctx.fillStyle = `rgba(255,255,255,${s.al * front})`;
    ctx.beginPath(); ctx.ellipse(x, y, G.R * s.w * 0.011, G.R * s.h * 0.011, s.a, 0, TAU); ctx.fill();
  }
  ctx.restore();
}



/* ---------------- 绘制：盘内四季装饰（会长、会动） ---------------- */

const DECO = { spring: null, summer: null, autumn: null, winter: null };

function buildDeco() {
  const mk = (n, rmin, rmax, smin, smax, dmax) => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        a: rnd(0, TAU),
        rr: rnd(rmin, rmax),
        s: rnd(smin, smax),
        ph: rnd(0, TAU),
        d: rnd(0, dmax),
        tone: Math.floor(rnd(0, 3))
      });
    }
    return arr;
  };
  DECO.spring = { flowers: mk(18, 0.16, 0.92, 0.7, 1.3, 1.3) };
  DECO.summer = { lotus: mk(7, 0.24, 0.9, 0.8, 1.3, 1.1) };
  DECO.autumn = { straw: mk(26, 0.18, 0.95, 0.75, 1.35, 1.6) };
  DECO.winter = { mounds: mk(16, 0.14, 0.94, 0.85, 1.6, 0.9) };
  // 按「离观察者远近」排序：后排先画，前排压在上面
  for (const key of Object.keys(DECO)) {
    const obj = DECO[key];
    const list = obj.flowers || obj.lotus || obj.straw || obj.mounds;
    list.sort((u, v) => Math.sin(u.a) - Math.sin(v.a));
  }
}

/* 角度 + 半径 → 椭圆地面上的真实坐标 */
function decoPos(a, rr) {
  return {
    x: G.cx + Math.cos(a) * G.R * rr,
    y: G.cy + Math.sin(a) * G.ry * rr
  };
}

/* 本季装饰的生长进度（换季之后从 0 慢慢长出来） */
function decoGrow(now, d, dur) {
  return easeOut(clamp((now - seasonT0 - d) / dur, 0, 1));
}

function drawSpringDeco(now, fade, k) {
  for (const f of DECO.spring.flowers) {
    const g = decoGrow(now, f.d, 1.7);
    if (g <= 0.02) continue;
    const p = decoPos(f.a, f.rr);
    const h = (16 + 14 * f.s) * k * g;
    const sway = Math.sin(now * 0.9 + f.ph) * 2.8 * k * g;
    const tipX = p.x + sway, tipY = p.y - h;

    // 根部落在草地上的小影子
    ctx.fillStyle = `rgba(38,86,36,${0.2 * fade})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 0.8 * k, 3.0 * k, 1.0 * k, 0, 0, TAU); ctx.fill();

    // 根部的草叶，让花像从地里长出来
    ctx.strokeStyle = `rgba(88,150,62,${0.55 * fade})`;
    ctx.lineWidth = Math.max(0.7, 0.9 * k);
    for (let j = -1; j <= 1; j++) {
      if (j === 0) continue;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + j * 3.4 * k, p.y - h * 0.22, p.x + j * 4.6 * k, p.y - h * 0.34);
      ctx.stroke();
    }

    // 茎
    ctx.strokeStyle = `rgba(58,116,44,${0.9 * fade})`;
    ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + sway * 0.35, p.y - h * 0.55, tipX, tipY);
    ctx.stroke();

    // 叶
    ctx.fillStyle = `rgba(100,172,78,${0.62 * fade})`;
    ctx.beginPath();
    ctx.ellipse(p.x + sway * 0.2 + 3.0 * k, p.y - h * 0.48, 3.3 * k * g, 1.3 * k * g, 0.55, 0, TAU);
    ctx.fill();

    // 花：五片小花瓣 + 花心
    const pr = (3.1 + 1.5 * f.s) * k * g;
    const col = f.tone === 1
      ? `rgba(255,238,172,${0.96 * fade})`
      : f.tone === 2
        ? `rgba(255,255,255,${0.96 * fade})`
        : `rgba(255,214,228,${0.95 * fade})`;
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU + f.ph;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(tipX + Math.cos(a) * pr * 0.82, tipY + Math.sin(a) * pr * 0.82,
        pr * 0.78, pr * 0.5, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(255,198,88,${0.92 * fade})`;
    ctx.beginPath(); ctx.arc(tipX, tipY, pr * 0.46, 0, TAU); ctx.fill();
  }
}

function drawAutumnDeco(now, fade, k) {
  // 秋天：长高的稻草，一根根立在地里，顶上有稻穗
  for (const f of DECO.autumn.straw) {
    const g = decoGrow(now, f.d, 2.2);
    if (g <= 0.02) continue;
    const p = decoPos(f.a, f.rr);
    const h = (28 + 26 * f.s) * k * g;
    const sway = Math.sin(now * 0.6 + f.ph) * 3.6 * k;
    const tipX = p.x + sway, tipY = p.y - h;

    ctx.strokeStyle = `rgba(178,132,50,${0.95 * fade})`;
    ctx.lineWidth = Math.max(1.2, 1.5 * k);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + sway * 0.3, p.y - h * 0.6, tipX, tipY);
    ctx.stroke();

    // 稻穗
    ctx.strokeStyle = `rgba(246,206,116,${0.9 * fade})`;
    ctx.lineWidth = Math.max(0.9, 1.05 * k);
    for (let j = -2; j <= 2; j++) {
      const aa = -Math.PI / 2 + j * 0.34 + Math.sin(now * 0.7 + f.ph) * 0.06;
      const L = (7 + 3 * f.s) * k * g;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY + 3 * k);
      ctx.quadraticCurveTo(
        tipX + Math.cos(aa) * L * 0.55, tipY + 3 * k + Math.sin(aa) * L * 0.55,
        tipX + Math.cos(aa) * L, tipY + 3 * k + Math.sin(aa) * L
      );
      ctx.stroke();
    }
    // 根部一点暖影
    ctx.fillStyle = `rgba(112,78,28,${0.28 * fade})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 0.6 * k, 2.8 * k, 1.05 * k, 0, 0, TAU); ctx.fill();
  }
}

function drawSummerDeco(now, fade, k) {
  // 夏天：水面上的荷花，俯看一层层花瓣铺开，随水轻晃
  for (const f of DECO.summer.lotus) {
    const g = decoGrow(now, f.d, 1.6);
    if (g <= 0.02) continue;
    const p = decoPos(f.a, f.rr);
    const bob = Math.sin(now * 1.2 + f.ph) * 1.5 * k;
    const pr = (5.0 + 2.2 * f.s) * k * g;
    const cx0 = p.x, cy0 = p.y + bob;
    const spin = Math.sin(now * 0.9 + f.ph) * 0.08;

    // 水面被压出的一圈浅浅涟漪
    ctx.strokeStyle = `rgba(214,255,248,${0.22 * fade})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx0, cy0 + pr * 0.55, pr * 1.75, pr * 0.55, 0, 0, TAU); ctx.stroke();

    // 荷叶
    ctx.fillStyle = `rgba(46,124,110,${0.42 * fade})`;
    ctx.beginPath(); ctx.ellipse(cx0 - pr * 1.5, cy0 + pr * 0.42, pr * 1.35, pr * 0.5, 0, 0, TAU); ctx.fill();

    // 外层花瓣（深粉）
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * TAU + spin;
      ctx.fillStyle = `rgba(234,140,174,${0.86 * fade})`;
      ctx.beginPath();
      ctx.ellipse(cx0 + Math.cos(a) * pr * 0.72, cy0 + Math.sin(a) * pr * 0.72,
        pr * 0.68, pr * 0.34, a, 0, TAU);
      ctx.fill();
    }
    // 内层花瓣（浅粉）
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU + spin + 0.5;
      ctx.fillStyle = `rgba(255,206,222,${0.94 * fade})`;
      ctx.beginPath();
      ctx.ellipse(cx0 + Math.cos(a) * pr * 0.34, cy0 + Math.sin(a) * pr * 0.34,
        pr * 0.42, pr * 0.26, a, 0, TAU);
      ctx.fill();
    }
    // 花心
    ctx.fillStyle = `rgba(255,232,158,${0.92 * fade})`;
    ctx.beginPath(); ctx.arc(cx0, cy0, pr * 0.14, 0, TAU); ctx.fill();
  }
}

/* 一堆雪的样子：圆润的小丘 + 顶部亮边 + 贴地的一道边 */
function snowDome(x, y, w, h, fade) {
  if (w < 0.6 || h < 0.4) return;
  const grad = ctx.createLinearGradient(x, y - h, x, y);
  grad.addColorStop(0, `rgba(255,255,255,${0.99 * fade})`);
  grad.addColorStop(0.5, `rgba(250,253,255,${0.96 * fade})`);
  grad.addColorStop(1, `rgba(203,221,242,${0.92 * fade})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.bezierCurveTo(x - w * 0.44, y - h * 0.9, x - w * 0.2, y - h * 1.04, x, y - h);
  ctx.bezierCurveTo(x + w * 0.2, y - h * 1.04, x + w * 0.44, y - h * 0.9, x + w * 0.5, y);
  ctx.closePath();
  ctx.fill();

  // 贴地的一道冷边，让它压在雪面上而不是浮着
  ctx.strokeStyle = `rgba(176,198,222,${0.4 * fade})`;
  ctx.lineWidth = Math.max(0.6, h * 0.09);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h * 0.02);
  ctx.quadraticCurveTo(x, y + h * 0.12, x + w * 0.5, y - h * 0.02);
  ctx.stroke();

  // 顶部亮边
  ctx.strokeStyle = `rgba(255,255,255,${0.72 * fade})`;
  ctx.lineWidth = Math.max(0.6, h * 0.11);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.30, y - h * 0.52);
  ctx.quadraticCurveTo(x - w * 0.06, y - h * 0.98, x + w * 0.22, y - h * 0.58);
  ctx.stroke();
}

function drawWinterDeco(now, fade, k) {
  // 冬天：地上堆起一层层厚雪，越往后越白
  const R = G.R;
  for (const f of DECO.winter.mounds) {
    const g = decoGrow(now, f.d, 1.8);
    if (g <= 0.02) continue;
    const p = decoPos(f.a, f.rr);
    const w = R * 0.115 * f.s * g;
    const h = R * 0.027 * f.s * g;

    // 雪堆压出来的淡影
    ctx.fillStyle = `rgba(142,170,202,${0.18 * fade})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + h * 0.22, w * 0.66, h * 0.3, 0, 0, TAU); ctx.fill();

    // 主体 + 两侧的小堆，合成一整片积雪
    snowDome(p.x + w * 0.32, p.y + h * 0.05, w * 0.52, h * 0.66, fade);
    snowDome(p.x - w * 0.36, p.y + h * 0.03, w * 0.46, h * 0.52, fade);
    snowDome(p.x, p.y, w, h, fade);
  }
}

/* 雪地里猫的脚印：一只只踩下去，慢慢被新雪盖住 */
const footprints = [];
const PRINT_LIFE = 26;
let lastFoot = null;

function initFootprints() {
  footprints.length = 0;
  lastFoot = null;
}

function updateFootprints(now) {
  if (season !== 'winter') {
    if (footprints.length) initFootprints();
    return;
  }
  for (let i = footprints.length - 1; i >= 0; i--) {
    if (now - footprints[i].t > PRINT_LIFE) footprints.splice(i, 1);
  }
  const cat = catPose(now);
  if (!cat || cat.state !== 'walk') { lastFoot = null; return; }

  const k = G.R / 230;
  if (!lastFoot) { lastFoot = { x: cat.x, y: cat.y }; return; }
  const dx = cat.x - lastFoot.x, dy = cat.y - lastFoot.y;
  if (Math.hypot(dx, dy) < 11 * k) return;

  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const side = footprints.length % 2 === 0 ? 1 : -1;
  footprints.push({
    x: cat.x + nx * side * 2.4 * k,
    y: cat.y + ny * side * 2.4 * k,
    rot: Math.atan2(dy, dx),
    s: k,
    t: now
  });
  lastFoot = { x: cat.x, y: cat.y };
  if (footprints.length > 160) footprints.shift();
}

function drawFootprints(now, fade) {
  if (!footprints.length || season !== 'winter') return;
  for (const p of footprints) {
    const age = (now - p.t) / PRINT_LIFE;
    const a = clamp(1 - age, 0, 1);
    const al = 0.62 * Math.pow(a, 1.4) * fade;
    if (al <= 0.02) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    // 雪花被踩下去：偏冷的蓝灰，比雪面深一档
    ctx.fillStyle = `rgba(108,140,176,${al})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2 * p.s, 2.4 * p.s, 0, 0, TAU); ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 2.3 * p.s, -2.8 * p.s, 1.05 * p.s, 0, TAU);
      ctx.fill();
    }
    // 坑边一圈被踩实的白
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * al})`;
    ctx.lineWidth = Math.max(0.6, 0.7 * p.s);
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2 * p.s, 2.4 * p.s, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function drawSeasonDeco(now) {
  if (!texturesReady || !G.R) return;
  if (!DECO.spring) buildDeco();
  // 换季扫动时，旧季的装饰与脚印一起淡出，等新季落地再重新长出
  const fade = wipe ? 1 - wipeProgress(now) : 1;
  if (fade <= 0.01) return;
  const k = G.R / 230;
  if (season === 'spring') drawSpringDeco(now, fade, k);
  else if (season === 'summer') drawSummerDeco(now, fade, k);
  else if (season === 'autumn') drawAutumnDeco(now, fade, k);
  else if (season === 'winter') { drawWinterDeco(now, fade, k); drawFootprints(now, fade); }
}

/* ---------------- 绘制：猫与鸽 ---------------- */

/* 猫的姿态：动物绘制与脚印共用，避免两处坐标跑偏 */
function catPose(now) {
  const R = G.R, ry = G.ry;
  const k = R / 230;
  const part = daypartNow();
  const cr = R * 0.66;

  if (part === 'night') {
    const ca = 0.32;
    return {
      state: 'sleep', part,
      x: G.cx + Math.cos(ca) * cr,
      y: G.cy + Math.sin(ca) * ry * (cr / R),
      s: 1.55 * k, dir: 1, ph: now * 1.0, bob: 0
    };
  }
  if (part === 'day') {
    const ca = 0.32;
    return {
      state: 'loaf', part,
      x: G.cx + Math.cos(ca) * cr,
      y: G.cy + Math.sin(ca) * ry * (cr / R),
      s: 1.54 * k, dir: 1, ph: now * 1.4, bob: 0
    };
  }
  const walkSpeed = part === 'dusk' ? 0.075 : 0.045;
  const ca = now * walkSpeed + 0.9;
  return {
    state: 'walk', part,
    x: G.cx + Math.cos(ca) * cr,
    y: G.cy + Math.sin(ca) * ry * (cr / R),
    s: 1.5 * k,
    dir: Math.cos(ca + Math.PI / 2) >= 0 ? 1 : -1,
    ph: now * 3.1,
    bob: Math.abs(Math.sin(now * 2.4)) * 1.2 * k
  };
}


function drawCat(x, y, s, dir, ph, state) {
  state = state || 'walk';
  const swing = Math.sin(ph * 1.6);
  const breath = 0.5 + 0.5 * Math.sin(ph * 0.55);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(0, 0.6, (state === 'sleep' ? 11.8 : 10) * s, 3.4 * s, 0, 0, TAU); ctx.fill();
  ctx.scale(dir * s, s);

  const body = '#0d0f12';
  ctx.fillStyle = body;

  if (state === 'sleep') {
    // 蜷成一团，头埋在尾巴里，只随呼吸轻轻起伏
    ctx.beginPath();
    ctx.ellipse(0, -4.2 - breath * 0.7, 9.8, 5.1 + breath * 0.6, -0.06, 0, TAU);
    ctx.fill();
    // 尾巴绕到身前
    ctx.strokeStyle = body; ctx.lineWidth = 2.3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7.6, -3.2);
    ctx.bezierCurveTo(-10.0, -1.2, -4.2, 0.2, 2.8, -1.0);
    ctx.stroke();
    // 头贴在前侧
    ctx.beginPath(); ctx.ellipse(6.4, -5.6, 3.7, 3.3, 0.18, 0, TAU); ctx.fill();
    // 耳朵平摊
    ctx.beginPath(); ctx.moveTo(4.0, -8.0); ctx.lineTo(3.5, -11.0); ctx.lineTo(6.1, -8.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7.1, -8.5); ctx.lineTo(8.7, -11.0); ctx.lineTo(9.4, -7.9); ctx.closePath(); ctx.fill();
    // 闭眼
    ctx.strokeStyle = 'rgba(206,232,186,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(6.8, -5.1, 1.6, 0.32, 1.12); ctx.stroke();
    // 背线轮廓光
    ctx.strokeStyle = 'rgba(210,235,190,0.24)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8.6, -7.2); ctx.quadraticCurveTo(-1.0, -9.8, 5.0, -8.2); ctx.stroke();
    ctx.restore();
    return;
  }

  if (state === 'loaf') {
    // 白天：蹲坐着看风景，尾巴盘在身前
    ctx.beginPath(); ctx.ellipse(-0.4, -3.6, 9.0, 4.7, -0.04, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.6, -6.2, 4.8, 5.6, -0.16, 0, TAU); ctx.fill();
    // 前爪
    ctx.beginPath(); ctx.rect(5.2, -2.6, 2.0, 3.6); ctx.fill();
    ctx.beginPath(); ctx.rect(2.4, -2.6, 2.0, 3.6); ctx.fill();
    // 头
    ctx.beginPath(); ctx.ellipse(6.4, -11.0, 3.9, 3.6, 0.06, 0, TAU); ctx.fill();
    // 耳
    ctx.beginPath(); ctx.moveTo(4.3, -13.2); ctx.lineTo(4.4, -16.8); ctx.lineTo(6.8, -14.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7.6, -14.0); ctx.lineTo(9.2, -17.0); ctx.lineTo(9.9, -13.4); ctx.closePath(); ctx.fill();
    // 尾巴绕到身前
    ctx.strokeStyle = body; ctx.lineWidth = 2.0; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8.6, -4.6);
    ctx.bezierCurveTo(-11.6, -2.2, -6.0, -0.4, 0.6, -1.3 + Math.sin(ph * 0.8) * 0.3);
    ctx.stroke();
    // 眼睛（偶尔眨一下）
    const blink = Math.sin(ph * 0.35) > 0.94 ? 0.2 : 1;
    ctx.fillStyle = 'rgba(200,240,180,0.75)';
    ctx.beginPath(); ctx.ellipse(7.7, -11.4, 0.9, 0.9 * blink, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,240,180,0.5)';
    ctx.beginPath(); ctx.ellipse(5.2, -11.3, 0.7, 0.7 * blink, 0.2, 0, TAU); ctx.fill();
    // 背线轮廓光
    ctx.strokeStyle = 'rgba(210,235,190,0.30)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-9.0, -6.6); ctx.quadraticCurveTo(-2.0, -9.6, 3.4, -9.4); ctx.stroke();
    ctx.restore();
    return;
  }

  // 身体
  ctx.beginPath();
  ctx.ellipse(0, -4.6, 8.6, 4.3, -0.04, 0, TAU);
  ctx.fill();
  // 胸口
  ctx.beginPath();
  ctx.ellipse(4.4, -5.0, 4.4, 4.6, -0.18, 0, TAU);
  ctx.fill();
  // 四肢
  ctx.fillStyle = body;
  const legY = -1.2;
  ctx.beginPath(); ctx.rect(3.4 + swing * 0.8, legY - 2.4, 1.9, 4.6); ctx.fill();
  ctx.beginPath(); ctx.rect(6.4 - swing * 0.8, legY - 2.4, 1.9, 4.6); ctx.fill();
  ctx.beginPath(); ctx.rect(-5.6 - swing * 0.8, legY - 2.4, 2.0, 4.4); ctx.fill();
  ctx.beginPath(); ctx.rect(-2.8 + swing * 0.8, legY - 2.4, 2.0, 4.4); ctx.fill();

  // 头
  ctx.beginPath();
  ctx.ellipse(9.6, -7.2, 3.9, 3.6, 0.12, 0, TAU);
  ctx.fill();
  // 双耳
  ctx.beginPath();
  ctx.moveTo(7.1, -9.4); ctx.lineTo(7.5, -13.4); ctx.lineTo(9.7, -10.4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10.4, -10.3); ctx.lineTo(11.8, -13.6); ctx.lineTo(12.9, -9.9);
  ctx.closePath(); ctx.fill();
  // 尾巴
  const sw = Math.sin(ph) * 1.6;
  ctx.strokeStyle = body;
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7.8, -5.4);
  ctx.bezierCurveTo(-12.4, -6.4 + sw, -13.6, -10.4 - sw, -11.4, -13.6 + sw);
  ctx.stroke();

  // 背线轮廓光
  ctx.strokeStyle = 'rgba(210,235,190,0.30)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-8.0, -8.0);
  ctx.quadraticCurveTo(-1.0, -10.2, 6.6, -8.6);
  ctx.stroke();

  ctx.restore();
}

function drawDove(x, y, s, dir, ph, flap, state) {
  state = state || 'walk';
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 0.8, 7.5 * s, 2.8 * s, 0, 0, TAU); ctx.fill();
  ctx.scale(dir * s, s);

  const ivory = '#f8f5ec';

  if (state === 'sleep') {
    // 蹲着睡：头缩进翅膀，眼睛闭上
    const br = 0.5 + 0.5 * Math.sin(ph * 0.5);
    ctx.fillStyle = '#ece6d6';
    ctx.beginPath();
    ctx.moveTo(-3.6, -4.0); ctx.lineTo(-10.4, -6.2); ctx.lineTo(-10.8, -3.0); ctx.lineTo(-4.0, -1.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ivory;
    ctx.beginPath(); ctx.ellipse(-0.6, -5.0 - br * 0.4, 6.2, 4.0 + br * 0.35, -0.08, 0, TAU); ctx.fill();
    // 折起的翅膀
    ctx.save();
    ctx.rotate(0.10);
    ctx.fillStyle = '#efeadb';
    ctx.beginPath(); ctx.ellipse(-1.4, -5.0, 5.4, 2.6, 0.06, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(180,172,150,0.45)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(1.0, -6.0); ctx.quadraticCurveTo(-1.8, -4.8, -5.2, -4.4); ctx.stroke();
    ctx.restore();
    // 头缩在肩后
    ctx.fillStyle = ivory;
    ctx.beginPath(); ctx.arc(2.4, -8.0, 2.6, 0, TAU); ctx.fill();
    // 闭眼
    ctx.strokeStyle = 'rgba(60,64,58,0.7)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(3.2, -8.2, 1.1, 0.3, 1.1); ctx.stroke();
    ctx.restore();
    return;
  }
  // 尾羽
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath();
  ctx.moveTo(-4.2, -4.6);
  ctx.lineTo(-11.2, -7.6);
  ctx.lineTo(-11.6, -4.4);
  ctx.lineTo(-5.0, -2.4);
  ctx.closePath(); ctx.fill();
  // 身体
  ctx.fillStyle = ivory;
  ctx.beginPath();
  ctx.ellipse(-0.4, -5.2, 6.0, 3.4, -0.10, 0, TAU);
  ctx.fill();
  // 头
  ctx.beginPath(); ctx.arc(4.9, -8.4, 2.8, 0, TAU); ctx.fill();
  // 喙
  ctx.fillStyle = '#dfbe7e';
  ctx.beginPath();
  ctx.moveTo(7.3, -8.9); ctx.lineTo(9.6, -8.2); ctx.lineTo(7.3, -7.5);
  ctx.closePath(); ctx.fill();
  // 翅膀（振翅）
  const wing = Math.sin(ph * 3.2) * 0.18 + flap * 0.9;
  ctx.save();
  ctx.translate(-0.8, -5.6);
  ctx.rotate(-0.28 - wing);
  ctx.fillStyle = '#efeadb';
  ctx.beginPath(); ctx.ellipse(-1.0, 0, 6.0, 2.6, 0.06, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(180,172,150,0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(1.4, -1.2); ctx.quadraticCurveTo(-1.8, 0.2, -5.4, 0.6);
  ctx.stroke();
  ctx.restore();

  // 眼睛
  ctx.fillStyle = 'rgba(30,34,32,0.9)';
  ctx.beginPath(); ctx.arc(5.9, -9.0, 0.7, 0, TAU); ctx.fill();

  ctx.restore();
}

/* 一天四段：清晨 / 白天 / 黄昏 / 夜里 */
let daypartForce = null;
function daypartNow(h) {
  if (daypartForce) return daypartForce;
  const hh = (h === undefined) ? new Date().getHours() : h;
  if (hh >= 5 && hh < 9) return 'dawn';
  if (hh >= 9 && hh < 17) return 'day';
  if (hh >= 17 && hh < 21) return 'dusk';
  return 'night';
}

/* 夜里主角呼吸般的 z z z */
function drawZzz(x, y, k, now) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const t = ((now * 0.32 + i * 0.6) % 1.8) / 1.8;
    const al = Math.sin(t * Math.PI) * 0.5;
    if (al <= 0.02) continue;
    ctx.font = `300 ${Math.round((6 + t * 7) * k)}px Georgia, serif`;
    ctx.fillStyle = `rgba(255,248,226,${al})`;
    ctx.fillText('z', x + (i - 1) * 5 * k + t * 9 * k, y - 16 * k - t * 20 * k);
  }
  ctx.restore();
}

function drawAnimals(now) {
  const R = G.R, ry = G.ry;
  const k = R / 230;
  const cat = catPose(now);
  const part = cat.part;

  if (cat.state === 'sleep') {
    // 夜里：猫蜷着睡，鸽子把头缩进翅膀，两只都在盘上歇着
    drawCat(cat.x, cat.y, cat.s, cat.dir, cat.ph, 'sleep');
    const da = 2.80, dr = R * 0.64;
    const dx = G.cx + Math.cos(da) * dr;
    const dy = G.cy + Math.sin(da) * ry * (dr / R);
    drawDove(dx, dy, 1.44 * k, -1, now * 0.9, 0, 'sleep');
    drawZzz(cat.x, cat.y, k, now);
    return;
  }

  if (cat.state === 'loaf') drawCat(cat.x, cat.y, cat.s, cat.dir, cat.ph, 'loaf');
  else drawCat(cat.x, cat.y - cat.bob, cat.s, cat.dir, cat.ph, 'walk');

  // 鸽：清晨与黄昏振翅绕行，白天在地面踱步
  const da = now * (part === 'day' ? 0.018 : 0.03) + 5.1;
  const dr = R * (part === 'day' ? 0.56 : 0.62);
  const dx = G.cx + Math.cos(da) * dr;
  const dy = G.cy + Math.sin(da) * ry * (dr / R);
  if (part === 'day') {
    const step = Math.abs(Math.sin(now * 3.4)) * 1.0 * k;
    drawDove(dx, dy - step, 1.4 * k, Math.cos(da) > 0 ? -1 : 1, now * 2, 0, 'walk');
  } else {
    const flap = (Math.sin(now * 0.7) > 0.86) ? Math.sin(now * 8) : 0;
    drawDove(dx, dy - Math.abs(flap) * 4 - 2, 1.4 * k, Math.cos(da) > 0 ? -1 : 1, now * 2, flap, 'fly');
  }
}

/* ---------------- 绘制：中枢与指针 ---------------- */

function drawHub(now) {
  const R = G.R, ry = G.ry;
  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);
  const h = G.hub;

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(0, 0, h * 1.18, 0, TAU); ctx.fill();

  const g = ctx.createRadialGradient(0, 0, h * 0.1, 0, 0, h);
  g.addColorStop(0, '#07080a');
  g.addColorStop(0.62, '#040506');
  g.addColorStop(0.86, '#151410');
  g.addColorStop(1, '#3b3320');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, h, 0, TAU); ctx.fill();

  // 金色内环
  ctx.strokeStyle = 'rgba(255,222,150,0.30)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(0, 0, h * 0.965, 0, TAU); ctx.stroke();

  // 顶部反光弧
  const ag = ctx.createLinearGradient(-h, -h, h, -h);
  ag.addColorStop(0, 'rgba(255,240,200,0)');
  ag.addColorStop(0.5, 'rgba(255,244,210,0.55)');
  ag.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.strokeStyle = ag;
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(0, 0, h * 0.99, -2.5, -0.7); ctx.stroke();
  ctx.restore();
}

/* 光束 = 秒针。默认跟着真实时间走；「加速轮转」时只是视觉上加速，
   真实时间（表盘下方的数字）完全不受影响。相位 0 指向 12 点。 */

const TURBO_REV = 15;            // 加速轮转：一圈 15 秒
let beamPhaseNow = 0;            // 当前光束相位 0..TAU
let beamOffset = 0;              // 叠加在真实秒针上的额外旋转

function realPhase(date) {
  const d = date || new Date();
  return TAU * ((d.getSeconds() + d.getMilliseconds() / 1000) / 60);
}

/* 从当前相位到下一次经过 12 点还要多少秒（加速轮转按 15 秒一圈算） */
function secondsToTop() {
  return (1 - beamPhaseNow / TAU) * TURBO_REV;
}

function updateBeam(dt, now) {
  const base = realPhase();
  if (CFG.turbo) {
    // 每秒比真实秒针多转 (1/15 - 1/60) 圈
    beamOffset += dt * TAU * (1 / TURBO_REV - 1 / 60);
  } else if (Math.abs(beamOffset) > 1e-4) {
    // 关掉加速后用指数衰减追回真实秒针，不会有生硬跳变
    beamOffset *= Math.exp(-dt * 3.4);
    if (Math.abs(beamOffset) < 2e-4) beamOffset = 0;
  }
  let ph = (base + beamOffset) % TAU;
  if (ph < 0) ph += TAU;
  beamPhaseNow = ph;
}

function beamAngle(now) {
  return -Math.PI / 2 + beamPhaseNow;
}

function drawHands(now) {
  const R = G.R, ry = G.ry;
  const d = new Date();
  const hourA = -Math.PI / 2 + TAU * (((d.getHours() % 12) + d.getMinutes() / 60) / 12);
  const minA = -Math.PI / 2 + TAU * ((d.getMinutes() + d.getSeconds() / 60) / 60);

  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);

  // 时针
  ctx.save();
  ctx.rotate(hourA);
  ctx.shadowColor = 'rgba(20,26,18,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255,240,196,0.82)';
  ctx.beginPath();
  ctx.moveTo(-R * 0.045, 0); ctx.lineTo(R * 0.275, 2.4);
  ctx.lineTo(R * 0.30, 0); ctx.lineTo(R * 0.275, -2.4);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 分针
  ctx.save();
  ctx.rotate(minA);
  ctx.shadowColor = 'rgba(20,26,18,0.5)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(255,246,214,0.9)';
  ctx.beginPath();
  ctx.moveTo(-R * 0.05, 0); ctx.lineTo(R * 0.455, 2.0);
  ctx.lineTo(R * 0.478, 0); ctx.lineTo(R * 0.455, -2.0);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBeam(now) {
  const R = G.R, ry = G.ry;
  const a = beamAngle(now);
  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(1, ry / R);
  ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';

  const len = R * 0.9;

  // 只靠粗细递减的叠线做柔光，避免出现硬边多边形
  const layers = [[R * 0.075, 0.05], [R * 0.038, 0.09], [R * 0.016, 0.16]];
  for (const [w, al] of layers) {
    ctx.strokeStyle = `rgba(255,226,152,${al})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(R * 0.02, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
  }

  // 光束芯
  const g2 = ctx.createLinearGradient(0, 0, len, 0);
  g2.addColorStop(0, 'rgba(255,230,165,0.30)');
  g2.addColorStop(0.5, 'rgba(255,242,200,0.62)');
  g2.addColorStop(1, 'rgba(255,252,232,0.92)');
  ctx.strokeStyle = g2;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

  // 笔尖：一团柔和的暖光，整团都留在盘内
  const bx = len - R * 0.055;
  const tg = ctx.createRadialGradient(bx, 0, 0, bx, 0, R * 0.062);
  tg.addColorStop(0, 'rgba(255,252,235,0.55)');
  tg.addColorStop(0.35, 'rgba(255,236,170,0.28)');
  tg.addColorStop(1, 'rgba(255,208,100,0)');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(bx, 0, R * 0.062, R * 0.030, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* ---------------- 绘制：水波反馈 ---------------- */

function drawRipples(now) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const t = (now - r.t0) / 1.1;
    if (t >= 1) { ripples.splice(i, 1); continue; }
    ctx.save();
    ctx.translate(G.cx, G.cy);
    ctx.scale(1, G.ry / G.R);
    ctx.globalCompositeOperation = 'lighter';
    const rad = G.R * (0.05 + 0.42 * easeOut(t));
    ctx.strokeStyle = `rgba(255,240,190,${(1 - t) * 0.55})`;
    ctx.lineWidth = 2.4 * (1 - t) + 0.6;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- 绘制：文字 ---------------- */

/* ---------------- 治愈语录：每季多条，随机轮换 ---------------- */

const QUOTE_DUR = 26;   // 每条停留秒数
let quote = '';
let quoteT0 = 0;
let quoteIdx = -1;

function pickQuote(s, now, force) {
  const list = (PAL[s] && PAL[s].quotes) || [];
  if (!list.length) { quote = ''; return; }
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1) {
    let guard = 0;
    while (i === quoteIdx && force !== 'same-season' && guard++ < 8) {
      i = Math.floor(Math.random() * list.length);
    }
  }
  quoteIdx = i;
  quote = list[i];
  quoteT0 = now;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function drawCaption(now) {
  if (!CFG.showClock) return;
  const d = new Date();
  const R = G.R;
  const bottom = G.cy + G.ry + G.th;                 // 盘底
  const area = Math.max(40, H - bottom);              // 盘下方可用于文字的高度
  const fsT = Math.round(Math.min(R * 0.125, area * 0.36));   // 时间字号
  const fs = Math.round(Math.min(Math.max(9, R * 0.046), area * 0.20));
  const y1 = bottom + area * 0.26;
  const y2 = bottom + area * 0.58;
  const y3 = bottom + area * 0.86;
  const pal = PAL[season];

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 三行文字统一画法：先一道深色细描边，再带紧凑深投影填色。
  // 这样纯白桌面/白色窗口上也能读，深色桌面上又不会糊成一片灰雾。
  const textLine = (str, x, y, font, fill, blur, dy, strokeA, lineW) => {
    ctx.font = font;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (lineW > 0) {
      ctx.lineWidth = lineW;
      ctx.strokeStyle = `rgba(8,12,16,${strokeA})`;
      ctx.strokeText(str, x, y);
    }
    ctx.shadowColor = 'rgba(8,12,16,0.88)';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = dy;
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };

  // 时间
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  textLine(t, G.cx, y1, `300 ${fsT}px Georgia, "Times New Roman", serif`,
    'rgba(255,250,236,0.99)', Math.max(3, fsT * 0.20), Math.max(1, fsT * 0.05),
    0.62, Math.max(1.6, fsT / 17));

  // 日期 + 星期 + 节气
  const week = '日一二三四五六'[d.getDay()];
  const line = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${week} · ${solarTermOf(d)}`;
  textLine(line, G.cx, y2, `300 ${fs}px "Microsoft YaHei", system-ui, sans-serif`,
    'rgba(255,250,238,0.94)', Math.max(2.5, fs * 0.34), 1,
    0.72, Math.max(1.8, fs * 0.32));

  // 季节 + 治愈语录（随机轮换，淡入淡出）
  if (!quote) pickQuote(season, now);
  if (now - quoteT0 > QUOTE_DUR) pickQuote(season, now);
  const life = now - quoteT0;
  const qa = Math.min(1, life / 1.4) * Math.min(1, Math.max(0, (QUOTE_DUR - life) / 1.4));
  textLine(`${pal.cn} · ${quote}`, G.cx, y3, `300 ${fs}px "Microsoft YaHei", system-ui, sans-serif`,
    pal.rim + (0.96 * Math.max(0, qa)).toFixed(3) + ')', Math.max(2.5, fs * 0.34), 1,
    0.72 * Math.max(0, qa), Math.max(1.8, fs * 0.32));
  ctx.restore();
}

/* ---------------- 主循环 ---------------- */

let last = 0;
let started = 0;

// 桌宠不需要 60fps：默认 30fps，显著降低 CPU/GPU 占用（可用 ?fps=60 临时放开）
const FPS = (() => {
  const q = parseFloat(new URLSearchParams(location.search).get('fps') || '30');
  return Math.min(60, Math.max(12, Number.isFinite(q) ? q : 30));
})();
const MIN_FRAME_GAP = 1 / FPS - 0.0025;

function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts / 1000;
  if (!started) started = now;
  // 限帧 + 页面不可见时不画
  if (document.hidden) return;
  if (last && now - last < MIN_FRAME_GAP) return;
  const dt = last ? Math.min(0.06, now - last) : 0.016;
  last = now;

  introT = Math.min(1, (now - started) / 1.4);

  updateBeam(dt, now);      // 光束（秒针）相位：加速轮转只改它，不改真实时间
  updateSeason(now);
  updateParticles(dt, now);
  updateSky(dt, now);
  updateFootprints(now);

  ctx.clearRect(0, 0, W, H);

  drawBaseLayer(now);       // 投影 + 侧壁 + 地面（缓存）
  drawSurfaceFx(now);       // 地表闪光 + 光束光池
  drawSeasonDeco(now);      // 盘内四季装饰（花 / 荷 / 稻草 / 雪堆 + 猫脚印）
  drawRim(now);
  drawSnowCap();
  drawAnimals(now);
  drawSnowCap();
  drawAnimals(now);
  drawHub(now);
  drawHands(now);
  drawBeam(now);
  drawSky(now);
  drawParticles(now);
  drawRipples(now);
  drawCaption(now);
  drawHoverHint();
}

function updateSeason(now) {
  const period = CFG.turbo ? TURBO_REV : CFG.interval;

  if (!wipe && !CFG.turbo && CFG.seasonMode === 'real') {
    const rs = realSeason();
    if (rs !== season) startWipe(rs, 60, now);
  } else if (!wipe && CFG.seasonMode === 'auto') {
    if (!nextChangeAt) nextChangeAt = now + (CFG.turbo ? secondsToTop() + 0.02 : 6);
    if (now >= nextChangeAt) {
      const i = ORDER.indexOf(season);
      const nxt = ORDER[(i + 1) % 4];
      startWipe(nxt, period, now);
      nextChangeAt = now + period;
    }
  }

  if (wipe) {
    const p = wipeProgress(now);
    if (p >= 1) {
      season = wipe.to;
      wipe = null;
      seedSky();
      pickQuote(season, now);
      seasonT0 = now;
      initFootprints();
      if (CFG.seasonMode === 'auto') {
        // 加速轮转时紧接着下一圈：每一圈 12 点都开始一次换季
        nextChangeAt = CFG.turbo ? now : now + Math.max(30, CFG.interval);
      }
    }
  }
}

/* ---------------- 鼠标 / 拖动 / 菜单 ---------------- */

function pointNearDisc(x, y) {
  if (!G.R) return false;
  const dx = (x - G.cx) / (G.R * 1.14);
  const dy = (y - G.cy) / (G.ry * 1.75 + G.th);
  return dx * dx + dy * dy <= 1;
}

/* 把「可点击区域」告诉主进程：主进程按真实光标位置判定穿透，
   这样鼠标快速移进盘面时也不会被穿透状态吃掉第一次点击 */
function sendHitShape() {
  const rx = Math.max(1, G.R * 1.14);
  const ry = Math.max(1, (G.ry + G.th) * 1.18);
  const capY = G.cy + G.ry + G.th;
  ipc.send('pet:hit', {
    cx: G.cx, cy: G.cy, rx, ry,
    capX0: G.cx - G.R * 0.6,
    capX1: G.cx + G.R * 0.6,
    capY0: Math.round(capY - 4),
    capY1: H
  });
}

function updateIgnore() { /* 穿透判定已移交主进程，这里保留空实现兼容旧调用 */ }

let dragging = false, dragMoved = false, pressAt = null, dragStart = null;

document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (dragging && dragStart) {
    // 位移由主进程按光标屏幕坐标算，这里只判「是否真的移动过」
    if (Math.abs(e.screenX - dragStart.sx) + Math.abs(e.screenY - dragStart.sy) > 3) dragMoved = true;
  }
});

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (!pointNearDisc(e.clientX, e.clientY)) return;
  dragging = true;
  dragMoved = false;
  dragStart = { sx: e.screenX, sy: e.screenY };
  pressAt = { x: e.clientX, y: e.clientY };
  ipc.send('pet:dragStart', {});
  e.preventDefault();
});

document.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  if (dragging) {
    dragging = false;
    ipc.send('pet:dragEnd', {});
    if (!dragMoved && pressAt) {
      ripples.push({ t0: performance.now() / 1000 });
      if (menuOpen) hideMenu();
    }
  }
  dragStart = null;
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showMenu(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

/* ---------------- 悬浮提示 ---------------- */

function drawHoverHint() {
  // 悬停时盘沿微微提亮
  if (!pointNearDisc(mouse.x, mouse.y)) { hoverT = Math.max(0, hoverT - 0.05); return; }
  hoverT = Math.min(1, hoverT + 0.06);
}

/* ---------------- 菜单 ---------------- */

let menuOpen = false;

const SIZE_LABEL = { s: '小', m: '中', l: '大' };

const MENU_DEF = [
  {
    title: '季节',
    items: [
      { label: '自动轮转', act: () => { CFG.seasonMode = 'auto'; nextChangeAt = 0; } },
      {
        label: '加速轮转', toggle: 'turbo',
        apply: (v) => {
          if (v) {
            // 加速轮转 = 自动轮转的快放：15 秒一圈，每转到 12 点开始换季
            CFG.seasonMode = 'auto';
            nextChangeAt = performance.now() / 1000 + secondsToTop() + 0.02;
          } else {
            nextChangeAt = 0;
          }
        }
      },
      { label: '跟随真实季节', act: () => { CFG.seasonMode = 'real'; } },
      { label: '定格 · 春', act: () => fixSeason('spring') },
      { label: '定格 · 夏', act: () => fixSeason('summer') },
      { label: '定格 · 秋', act: () => fixSeason('autumn') },
      { label: '定格 · 冬', act: () => fixSeason('winter') }
    ]
  },
  {
    title: '转盘',
    items: [
      { label: '显示时钟', toggle: 'showClock' },
      { label: '十二刻度', toggle: 'showTicks' },
      { label: '轮转间隔', sub: true }
    ]
  },
  {
    title: '窗口',
    items: [
      { label: '小', act: () => setSize('s'), check: () => CFG.size === 's' },
      { label: '中', act: () => setSize('m'), check: () => CFG.size === 'm' },
      { label: '大', act: () => setSize('l'), check: () => CFG.size === 'l' },
      { label: '窗口置顶', toggle: 'topmost', apply: (v) => ipc.send('pet:topmost', v) },
      { label: '鼠标穿透', toggle: 'clickThrough', apply: (v) => ipc.send('pet:clickthrough', v) },
      { label: '开机自启', toggle: 'autoStart', apply: (v) => ipc.send('pet:autostart', v) }
    ]
  },
  {
    title: '支持',
    items: [
      { label: '打赏作者', act: () => ipc.send('pet:donate', {}) }
    ]
  }
];

function fixSeason(s) {
  CFG.seasonMode = 'fixed';
  CFG.fixedSeason = s;
  const now = performance.now() / 1000;
  if (s !== season) { startWipe(s, 2.4, now); pickQuote(s, now); }
}

function setSize(k) {
  CFG.size = k;
  ipc.send('pet:resize', SIZES[k]);
}

function buildMenu() {
  const html = [];
  for (const grp of MENU_DEF) {
    html.push(`<div class="group"><div class="group-title">${grp.title}</div>`);
    for (const it of grp.items) {
      if (it.sub) {
        html.push(`<div class="item" data-subtime="1">轮转间隔<span style="opacity:.55">${CFG.interval}s ▾</span><span class="check"> </span></div>`);
        continue;
      }
      const active = it.toggle ? !!CFG[it.toggle] : (it.check ? it.check() : (it.label.startsWith('自动') ? CFG.seasonMode === 'auto' : it.label.startsWith('跟随') ? CFG.seasonMode === 'real' : false));
      html.push(`<div class="item${active ? ' active' : ''}" data-idx="${MENU_DEF.indexOf(grp)}:${grp.items.indexOf(it)}">${it.label}<span class="check">✓</span></div>`);
    }
    html.push('</div>');
  }
  html.push('<div class="sep"></div>');
  html.push('<div class="item danger" data-act="quit">退出</div>');
  menuEl.innerHTML = html.join('');
}

function showMenu(x, y) {
  buildMenu();
  menuOpen = true;
  menuEl.classList.remove('hidden');
  // 菜单高度受窗口限制：先定最大高度，再据此摆放，避免被裁掉
  const maxH = Math.max(180, H - 12);
  menuEl.style.maxHeight = maxH + 'px';
  const mw = menuEl.offsetWidth;
  const mh = Math.min(menuEl.offsetHeight, maxH);
  const px = clamp(x, 6, Math.max(6, W - mw - 6));
  const py = clamp(y, 6, Math.max(6, H - mh - 6));
  menuEl.style.left = px + 'px';
  menuEl.style.top = py + 'px';
  ipc.send('pet:menuopen', true);
}

function hideMenu() {
  menuOpen = false;
  menuEl.classList.add('hidden');
  ipc.send('pet:menuopen', false);
}

menuEl.addEventListener('mousedown', () => { menuOpen = true; });
menuEl.addEventListener('click', (e) => {
  const el = e.target.closest('.item');
  if (!el) return;
  if (el.dataset.act === 'quit') { ipc.send('pet:quit'); return; }
  if (el.dataset.subtime) {
    const opts = [60, 90, 180, 360];
    const i = opts.indexOf(CFG.interval);
    CFG.interval = opts[(i + 1) % opts.length];
    nextChangeAt = 0;
    saveCfg();
    buildMenu();
    return;
  }
  const idx = el.dataset.idx;
  if (!idx) return;
  const [gi, ii] = idx.split(':').map(Number);
  const it = MENU_DEF[gi].items[ii];
  if (it.toggle) {
    CFG[it.toggle] = !CFG[it.toggle];
    if (it.apply) it.apply(CFG[it.toggle]);
  } else if (it.act) {
    it.act();
  }
  saveCfg();
  buildMenu();
  setTimeout(() => { if (menuOpen) { menuOpen = false; menuEl.classList.add('hidden'); updateIgnore(); } }, 140);
});

window.addEventListener('mousedown', (e) => {
  if (menuOpen && !menuEl.contains(e.target)) hideMenu();
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) hideMenu();
});

// 主进程告知：窗口失焦 / 光标离开窗口 → 收起菜单
if (ipc.on) ipc.on('pet:menuClose', () => { if (menuOpen) hideMenu(); });

/* ---------------- 启动 ---------------- */

window.addEventListener('resize', () => { resize(); });

ipc.on('pet:resized', () => { resize(); });

function boot() {
  resize();
  buildAllTextures();
  season = CFG.seasonMode === 'real' ? realSeason() : (CFG.seasonMode === 'fixed' ? CFG.fixedSeason : 'spring');

  // 调试用：?season=autumn&wipeTo=winter&wipeP=0.5&a0=-1.1
  const qp = new URLSearchParams(location.search);
  const qs = qp.get('season');
  if (qs && PAL[qs]) {
    season = qs;
    CFG.seasonMode = 'fixed';
    CFG.fixedSeason = qs;
    const wt = qp.get('wipeTo');
    if (wt && PAL[wt]) {
      const p = clamp(parseFloat(qp.get('wipeP') || '0.5'), 0.001, 0.999);
      const now0 = performance.now() / 1000;
      const dur = 1e9;
      wipe = {
        from: qs, to: wt, dur,
        t0: now0 - p * dur,
        a0: qp.get('a0') ? parseFloat(qp.get('a0')) : -Math.PI / 2
      };
    }
  }
  if (qp.get('clock') === '0') CFG.showClock = false;
  if (qp.get('turbo') === '1') { CFG.turbo = true; CFG.seasonMode = 'auto'; }
  const dp = qp.get('part');
  if (dp === 'dawn' || dp === 'day' || dp === 'dusk' || dp === 'night') daypartForce = dp;

  pickQuote(season, performance.now() / 1000);

  ipc.send('pet:ready', {});
  // 让窗口尺寸和菜单里勾选的档位保持一致
  if (CFG.size && SIZES[CFG.size]) ipc.send('pet:resize', SIZES[CFG.size]);
  ipc.send('pet:topmost', CFG.topmost);
  ipc.send('pet:autostart', CFG.autoStart);
  ipc.send('pet:clickthrough', CFG.clickThrough);
  sendHitShape();
  seedSky();
  requestAnimationFrame(frame);
}

boot();
