import { Sidebar } from "flowbite-react";
import type { FC } from "react";
import { useState } from "react";
import { EnvironmentsPane } from "./EnvironmentsPane";
import { ExportPane } from "./ExportPane";
import { env } from "../../../../shared/environment";
import { DocumentationPane } from "./DocumentationPane";

enum SubLayout {
  Environments = "Environments",
  Export = "Export",
  Documentation = "Documentation",
}

const subLayoutComponentMap: Record<SubLayout, FC> = {
  [SubLayout.Environments]: EnvironmentsPane,
  [SubLayout.Export]: ExportPane,
  [SubLayout.Documentation]: DocumentationPane,
};

export const ExportLayout: FC = () => {
  const [selectedSubLayout, setSelectedSubLayout] = useState<SubLayout>(
    SubLayout.Export,
  );

  const SubLayoutComponent = subLayoutComponentMap[selectedSubLayout];

  return (
    <div className="flex h-full">
      <Sidebar aria-label="export sidebar">
        <Sidebar.Items>
          <Sidebar.ItemGroup>
            {Object.values(SubLayout)
              .filter(
                (subLayout) =>
                  env.documentationEnabled ||
                  subLayout !== SubLayout.Documentation,
              )
              .map((subLayout) => {
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
