export const ATOMIC_BLOCK_HOST_CLASS = "atomic-block-host";
export const ATOMIC_BLOCK_PENDING_CLASS = "fitness-plugin atomic-block-pending";
export const ATOMIC_BLOCK_PENDING_BAR_CLASS = "atomic-block-pending-bar";

export type AtomicBlockHost = {
  empty(): void;
  createDiv(options?: { cls?: string }): AtomicBlockHost;
  addClass?(cls: string): void;
  classList?: { add(cls: string): void };
};

const generations = new WeakMap<object, number>();
const chains = new WeakMap<object, Promise<void>>();

export function markAtomicBlockHost(el: AtomicBlockHost): void {
  if (typeof el.addClass === "function") {
    el.addClass(ATOMIC_BLOCK_HOST_CLASS);
    return;
  }
  el.classList?.add(ATOMIC_BLOCK_HOST_CLASS);
}

export function mountAtomicBlockShell(el: AtomicBlockHost): AtomicBlockHost {
  el.empty();
  markAtomicBlockHost(el);
  const root = el.createDiv({ cls: ATOMIC_BLOCK_PENDING_CLASS });
  root.createDiv({ cls: ATOMIC_BLOCK_PENDING_BAR_CLASS });
  return root;
}

export function beginBlockRender(el: object): number {
  const next = (generations.get(el) ?? 0) + 1;
  generations.set(el, next);
  return next;
}

export function isStaleBlockRender(el: object, generation: number): boolean {
  return generations.get(el) !== generation;
}

export function currentBlockGeneration(el: object): number {
  return generations.get(el) ?? 0;
}

export function invalidateBlockRenderIfCurrent(
  el: object,
  generation: number,
): void {
  if (!isStaleBlockRender(el, generation)) {
    beginBlockRender(el);
  }
}

export function enqueueBlockRender(
  el: object,
  work: (generation: number) => Promise<void>,
): Promise<void> {
  const generation = beginBlockRender(el);
  const previous = chains.get(el) ?? Promise.resolve();
  const next = previous.then(
    () => work(generation),
    () => work(generation),
  );
  chains.set(el, next);
  return next;
}
