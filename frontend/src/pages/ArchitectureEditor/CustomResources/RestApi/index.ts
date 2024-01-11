import type { CustomConfigMap } from "../../config/CustomConfigMappings";
import {
  apiIntegrationNodeModifier,
  handleRoutesState,
  restApiCreationConstraintsModifier,
  restApiFormStateBuilder,
} from "./RestApiRouteConfig";
import { restApiLayoutModifier } from "./LayoutModifier";
import {
  restApiResourceTypeModifier,
  RestApiRouteConfig,
} from "./ConfigCustomizer";

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
