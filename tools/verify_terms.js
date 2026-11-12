// 24 节气精确时刻（北京时间），供 app.js 与校验使用
const RAD = Math.PI / 180;

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

const TERMS = [
  ['小寒', 285], ['大寒', 300], ['立春', 315], ['雨水', 330],
  ['惊蛰', 345], ['春分', 0], ['清明', 15], ['谷雨', 30],
  ['立夏', 45], ['小满', 60], ['芒种', 75], ['夏至', 90],
  ['小暑', 105], ['大暑', 120], ['立秋', 135], ['处暑', 150],
  ['白露', 165], ['秋分', 180], ['寒露', 195], ['霜降', 210],
  ['立冬', 225], ['小雪', 240], ['大雪', 255], ['冬至', 270]
];

function findTerm(year, targetL) {
  const startJd = jdFromUTC(year, 1, 1, 0) - 0.5;
  let prevJd = startJd, prev = sunLong(startJd) - targetL;
  for (let i = 1; i <= 400; i++) {
    const jd = startJd + i;
    const raw = sunLong(jd) - targetL;
    const cur = ((raw + 540) % 360) - 180;
    const prevN = ((prev + 540) % 360) - 180;
    if (prevN < 0 && cur >= 0 && (cur - prevN) < 30) {
      let lo = prevJd, hi = jd;
      for (let k = 0; k < 40; k++) {
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

// JD → 北京时间的年月日时分（不受本机时区影响）
function beijing(jd) {
  const d = new Date((jd - 2440587.5) * 86400000 + 8 * 3600000);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    hh: d.getUTCHours(), mm: d.getUTCMinutes()
  };
}

const pad = (n) => String(n).padStart(2, '0');
const cache = {};
function yearTerms(y) {
  if (cache[y]) return cache[y];
  const rows = TERMS.map(([name, L]) => {
    const jd = findTerm(y, L);
    const b = beijing(jd);
    return { name, m: b.m, d: b.d, hh: b.hh, mm: b.mm, ts: (jd - 2440587.5) * 86400000 };
  });
  cache[y] = rows;
  return rows;
}

for (const y of [2026, 2027, 2025, 2028]) {
  const rows = yearTerms(y);
  console.log(`\n==== ${y} 年 24 节气（北京时间）====`);
  let line = '';
  rows.forEach((r, i) => {
    line += `${r.name} ${r.m}/${r.d} ${pad(r.hh)}:${pad(r.mm)}   `;
    if ((i + 1) % 3 === 0) { console.log(line); line = ''; }
  });
  if (line) console.log(line);
}

console.log('\n== 立春/立夏/立秋/立冬 对照 ==');
for (const y of [2024, 2025, 2026, 2027, 2028]) {
  const rows = yearTerms(y);
  const pick = ['立春', '立夏', '立秋', '立冬'].map((n) => {
    const r = rows.find((x) => x.name === n);
    return `${n} ${r.m}/${r.d}`;
  });
  console.log(`${y}: ${pick.join('  ')}`);
}
