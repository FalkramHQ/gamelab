# TAXON

**A competitive deduction card game for 2–5 players · ~25 minutes · ages 10+**

Every player is a field biologist hiding a secret specimen. Interrogate your rivals,
read the pattern of their questions, and strike when you can name their creature.
Ask too many questions and everyone learns the answer — including the rival you're
hunting. The sharpest decision tree wins.

> Design reference: built from the mechanism blocks of *Building Blocks of Tabletop
> Game Design* — see `docs/specs/2026-08-10-taxon-design.md`.

---

## Components

| Component | Count | File |
|---|---|---|
| Creature cards (5 traits each) | 25 | `cards/creatures.csv` |
| Question cards | 64 | `cards/questions.csv` |
| Special cards | 16 | `cards/specials.csv` |
| Discovery tokens | 25 | — |
| Yes/No answer tokens (two-sided) | 5 | — |
| Deduction pad + pencil | 1 per player | see DEDUCTION PAD below |

**The trait matrix (public knowledge):** every creature has exactly one value for each
of 5 traits:

- **CLASS** — mammal · bird · reptile · insect · aquatic
- **HABITAT** — forest · grassland · desert · water · underground
- **SIZE** — small · medium · large
- **DIET** — herbivore · carnivore · omnivore
- **ACTIVITY** — diurnal · nocturnal

## Setup

1. Shuffle the creature deck. Deal **1 creature card face-down** to each player. This
   is your **Specimen** — never reveal it.
2. Shuffle the question deck (questions + specials together). Deal **6 cards** to each
   player. This is your hand. **Hand limit: 7.**
3. Place both decks and the Discovery tokens within reach. Each player takes a
   deduction pad. Give each player a yes/no token.
4. Choose a starting player at random. Place the **First Biologist marker** in front
   of them. Turns proceed clockwise.

**Round rule:** a *round* is one turn for every player. At the start of each new
round, the First Biologist marker passes one seat to the left — the turn order
rotates. *(Sim-verified: this cancels the listening advantage of late seats; without
it, later seats win measurably more often.)*

## Your turn

**Step 1 — Draw:** draw 1 card from the question deck. If you now exceed 7 cards,
discard down to 7 immediately. If the question deck is empty, shuffle its discard pile
to form a new deck.

**Step 2 — Act:** choose **one**:

### A. Play a question card at a target
Play a question card face-up, point at any other player (the target), and read the
question. The target must answer **honestly** using their yes/no token, **visible to
everyone**. Mark the answer on your deduction pad — and remember: everyone else heard
it too. Then discard the question card.

### B. Play a special card
Resolve it as written, then discard it:

- **Double Probe** — ask up to 2 questions (same or different targets). Answers public.
- **Misdirect** — ask 1 question; the target answers **secretly to you only** (hide the
  token). Others know a question happened but not what was answered.
- **Eavesdrop** — name a target and one trait; the target secretly shows you their
  trait value (no announcement).
- **Cross-Examine** — ask the same question to 2 different targets. Answers public.
- **Wild Probe** — ask any trait question you like, even without holding the card.
  Answer public.

### C. Make an Identification (guess a rival's Specimen)
Announce a rival and name one of the 25 creatures as their Specimen. **You may do this
regardless of the cards in your hand, and it does not require playing a card.**

- **Correct:** reveal their Specimen. You score Discovery tokens equal to
  **2 + efficiency bonus**, where the bonus = `max(0, 4 − q)` and `q` is the number of
  **publicly answered** questions about that rival since they took this Specimen
  (Misdirect/Eavesdrop intel never counts toward `q`). Max 6, min 2.
  The rival immediately draws a new Specimen (their `q` counter resets).
  If the creature deck is empty, see **Game end**.
- **Wrong:** you lose **2 Discovery tokens** (minimum 0), and your failed guess is
  **public information** — everyone now knows that creature is *not* your rival's
  Specimen.

### D. Discard
Discard any 1 card. Useful for cycling toward specials or hiding which questions you
can ask.

## Game end

When any player reaches **10 Discovery tokens**, the trigger fires — but the round is
played out so **every player has taken the same number of turns** *(equal-turn finish:
no seat-order advantage)*. Then the game ends and the **highest token total wins**.
Tiebreak, in order: most correct Identifications made this game, then the player
closest to the starting player's left. *(No shared victories.)*

If a correctly identified Specimen cannot be replaced because the creature deck is
empty, the same equal-turn finish applies.

## Strategy notes (the decision tree inside the game)

- Every question halves the field — but for **everyone**. Asking your rival "NOCTURNAL?"
  also hands your hunter a branch of *your* tree whenever questions about you are asked.
  Efficient players win: guessing with only 1 public question answered pays 5 tokens;
  grinding out 5 questions pays only 2.
- **Misdirect** answers are invisible to rivals — the safest way to build certainty.
- Watch *why* someone asks a question. Asking something they already know is a bluff;
  asking a trait they've never explored is a tell.
- Guessing early is push-your-luck: 1-in-25 odds for 6 tokens can be worth the gamble
  when you're behind — and your wrong guess poisons the information pool for everyone.

## Deduction pad

One grid per rival, updated after every **public** answer:

```
Rival: ______
CLASS    mammal[ ] bird[ ] reptile[ ] insect[ ] aquatic[ ]
HABITAT  forest[ ] grassland[ ] desert[ ] water[ ] underground[ ]
SIZE     small[ ] medium[ ] large[ ]
DIET     herbivore[ ] carnivore[ ] omnivore[ ]
ACTIVITY diurnal[ ] nocturnal[ ]
Public answers heard (q): ___
Notes / failed guesses: __________________________
```

Cross out values that a public **NO** eliminates; circle confirmed **YES** values. When
exactly one creature on the reference sheet survives, you are ready to Identify.

## Variant: Duel (2-player)

Use all rules unchanged, but the win threshold is **8 tokens**. Faster, sharper, meaner.
*(Sim-verified: 2-player seat fairness sits ~1–3% across seeds — rotation plus the
equal-turn finish do the balancing; no extra handicaps needed.)*

## Variant: Team Field Study (4 players)

Play 2v2 across the table. Teammates may not show each other their pads, but a correct
Identification by either teammate scores for the team. First team to 12 tokens wins.
