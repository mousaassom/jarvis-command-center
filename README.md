# JARVIS Command Center

An Iron Man-inspired browser command center with a red-and-gold 3D helmet, animated reactor HUD, local command engine, voice input/output, browser telemetry, safe diagnostics, security guidance, focus mode, and diagnostic-report export.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Commands

Try `help`, `run diagnostic`, `check security`, `mission brief`, `optimize performance`, `focus mode`, `current time`, or `clear chat`.

## Scope and privacy

This version is frontend-only. It uses browser-provided metadata and a rule-based local command engine, not a cloud AI model. It cannot inspect or control operating-system files, processes, credentials, or other applications. Chat and preferences are stored in this browser's local storage only; they do not sync across devices and are removed when browser data is cleared.

Voice recognition requires a browser with the Web Speech API. Voice replies use browser speech synthesis. Fullscreen and device-memory metrics depend on browser support.

## Helmet rendering

The app includes a procedural red-and-gold Three.js helmet that works without external model files. The enhanced Kimi preview also uses a higher-detail reusable helmet bundle. To enable an optional local bundle, place its runtime in `public/helmet/` and set `public/helmet/manifest.json` to `{ "available": true }`.

## Structure

- `src/App.tsx` — command engine, telemetry, assistant feed, settings
- `src/components/HelmetScene.tsx` — Three.js helmet scene and material adaptation
- `src/App.css` — responsive cinematic HUD and motion system
- `public/helmet/` — optional enhanced helmet runtime and resources

See `CREDITS.md` for asset and library credits.
