import { type FC, useEffect, useRef } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import classNames from "classnames";
import {
  type CustomFlowbiteTheme,
  Tabs,
  type TabsRef,
  Tooltip,
} from "flowbite-react";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import { RightSidebarDetailsTab } from "../../shared/sidebar-nav";
import { HiCog6Tooth } from "react-icons/hi2";
import ConfigForm from "./ConfigForm";
import { type Property } from "../../shared/resources/ResourceTypes";
import React from "react";
import { resourceProperties } from "../../shared/architecture/EnvironmentVersion";
import {
  type Constraint,
  ConstraintScope,
  type ResourceConstraint,
} from "../../shared/architecture/Constraints";
import { getEnvironmentConstraints } from "../../api/GetEnvironmentConstraints";

interface DetailsSidebarProps {
  hidden?: boolean;
  setWarnMissingProperties: (missing: boolean) => void;
}

export const ModifiedConfigSidebar: FC<DetailsSidebarProps> = ({
  hidden,
  setWarnMissingProperties,
}: DetailsSidebarProps) => {
  return (
    <div
      className={classNames("flex flex-col h-full w-full overflow-hidden", {
        hidden: hidden,
      })}
    >
      <div className="flex h-10 w-full shrink-0 grow-0 items-baseline justify-between border-b-[1px] p-2 dark:border-gray-700">
        <h2 className={"text-md font-medium dark:text-white"}>
          Modified Properties
        </h2>
      </div>
      <ErrorBoundary
        onError={(error, info) =>
          trackError(
            new UIError({
              message: "uncaught error in ModifiedConfigSidebar",
              errorId: "ModifiedConfigSidebar:ErrorBoundary",
              cause: error,
              data: { info },
            }),
          )
        }
        fallbackRender={FallbackRenderer}
      >
        <div className="flex h-full min-h-0 w-full flex-col justify-between p-2">
          <Details setWarnMissingProperties={setWarnMissingProperties} />
        </div>
      </ErrorBoundary>
    </div>
  );
};

const detailsTabsTheme: CustomFlowbiteTheme["tab"] = {
  base: "flex flex-col gap-2 min-h-0 h-full",
  tablist: {
    base: "max-h-12 bg-transparent",
    tabitem: {
      styles: {
        fullWidth: {
          base: "rounded-t-lg max-h-12 focus:ring-primary-300",
          active: {
            on: "bg-primary-600 text-white dark:bg-primary-700 dark:white active:border-primary-300",
            off: "text-gray-500 hover:bg-gray-50 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300",
          },
        },
      },
    },
  },
  tabitemcontainer: {
    base: "flex flex-col min-h-0 h-full",
  },
  tabpanel: "max-h-full min-h-0 h-full",
};

interface DetailsProps {
  setWarnMissingProperties: (missing: boolean) => void;
}

const Details: FC<DetailsProps> = function ({
  setWarnMissingProperties,
}) {
  const {
    environmentVersion,
    resourceTypeKB,
    architecture,
    currentIdToken,
    unappliedConstraints,
  } = useApplicationStore();


  const [missingProperties, setMissingProperties] = React.useState<
    Map<string, Property[]>
  >(new Map<string, Property[]>());
  const [modifiedProperties, setModifiedProperties] = React.useState<
    Map<string, Property[]>
  >(new Map<string, Property[]>());

  const [isLoadingConstraints, setIsLoadingConstraints] =
    React.useState<boolean>(false);

  console.log("rendering modified config details",
  isLoadingConstraints,
  architecture,
  environmentVersion,
  currentIdToken,
  unappliedConstraints,
  environmentVersion.config_errors, resourceTypeKB
  )
  useEffect(() => {
    if (
      !isLoadingConstraints &&
      architecture.id != undefined &&
      environmentVersion.id != undefined
    ) {
      setIsLoadingConstraints(true);
      getEnvironmentConstraints(
        architecture.id,
        environmentVersion.id,
        currentIdToken.idToken,
      ).then((constraints): void => {
        const resourceConstraints = constraints.filter(
          (constraint) => constraint.scope === ConstraintScope.Resource,
        ) as ResourceConstraint[];

        const constraintsPropertyMap = new Map<string, Property[]>();
        resourceConstraints.forEach((constraint) => {
      const allProperties = resourceProperties(
        environmentVersion,
        resourceTypeKB,
        constraint.target,
      );
      for (const [resourceId, properties] of allProperties) {
        properties.forEach((property) => {
          if (property.name === constraint.property) {
            if (constraintsPropertyMap.has(resourceId.toString())) {
              constraintsPropertyMap.get(resourceId.toString())?.push(property);
            } else {
              constraintsPropertyMap.set(resourceId.toString(), [property]);
            }
          }
        });
      }
    });
      setModifiedProperties(constraintsPropertyMap);
        setIsLoadingConstraints(false);
      });
    }
  }, [
    architecture,
    environmentVersion,
    unappliedConstraints,
  ]);

  useEffect(() => {
    if (environmentVersion.config_errors?.length > 0) {
      const configErrors = environmentVersion.config_errors;
      const configErrorsMap = new Map<string, Property[]>();
      configErrors.forEach((configError) => {
        const allProperties = resourceProperties(
          environmentVersion,
          resourceTypeKB,
          configError.resource,
        );
        for (const [resourceId, properties] of allProperties) {
          properties.forEach((property) => {
            if (property.hidden || property.configurationDisabled || property.deployTime) {
              return;
            }
            if (property.name === configError.property) {
              if (configErrorsMap.has(resourceId.toString())) {
                configErrorsMap.get(resourceId.toString())?.push(property);
              } else {
                configErrorsMap.set(resourceId.toString(), [property]);
              }
            }
          });
        }
      });
      setMissingProperties(configErrorsMap);
      if (configErrorsMap.size > 0) {
        setWarnMissingProperties(true);
      }

    } else {
      setMissingProperties(new Map<string, Property[]>());
      setWarnMissingProperties(false);
    }
  }, [environmentVersion.config_errors, resourceTypeKB, unappliedConstraints]);


  const sections = []
  if (missingProperties.size > 0) {
    sections.push({
      title: "Missing Properties",
      propertyMap: missingProperties,
    })
  }
  if (modifiedProperties.size > 0) {
    sections.push({
      title: "Modified Properties",
      propertyMap: modifiedProperties,
    })
  }


  return (
    <div className="flex h-full min-h-0 flex-col">
          <ConfigForm
            key={`config-table-missing`}
            sections={sections}
          />      
    </div>
  );
};
