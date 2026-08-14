import test from "node:test";
import assert from "node:assert/strict";
import { VaultListCache } from "../src/util/vault-list-cache.ts";

test("VaultListCache returns cached values until invalidate", () => {
  const cache = new VaultListCache();
  const list = [{ path: "a.md" }];

  assert.equal(cache.get("sessions:atomics/exercise/Gym:2026"), undefined);
  cache.set("sessions:atomics/exercise/Gym:2026", list);
  assert.equal(cache.get("sessions:atomics/exercise/Gym:2026"), list);
  assert.equal(cache.size, 1);

  cache.invalidate();
  assert.equal(cache.get("sessions:atomics/exercise/Gym:2026"), undefined);
  assert.equal(cache.size, 0);
  assert.equal(cache.generation, 1);
});

test("VaultListCache keeps independent keys until invalidate", () => {
  const cache = new VaultListCache();
  cache.set("hobby:reading", [{ path: "book.md" }]);
  cache.set("hobby:chess", [{ path: "game.md" }]);
  assert.equal(cache.size, 2);

  cache.invalidate();
  assert.equal(cache.get("hobby:reading"), undefined);
  assert.equal(cache.get("hobby:chess"), undefined);
});

test("VaultListCache path invalidate drops only touching scopes", () => {
  const cache = new VaultListCache();
  const gym = [{ path: "gym.md" }];
  const golf = [{ path: "golf.md" }];
  cache.set("gym:2026", gym, "atomics/exercise/Gym/2026/");
  cache.set("golf:2026", golf, "atomics/exercise/Golf/2026/");

  cache.invalidate("atomics/exercise/Gym/2026/2026-01-01.md");
  assert.equal(cache.get("gym:2026"), undefined);
  assert.equal(cache.get("golf:2026"), golf);
  assert.equal(cache.size, 1);
  assert.equal(cache.generation, 0);
});
