/**
 * Card data + shared math, ported from sim/data.py.
 * Source of truth is the CSV files in games/spotted/cards (imported raw at
 * build time) so the physical game, the Python sim and this web app never drift.
 */

export const TRAITS = ["class", "habitat", "size", "diet", "activity"] as const;
export type Trait = (typeof TRAITS)[number];

export interface Creature {
  cid: string;
  name: string;
  nickname: string;
  traits: Record<Trait, string>;
}

export type SpecialKind =
  | "double_probe"
  | "misdirect"
  | "eavesdrop"
  | "cross_examine"
  | "wild_probe";

export interface QuestionCard {
  cardId: string;
  trait: Trait | "";
  value: string;
  question: string;
  special: boolean;
  kind: SpecialKind | "";
  name: string; // special card name
  rule: string; // special card rule text
}

export const SPECIAL_KINDS: Record<string, SpecialKind> = {
  S01: "double_probe",
  S02: "misdirect",
  S03: "eavesdrop",
  S04: "cross_examine",
  S05: "wild_probe",
};

export const SPECIAL_NAMES: Record<SpecialKind, string> = {
  double_probe: "Double Probe",
  misdirect: "Misdirect",
  eavesdrop: "Eavesdrop",
  cross_examine: "Cross-Examine",
  wild_probe: "Wild Probe",
};

// ---------------------------------------------------------------- csv parsing

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { cur.push(field); field = ""; };
  const pushRow = () => { rows.push(cur); cur = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") pushField();
    else if (ch === "\n") { pushField(); pushRow(); }
    else if (ch !== "\r") field += ch;
  }
  if (field.length || cur.length) { pushField(); pushRow(); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return body.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])),
  );
}

// Raw CSV imports keep a single source of truth with the physical game.
// Local copies of games/spotted/cards/*.csv so Vercel (which only uploads the
// project directory) can resolve them; keep in sync with the card CSVs.
import creaturesRaw from "./data/creatures.csv?raw";
import questionsRaw from "./data/questions.csv?raw";
import specialsRaw from "./data/specials.csv?raw";

export const CREATURES: Creature[] = parseCsv(creaturesRaw).map((row) => ({
  cid: row.id,
  name: row.name,
  nickname: row.nickname,
  traits: {
    class: row.class,
    habitat: row.habitat,
    size: row.size,
    diet: row.diet,
    activity: row.activity,
  },
}));

export function creatureById(cid: string): Creature {
  const c = CREATURES.find((c) => c.cid === cid);
  if (!c) throw new Error(`unknown creature ${cid}`);
  return c;
}

export function hasTrait(c: Creature, trait: Trait, value: string): boolean {
  return c.traits[trait] === value;
}

/** Expanded 80-card deck: 64 trait questions + 16 specials. */
export function buildQuestionDeck(): QuestionCard[] {
  const deck: QuestionCard[] = [];
  for (const row of parseCsv(questionsRaw)) {
    for (let i = 0; i < parseInt(row.copies, 10); i++) {
      deck.push({
        cardId: `${row.id}-${i}`,
        trait: row.trait as Trait,
        value: row.value,
        question: row.question,
        special: false,
        kind: "",
        name: "",
        rule: "",
      });
    }
  }
  for (const row of parseCsv(specialsRaw)) {
    const kind = SPECIAL_KINDS[row.id];
    for (let i = 0; i < parseInt(row.copies, 10); i++) {
      deck.push({
        cardId: `${row.id}-${i}`,
        trait: "",
        value: "",
        question: "",
        special: true,
        kind,
        name: row.name,
        rule: row.rule,
      });
    }
  }
  return deck;
}

/** Every askable (trait, value) pair derived from the creature set. */
export function allQuestions(): [Trait, string][] {
  const pairs = new Set<string>();
  const out: [Trait, string][] = [];
  for (const c of CREATURES) {
    for (const t of TRAITS) {
      const key = `${t}|${c.traits[t]}`;
      if (!pairs.has(key)) { pairs.add(key); out.push([t, c.traits[t]]); }
    }
  }
  return out.sort(([a, b], [c, d]) => (a + b).localeCompare(c + d));
}

/** Printed question text per (trait, value), from questions.csv. */
export const QUESTION_TEXT: Record<string, string> = Object.fromEntries(
  parseCsv(questionsRaw).map((r) => [`${r.trait}|${r.value}`, r.question]),
);

export function questionText(trait: Trait, value: string): string {
  return QUESTION_TEXT[`${trait}|${value}`] ?? `Is your creature ${value} (${trait})?`;
}

/** Distinct values per trait, for the free-question builder UI. */
export function traitValues(): Record<Trait, string[]> {
  const out = {} as Record<Trait, string[]>;
  for (const t of TRAITS) {
    out[t] = [...new Set(CREATURES.map((c) => c.traits[t]))].sort();
  }
  return out;
}

// ---------------------------------------------------------------- information

export function entropy(n: number): number {
  return n > 1 ? Math.log2(n) : 0;
}

/** Expected bits learned by asking "is it <value> <trait>?" over candidates. */
export function questionInfoGain(cands: Creature[], trait: Trait, value: string): number {
  const n = cands.length;
  if (n <= 1) return 0;
  const yes = cands.filter((c) => hasTrait(c, trait, value)).length;
  if (yes === 0 || yes === n) return 0;
  const p = yes / n;
  return entropy(n) - (p * entropy(yes) + (1 - p) * entropy(n - yes));
}

/** Expected bits learned when a trait's exact value is revealed (Eavesdrop). */
export function traitRevealGain(cands: Creature[], trait: Trait): number {
  const n = cands.length;
  if (n <= 1) return 0;
  const groups = new Map<string, number>();
  for (const c of cands) {
    const v = c.traits[trait];
    groups.set(v, (groups.get(v) ?? 0) + 1);
  }
  let gain = entropy(n);
  for (const k of groups.values()) gain -= (k / n) * entropy(k);
  return gain;
}
