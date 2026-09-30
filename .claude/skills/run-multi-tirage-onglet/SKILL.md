---
name: run-multi-tirage-onglet
description: Run, check and screenshot the Multi-Tirage-Onglet "Tirage au sort" app (names + dice draw, static HTML/CSS/JS). Use when asked to start or serve the app, check the code, check the UI or ergonomics, check compatibility on phones, tablets or interactive whiteboards (TBI), take a screenshot, or verify a change before pushing.
---

Static site (`index.html`, `css/`, `scripts/`, `assets/`) with no build and no dependencies.
Agents drive it with **`.claude/skills/run-multi-tirage-onglet/driver.cjs`**, a Playwright
script that serves the repo itself on a random port, runs the checks in headless Chromium,
prints `PASS`/`FAIL` lines, saves screenshots and exits 1 on any failure.

All paths are relative to the repo root.

## Prerequisites

Already present in the Claude Code cloud container. Nothing to install:

- Node 22 with **global** `playwright` (1.56) and `eslint` (10), from `npm root -g` = `/opt/node22/lib/node_modules`.
- Chromium at `/opt/pw-browsers/chromium`. Do **not** run `playwright install`.

```bash
NODE_PATH="$(npm root -g)" node -e "const {chromium,devices}=require('playwright');console.log(!!chromium, Object.keys(devices).length)"
# -> true 143
```

## Run (agent path)

```bash
NODE_PATH="$(npm root -g)" node .claude/skills/run-multi-tirage-onglet/driver.cjs all
```

Takes about 1–2 minutes and ends with `ALL PASSED — screenshots in /tmp/multi-tirage-shots`.
Screenshots go to `/tmp/multi-tirage-shots/` (override with `SHOTS=/path`). **Open them**
(`device-*.png`, `ui-*.png`): a PASS line does not show visual problems.

| command | what it checks |
|---|---|
| `code` | `node --check` on both scripts; eslint on `scripts/randomizer.js` (ES5 + browser globals, config next to the driver); every `getElementById` id exists in `index.html`; every local `href`/`src` and the 6 hand PNGs exist; `innerHTML` only receives internal markup (never names or file contents) |
| `ui` | at 1366×768, touch + mouse: HTML in a name is shown as text; the remove-drawn option; history; windows-1252 `.txt` import keeps accents; tap followed by mouse click both register; `?` on dice before the first roll; rolls of 6 points / 2 digits / 4 hands stay inside the dice area; hand images load; Space launches the draw; `F` enters fullscreen with a button focused; no horizontal overflow; touch targets ≥ 44 px; Lancer visible without scrolling; control outlines ≥ 3:1 contrast in light and dark themes; no page errors |
| `devices` | 13 emulated devices (iPhone SE/14/14 landscape, Pixel 7, Galaxy S9+, iPad Mini, iPad landscape, Galaxy Tab S4, whiteboards 1024×768 and 1920×1080, laptops 1280×720 and 1366×768, phone with text at 130 %): draws a long name, rolls 6 hand dice, draws an image (must stay inside its stage), imports 4 generated WAV + 1 broken file in the Sounds tab and plays / skips (on emulated iPad/iPhone the broken file is only caught at playback), checks overflow, dice fit, touch targets on all four tabs, errors, and that Lancer is **above the fold except on phones** (scrolling there is accepted). Prints die size and Lancer's bottom position |
| `shot WxH [opts]` | one screenshot. Options: `--tab dice --style hands\|pips\|digits --count 1-6 --roll --dark --fullscreen --text130 --touch`. `--fullscreen` uses the app's CSS fallback (`.fakeFullscreen`) |
| `all` | `code` + `ui` + `devices` |

Example of the one-screenshot path (checked working):

```bash
NODE_PATH="$(npm root -g)" node .claude/skills/run-multi-tirage-onglet/driver.cjs shot 1920x1080 --tab dice --style hands --count 3 --roll --fullscreen --touch
# -> PASS  screenshot /tmp/multi-tirage-shots/shot-1920x1080_tab_dice_style_hands_count_3_roll_fullscreen_touch.png
```

Lint only:

```bash
eslint -c .claude/skills/run-multi-tirage-onglet/eslint.config.mjs scripts/randomizer.js
```

**New hand drawings uploaded** (`assets/dice-hands/1.png` … `6.png`): normalise them in place
(crop, centre in 600×600 with a 6 % margin, even out stroke width, grey+alpha PNG) and rebuild
`icon.png` (outline of hand 5, used as a CSS mask by the style button), then run `all`:

```bash
NODE_PATH="$(npm root -g)" node .claude/skills/run-multi-tirage-onglet/prepare-hands.cjs
# -> 6.png  content 1175x896 → scale 0.449, stroke 19px thickened +16px, 556 KB → 50 KB
```

Files already at 600×600 are skipped, so re-running is safe. Rules for the drawings are in
`assets/dice-hands/README.md`.

To add a check, extend `ui()` or `deviceMatrix()` in the driver. The `measure()` and
`bottomFromTop()` helpers run inside the page.

## Run (human path)

```bash
python3 -m http.server 8765   # then open http://localhost:8765 ; Ctrl-C to stop
```

## Gotchas

- **`scripts/outil.js` and `css/outil.css` are verbatim copies of the Apps1D76 reference UI.**
  Never edit, reformat or lint-fix them. Put app styles in `css/style.css` using their
  variables (`--blue`, `--surface`, `--border`, …).
- **Measure "Lancer above the fold" in the worst case, not on a fresh page.** Two layout
  shifts appear only after use: the `Total :` line (after a roll with several dice) and a
  filled history column. Both once pushed Lancer 2–60 px below the fold on laptops while a
  fresh-page check passed. The driver measures after rolling 6 dice with history entries.
- **Playwright `tap`/`click` scroll the page.** Call `window.scrollTo(0,0)` before measuring
  positions (the driver's `bottomFromTop` does this).
- **Global modules only resolve with `NODE_PATH="$(npm root -g)"` and CommonJS.** ESM
  `import 'playwright'` does not use `NODE_PATH`, which is why the driver is `.cjs`.
- **ESLint 10 (global) has no `--env` and no bundled `@eslint/js`.** The config file lists
  its rules explicitly and ignores `catch (e)` bindings, which ES5 requires.
- **The Marianne font comes from `cdn.jsdelivr.net`, which the sandbox proxy blocks.**
  Screenshots use the fallback system font, so text looks slightly different from
  production. The driver filters those console errors out.
- **Only Chromium exists here.** Firefox and Safari/WebKit cannot be run, so device checks
  emulate size, pixel density and touch only. Target browsers are Safari/iPadOS 14.5+,
  Chrome/Edge 84+ and Firefox 75+, set by `?.`/`??` in `outil.js` and the flexbox `gap`.
  `randomizer.js` must stay ES5 (enforced by eslint `ecmaVersion: 5`).
- **The driver sets `reducedMotion: 'reduce'`.** The reference UI then disables animations,
  so rolls finish deterministically. Confetti is not rendered in the driver's screenshots.
- **Never process the hand images twice.** A second pass resamples an already-resized
  image by a fraction of a pixel and blurs it. `prepare-hands.cjs` skips 600×600 files. To
  redo them, restore the originals from git first (see `assets/dice-hands/README.md`).
- **The style-button icon is `assets/dice-hands/icon.png` used as a CSS mask**
  (`background: currentColor`), not the hand image. At 32 px the drawing's 16 px stroke
  becomes 0.8 px and only the white fill shows, as a white block. The icon keeps the outline only,
  thickened (`ICON_STROKE` 0.05: at 0.085 the fingers merge).
- **The reference `--border` is too faint for controls** (1.25:1 in light, 1.4:1 in dark).
  `css/style.css` gives controls `--control-border` (#88889f light, #6e6e92 dark, ≥ 3:1). The
  `ui` check measures it in both themes. Component rules declared later with
  `border: … var(--border)` override it, so use `var(--control-border)` in those rules directly
  (the `.tabBar` rule does).
- **The hands are white-filled with a black outline.** Don't add `filter: invert()` or
  `brightness(0)` on them (the old thin-line PNGs needed it): that would turn them into
  flat silhouettes.
- **Don't stop a background server with `pkill -f "http.server"`.** It matched the
  agent's own shell (exit 144). The driver serves in-process and needs no cleanup.

## Troubleshooting

- **`Invalid option '--env' - perhaps you meant '--ext'?`**: eslint 10 has no `--env`. Use
  `-c .claude/skills/run-multi-tirage-onglet/eslint.config.mjs`.
- **`ModuleNotFoundError: No module named 'PIL'`** when inspecting the hand PNGs: there is
  no Pillow. Measure images in the page with a `<canvas>` via Playwright instead.
- **`curl: (56) CONNECT tunnel failed, response 403`** on `ploufty.github.io`: the sandbox
  cannot reach the deployed site. Check deployment with the GitHub MCP `actions_list`
  (`pages build and deployment` runs on each merge to `main`) and test locally with the driver.
- **`FAIL ... Lancer bottom 728/720px BELOW FOLD`**: a layout change made the dice card
  taller. Adjust `.diceFaces` height or the `@media (max-height: 56rem)` block in
  `css/style.css`, not the test.
