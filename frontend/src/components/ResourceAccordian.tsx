import * as React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { typeMappings } from "../shared/reactflow/ResourceMappings";
import { Card, CardContent, Typography } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";

import "./ResourceAccordian.scss";

interface DragSubmenuOptions {
  name: string;
  icon: React.ReactElement;
}

interface ResourceOption {
  provider: string;
  type: string;
  name: string;
  icon: CallableFunction;
}

export default function ResourceAccordian({ name, icon }: DragSubmenuOptions) {
  const [expanded, setExpanded] = React.useState<string | false>(false);
  const provider = name.toLowerCase();
  const mappings = typeMappings.get(provider);
  let options: ResourceOption[] = [];
  if (mappings) {
    options = Array.from(mappings.entries()).map(([type, mapping]) => {
      return {
        provider: provider,
        type: type,
        name: type
          .split("_")
          .map(
            ([firstChar, ...rest]) =>
              firstChar.toUpperCase() + rest.join("").toLowerCase()
          )
          .join(" "),
        icon: mapping instanceof Function ? mapping : mapping.nodeIcon,
      };
    });
  }
  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const onDragStart = (event: any, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Accordion
      expanded={expanded === "panel1"}
      onChange={handleChange("panel1")}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1bh-content"
        id="panel1bh-header"
      >
        <span>{icon}</span>
        <span style={{ marginLeft: "8px" }}>{name}</span>
      </AccordionSummary>
      <AccordionDetails style={{ overflow: "auto", maxHeight: "300px" }}>
        <Grid2 container spacing={1} style={{ overflowY: "scroll" }}>
          {options?.map((option: ResourceOption) => {
            return (
              <Grid2 xs={4}>
                <Card
                  variant="outlined"
                  style={{ overflowWrap: "break-word", height: "125px" }}
                  onDragStart={(event) =>
                    onDragStart(event, `${option.provider}:${option.type}`)
                  }
                  draggable
                >
                  <CardContent style={{ textAlign: "center" }}>
                    <div>
                      {
                        <option.icon
                          className="fixed-image"
                          style={{ width: "50px", height: "50px" }}
                        />
                      }
                    </div>
                    <Typography variant="resourceLabel">
                      {option.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid2>
            );
          })}
        </Grid2>
      </AccordionDetails>
    </Accordion>
  );
}
