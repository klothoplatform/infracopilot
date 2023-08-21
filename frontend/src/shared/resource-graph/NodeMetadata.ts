import { NodeData } from "./Node";

export interface SubnetData extends NodeData {
  public?: boolean;
  cidr_block?: string;
}

export interface RdsInstanceData extends NodeData {
  engine?: string;
}
