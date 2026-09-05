import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { buildSavePayload, readErrorKind, readSavedId, resultFor } from "@/lib/game/save";
import { saveGameSchema } from "@/lib/game/save-schema";
import {
  describeEnd,
  describeResignation,
  describeTimeout,
  type EndCause,
  type GameEnd,
} from "@/lib/game/result";
import {
  depthFor,
  DIFFICULTIES,
  TIME_CONTROL_IDS,
  type GameSettings,
  type Side,
} from "@/lib/game/settings";

// Fool's mate. Black delivers checkmate on move two, so the four-ply game is
// also the cheapest way to reach a finished board.
function foolsMate(): Chess {
  const chess = new Chess();
  for (const san of ["f3", "e5", "g4", "Qh4#"]) chess.move(san);
  return chess;
}

function endWith(cause: EndCause, winner: Side | null): GameEnd {
  return { outcome: "draw", winner, cause, headline: "Draw", reason: "" };
}

describe("resultFor", () => {
  describe("checkmate", () => {
    it("records the side that mated, not the side that was asked", () => {
      // The user's own colour must not change what is stored.
      expect(resultFor(describeEnd(foolsMate(), "white")!)).toBe("black_wins");
      expect(resultFor(describeEnd(foolsMate(), "black")!)).toBe("black_wins");
    });

    it("records a white mate as white_wins", () => {
      const chess = new Chess();
      for (const san of ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]) chess.move(san);
      expect(resultFor(describeEnd(chess, "white")!)).toBe("white_wins");
    });
  });

  describe("draws", () => {
    it("records stalemate as a draw", () => {
      const chess = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
      expect(resultFor(describeEnd(chess, "white")!)).toBe("draw");
    });

    it("records insufficient material as a draw", () => {
      const chess = new Chess("8/8/8/4k3/8/8/8/4K2B w - - 0 1");
      expect(resultFor(describeEnd(chess, "black")!)).toBe("draw");
    });

    it("records threefold repetition as a draw", () => {
      const chess = new Chess();
      for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
        chess.move(san);
      }
      expect(resultFor(describeEnd(chess, "white")!)).toBe("draw");
    });

    it("records the fifty-move rule as a draw", () => {
      const chess = new Chess("8/8/8/4k3/8/8/4R3/4K3 w - - 100 200");
      expect(resultFor(describeEnd(chess, "white")!)).toBe("draw");
    });
  });

  describe("timeout", () => {
    it("gives the game to whoever did not flag", () => {
      expect(resultFor(describeTimeout("white", "white"))).toBe("black_wins");
      expect(resultFor(describeTimeout("black", "white"))).toBe("white_wins");
    });

    it("never reads as abandoned", () => {
      for (const flagged of ["white", "black"] as const) {
        expect(resultFor(describeTimeout(flagged, flagged))).not.toBe("abandoned");
      }
    });
  });

  describe("resignation", () => {
    it("is abandoned whichever colour the player had", () => {
      expect(resultFor(describeResignation("white"))).toBe("abandoned");
      expect(resultFor(describeResignation("black"))).toBe("abandoned");
    });

    it("ignores the winner the end still carries", () => {
      // The post-game screen names a winner after a resignation. The saved
      // result deliberately does not, so cause has to win over winner.
      expect(describeResignation("white").winner).toBe("black");
      expect(resultFor(describeResignation("white"))).toBe("abandoned");
    });
  });

  it("maps every cause to a value the games table accepts", () => {
    const causes: readonly EndCause[] = [
      "checkmate",
      "stalemate",
      "insufficient_material",
      "repetition",
      "fifty_moves",
      "timeout",
      "resignation",
      "agreement",
    ];
    const allowed = ["white_wins", "black_wins", "draw", "abandoned"];

    for (const cause of causes) {
      for (const winner of ["white", "black", null] as const) {
        expect(allowed).toContain(resultFor(endWith(cause, winner)));
      }
    }
  });
});

describe("buildSavePayload", () => {
  const settings: GameSettings = { side: "white", difficulty: "easy", timeControl: "3+2" };

  it("reads the settings as the columns store them", () => {
    const chess = foolsMate();
    const payload = buildSavePayload(chess, settings, describeEnd(chess, "white")!);

    expect(payload).toMatchObject({
      result: "black_wins",
      user_color: "white",
      difficulty: 3,
      time_control: "3+2",
      move_count: 4,
    });
    expect(payload.pgn).toContain("Qh4#");
  });

  it("stores a resignation as an abandoned game with the moves played so far", () => {
    const chess = new Chess();
    for (const san of ["e4", "e5", "Qh5", "Nc6"]) chess.move(san);

    const payload = buildSavePayload(chess, settings, describeResignation("white"));

    expect(payload).toMatchObject({ result: "abandoned", move_count: 4 });
    expect(saveGameSchema.safeParse(payload).success).toBe(true);
  });

  it("counts plies rather than full moves", () => {
    const chess = new Chess();
    for (const san of ["e4", "e5", "Nf3"]) chess.move(san);
    const payload = buildSavePayload(chess, settings, describeTimeout("black", "white"));
    expect(payload.move_count).toBe(3);
  });

  it("does not follow the board after the game it was built from", () => {
    // The retry-after-rematch case. chess.js mutates in place, so a payload
    // that held on to the instance would quietly send the next game instead.
    const chess = foolsMate();
    const payload = buildSavePayload(chess, settings, describeEnd(chess, "white")!);
    const pgn = payload.pgn;

    chess.reset();
    chess.move("d4");

    expect(payload.pgn).toBe(pgn);
    expect(payload.move_count).toBe(4);
  });
});

describe("readSavedId", () => {
  it("takes the id out of a success body", () => {
    expect(readSavedId({ id: "abc" })).toBe("abc");
  });

  it("returns null for anything else", () => {
    expect(readSavedId(null)).toBeNull();
    expect(readSavedId({})).toBeNull();
    expect(readSavedId({ id: 7 })).toBeNull();
    expect(readSavedId("abc")).toBeNull();
  });
});

describe("readErrorKind", () => {
  it("passes through the kinds the route sends", () => {
    expect(readErrorKind({ error: "not_authenticated" })).toBe("not_authenticated");
    expect(readErrorKind({ error: "email_not_verified" })).toBe("email_not_verified");
    expect(readErrorKind({ error: "invalid_game_data" })).toBe("invalid_game_data");
  });

  it("falls back to save_failed for anything it does not recognise", () => {
    expect(readErrorKind({ error: "games_table_missing" })).toBe("save_failed");
    expect(readErrorKind({ error: 7 })).toBe("save_failed");
    expect(readErrorKind({})).toBe("save_failed");
    expect(readErrorKind(null)).toBe("save_failed");
  });
});

describe("saveGameSchema", () => {
  const valid = {
    pgn: "1. f3 e5 2. g4 Qh4#",
    result: "black_wins",
    user_color: "white",
    difficulty: 3,
    time_control: "3+2",
    move_count: 4,
  };

  it("accepts what buildSavePayload produces", () => {
    const chess = foolsMate();
    const settings: GameSettings = { side: "black", difficulty: "hard", timeControl: "1+0" };
    const payload = buildSavePayload(chess, settings, describeEnd(chess, "black")!);

    expect(saveGameSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts every difficulty the setup screen offers", () => {
    for (const difficulty of DIFFICULTIES) {
      const parsed = saveGameSchema.safeParse({ ...valid, difficulty: depthFor(difficulty) });
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts every time control the setup screen offers", () => {
    for (const id of TIME_CONTROL_IDS) {
      expect(saveGameSchema.safeParse({ ...valid, time_control: id }).success).toBe(true);
    }
  });

  it("rejects a depth the app cannot produce", () => {
    // Depth 4 sits between Easy and Medium, and depth 8 is past the engine's
    // ceiling. Neither is reachable from the setup screen, so neither is stored.
    for (const difficulty of [0, 2, 4, 7, 8, -3, 3.5]) {
      expect(saveGameSchema.safeParse({ ...valid, difficulty }).success).toBe(false);
    }
  });

  it("rejects a time control the app cannot produce", () => {
    for (const time_control of ["5+0", "3+2 ", "", "10+0s"]) {
      expect(saveGameSchema.safeParse({ ...valid, time_control }).success).toBe(false);
    }
  });

  it("rejects a result outside the table's check constraint", () => {
    for (const result of ["white", "1-0", "resigned", "", "draw "]) {
      expect(saveGameSchema.safeParse({ ...valid, result }).success).toBe(false);
    }
  });

  it("rejects an empty or oversized pgn", () => {
    expect(saveGameSchema.safeParse({ ...valid, pgn: "" }).success).toBe(false);
    expect(saveGameSchema.safeParse({ ...valid, pgn: "a".repeat(10_000) }).success).toBe(true);
    expect(saveGameSchema.safeParse({ ...valid, pgn: "a".repeat(10_001) }).success).toBe(false);
  });

  it("rejects a move count that is not a sane ply count", () => {
    for (const move_count of [0, -1, 2.5, 1001]) {
      expect(saveGameSchema.safeParse({ ...valid, move_count }).success).toBe(false);
    }
    expect(saveGameSchema.safeParse({ ...valid, move_count: 1000 }).success).toBe(true);
  });

  it("rejects a payload trying to choose its own user_id", () => {
    // Stripped rather than refused: zod drops unknown keys, so the insert can
    // never see one. The owner comes from the session on the server.
    const parsed = saveGameSchema.safeParse({ ...valid, user_id: "someone-else" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("user_id");
  });

  it("rejects a missing body", () => {
    expect(saveGameSchema.safeParse({}).success).toBe(false);
    expect(saveGameSchema.safeParse(null).success).toBe(false);
  });
});
