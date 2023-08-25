import { Constraint } from "../shared/architecture/Constraints";
import { Architecture } from "../shared/architecture/Architecture";

export async function applyConstraints(
  architectureId: string,
  architectureVersion: number,
  constraints: Constraint[]
): Promise<Architecture> {
  console.log("applyConstraints");
  // TODO: implement applyConstraints
  return {} as Architecture;
}
