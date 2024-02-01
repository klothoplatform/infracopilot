import { ConfigSection } from "../../../../components/config/ConfigSection";
import { ListField } from "../../../../components/config/ListField";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import type { FC } from "react";
import React from "react";
import { RoutesField } from "./ResourceTypes";

export const RestApiRouteConfig: FC<{ configResource: NodeId }> = ({
  configResource,
}) => (
  <ConfigSection id="Routes" title="Routes">
    <ListField
      qualifiedFieldName={`${configResource}#Routes`}
      field={RoutesField}
      configResource={configResource}
    />
  </ConfigSection>
);
