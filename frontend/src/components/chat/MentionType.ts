export enum MentionType {
  Resource = "resource",
  Explain = "explain",
}

export function mention(type: MentionType, id: string, displayText: string) {
  return `<msft-mention id="${type}#${id}">${displayText}</msft-mention>`;
}
