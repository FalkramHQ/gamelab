import { describe, expect, test } from "vitest";
import { Game, HAND_LIMIT, Action } from "./engine";
import { buildQuestionDeck, CREATURES } from "./data";
import { InfoGainAgent, RandomAgent } from "./agents";
import { makeRng } from "./rng";

const mk = (n = 2, seed = 7, kids = false) => new Game({ nPlayers: n, seed, kidsMode: kids });

describe("deck data", () => {
  test("25 creatures, 80-card question deck (64 + 16)", () => {
    expect(CREATURES.length).toBe(25);
    const deck = buildQuestionDeck();
    expect(deck.length).toBe(80);
    expect(deck.filter((c) => c.special).length).toBe(16);
  });
});

describe("scoring (RULES.md exact)", () => {
  test("correct identification at q=0 pays 6 (2 + max(0,4-q))", () => {
    const g = mk();
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: g.players[1].specimen.cid }]);
    expect(g.players[0].score).toBe(6);
    expect(g.players[0].correctIds).toBe(1);
  });

  test("efficiency bonus shrinks as public q grows (q=2 -> 4 points)", () => {
    const g = mk();
    g.players[1].q = 2;
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: g.players[1].specimen.cid }]);
    expect(g.players[0].score).toBe(4);
  });

  test("wrong identification costs 3, floored at 0", () => {
    const g = mk();
    const wrong = CREATURES.find((c) => c.cid !== g.players[1].specimen.cid)!.cid;
    // score some points first so the -3 is visible
    g.players[0].score = 5;
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: wrong }]);
    expect(g.players[0].score).toBe(2);
    // and the floor
    const g2 = mk(2, 8);
    g2.beginTurn();
    g2.resolve([{ kind: "guess", target: 1, cid: wrong }]);
    expect(g2.players[0].score).toBe(0);
  });

  test("wrong guess becomes public information (candidate removed for all)", () => {
    const g = mk(3);
    const wrong = CREATURES.find((c) => c.cid !== g.players[1].specimen.cid)!.cid;
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: wrong }]);
    expect(g.candidates(0, 1).some((c) => c.cid === wrong)).toBe(false);
    expect(g.candidates(2, 1).some((c) => c.cid === wrong)).toBe(false); // bystander also learns it
  });

  test("identified specimen is replaced and q resets", () => {
    const g = mk();
    const before = g.players[1].specimen.cid;
    g.players[1].q = 3;
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: before }]);
    expect(g.players[1].specimen.cid).not.toBe(before);
    expect(g.players[1].q).toBe(0);
    expect(g.players[1].epoch).toBe(1);
  });
});

describe("kids mode", () => {
  test("flat +2, wrong guess free, win target 6", () => {
    const g = mk(2, 3, true);
    expect(g.winTarget).toBe(6);
    g.beginTurn();
    g.resolve([{ kind: "guess", target: 1, cid: g.players[1].specimen.cid }]);
    expect(g.players[0].score).toBe(2);
    const wrong = CREATURES.find((c) => c.cid !== g.players[1].specimen.cid)!.cid;
    g.endTurn();
    g.beginTurn(); // seat 1
    g.resolve([{ kind: "guess", target: 0, cid: wrong }]);
    expect(g.players[1].score).toBe(0); // no penalty
  });
});

describe("information rules", () => {
  test("public answer increments target q; private answer does not", () => {
    const g = mk();
    g.beginTurn();
    const card = g.players[0].hand.find((c) => !c.special)!;
    g.resolve([{ kind: "ask_card", card, target: 1 }]);
    expect(g.players[1].q).toBe(1);

    g.endTurn();
    g.beginTurn(); // seat 1's turn
    g.resolve([{ kind: "ask_free", trait: "size", value: "small", target: 0, privateTo: 1 }]);
    expect(g.players[0].q).toBe(0); // private: no q increment
    const ev = g.log[g.log.length - 1];
    expect(ev.kind === "answer" && ev.privateTo).toBe(1);
  });

  test("eavesdrop reveal is private to the asker", () => {
    const g = mk();
    g.beginTurn();
    g.resolve([{ kind: "reveal_trait", trait: "class", target: 1, privateTo: 0 }]);
    const ev = g.log[g.log.length - 1];
    expect(ev.kind).toBe("reveal");
    if (ev.kind === "reveal") {
      expect(ev.value).toBe(g.players[1].specimen.traits.class);
      expect(ev.privateTo).toBe(0);
    }
  });
});

describe("turn structure", () => {
  test("hand limit 7 enforced on draw", () => {
    const g = mk();
    const p = g.players[0];
    while (p.hand.length < HAND_LIMIT) p.hand.push(buildQuestionDeck()[0]);
    g.beginTurn();
    expect(p.hand.length).toBe(HAND_LIMIT);
  });

  test("empty question deck reshuffles discard", () => {
    const g = mk();
    g.questionDiscard = [...g.questionDeck];
    g.questionDeck = [];
    g.beginTurn();
    expect(g.players[0].hand.length).toBe(7);
    expect(g.questionDeck.length + g.questionDiscard.length).toBe(80 - 12 - 1); // minus starting hands and the draw
  });

  test("equal-turn finish: total turns is a multiple of player count", () => {
    for (const n of [2, 3, 4]) {
      const g = new Game({ nPlayers: n, seed: 42 + n });
      g.agents = g.players.map((_, i) => new InfoGainAgent(makeRng(100 + i)));
      g.play();
      expect(g.turns % n).toBe(0);
    }
  });
});

describe("bots (headless smoke + skill)", () => {
  test("sharp bot beats casual bot decisively (2p, 40 games)", () => {
    let wins = 0;
    const G = 40;
    for (let s = 0; s < G; s++) {
      const g = new Game({ nPlayers: 2, seed: 500 + s });
      g.agents = [new InfoGainAgent(makeRng(9000 + s)), new RandomAgent(makeRng(7000 + s))];
      const r = g.play();
      if (r.winner === 0) wins++;
    }
    expect(wins / G).toBeGreaterThanOrEqual(0.7);
  });

  test("3-player sharp-vs-sharp game completes under the turn cap", () => {
    const g = new Game({ nPlayers: 3, seed: 999 });
    g.agents = g.players.map((_, i) => new InfoGainAgent(makeRng(50 + i)));
    const r = g.play();
    expect(r.capped).toBe(false);
    expect(r.turns).toBeLessThan(400);
    expect(r.winner).toBeGreaterThanOrEqual(0);
  });
});
