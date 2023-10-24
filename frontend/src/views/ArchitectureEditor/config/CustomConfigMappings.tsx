import {
  handleRoutesState,
  RestApiFormStateBuilder,
  RestApiRouteConfig,
} from "./RestApiRouteConfig";
import type { FC } from "react";
import type { Architecture } from "../../../shared/architecture/Architecture";
import type { NodeId } from "../../../shared/architecture/TopologyNode";

export type ConfigSections = {
  [key: string]: {
    component?: FC<any>;
    stateHandler?: (state: any, resourceId: NodeId) => any;
  };
};

export const customConfigMappings: {
  [key: string]: {
    sections: ConfigSections;
    stateBuilder: (resourceId: NodeId, architecture: Architecture) => any;
  };
} = {
  "aws:rest_api": {
    stateBuilder: RestApiFormStateBuilder,
    sections: {
      Routes: {
        component: RestApiRouteConfig,
        stateHandler: handleRoutesState,
      },
    },
  },
};

export function getCustomConfigSections(
  provider: string,
  type: string,
): ConfigSections {
  return customConfigMappings[`${provider}:${type}`]?.sections ?? {};
}

export function getCustomConfigState(
  resourceId: NodeId,
  architecture: Architecture,
): any {
  return customConfigMappings[
    `${resourceId.provider}:${resourceId.type}`
  ]?.stateBuilder(resourceId, architecture);
}
