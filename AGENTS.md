# Atomic Tracker

Obsidian community plugin (TypeScript, bundled with esbuild) for Atomic Tracker habit tracking. Default plugin-created content lives under `atomics/**`; see `README.md` for feature and data-layout details. Built-in domains are exercise (Gym/Golf sessions and cues) and general habits (Reading by default: item notes, timers, Bases bookshelf, book shelf). Activities support `enabled`, `baseColor` (one picker → four heatmap shades), and settings delete. `atomic-heatmap` accepts `activity: all|id|id1, id2`.

## Cursor Cloud specific instructions

- This is an Obsidian plugin, not a standalone/web app. There is no server to run; the UI runs inside the Obsidian desktop client.
- If Obsidian is **not** already installed in the Cloud VM, install the **latest Linux release** from [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) (prefer the `.deb` asset for Ubuntu, e.g. `obsidian_*_amd64.deb` via `apt-get install` / `dpkg -i`). Launch with `--no-sandbox` when the VM requires it. Only skip Obsidian GUI E2E if installation or launch fails after a reasonable attempt; note the failure in the PR/summary.
- Always validate with `npm test`, `npm run typecheck`, and `npm run build`. When Obsidian is installed (or successfully installed), also run `npm run test:e2e` (Selenium health check). Do **not** use the computer-use agent for that standard health check.
- Standard dev commands live in `package.json` scripts: `npm test` (node test runner over `tests/*.mjs`), `npm run typecheck` (`tsc --noEmit`), `npm run build` (production esbuild bundle), `npm run dev` (esbuild watch), `npm run test:e2e` (Selenium UI health check against Obsidian).
- Domain logic is intentionally Obsidian-free in `src/core.ts` and `src/core/hobby.ts`, which the test suite exercises. Put pure parsing, timer, and model-building logic there or in similarly pure modules so it stays unit-testable without Obsidian.
- `main.js` is a committed build artifact. Both `npm run build` and `npm run dev` overwrite it in the repo root. After building/watching, `git checkout -- main.js` if you don't intend to commit the regenerated bundle.
- The test runner relies on Node's `--experimental-strip-types` to import `src/core.ts` directly, so Node 22+ is required (the VM ships Node 22).
- `npm run build`/`dev` also try to deploy the bundle into `../obsidian-lab/.obsidian/plugins/atomic-tracker/` or `$OBSIDIAN_PLUGIN_OUT` if that path exists. In Cloud VMs you can also deploy into a local demo vault (e.g. `/workspace/obsidian-demo/.obsidian/plugins/atomic-tracker/`).

## Testing and Obsidian screenshots

- Always run `npm test`, `npm run typecheck`, and `npm run build` before claiming work complete.
- When Obsidian is available (or after installing it from [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)), run **`npm run test:e2e`**. That Selenium suite is the standard GUI health check. It covers plugin enablement; `atomic-golf-cues` / `atomic-gym-cues` / `atomic-cues` / `atomic-timer` / `atomic-bookshelf`; creating a Reading item and start/stop timer with heatmap minutes; Settings color picker + swatches, enable/disable, Delete, and Add general habit; heatmap `activity: reading` and `activity: gym, golf`; property dropdowns; bookshelf `status: reading` vs all; and **Open reading Bases** plus Notices when Bases or Reading is disabled.
- Do **not** use the computer-use agent as the primary health check. It costs tokens on a deterministic path. If `npm run test:e2e` fails, inspect screenshots under `/tmp/atomic-e2e-artifacts/`, then you may use the computer-use agent only to troubleshoot that failure.
- After any UI or breaking change, update `e2e/health-check.test.mjs` and the `data-testid` hooks it uses (`atomic-heatmap`, `atomic-timer-*`, `atomic-cues`, `atomic-bookshelf`, `atomic-book`, `atomic-setting-*`, `atomic-property-select`). Leaving Selenium coverage stale is a bug.
- Skip Obsidian GUI E2E **only** when Obsidian cannot be installed or launched in the environment; say so in the PR/summary. HTML mockups under `docs/mockups/` remain useful for design review, but they do not replace E2E when Obsidian can run.
- When capturing Obsidian screenshots for docs:
  1. Disable **Readable line length** (Settings → Editor)
  2. Use **fullscreen** Obsidian
  3. Use **Light** mode
