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
// 已知参照点：太阳黄经 0° 在 2026-03-20 22:46 北京时间（春分）
const probes = [
  ['2026 春分 参考 3/20 22:46 CST', 2026, 3, 20, 14.7667, 0],
  ['2026 夏至 参考 6/21 16:24 CST', 2026, 6, 21, 8.4, 90],
  ['2026 立冬 参考 11/7 11:38 CST', 2026, 11, 7, 3.6333, 225],
];
for (const [tag, y, m, d, hUtc, expect] of probes) {
  const jd = jdFromUTC(y, m, d, hUtc);
  const got = sunLong(jd);
  console.log(`${tag}  期望 ${expect}°  算得 ${got.toFixed(4)}°  差 ${(got - expect).toFixed(4)}°`);
}
// 2000-01-01 12:00 UTC 的理论值约 280.37°
console.log('J2000 校验：', sunLong(jdFromUTC(2000, 1, 1, 12)).toFixed(4), '（应约 280.37）');
