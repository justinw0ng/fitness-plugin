# obsidian-atomic

Obsidian community plugin (TypeScript, bundled with esbuild) for Atomic habit tracking. Default plugin-created content lives under `atomics/**`; see `README.md` for feature and data-layout details. Built-in domains are exercise (Gym/Golf sessions and cues) and Reading (item notes, timers, Bases bookshelf, book shelf).

## Cursor Cloud specific instructions

- This is an Obsidian plugin, not a standalone/web app. There is no server or headless GUI to run; the "app" only runs inside the Obsidian desktop client, which is not available in this VM. Validate changes via `npm test`, `npm run typecheck`, and `npm run build` instead.
- Standard dev commands live in `package.json` scripts: `npm test` (node test runner over `tests/*.mjs`), `npm run typecheck` (`tsc --noEmit`), `npm run build` (production esbuild bundle), `npm run dev` (esbuild watch).
- Domain logic is intentionally Obsidian-free in `src/core.ts` and `src/core/hobby.ts`, which the test suite exercises. Put pure parsing, timer, migration, and model-building logic there or in similarly pure modules so it stays unit-testable without Obsidian.
- `main.js` is a committed build artifact. Both `npm run build` and `npm run dev` overwrite it in the repo root. After building/watching, `git checkout -- main.js` if you don't intend to commit the regenerated bundle.
- The test runner relies on Node's `--experimental-strip-types` to import `src/core.ts` directly, so Node 22+ is required (the VM ships Node 22).
- `npm run build`/`dev` also try to deploy the bundle into `../obsidian-lab/.obsidian/plugins/obsidian-atomic/` or `$OBSIDIAN_PLUGIN_OUT` if that path exists; neither exists here, so the deploy step is silently skipped.

## Testing and Obsidian screenshots

- Always run `npm test`, `npm run typecheck`, and `npm run build` before claiming work complete.
- When Obsidian is available in the environment, also do a short manual E2E pass:
  1. Enable the plugin in a demo vault
  2. Open notes with `atomic-golf-cues`, `atomic-gym-cues`, `atomic-cues`, `atomic-timer`, and `atomic-bookshelf`
  3. Create a Reading item, start/stop its timer, and confirm Reading minutes appear in `atomic-heatmap`
  4. Run **Open reading bookshelf** with Bases enabled; with Bases disabled, confirm the command shows a Notice
  5. Confirm legacy `fitness-*` aliases work while **Allow legacy `fitness-*` blocks** is on
  6. Run **Migrate from Fitness → Atomic** on demo notes and confirm the legacy toggle turns off
- When Obsidian is not available (typical Cursor Cloud VM), skip GUI E2E and screenshots; note that in the PR/summary.
- When capturing Obsidian screenshots for docs:
  1. Disable **Readable line length** (Settings → Editor)
  2. Use **fullscreen** Obsidian
  3. Use **Light** mode
