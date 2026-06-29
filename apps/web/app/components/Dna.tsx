"use client";

// Per-base coloured nucleotide sequence (A green / C blue / G amber / T,U red).
// Usable in both server and client trees.
export default function Dna({ seq, className = "partseq" }: { seq: string; className?: string }) {
  return (
    <span className={className}>
      {Array.from(seq).map((b, i) => (
        <span key={i} className={`b-${b.toUpperCase()}`}>{b}</span>
      ))}
    </span>
  );
}
