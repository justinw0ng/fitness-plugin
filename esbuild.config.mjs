import esbuild from "esbuild";
import process from "process";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prod = process.argv[2] === "production";

// Build into repo root (standard Obsidian plugin layout).
const outdir = __dirname;

// Optional: deploy into a vault when OBSIDIAN_PLUGIN_OUT is set.
const vaultOut = process.env.OBSIDIAN_PLUGIN_OUT;

function deployToVault() {
  if (!vaultOut) return;
  if (!existsSync(dirname(vaultOut))) return;
  mkdirSync(vaultOut, { recursive: true });
  for (const f of ["main.js", "manifest.json", "styles.css"]) {
    const src = join(outdir, f);
    if (existsSync(src)) copyFileSync(src, join(vaultOut, f));
  }
  console.log(`Deployed to ${vaultOut}`);
}

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: join(outdir, "main.js"),
});

if (prod) {
  await context.rebuild();
  await context.dispose();
  deployToVault();
} else {
  await context.watch();
}
