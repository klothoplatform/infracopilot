import { isObject } from "./object-util";

describe("ObjectUtil", () => {
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
});
