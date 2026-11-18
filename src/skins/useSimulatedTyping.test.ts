import { describe, expect, it } from "vitest";
import { characters } from "./useSimulatedTyping";

describe("simulated typing characters", () => {
  it("keeps Chinese punctuation, newlines, and emoji in display order", () => {
    expect(characters("昇玟，你好。\n🐶")).toEqual([
      "昇", "玟", "，", "你", "好", "。", "\n", "🐶",
    ]);
  });
});
