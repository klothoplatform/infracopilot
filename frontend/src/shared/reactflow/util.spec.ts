import { Direction, getLineDirection } from "./util";

describe("getLineDirection", () => {
  it("should return top left for a line going from bottom right to top left", () => {
    const A = { x: 100, y: 100 };
    const B = { x: 0, y: 0 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Left);
    expect(result.vertical).toBe(Direction.Up);
  });
  it("should return top right for a line going from bottom left to top right", () => {
    const A = { x: 0, y: 100 };
    const B = { x: 100, y: 0 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Right);
    expect(result.vertical).toBe(Direction.Up);
  });
  it("should return bottom left for a line going from top right to bottom left", () => {
    const A = { x: 100, y: 0 };
    const B = { x: 0, y: 100 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Left);
    expect(result.vertical).toBe(Direction.Down);
  });
  it("should return bottom right for a line going from top left to bottom right", () => {
    const A = { x: 0, y: 0 };
    const B = { x: 100, y: 100 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Right);
    expect(result.vertical).toBe(Direction.Down);
  });
  it("should return left for a line going from right to left", () => {
    const A = { x: 100, y: 0 };
    const B = { x: 0, y: 0 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Left);
    expect(result.vertical).toBeUndefined();
  });
  it("should return right for a line going from left to right", () => {
    const A = { x: 0, y: 0 };
    const B = { x: 100, y: 0 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBe(Direction.Right);
    expect(result.vertical).toBeUndefined();
  });
  it("should return up for a line going from bottom to top", () => {
    const A = { x: 0, y: 100 };
    const B = { x: 0, y: 0 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBeUndefined();
    expect(result.vertical).toBe(Direction.Up);
  });
  it("should return down for a line going from top to bottom", () => {
    const A = { x: 0, y: 0 };
    const B = { x: 0, y: 100 };
    const result = getLineDirection(A, B);
    expect(result.horizontal).toBeUndefined();
    expect(result.vertical).toBe(Direction.Down);
  });
});
