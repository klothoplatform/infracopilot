import ResourceAccordian from "../../components/ResourceAccordian";
import { Box } from "@mui/material";
import { Logo } from "../../components/icons/K8SLogo/Unlabeled";
import { AwsLogo, Docker } from "../../components/Icon";

export default function LeftSidebar() {
  return (
    <Box style={{ height: "100%", overflow: "hidden" }}>
      <ResourceAccordian
        name={"AWS"}
        icon={<AwsLogo width={"20px"} height={"20px"} />}
      />
      <ResourceAccordian
        name={"Kubernetes"}
        icon={<Logo width={"20px"} height={"20px"} />}
      />
      <ResourceAccordian
        name={"Docker"}
        icon={<Docker width={"20px"} height={"20px"} />}
      />
    </Box>
  );
}
