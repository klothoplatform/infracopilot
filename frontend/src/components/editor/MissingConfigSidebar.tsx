import { type FC, useEffect, useRef } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import classNames from "classnames";
import { type CustomFlowbiteTheme, Tabs, type TabsRef, Tooltip } from "flowbite-react";
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
import { type Constraint, ConstraintScope, type ResourceConstraint } from "../../shared/architecture/Constraints";
import { getEnvironmentConstraints } from "../../api/GetEnvironmentConstraints";



interface DetailsSidebarProps {
    hidden?: boolean;
  }
  
export const MissingConfigSidebar: FC<DetailsSidebarProps> = ({
    hidden,
  }: DetailsSidebarProps) => {
    const {
      environmentVersion,
      navigateBackRightSidebar,
      navigateForwardRightSidebar,
      editorSidebarState,
      rightSidebarSelector,
      selectedResource,
    } = useApplicationStore();

  
  
    return (
      <div
        className={classNames("flex flex-col h-full w-full overflow-hidden", {
          hidden: hidden,
        })}
      >
        <div className="flex h-10 w-full shrink-0 grow-0 items-baseline justify-between border-b-[1px] p-2 dark:border-gray-700">
          <h2 className={"text-md font-medium dark:text-white"}>Missing Config</h2>
          </div>
        <ErrorBoundary
          onError={(error, info) =>
            trackError(
              new UIError({
                message: "uncaught error in EditorSidebarRight",
                errorId: "EditorSidebarRight:ErrorBoundary",
                cause: error,
                data: { info },
              }),
            )
          }
          fallbackRender={FallbackRenderer}
        >
          <div className="flex h-full min-h-0 w-full flex-col justify-between p-2">
            <Details />
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
  
  const Details: FC = function () {
    const tabsRef = useRef<TabsRef>(null);
    const {
      rightSidebarSelector,
      navigateRightSidebar,
      environmentVersion,
      resourceTypeKB,
      architecture,
      currentIdToken,
      unappliedConstraints,
    } = useApplicationStore();

    const [promotedProperties, setPromotedProperties] = React.useState<
      Map<string, Property[]> | undefined
    >();
    const [remainingProperties, setRemainingProperties] = React.useState<
      Property[] | undefined
    >();    

    const [isLoadingConstraints, setIsLoadingConstraints] = React.useState<boolean>(false);
    const [loadedConstraints, setLoadedConstraints] = React.useState<boolean>(false);
    const [constraints, setConstraints] = React.useState<ResourceConstraint[]>([]);

    useEffect(() => {
      if (!isLoadingConstraints && !loadedConstraints && architecture.id != undefined && environmentVersion.id != undefined) {
        setIsLoadingConstraints(true);
        getEnvironmentConstraints(architecture.id, environmentVersion.id, currentIdToken.idToken).then((constraints) => {
          const resourceConstraints = constraints.filter((constraint) => constraint.scope === ConstraintScope.Resource) as ResourceConstraint[];
          setConstraints(resourceConstraints);
          setLoadedConstraints(true);
          setIsLoadingConstraints(false);
        });
      }
    }, [isLoadingConstraints, loadedConstraints, constraints, architecture, environmentVersion, currentIdToken, unappliedConstraints]);


    useEffect(() => {
      tabsRef.current?.setActiveTab(rightSidebarSelector[1]);
    }, [rightSidebarSelector]);

    useEffect(() => {
      if (environmentVersion.config_errors?.length > 0 && rightSidebarSelector[1] == 0) {
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
        setPromotedProperties(configErrorsMap);
      }
    }, [environmentVersion.config_errors, resourceTypeKB, rightSidebarSelector[1], unappliedConstraints]);

    useEffect(() => {
      if (rightSidebarSelector[1] == 1) {
        const constraintsPropertyMap = new Map<string, Property[]>();
        constraints.forEach((constraint) => {
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
        setPromotedProperties(constraintsPropertyMap);
      }
    }, [isLoadingConstraints, loadedConstraints, constraints, architecture, environmentVersion, rightSidebarSelector[1], unappliedConstraints]);

  
    return (
      <Tabs.Group
        theme={detailsTabsTheme}
        aria-label="Architecture Actions"
        /* eslint-disable-next-line react/style-prop-object */
        style={"fullWidth"}
        ref={tabsRef}
        onActiveTabChange={(tab) => {
          if (tab === rightSidebarSelector[1]) {
            return;
          }
          navigateRightSidebar([
            rightSidebarSelector[0],
            RightSidebarDetailsTab[
              RightSidebarDetailsTab[tab] as keyof typeof RightSidebarDetailsTab
            ],
          ]);
        }}
      >
        <Tabs.Item
          className="col flex h-full min-h-0"
          active
          title="Missing Config"
          icon={HiCog6Tooth}
        >
          <div className="flex h-full min-h-0 flex-col">
            {environmentVersion.config_errors?.length > 0 ? (
              <ConfigForm 
                key={`config-table-missing`}
                promotedProperties={promotedProperties}
                remainingProperties={remainingProperties}
                />
            ): 
            <div className="flex h-full min-h-0 flex-col">
              <h2 className={"text-md font-medium dark:text-white"}>No Missing Config</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All resources have been configured
              </p>
            </div>
            }
          </div>
        </Tabs.Item>
        <Tabs.Item title="Previously Set">
          <ConfigForm 
            key={`config-table-constraints`}
            promotedProperties={promotedProperties}
            remainingProperties={remainingProperties}
          />
        </Tabs.Item>
      </Tabs.Group>
    );
  };
