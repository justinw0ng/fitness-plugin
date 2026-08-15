# Example notes

Copy these into a vault with Atomic enabled.

**Daily note (filled).** `daily-notes/2026-08-11.md` is the README hero note: book shelf, action buttons, a 2×2 heatmap grid, and today’s sessions. On a wide pane the heatmaps sit two-up and the shelf is a single row.

**Daily note template.** `templates/Atomic daily note.md` is the same layout with Obsidian `{{date}}` tokens, so each new daily note gets today’s heading. Heatmap year is left off on purpose. Atomic reads it from the `YYYY-MM-DD` filename.

**Dashboard.** `dashboard/Dashboard.md` belongs at `atomics/Dashboard.md` (the default **Open dashboard** path).

Each UI block lists every option as a hash comment. Uncomment a line to customize it; `#` comments are ignored at render time.

The blocks read session and hobby notes already in the vault. Empty heatmaps and today lists mean those notes are missing, not that the fences are wrong.

## Use the daily note template

1. Copy `templates/Atomic daily note.md` into your vault. A folder named `Templates` is the usual place.
2. Settings → Core plugins: turn on **Templates** and **Daily notes**.
3. Settings → Templates: set **Template folder location** to `Templates`.
4. Settings → Daily notes:
   - Date format: `YYYY-MM-DD`
   - New file location: `Daily notes`
   - Template file location: `Templates/Atomic daily note`
5. Open today’s daily note (ribbon calendar, or **Open today's daily note**).

The heading becomes something like `Tuesday, August 11, 2026`. Bookshelf, actions, heatmaps, and today render from whatever Atomic notes you already have.

If you use Templater instead of core Templates, swap `{{date:dddd, MMMM D, YYYY}}` for `<% tp.date.now("dddd, MMMM D, YYYY") %>` and point Periodic Notes / Daily notes at the same file.
