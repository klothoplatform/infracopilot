import { NodeId } from "../architecture/TopologyNode";
import { ApplicationError } from "../errors";
import { isObject } from "../object-util";

export interface ConfigurationError  {
    resource: NodeId
    property: string
    value?: any
    error: string
}


export const parseConfigurationErrors = (errors: any): ConfigurationError[] => {
    return errors.map((error: any) => {
        return {
            resource: NodeId.fromTopologyId(error.resource),
            property: error.property,
            value: error.value,
            error: error.error
        }
    })
}

