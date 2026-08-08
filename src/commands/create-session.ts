import { App, FuzzySuggestModal, Notice, Modal, Setting } from "obsidian";
import {
  GYM_LOCATIONS,
  MUSCLES,
} from "../core";
import type { VaultDataSource } from "../data/vault-source";
import { ymdInZone } from "../dates";
import type { SeriesConfig } from "../types";

function promptText(
  app: App,
  title: string,
  defaultValue: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new (class extends Modal {
      private value = defaultValue;
      private resolved = false;

      onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: title });
        new Setting(contentEl).addText((text) => {
          text.setValue(defaultValue);
          text.inputEl.style.width = "100%";
          text.onChange((v) => {
            this.value = v;
          });
          text.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.finish(this.value);
            }
          });
          window.setTimeout(() => text.inputEl.focus(), 20);
        });
        new Setting(contentEl)
          .addButton((btn) =>
            btn.setButtonText("Cancel").onClick(() => this.finish(null)),
          )
          .addButton((btn) =>
            btn
              .setButtonText("OK")
              .setCta()
              .onClick(() => this.finish(this.value)),
          );
      }

      finish(v: string | null) {
        if (this.resolved) return;
        this.resolved = true;
        this.close();
        resolve(v);
      }

      onClose() {
        if (!this.resolved) {
          this.resolved = true;
          resolve(null);
        }
      }
    })(app);
    modal.open();
  });
}

function suggestOne(
  app: App,
  placeholder: string,
  items: string[],
  labels?: string[],
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new (class extends FuzzySuggestModal<string> {
      getItems(): string[] {
        return items;
      }
      getItemText(item: string): string {
        const i = items.indexOf(item);
        return labels && labels[i] ? labels[i] : item;
      }
      onChooseItem(item: string) {
        if (settled) return;
        settled = true;
        resolve(item);
      }
      onClose() {
        if (settled) return;
        settled = true;
        resolve(null);
      }
    })(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}

function gymBody(
  date: string,
  location: string,
  locationDetail: string,
  weightUnit: string,
): string {
  const muscleHints = [
    "Chest / 胸",
    "Back / 背",
    "Shoulders / 肩",
    "Biceps / 二頭",
    "Triceps / 三頭",
    "Quads / 股四頭",
    "Hamstrings / 腿後腱",
    "Glutes / 臀",
    "Calves / 小腿",
    "Core / 核心",
  ];
  return `---
type: session
date: ${date}
activity: gym
duration_min:
location: ${location}
location_detail: ${locationDetail}
weight_unit: ${weightUnit}
---

# 🏋️ Gym / 健身 — ${date}

<!-- 💪 Muscles / 肌群: ${muscleHints.join(", ")} -->

| 💪 Exercise / 動作 | 🧬 Muscle / 肌群 | ⚖️ Weight / 重量 | 🔢 Reps / 次數 | 🗒️ Notes / 備註 |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
`;
}

function golfBody(date: string): string {
  return `---
type: session
date: ${date}
activity: golf
duration_min:
location:
focus: []
club: []
---

# ⛳ Golf / 高爾夫 — ${date}

<!-- 📍 location / 地點: Home net / 家用網, Driving range / 練習場, Course / 球場, Other / 其他 -->
<!-- 🎯 focus / 重點 (multi): Grip / 握桿, Stance / 站姿, Takeaway / 起桿, Backswing / 上桿, Transition / 轉換, Downswing / 下桿, Impact / 擊球, Follow-through / 送桿, Tempo / 節奏, Alignment / 瞄準線 -->
<!-- 🏌️ club / 球桿 (multi): Driver / 一號木, 3W / 三號木, 5W / 五號木, Hybrid / 混血桿, 4i–9i / 鐵桿, PW / 劈起桿, GW / 缺口桿, SW / 沙坑桿, LW / 高吊桿, Putter / 推桿, Mixed / 混合 -->

## 💡 Reminders / 提醒

- 
`;
}

export async function createGymSession(
  app: App,
  data: VaultDataSource,
  series: SeriesConfig,
  timezone: string,
): Promise<void> {
  const today = ymdInZone(new Date(), timezone);
  const dateRaw = await promptText(app, "Date / 日期 (YYYY-MM-DD)", today);
  if (dateRaw === null) return;
  let date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new Notice("Invalid date / 日期無效");
    return;
  }
  const year = date.slice(0, 4);
  const folder = `${series.folder}/${year}`;
  const target = `${folder}/${date}.md`;

  if (data.exists(target)) {
    await data.openPath(target);
    new Notice(`Opened existing gym session / 已開啟: ${target}`);
    return;
  }

  const locationLabels = [
    "Home / 家中",
    "Commercial / 商業健身房",
    "Hotel/Travel / 酒店／旅途",
    "Other / 其他",
  ];
  let location =
    (await suggestOne(
      app,
      "Location / 地點 (Esc to skip / 略過)",
      GYM_LOCATIONS,
      locationLabels,
    )) || "";

  let locationDetail = "";
  if (location === "Other") {
    locationDetail =
      (await promptText(app, "Other location detail / 其他地點說明", "")) || "";
  }

  let weightUnit =
    (await suggestOne(app, "Weight unit / 重量單位 (Esc → kg)", [
      "kg",
      "lb",
    ])) || "kg";
  if (weightUnit !== "lb") weightUnit = "kg";

  // silence unused MUSCLES (kept for future editor UX / parity with templates)
  void MUSCLES;

  await data.createNote(
    target,
    gymBody(date, location, locationDetail, weightUnit),
  );
  await data.openPath(target);
  new Notice(`Created gym session / 已建立: ${target}`);
}

export async function createGolfSession(
  app: App,
  data: VaultDataSource,
  series: SeriesConfig,
  timezone: string,
): Promise<void> {
  const today = ymdInZone(new Date(), timezone);
  const dateRaw = await promptText(app, "Date / 日期 (YYYY-MM-DD)", today);
  if (dateRaw === null) return;
  let date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new Notice("Invalid date / 日期無效");
    return;
  }
  const year = date.slice(0, 4);
  const folder = `${series.folder}/${year}`;
  const target = `${folder}/${date}.md`;

  if (data.exists(target)) {
    await data.openPath(target);
    new Notice(`Opened existing golf session / 已開啟: ${target}`);
    return;
  }

  await data.createNote(target, golfBody(date));
  await data.openPath(target);
  new Notice(`Created golf session / 已建立: ${target}`);
}
