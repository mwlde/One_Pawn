import { describe, expect, it } from "vitest";

import { formatMoveLabel } from "@/lib/analysis/display";

describe("formatMoveLabel", () => {
  it("numbers White's moves with a single dot", () => {
    expect(formatMoveLabel(1, "e4")).toBe("1. e4");
    expect(formatMoveLabel(3, "Nf3")).toBe("2. Nf3");
  });

  it("numbers Black's moves with an ellipsis and the same full-move number", () => {
    expect(formatMoveLabel(2, "e5")).toBe("1... e5");
    expect(formatMoveLabel(4, "Nc6")).toBe("2... Nc6");
  });
});
