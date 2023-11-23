export function isObject(value: any): boolean {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}
