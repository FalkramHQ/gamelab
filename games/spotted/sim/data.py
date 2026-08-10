"""SPOTTED! simulation: card data loading and shared helpers.

Source of truth for card content is the CSV files in ../cards so the physical
game and the simulator can never drift apart.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from math import log2
from pathlib import Path

CARDS_DIR = Path(__file__).resolve().parent.parent / "cards"

TRAITS = ("class", "habitat", "size", "diet", "activity")

SPECIAL_KINDS = {
    "S01": "double_probe",
    "S02": "misdirect",
    "S03": "eavesdrop",
    "S04": "cross_examine",
    "S05": "wild_probe",
}


@dataclass(frozen=True)
class Creature:
    cid: str
    name: str
    traits: tuple  # ordered like TRAITS

    def value_of(self, trait: str) -> str:
        return self.traits[TRAITS.index(trait)]

    def has(self, trait: str, value: str) -> bool:
        return self.value_of(trait) == value


@dataclass(frozen=True)
class QuestionCard:
    card_id: str
    trait: str
    value: str
    special: bool = False
    kind: str = ""  # special kind when special=True


def load_creatures() -> list[Creature]:
    creatures = []
    with open(CARDS_DIR / "creatures.csv", newline="") as f:
        for row in csv.DictReader(f):
            creatures.append(
                Creature(
                    row["id"].strip(),
                    row["name"].strip(),
                    tuple(row[t].strip() for t in TRAITS),
                )
            )
    return creatures


def load_question_deck() -> list[QuestionCard]:
    """Expanded question deck: 64 trait questions + 16 specials = 80 cards."""
    deck: list[QuestionCard] = []
    with open(CARDS_DIR / "questions.csv", newline="") as f:
        for row in csv.DictReader(f):
            for i in range(int(row["copies"])):
                deck.append(
                    QuestionCard(f"{row['id']}-{i}", row["trait"], row["value"])
                )
    with open(CARDS_DIR / "specials.csv", newline="") as f:
        for row in csv.DictReader(f):
            kind = SPECIAL_KINDS[row["id"]]
            for i in range(int(row["copies"])):
                deck.append(
                    QuestionCard(f"{row['id']}-{i}", "", "", special=True, kind=kind)
                )
    return deck


def all_questions(creatures: list[Creature]) -> list[tuple[str, str]]:
    """Every askable (trait, value) pair derived from the creature set."""
    pairs = set()
    for c in creatures:
        for t in TRAITS:
            pairs.add((t, c.value_of(t)))
    return sorted(pairs)


def entropy(n: int) -> float:
    """Entropy (bits) of a uniform distribution over n items."""
    return log2(n) if n > 1 else 0.0


def question_info_gain(cands: list[Creature], trait: str, value: str) -> float:
    """Expected bits learned by asking 'is it <value> <trait>?' over candidates."""
    n = len(cands)
    if n <= 1:
        return 0.0
    yes = sum(1 for c in cands if c.has(trait, value))
    if yes in (0, n):
        return 0.0
    p = yes / n
    return entropy(n) - (p * entropy(yes) + (1 - p) * entropy(n - yes))


def trait_reveal_gain(cands: list[Creature], trait: str) -> float:
    """Expected bits learned when a trait's exact value is revealed (Eavesdrop)."""
    n = len(cands)
    if n <= 1:
        return 0.0
    groups: dict[str, int] = {}
    for c in cands:
        v = c.value_of(trait)
        groups[v] = groups.get(v, 0) + 1
    gain = entropy(n)
    for k in groups.values():
        gain -= (k / n) * entropy(k)
    return gain
