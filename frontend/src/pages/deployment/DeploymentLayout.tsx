import { Sidebar } from "flowbite-react";
import type { FC } from "react";
import { useState } from "react";
import { StacksPage } from "./StacksPage";
import { StackDetailsPage } from "./StackDetailsPage";
import DeploymentPage from "./DeploymentPage";

enum SubLayout {
  Stacks = "Stacks",
  Details = "Details",
  Deployment = "Deployment",
}

const subLayoutComponentMap: Record<SubLayout, FC> = {
  [SubLayout.Stacks]: StacksPage,
  [SubLayout.Details]: StackDetailsPage,
  [SubLayout.Deployment]: DeploymentPage,
};

export const DeploymentLayout: FC = () => {
  const [selectedSubLayout, setSelectedSubLayout] = useState<SubLayout>(
    SubLayout.Stacks,
  );

  const SubLayoutComponent = subLayoutComponentMap[selectedSubLayout];

  return (
    <div className="flex h-full">
      <Sidebar aria-label="export sidebar">
        <Sidebar.Items>
          <Sidebar.ItemGroup>
            {Object.values(SubLayout).map((subLayout) => {
              return (
                <Sidebar.Item
                  key={subLayout}
                  active={selectedSubLayout === subLayout}
                  onClick={() => setSelectedSubLayout(subLayout)}
                >
                  {subLayout}
                </Sidebar.Item>
              );
            })}
          </Sidebar.ItemGroup>
        </Sidebar.Items>
      </Sidebar>
      <SubLayoutComponent />
    </div>
  );
};
