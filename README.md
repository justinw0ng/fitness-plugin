# fitness-plugin

Obsidian plugin for gym and golf session tracking:

- Year heatmaps (duration intensity)
- Today’s sessions
- Yearly dashboard (volume, muscles, sparklines)
- Golf cue rollup (this month + keepers)
- Commands / buttons to create session notes

## Preview

### `fitness-dashboard`

Year overview: session counts, gym volume, monthly table, muscle breakdown, and recent sessions.

![fitness-dashboard](docs/images/fitness-dashboard.png)

```fitness-dashboard
year: 2026
```

### `fitness-heatmap`

GitHub-style year grids for Gym and Golf intensity (by duration), plus today’s sessions.

![fitness-heatmap](docs/images/fitness-heatmap.png)

```fitness-heatmap
year: 2026
```

More setup screenshots and a full walkthrough: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Install

```bash
npm install
npm run build
```

Build writes `main.js` in this repo. Optionally set `OBSIDIAN_PLUGIN_OUT` to copy artifacts into a vault:

```bash
OBSIDIAN_PLUGIN_OUT=/path/to/vault/.obsidian/plugins/obsidian-fitness npm run build
```

Enable **Fitness** under Community plugins and reload Obsidian.

### Symlink install (optional)

```bash
ln -sfn "$(pwd)" /path/to/vault/.obsidian/plugins/obsidian-fitness
npm run build
```

## Codeblocks

```fitness-heatmap
```

```fitness-today
```

```fitness-dashboard
```

```fitness-cues
```

```fitness-actions
```

Optional YAML in the block body: `year: 2026` or `date: 2026-08-08`.

## Commands

- **Fitness: New gym session**
- **Fitness: New golf session**
- **Fitness: Open dashboard**

## Data layout

Session notes are plain markdown:

| Activity | Path |
|----------|------|
| Gym | `Gym/YYYY/YYYY-MM-DD.md` |
| Golf | `Golf/YYYY/YYYY-MM-DD.md` |
| Dashboard | `Fitness/Dashboard.md` (`year:` frontmatter) |
| Cues | `Golf/Cues.md` |

## Develop

```bash
npm install
npm test
npm run typecheck
npm run build
```

Settings: timezone, dashboard path, cues path (series defaults: Gym + Golf).
