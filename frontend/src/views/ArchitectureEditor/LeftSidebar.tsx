import ResourceAccordion from "../../components/ResourceAccordion";
import { Logo } from "../../components/icons/K8SLogo/Unlabeled";
import { AwsLogo, Docker } from "../../components/Icon";

export default function LeftSidebar() {
  return (
    <div className={"w-max"}>
      <ResourceAccordion
        name={"AWS"}
        icon={<AwsLogo width={"20px"} height={"20px"} />}
      />
      <ResourceAccordion
        name={"Kubernetes"}
        icon={<Logo width={"20px"} height={"20px"} />}
      />
      <ResourceAccordion
        name={"Docker"}
        icon={<Docker width={"20px"} height={"20px"} />}
      />
    </div>
  );
}
