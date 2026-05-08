import { formatTopPickLimit, getTopPickLimit } from "./topPickPolicy";

describe("topPickPolicy", () => {
  it("derives the TopPick limit from onboarding execution difficulty", () => {
    expect(getTopPickLimit("LOW")).toBe(1);
    expect(getTopPickLimit("MEDIUM")).toBe(2);
    expect(getTopPickLimit("HIGH")).toBe(3);
    expect(getTopPickLimit(null)).toBe(1);
  });

  it("formats the limit for user-facing copy", () => {
    expect(formatTopPickLimit(1)).toBe("하나");
    expect(formatTopPickLimit(2)).toBe("2개");
  });
});
