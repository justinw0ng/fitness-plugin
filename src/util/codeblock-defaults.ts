// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { ATOMIC_CODEBLOCK_LANGUAGES } from "./codeblock-languages.ts";

export type AtomicBlockKind = (typeof ATOMIC_CODEBLOCK_LANGUAGES)[number];

type OptionSpec = {
  key: string;
  example: string;
  commentKey: string;
  /** Emit as an active `key: value` line unless overridden. */
  defaultActive?: boolean;
};

type BlockSpec = {
  headerKey?: string;
  emptyKey?: string;
  options: OptionSpec[];
};

const BLOCK_SPECS: Record<AtomicBlockKind, BlockSpec> = {
  "atomic-heatmap": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearHeatmap",
      },
      {
        key: "activity",
        example: "all",
        commentKey: "block.opt.activityHeatmap",
      },
      {
        key: "rows",
        example: "1",
        commentKey: "block.opt.rows",
      },
      {
        key: "columns",
        example: "1",
        commentKey: "block.opt.columns",
      },
      {
        key: "min-column-width",
        example: "300",
        commentKey: "block.opt.minColumnWidth",
      },
      {
        key: "default-span",
        example: "1.2",
        commentKey: "block.opt.defaultSpan",
      },
    ],
  },
  "atomic-today": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "date",
        example: "2026-08-08",
        commentKey: "block.opt.dateToday",
      },
    ],
  },
  "atomic-dashboard": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearDashboard",
      },
    ],
  },
  "atomic-actions": {
    emptyKey: "block.opt.noneActions",
    options: [],
  },
  "atomic-golf-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues",
      },
    ],
  },
  "atomic-gym-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues",
      },
    ],
  },
  "atomic-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "golf",
        commentKey: "block.opt.activityCues",
        defaultActive: true,
      },
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues",
      },
    ],
  },
  "atomic-timer": {
    emptyKey: "block.opt.noneTimer",
    options: [],
  },
  "atomic-bookshelf": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "reading",
        commentKey: "block.opt.activityBookshelf",
        defaultActive: true,
      },
      {
        key: "status",
        example: "all",
        commentKey: "block.opt.statusBookshelf",
      },
      {
        key: "scale",
        example: "1",
        commentKey: "block.opt.scaleBookshelf",
      },
    ],
  },
};

function optionLine(
  spec: OptionSpec,
  language: Language,
  values: Record<string, string>,
): string {
  const comment = t(spec.commentKey, language);
  const hasOverride = Object.prototype.hasOwnProperty.call(values, spec.key);
  const active = hasOverride ? values[spec.key] : spec.defaultActive ? spec.example : undefined;
  const pair = `${spec.key}: ${active ?? spec.example}`;
  const line = `${pair}  # ${comment}`;
  return active !== undefined ? line : `# ${line}`;
}

export function isAtomicBlockKind(kind: string): kind is AtomicBlockKind {
  return (ATOMIC_CODEBLOCK_LANGUAGES as readonly string[]).includes(kind);
}

/** Default codeblock body with every option documented as a hash comment. */
export function defaultAtomicBlockBody(
  kind: AtomicBlockKind,
  language: Language = "en",
  values: Record<string, string> = {},
): string {
  const spec = BLOCK_SPECS[kind];
  const lines: string[] = [];
  if (spec.headerKey) lines.push(`# ${t(spec.headerKey, language)}`);
  if (spec.emptyKey) lines.push(`# ${t(spec.emptyKey, language)}`);
  for (const option of spec.options) {
    lines.push(optionLine(option, language, values));
  }
  return `${lines.join("\n")}\n`;
}

/** Fenced markdown for a newly created Atomic UI block. */
export function defaultAtomicBlockFence(
  kind: AtomicBlockKind,
  language: Language = "en",
  values: Record<string, string> = {},
): string {
  return `\`\`\`${kind}\n${defaultAtomicBlockBody(kind, language, values)}\`\`\`\n`;
}
