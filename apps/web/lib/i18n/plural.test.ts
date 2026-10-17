import { describe, expect, it } from "vitest";
import { pluralize } from "./plural";

const forms = { one: "помилка", few: "помилки", many: "помилок" };

function plural(count: number): string {
  return pluralize(count, forms.one, forms.few, forms.many);
}

describe("pluralize", () => {
  it("uses 'one' when the last digit is 1 and it is not 11", () => {
    expect(plural(1)).toBe("помилка");
    expect(plural(21)).toBe("помилка");
    expect(plural(31)).toBe("помилка");
  });

  it("uses 'few' when the last digit is 2–4 and it is not 12–14", () => {
    expect(plural(2)).toBe("помилки");
    expect(plural(3)).toBe("помилки");
    expect(plural(4)).toBe("помилки");
    expect(plural(22)).toBe("помилки");
    expect(plural(23)).toBe("помилки");
  });

  it("uses 'many' for 0, 5–9 and the 11–14 exception", () => {
    expect(plural(0)).toBe("помилок");
    expect(plural(5)).toBe("помилок");
    expect(plural(9)).toBe("помилок");
    expect(plural(10)).toBe("помилок");
    expect(plural(11)).toBe("помилок");
    expect(plural(12)).toBe("помилок");
    expect(plural(13)).toBe("помилок");
    expect(plural(14)).toBe("помилок");
    expect(plural(15)).toBe("помилок");
  });
});
