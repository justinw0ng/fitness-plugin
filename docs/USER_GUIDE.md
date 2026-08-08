# Fitness plugin — user guide

Step-by-step setup for the Obsidian **Fitness** plugin: gym and golf session notes, heatmaps, dashboard, and cue rollup.

Screenshots live in [`docs/images/`](./images/). They were captured on Linux with Obsidian in dark mode; macOS and Windows look the same aside from window chrome.

---

## What you get

| Feature | How you use it |
|---------|----------------|
| Year heatmaps | `fitness-heatmap` codeblock |
| Today’s sessions | `fitness-today` codeblock |
| Yearly dashboard | `fitness-dashboard` codeblock |
| Golf cue rollup | `fitness-cues` codeblock |
| Quick actions | `fitness-actions` codeblock, or command palette |
| New gym / golf notes | Commands **Fitness: New gym session** / **New golf session** |

Session data is plain markdown in your vault. Nothing is sent over the network.

---

## 1. Install Obsidian

1. Download Obsidian from [obsidian.md/download](https://obsidian.md/download).
2. Install for your OS (Installer on macOS/Windows, AppImage or deb on Linux).
3. Launch Obsidian.

![Obsidian welcome screen](./images/01-obsidian-welcome.png)

---

## 2. Create or open a vault

1. Choose **Create new vault** (or open an existing one).
2. Name it (example: `Fitness Demo`).
3. Pick a folder on disk and create it.

![Create a new vault](./images/02-create-vault.png)

![Vault open in Obsidian](./images/03-vault-open.png)

---

## 3. Turn on community plugins

Local plugins load through the Community plugins system.

1. Open **Settings** (gear icon, or `Ctrl/Cmd + ,`).
2. Go to **Community plugins**.
3. If you see **Restricted mode**, turn it **off** / click **Turn on community plugins**.
4. Confirm any trust prompt for your vault.

![Community plugins settings](./images/04-settings-community-plugins.png)

---

## 4. Install this plugin into the vault

This plugin is installed from source (not yet from the Community Plugin browser).

### Option A — Copy build output

From the plugin repo:

```bash
npm install
npm run build
```

Copy these three files into your vault:

```text
<vault>/.obsidian/plugins/obsidian-fitness/main.js
<vault>/.obsidian/plugins/obsidian-fitness/manifest.json
<vault>/.obsidian/plugins/obsidian-fitness/styles.css
```

Create the `obsidian-fitness` folder if it does not exist.

Optional one-shot copy while building:

```bash
OBSIDIAN_PLUGIN_OUT=/path/to/vault/.obsidian/plugins/obsidian-fitness npm run build
```

### Option B — Symlink (good for development)

```bash
mkdir -p /path/to/vault/.obsidian/plugins
ln -sfn "$(pwd)" /path/to/vault/.obsidian/plugins/obsidian-fitness
npm run build
```

![Plugin folder layout](./images/05-install-plugin-folder.png)

The screenshot shows a demo vault under `/tmp/...`. On your machine the folder is `<your-vault>/.obsidian/plugins/obsidian-fitness/` with the same three files: `main.js`, `manifest.json`, and `styles.css`.

---

## 5. Enable Fitness

1. In Obsidian: **Settings → Community plugins**.
2. Click **Reload plugins** if the list is stale.
3. Find **Fitness** and toggle it **on**.

![Enable Fitness plugin](./images/06-enable-fitness-plugin.png)

---

## 6. Configure settings

**Settings → Fitness**:

| Setting | Default | Purpose |
|---------|---------|---------|
| Timezone | `Asia/Hong_Kong` | “Today” and new session dates |
| Dashboard path | `Fitness/Dashboard.md` | Target of **Open dashboard** |
| Cues path | `Golf/Cues.md` | Golf cue rollup note |

![Fitness plugin settings](./images/07-settings-fitness.png)

Series folders default to `Gym` and `Golf`. Advanced series edits live in the plugin `data.json` if you need custom folders later.

---

## 7. Recommended vault layout

Create folders and notes like this (the plugin also creates session notes via commands):

```text
Vault/
├── Fitness/
│   └── Dashboard.md
├── Gym/
│   └── YYYY/
│       └── YYYY-MM-DD.md
├── Golf/
│   ├── Cues.md
│   └── YYYY/
│       └── YYYY-MM-DD.md
└── .obsidian/plugins/obsidian-fitness/
    ├── main.js
    ├── manifest.json
    └── styles.css
```

### Dashboard note example

`Fitness/Dashboard.md`:

````markdown
---
year: 2026
---

# Fitness Dashboard

```fitness-dashboard
year: 2026
```

```fitness-actions
```
````

### Heatmap note example

````markdown
# Heatmaps

```fitness-heatmap
year: 2026
```

```fitness-today
```
````

### Cues note example

`Golf/Cues.md`:

````markdown
# Golf Cues

```fitness-cues
year: 2026
```
````

---

## 8. Create your first sessions

### From the command palette

1. `Ctrl/Cmd + P`
2. Run **Fitness: New gym session** or **Fitness: New golf session**
3. Enter the date, then follow location / unit prompts for gym

### From the actions codeblock

Put `fitness-actions` on a note and use the buttons.

Gym notes store sets in a markdown table. Golf notes store reminders under a **Reminders** heading; those feed the cue rollup.

---

## 9. Use the views

Open your dashboard or heatmap note. Codeblocks render inside the note reading view.

### `fitness-dashboard`

![fitness-dashboard](./images/fitness-dashboard.png)

### `fitness-heatmap`

![fitness-heatmap](./images/fitness-heatmap.png)

Optional YAML inside a codeblock body:

```text
year: 2026
```

or for today:

```text
date: 2026-08-08
```

---

## 10. Commands reference

| Command | Action |
|---------|--------|
| Fitness: New gym session | Create or open `Gym/YYYY/YYYY-MM-DD.md` |
| Fitness: New golf session | Create or open `Golf/YYYY/YYYY-MM-DD.md` |
| Fitness: Open dashboard | Open the configured dashboard path |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Plugin not listed | Confirm files are under `.obsidian/plugins/obsidian-fitness/` and reload plugins |
| Restricted mode | Turn on community plugins in Settings |
| Empty heatmap / dashboard | Add session notes under `Gym/YYYY/` or `Golf/YYYY/` with `date` / duration frontmatter |
| Wrong “today” | Set **Timezone** in Fitness settings to your IANA zone |
| Codeblock shows raw text | Ensure the plugin is enabled and you are in Reading view (or Live Preview after reload) |

---

## Privacy

- All data stays in your vault as markdown.
- The plugin does not make network requests.
- Build deploy to a vault happens only if you set `OBSIDIAN_PLUGIN_OUT` yourself.
