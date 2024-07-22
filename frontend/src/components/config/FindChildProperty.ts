// findChildProperty finds a child property of an object by path.
// A period indicates a child property, a "[]" indicates an array index.
export function findChildProperty(obj: any, path: string): any {
  const parts = path.split(/[[.]/);
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined) {
      return undefined;
    }
    if (part.endsWith("]")) {
      const index = parseInt(
        part.substring(part.indexOf("[") + 1, part.length),
      );
      current = current[index];
    } else {
      current = current[part];
    }
  }
  return current;
}
