import axios from "axios";
import { ApiError, ApplicationError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import type { NodeId } from "../shared/architecture/TopologyNode";

export interface GetValidEdgeTargetsConfig {
  resources?: { sources?: NodeId[]; targets?: NodeId[] };
  resourceTypes?: { sources?: NodeId[]; targets?: NodeId[] };
  tags?: ("big" | "small" | "parent")[];
  classifications?: string[];
}

export interface GetValidEdgeTargetsResponse {
  validTargets: Map<string, string[]>;
  architectureVersion: number;
  architectureId: string;
  environment: string;
}

export async function getValidEdgeTargets(
  architectureId: string,
  environment: string,
  latestState: number,
  config: GetValidEdgeTargetsConfig,
  idToken: string,
): Promise<GetValidEdgeTargetsResponse> {
  console.log("getValidEdgeTargets", architectureId);

  let data: any;

  try {
    const response = await axios.post(
      `/api/architecture/${architectureId}/environment/${environment}/valid-edge-targets`,
      { config: formatConfig(config) },
      {
        params: {
          state: latestState,
        },
        responseType: "json",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    data = response.data;
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetValidEdgeTargets",
      message: "An error occurred while getting valid edge targets.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
    });
    trackError(error);
    throw error;
  }

  return {
    architectureId: data.architectureId,
    environment: data.environment,
    architectureVersion: data.version,
    validTargets: formatResponse(data),
  };
}

function formatConfig(config: GetValidEdgeTargetsConfig): object {
  try {
    return {
      resources: {
        sources: config.resources?.sources?.map((r) => r.toString()),
        targets: config.resources?.targets?.map((r) => r.toString()),
      },
      resourceTypes: {
        sources: config.resourceTypes?.sources?.map((r) => r.qualifiedType),
        targets: config.resourceTypes?.targets?.map((r) => r.qualifiedType),
      },
      tags: config.tags,
      classifications: config.classifications,
    };
  } catch (e: any) {
    throw new ApplicationError({
      errorId: "GetValidEdgeTargets",
      message:
        "An error occurred while formatting the GetValidEdgeTargets request configuration.",
      cause: e,
    });
  }
}

function formatResponse(data: any): Map<string, string[]> {
  try {
    const validTargets = new Map<string, string[]>();

    for (const [source, targets] of Object.entries(data.validEdgeTargets)) {
      validTargets.set(source, targets as string[]);
    }
    return validTargets;
  } catch (e: any) {
    throw new ApplicationError({
      errorId: "GetValidEdgeTargets",
      message:
        "An error occurred while parsing the valid edge targets response.",
      cause: e,
    });
  }
}
