import {
  Architecture,
  defaultArchitecture,
} from "../shared/architecture/Architecture";

export async function getArchitecture(
  id: string,
  version?: number
): Promise<Architecture> {
  console.log(
    "getArchitecture called with id: " + id + " and version: " + version
  );
  // TODO: implement getArchitecture
  return defaultArchitecture;
}
