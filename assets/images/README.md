# Lap Analysis – Logo & Favicon

Racing lap + data analysis theme. Colors match `RacingTheme`: **#00d4ff** (electric blue), **#00ff88** (racing green), **#0a0a0a** (background).

## Files

| File                 | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `logo-source.svg`    | Main logo (track loop + data line). Use for app icon, splash, marketing. |
| `favicon-source.svg` | Simplified version for small favicons (32×32).                           |
| `icon.png`           | App icon (1024×1024). Referenced in `app.json`.                          |
| `favicon.png`        | Web favicon (48×48). Referenced in `app.json` for web.                   |

## Generating PNGs from SVG

**Option A – Script (recommended)**

```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

This creates `favicon.png`, `icon.png`, `splash-icon.png`, and `android-icon-foreground.png` in this folder.

**Option B – Manual**

1. Open `logo-source.svg` in a browser or design tool (Figma, Inkscape, etc.).
2. Export as PNG:
   - **favicon.png**: 48×48
   - **icon.png**: 1024×1024
   - **splash-icon.png**: 200×200 (or 1024 and let Expo scale)

Then place the files in `assets/images/` so `app.json` paths resolve.

## Android adaptive icons

`app.json` also references:

- `android-icon-foreground.png` (1024×1024; center 66% is visible)
- `android-icon-background.png` (1024×1024; solid or simple shape)
- `android-icon-monochrome.png` (1024×1024; single color for themed icons)

You can use the same logo for foreground. For background use a solid color (e.g. `#0a0a0a` or `#E6F4FE` to match current config). Generate monochrome by opening the SVG and exporting with one color (e.g. white or #00d4ff).
