export function resolveMentions(text: string) {
  return text
    .replace(/<msft-mention id="resource#.*?">(.*?)<\/msft-mention>/g, "$1")
    .replace(/<msft-mention id="explain#.*?">(.*?)<\/msft-mention>/g, "")
    .trim();
}
