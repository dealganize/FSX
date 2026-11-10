import { describe, expect, it } from "vitest";
import { initials } from "./avatars";

describe("initials", () => {
  it("uses first and last name, ignoring suffixes and punctuation", () => {
    expect(initials("Jahmyr Gibbs")).toBe("JG");
    expect(initials("Marvin Harrison Jr.")).toBe("MH");
    expect(initials("Amon-Ra St. Brown")).toBe("AB");
    expect(initials("Ja'Marr Chase")).toBe("JC");
    expect(initials("Kelce")).toBe("KE");
    expect(initials("")).toBe("?");
  });
});
