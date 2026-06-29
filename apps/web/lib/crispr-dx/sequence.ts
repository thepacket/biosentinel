/**
 * Nucleotide-sequence utilities: parsing, sanitation, complementation, and
 * IUPAC ambiguity-code matching used throughout PAM discovery.
 */

const COMPLEMENT: Record<string, string> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
  U: "A",
  N: "N",
  R: "Y",
  Y: "R",
  S: "S",
  W: "W",
  K: "M",
  M: "K",
  B: "V",
  V: "B",
  D: "H",
  H: "D",
};

/** Bases an IUPAC ambiguity code can stand for. */
const IUPAC: Record<string, string> = {
  A: "A",
  C: "C",
  G: "G",
  T: "T",
  U: "T",
  R: "AG",
  Y: "CT",
  S: "GC",
  W: "AT",
  K: "GT",
  M: "AC",
  B: "CGT",
  D: "AGT",
  H: "ACT",
  V: "ACG",
  N: "ACGT",
};

export interface ParsedSequence {
  /** uppercase A/C/G/T/N sequence with all non-base characters removed */
  seq: string;
  /** FASTA header line (without the leading ">"), if one was present */
  name: string | null;
  /** characters that were dropped because they were not nucleotides */
  droppedNonBase: number;
}

/**
 * Parse pasted text that may be raw sequence or FASTA. Lowercase is upcased,
 * whitespace/digits/punctuation are stripped, and `U` is normalised to `T`.
 * Any residual non-ACGTN letters are removed and counted.
 */
export function parseSequence(raw: string): ParsedSequence {
  let name: string | null = null;
  const lines = raw.split(/\r?\n/);
  const body: string[] = [];
  for (const line of lines) {
    if (line.startsWith(">")) {
      if (name === null) name = line.slice(1).trim();
      continue;
    }
    body.push(line);
  }
  const joined = body.join("").toUpperCase().replace(/U/g, "T");
  let seq = "";
  let dropped = 0;
  for (const ch of joined) {
    if (ch === "A" || ch === "C" || ch === "G" || ch === "T" || ch === "N") {
      seq += ch;
    } else if (/[A-Z]/.test(ch)) {
      dropped += 1;
    }
    // whitespace / digits / punctuation are silently ignored
  }
  return { seq, name, droppedNonBase: dropped };
}

/** Reverse a string. */
export function reverse(s: string): string {
  return s.split("").reverse().join("");
}

/** Watson–Crick complement of a single base (IUPAC-aware). */
export function complementBase(base: string): string {
  return COMPLEMENT[base] ?? "N";
}

/** Complement without reversing. */
export function complement(seq: string): string {
  let out = "";
  for (const ch of seq) out += COMPLEMENT[ch] ?? "N";
  return out;
}

/** Reverse complement, 5'->3'. */
export function reverseComplement(seq: string): string {
  let out = "";
  for (let i = seq.length - 1; i >= 0; i--) out += COMPLEMENT[seq[i]] ?? "N";
  return out;
}

/** GC fraction (0-1). N and other ambiguous codes are excluded from the
 *  denominator. Returns 0 for an empty/uncountable sequence. */
export function gcContent(seq: string): number {
  let gc = 0;
  let counted = 0;
  for (const ch of seq) {
    if (ch === "G" || ch === "C") {
      gc += 1;
      counted += 1;
    } else if (ch === "A" || ch === "T") {
      counted += 1;
    }
  }
  return counted === 0 ? 0 : gc / counted;
}

/** Does concrete base `base` satisfy IUPAC `code`? */
export function baseMatchesCode(base: string, code: string): boolean {
  const allowed = IUPAC[code];
  return allowed !== undefined && allowed.includes(base);
}

/**
 * Does `seq` (concrete A/C/G/T/N) match the IUPAC `pattern` at every position?
 * Lengths must be equal. An `N` in the *sequence* matches nothing concrete and
 * therefore fails a specific code but satisfies an `N` in the pattern.
 */
export function matchesIupac(seq: string, pattern: string): boolean {
  if (seq.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (!baseMatchesCode(seq[i], pattern[i])) return false;
  }
  return true;
}

/** Longest run of a single identical base in `seq`. */
export function longestHomopolymer(seq: string): number {
  let best = 0;
  let run = 0;
  let prev = "";
  for (const ch of seq) {
    run = ch === prev ? run + 1 : 1;
    prev = ch;
    if (run > best) best = run;
  }
  return best;
}

/** Hamming distance between two equal-length strings (Infinity if unequal). */
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d += 1;
  return d;
}
