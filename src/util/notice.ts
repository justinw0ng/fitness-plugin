/**
 * Show an Obsidian Notice without a top-level `obsidian` value import.
 * Keeps pure modules importable under Node's test runner.
 */
export function showNotice(message: string): void {
  // Obsidian plugins load as CJS; `obsidian` is provided by the app loader.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Notice } = require("obsidian") as {
    Notice: new (message: string) => { };
  };
  new Notice(message);
}
