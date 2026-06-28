"""Reference parsing and sequence utilities for genome-scale off-target search."""

from dataclasses import dataclass

_COMPLEMENT = str.maketrans("ACGTNacgtn", "TGCANtgcan")

_IUPAC = {
    "A": "A", "C": "C", "G": "G", "T": "T",
    "R": "AG", "Y": "CT", "S": "GC", "W": "AT", "K": "GT", "M": "AC",
    "B": "CGT", "D": "AGT", "H": "ACT", "V": "ACG", "N": "ACGT",
}


@dataclass
class Record:
    name: str
    seq: str


def reverse_complement(seq: str) -> str:
    return seq.translate(_COMPLEMENT)[::-1]


def parse_fasta(text: str) -> list[Record]:
    """Parse one or more FASTA records (or a single raw sequence).

    Sequences are upper-cased; ``U`` is normalised to ``T``; any character that
    is not A/C/G/T/N is dropped. A leading non-FASTA block is accepted as an
    unnamed record so raw pasted sequence works too.
    """
    records: list[Record] = []
    name = None
    chunks: list[str] = []

    def flush() -> None:
        if chunks or name is not None:
            seq = _clean("".join(chunks))
            if seq:
                records.append(Record(name or f"seq{len(records) + 1}", seq))

    for line in text.splitlines():
        if line.startswith(">"):
            flush()
            name = line[1:].strip() or None
            chunks = []
        else:
            chunks.append(line)
    flush()
    return records


def _clean(raw: str) -> str:
    out = []
    for ch in raw.upper().replace("U", "T"):
        if ch in "ACGTN":
            out.append(ch)
    return "".join(out)


def matches_iupac(seq: str, pattern: str) -> bool:
    if len(seq) != len(pattern):
        return False
    return all(b in _IUPAC.get(code, "") for b, code in zip(seq, pattern))


def hamming(a: str, b: str) -> int:
    return sum(1 for x, y in zip(a, b) if x != y)
