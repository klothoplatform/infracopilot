import type { CustomConfigMap } from "../../config/CustomConfigMappings";

import { handleRoutesState, restApiFormStateBuilder } from "./FormState";
import { restApiResourceTypeModifier } from "./ResourceTypes";
import {
  apiIntegrationNodeModifier,
  restApiCreationConstraintsModifier,
} from "./Constraints";
import { restApiLayoutModifier } from "./Visualization";
import { RestApiRouteConfig } from "./Config";

export const Config: CustomConfigMap = {
  "aws:rest_api": {
    creationConstraintsModifier: restApiCreationConstraintsModifier,
    layoutModifier: restApiLayoutModifier,
    stateBuilder: restApiFormStateBuilder,
    resourceTypeModifier: restApiResourceTypeModifier,
    sections: {
      Routes: {
        component: RestApiRouteConfig,
        stateHandler: handleRoutesState,
      },
    },
  },
  "aws:api_integration": {
    nodeModifier: apiIntegrationNodeModifier,
    sections: {},
    stateBuilder: () => ({}),
  },
};

export default Config;
