import { Tabs } from "flowbite-react";
import type { FC } from "react";
import React from "react";
import { EditorLayout } from "../../shared/EditorViewSettings";
import useApplicationStore from "../store/ApplicationStore";

export const LayoutSelector: FC = () => {
  const tabItems = Object.values(EditorLayout);

  const { viewSettings, updateViewSettings } = useApplicationStore();
  const onActiveTabChange = (tab: EditorLayout) => {
    updateViewSettings({ layout: tab });
  };

  return (
    <div className="w-fit min-w-fit">
      <Tabs.Group
        theme={{
          tabpanel: "",
          tablist: {
            styles: {
              underline: "flex-no-wrap -mb-px",
            },
            tabitem: {
              base: "text-primary-500 dark:text-primary-300 flex items-center justify-center p-2 text-sm font-medium first:ml-0 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500 focus:outline-none",
              styles: {
                underline: {
                  base: "",
                  active: {
                    on: "text-primary-600 border-b-2 border-primary-600 active dark:border-primary-500",
                    off: "border-b-2 border-transparent hover:border-primary-300 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300",
                  },
                },
              },
            },
          },
        }}
        aria-label="Editor layout selection menu"
        // eslint-disable-next-line react/style-prop-object
        style={"underline"}
        onActiveTabChange={(activeTab) => {
          onActiveTabChange(tabItems[activeTab]);
        }}
      >
        {tabItems.map((option, index) => {
          return (
            <Tabs.Item
              key={index}
              active={option === viewSettings?.layout}
              title={option}
            />
          );
        })}
      </Tabs.Group>
    </div>
  );
};
