const RAD = Math.PI / 180;
function sunLong(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const trueL = L0 + C;
  const omega = (125.04 - 1934.136 * T) * RAD;
  const app = trueL - 0.00569 - 0.00478 * Math.sin(omega);
  return ((app % 360) + 360) % 360;
}
function jdFromUTC(y, m, d, h) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24;
}
function jdToLocal(jd) { return new Date((jd - 2440587.5) * 86400000 + 8 * 3600000); }

const refJd = jdFromUTC(2026, 3, 20, 14.7667);
console.log('参考 JD:', refJd, ' sunLong=', sunLong(refJd).toFixed(4), ' 转本地=', jdToLocal(refJd).toISOString());

// 在参考点附近 ±1 天扫描 0° 穿越
for (let off = -1; off <= 1; off += 0.25) {
  const jd = refJd + off;
  console.log(`off=${off.toFixed(2)}d  sunLong=${sunLong(jd).toFixed(4)}`);
}

// 复现 termTime 的逻辑并打印
function findCrossing(year, targetL) {
  const startJd = jdFromUTC(year, 1, 1, 0) - 0.5;
  let prevJd = startJd;
  let prev = sunLong(startJd) - targetL;
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
      return { jd: (lo + hi) / 2, foundAt: i };
    }
    prev = raw; prevJd = jd;
  }
  return null;
}
const r = findCrossing(2026, 0);
console.log('\n扫到的春分 JD:', r.jd, ' sunLong=', sunLong(r.jd).toFixed(4));
console.log('转本地:', jdToLocal(r.jd).toISOString());
console.log('day index:', r.foundAt, ' startJd:', jdFromUTC(2026, 1, 1, 0) - 0.5);
console.log('startJd 转本地:', jdToLocal(jdFromUTC(2026, 1, 1, 0) - 0.5).toISOString());
