import {
  getEnumKeyByEnumValue,
  isObject,
  qualifiedProperties,
} from "./object-util";

describe("isObject", () => {
  it("should return true if value is an object", () => {
    expect(isObject({})).toBe(true);
  });
  it("should return false if value is an array", () => {
    expect(isObject([])).toBe(false);
  });
  it("should return false if value is null", () => {
    expect(isObject(null)).toBe(false);
  });
  it("should return false if value is undefined", () => {
    expect(isObject(undefined)).toBe(false);
  });
  it("should return false if value is a string", () => {
    expect(isObject("")).toBe(false);
  });
  it("should return false if value is a number", () => {
    expect(isObject(1)).toBe(false);
  });
  it("should return false if value is a boolean", () => {
    expect(isObject(true)).toBe(false);
  });
  it("should return false if value is a function", () => {
    expect(isObject(() => {})).toBe(false);
  });
});

describe("getEnumKeyByEnumValue", () => {
  enum TestEnum {
    A = "a",
    B = "b",
  }

  it("should return the key of the enum value", () => {
    expect(getEnumKeyByEnumValue(TestEnum, "a")).toBe("A");
  });
  it("should return null if the enum value is not found", () => {
    expect(getEnumKeyByEnumValue(TestEnum, "c")).toBeNull();
  });
});

describe("qualifiedProperties", () => {
  it("should return an empty array if the value is not an object or array", () => {
    expect(qualifiedProperties(1)).toEqual([]);
  });
  it("should return an empty array if the value is null", () => {
    expect(qualifiedProperties(null)).toEqual([]);
  });
  it("should return an empty array if the value is undefined", () => {
    expect(qualifiedProperties(undefined)).toEqual([]);
  });
  it("should return an empty array if the value is a string", () => {
    expect(qualifiedProperties("")).toEqual([]);
  });
  it("should return an empty array if the value is a number", () => {
    expect(qualifiedProperties(1)).toEqual([]);
  });
  it("should return an empty array if the value is a boolean", () => {
    expect(qualifiedProperties(true)).toEqual([]);
  });
  it("should return an empty array if the value is a function", () => {
    expect(qualifiedProperties(() => {})).toEqual([]);
  });
  it("should return an array of properties for an object", () => {
    expect(qualifiedProperties({ a: 1, b: 2 })).toEqual(["a", "b"]);
  });
  it("should return an array of properties for an array", () => {
    expect(qualifiedProperties([1, 2])).toEqual(["[0]", "[1]"]);
  });
  it("should return an array of properties for a nested object", () => {
    expect(qualifiedProperties({ a: { b: 1 }, c: { d: 2 }, e: 3 })).toEqual([
      "a",
      "a.b",
      "c",
      "c.d",
      "e",
    ]);
  });
  it("should handle an object containing an array", () => {
    expect(qualifiedProperties({ a: [1, 2] })).toEqual(["a", "a[0]", "a[1]"]);
  });
  it("should return an array of properties for a nested array", () => {
    expect(qualifiedProperties([[1, 2]])).toEqual(["[0]", "[0][0]", "[0][1]"]);
  });
});
