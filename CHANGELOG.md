# Changelog

All notable changes to SeasonDial (四季转盘) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer.

## [1.2.0] — 2026-11-13

### Added
- **Turbo spin (加速轮转)**: new entry in the right-click menu's season group. The golden beam speeds up from one turn per 60 s to one turn per 15 s, and the ground is handed to the next season every time it passes 12 o'clock, so spring → summer → autumn → winter runs past in 15 s. The second-hand speed is purely visual: the hub hands and the clock/date/line underneath still show the real time. Turning it off blends the beam back onto the real second hand (no jump). Selecting turbo also switches the season mode to auto; any fixed mode or "follow the real season" cancels it.
- **Seasonal decorations that grow inside the disc**: spring flowers with stems and leaves rising out of the grass, summer water lilies floating on the pond with pads and ripples, autumn rice stalks growing tall with ears on top, winter snow drifts piling up in layers. They grow in over ~1.5–1.8 s when a season lands and fade out together with the outgoing ground during the wipe.
- **Footprints in the snow**: in winter the walking cat leaves a trail of paw prints behind it, alternately offset left and right, fading out over 26 s (about 160 prints at most).
- `tools/preview_new.js`, `tools/shot_one.js` — offscreen preview renderers used while tuning the decorations.
- `tools/test_behavior.js` — samples the beam phase and the wipe state through `executeJavaScript` to verify the 15 s period and the "change at 12 o'clock" timing without a GUI.
- `?turbo=1` query flag to force turbo spin on for debugging.

### Changed
- Sky particles (petals, leaves, snow, water glints) now fade out with a smoothstep as they drift below the disc, and are recycled at the fade end instead of at the window bottom — no more hard cut-off at the bottom edge.
- `drawAnimals` now reads a single `catPose(now)` pose, shared with the footprint trail so the prints line up with the cat.
- README (both languages) and the menu table in the manual document the turbo entry and the new per-season decorations; README screenshots regenerated with the new look.
- Version bumped to 1.2.0; the portable artefact is now `SeasonDial-1.2.0.exe`.

### Fixed
- Season decorations stayed invisible while no wipe was running (`wipeProgress()` returns 1 when idle, so the old `1 - wipeProgress()` fade evaluated to 0).

## [1.1.0] — 2026-11-13

### Added
- **Tip the author**: a new "打赏作者 / Tip the author" entry in the right-click menu and in the tray menu opens a small always-on-top window showing the WeChat reward QR code, with a close button and `Esc` support. The window is centred on the pet, clamped into the work area, and reused instead of stacked when opened twice.
- `renderer/donate.html` — the donate popup (dark rounded panel, gold title, QR card, close button).
- `assets/donate.png` — the reward code card, cropped free of the surrounding screenshot frame.
- `tools/make_donate.py` — rebuilds `assets/donate.png` from the original screenshot.
- `tools/preview_donate.js` — renders the donate popup offscreen to `tools/out/donate_preview.png` for layout checks without opening a GUI.

### Changed
- `README.md` is now the Simplified Chinese readme (the default GitHub landing page); the English one moved to `README.en.md`, with cross links updated both ways.
- Version bumped to 1.1.0; the portable artefact is now `SeasonDial-1.1.0.exe`.

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

[1.2.0]: https://github.com/92lyzxx/season-dial/releases/tag/v1.2.0
[1.1.0]: https://github.com/92lyzxx/season-dial/releases/tag/v1.1.0
[1.0.0]: https://github.com/92lyzxx/season-dial/releases/tag/v1.0.0
