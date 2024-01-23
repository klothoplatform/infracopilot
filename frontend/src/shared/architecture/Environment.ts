export interface Environment {
  provider: string;
  architecture_id: string;
  id: string;
  current: number;
  tags: Map<string, string>;
}
