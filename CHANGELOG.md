# Changelog

All notable changes to SeasonDial (四季转盘) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer.

## [1.0.0] — 2026-11-13

First public release.

### Added
- Oval four-season island rendered entirely with Canvas 2D: grass plate, dark hub, golden beam as the second hand, ring of light-bead ticks, black cat and white dove.
- Season sweep: every rotation the ground is handed over with a sharp, glowing wedge boundary (spring → summer → autumn → winter).
- Real-season mode driven by the sun's apparent longitude (Meeus low precision), verified against the official 24-solar-term almanac for 2025–2028 (same day, 1–13 min difference).
- Distinct grounds per season, including a bright midday-teal summer pond with lotus leaves and water lilies, kept clearly apart from spring grass.
- Per-season sky: cherry petals, rising water glints, falling leaves, snow.
- Cat and dove schedules by time of day (sleep at night, loaf/blink by day, pace/flap at dawn and dusk).
- Six original healing lines per season, rotating every 26 s with fade, never repeating back-to-back.
- Right-click menu: season mode, clock and tick toggles, rotation interval (60/90/180/360 s), three sizes, always-on-top, click-through, autostart, quit.
- Position persistence, first launch in the top-right corner of the work area, clamping when a monitor is removed.
- Text outline plus drop shadow so all three caption lines stay readable on a white background.
- Multi-size Windows icon (16–256 px) — small sizes use a simplified disc crop.

### Performance
- 30 fps cap, base-layer offscreen caching, wedge-only compositing during season wipes.
- Measured 18–23 % of one core and ~430 MB working set; drawing stops when the window is hidden.

### Fixed
- Season mode previously used month-based guessing instead of real solar terms.
- Size switching and dragging silently did nothing in packaged builds because `preload.js` was missing from the build file list.
- Right-click menu did not close when clicking outside the window.
- Third caption line was clipped at the smallest window size.

[1.0.0]: https://github.com/USERNAME/season-dial/releases/tag/v1.0.0
