import { expect, test } from "vitest";
import { validateCards } from "../../repositories/ResponseGenerator.js";
import { Cards } from "../../types.js";

const cards: Cards = [{ front: "test", back: "test" }];

test("a non empty array with an object that contains a front and back field ", () => {
  const returndCards = validateCards(cards);
  expect(returndCards).toEqual(cards);
});

test("rejects input that is not an array", () => {
  expect(() => validateCards({})).toThrow("expected an array");
});

test("rejects input where an array is empty", () => {
  expect(() => validateCards([])).toThrow("no items found");
});

test("rejects input where array item not an object", () => {
  expect(() => validateCards([""])).toThrow("item is not an object");
});

test("rejects input that has an array with an object with no fornt field", () => {
  expect(() => validateCards([{ back: "test" }])).toThrow(
    "front missing a value"
  );
});

test("rejects input that has an array with an object with no back field", () => {
  expect(() => validateCards([{ front: "test" }])).toThrow(
    "back missing a value"
  );
});
