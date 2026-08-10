# obsidian-atomic

Obsidian community plugin (TypeScript, bundled with esbuild) for Atomic habit tracking. Default plugin-created content lives under `atomics/**`; see `README.md` for feature and data-layout details. Built-in domains are exercise (Gym/Golf sessions and cues) and general habits (Reading by default: item notes, timers, Bases bookshelf, book shelf). Activities support `enabled`, `baseColor` (one picker → four heatmap shades), and settings delete. `atomic-heatmap` accepts `activity: all|id|id1, id2`.

## Cursor Cloud specific instructions

- This is an Obsidian plugin, not a standalone/web app. There is no server to run; the UI runs inside the Obsidian desktop client.
- If Obsidian is **not** already installed in the Cloud VM, install the **latest Linux release** from [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) (prefer the `.deb` asset for Ubuntu, e.g. `obsidian_*_amd64.deb` via `apt-get install` / `dpkg -i`). Launch with `--no-sandbox` when the VM requires it. Only skip Obsidian GUI E2E if installation or launch fails after a reasonable attempt; note the failure in the PR/summary.
- Always validate with `npm test`, `npm run typecheck`, and `npm run build`. When Obsidian is installed (or successfully installed), also run the E2E pass below.
- Standard dev commands live in `package.json` scripts: `npm test` (node test runner over `tests/*.mjs`), `npm run typecheck` (`tsc --noEmit`), `npm run build` (production esbuild bundle), `npm run dev` (esbuild watch).
- Domain logic is intentionally Obsidian-free in `src/core.ts` and `src/core/hobby.ts`, which the test suite exercises. Put pure parsing, timer, migration, and model-building logic there or in similarly pure modules so it stays unit-testable without Obsidian.
- `main.js` is a committed build artifact. Both `npm run build` and `npm run dev` overwrite it in the repo root. After building/watching, `git checkout -- main.js` if you don't intend to commit the regenerated bundle.
- The test runner relies on Node's `--experimental-strip-types` to import `src/core.ts` directly, so Node 22+ is required (the VM ships Node 22).
- `npm run build`/`dev` also try to deploy the bundle into `../obsidian-lab/.obsidian/plugins/obsidian-atomic/` or `$OBSIDIAN_PLUGIN_OUT` if that path exists. In Cloud VMs you can also deploy into a local demo vault (e.g. `/workspace/obsidian-demo/.obsidian/plugins/obsidian-atomic/`).

## Testing and Obsidian screenshots

- Always run `npm test`, `npm run typecheck`, and `npm run build` before claiming work complete.
- When Obsidian is available (or after installing it from [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)), also do a short manual E2E pass in a demo vault with the built plugin installed:
  1. Enable the plugin in a demo vault
  2. Open notes with `atomic-golf-cues`, `atomic-gym-cues`, `atomic-cues`, `atomic-timer`, and `atomic-bookshelf`
  3. Create a Reading item, start/stop its timer, and confirm Reading minutes appear in `atomic-heatmap`
  4. In Settings, confirm one color picker + shade swatches, enable/disable, Delete, and Add general habit
  5. Confirm `atomic-heatmap` with `activity: reading` and `activity: gym, golf` filters correctly
  6. On a Reading item, confirm `status` is a dropdown in Properties; on golf/gym session notes confirm `felt`/`location`/`weight_unit` dropdowns where applicable
  7. Confirm `atomic-bookshelf` with `status: reading` shows only reading-status books; default block shows all
  8. Run **Open Obsidian bases of reading notes** with Bases enabled; with Bases disabled or Reading disabled, confirm the command shows a Notice
  9. Confirm legacy `fitness-*` aliases work while **Allow legacy `fitness-*` blocks** is on
  10. Run **Migrate from Fitness → Atomic** on demo notes and confirm the legacy toggle turns off
- Skip Obsidian GUI E2E **only** when Obsidian cannot be installed or launched in the environment; say so in the PR/summary. HTML mockups under `docs/mockups/` remain useful for design review, but they do not replace E2E when Obsidian can run.
- When capturing Obsidian screenshots for docs:
  1. Disable **Readable line length** (Settings → Editor)
  2. Use **fullscreen** Obsidian
  3. Use **Light** mode
