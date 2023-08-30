export interface ResourceField {
  name: string;
  type: string;
  configurable: boolean;
}

export function getResourceFields(
  provider: string,
  type: string,
): ResourceField[] {
  // TODO: implement getResourceFields
  return [];
}
