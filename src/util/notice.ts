/**
 * Show an Obsidian Notice without a top-level `obsidian` value import.
 * Keeps pure modules importable under Node's test runner.
 */
export function showNotice(message: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call -- CJS require: the app loader provides `obsidian`; a static import would load it in Node tests.
  const obsidian = require("obsidian") as {
    Notice: new (message: string) => object;
  };
  new obsidian.Notice(message);
}
