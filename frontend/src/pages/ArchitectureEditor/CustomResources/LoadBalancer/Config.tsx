import React from "react";
import { ListenerField } from "./ResourceTypes";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import { MapField } from "../../../../components/config/MapField";

export function ALBRouteConfig({
  resource,
  configResource,
}: {
  resource: any;
  configResource: NodeId;
}) {
  return (
    <>
      {resource?.Type === "application" && (
        <MapField
          field={{
            ...ListenerField,
            hidden: false,
          }}
          configResource={configResource}
          qualifiedFieldName={`${configResource}#Listener`}
        />
      )}
    </>
  );
}
