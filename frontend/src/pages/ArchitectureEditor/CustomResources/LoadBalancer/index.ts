import type { CustomConfigMap } from "../../config/CustomConfigMappings";
import { loadBalancerCreationConstraintsModifier } from "./Constraints";
import {
  AlbListenerRuleNodeModifier,
  LBNodeModifier,
  loadBalancerLayoutModifier,
} from "./Visualization";
import {
  handleAlbListenerFormState,
  handleLBTypeFormState,
  loadBalancerFormStateBuilder,
} from "./FormState";
import { ALBRouteConfig } from "./Config";
import { loadBalancerResourceTypeModifier } from "./ResourceTypes";

const Config: CustomConfigMap = {
  "aws:load_balancer": {
    creationConstraintsModifier: loadBalancerCreationConstraintsModifier,
    stateBuilder: loadBalancerFormStateBuilder,
    resourceTypeModifier: loadBalancerResourceTypeModifier,
    layoutModifier: loadBalancerLayoutModifier,
    sections: {
      Listener: {
        component: ALBRouteConfig,
        stateHandler: handleAlbListenerFormState,
      },
      Type: {
        stateHandler: handleLBTypeFormState,
      },
    },
    nodeModifier: LBNodeModifier,
  },
  "aws:load_balancer_listener_rule": {
    nodeModifier: AlbListenerRuleNodeModifier,
    sections: {},
    stateBuilder: () => ({}),
  },
};

export default Config;
