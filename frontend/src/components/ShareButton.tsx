import { Button } from "flowbite-react";
import type { FC } from "react";
import React, { useState } from "react";
import type { Architecture } from "../shared/architecture/Architecture";
import type { User } from "@auth0/auth0-react";
import { FaBuildingLock, FaUserPlus } from "react-icons/fa6";
import { FaGlobeAmericas } from "react-icons/fa";
import { MdOutlineLock } from "react-icons/md";
import { AccessModal, actionMap } from "./AccessModal";
import type { ArchitectureAccess } from "../shared/architecture/Access";
import {
  ArchitectureRole,
  GeneralAccess,
  publicUserId,
} from "../shared/architecture/Access";
import { Tooltip } from "./Tooltip";

export const ShareButton: FC<{
  user?: User;
  architecture: Architecture;
  access?: ArchitectureAccess;
  small?: boolean;
}> = ({ user, architecture, access, small }) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    setShowModal(true);
  };

  let IconComponent = MdOutlineLock;
  let color = "light";

  if (access?.generalAccess.type === GeneralAccess.Public) {
    IconComponent = FaGlobeAmericas;
    color = "success";
  } else if (access?.generalAccess.type === GeneralAccess.Organization) {
    IconComponent = FaBuildingLock;
    color = "blue";
  }

  return (
    <>
      <Tooltip
        trigger={access?.generalAccess ? "hover" : undefined}
        content={<GeneralAccessTooltipContent access={access} />}
        placement={"bottom"}
        disabled={!access?.generalAccess}
      >
        <Button size={"sm"} color={color} onClick={handleClick} pill>
          {!small && (
            <>
              <IconComponent />
              <span className="ml-2">Share</span>
            </>
          )}
          {small && <FaUserPlus size={20} />}
        </Button>
        {showModal && (
          <AccessModal
            user={user}
            architecture={architecture}
            show={showModal}
            onClose={() => setShowModal(false)}
            readonly={!access?.canShare}
          />
        )}
      </Tooltip>
    </>
  );
};

const GeneralAccessTooltipContent: FC<{
  access?: ArchitectureAccess;
}> = ({ access }) => {
  if (!access) {
    return <></>;
  }

  // TODO: make this the actual org name
  const mockOrganization = "Klotho";

  const peopleCount = access.entities.filter(
    (e) =>
      e.type !== "organization" &&
      e.id !== publicUserId &&
      e.role !== ArchitectureRole.Owner,
  ).length;

  const options = {
    public: {
      label: "Public on the internet",
      description: `Anyone with the link can ${
        actionMap[access.generalAccess.entity?.role ?? ""] ?? "open"
      }`,
    },
    organization: {
      label: `${mockOrganization} organization`,
      description: `Anyone in the ${mockOrganization} organization can ${
        actionMap[access.generalAccess.entity?.role ?? ""] ?? "open"
      } with the link`,
    },
    restricted: {
      description: peopleCount
        ? `Shared with ${peopleCount} ${
            peopleCount === 1 ? "person" : "people"
          }`
        : "Private to only me",
    },
  } as any;

  const selectedType = options[access.generalAccess.type];

  return (
    <>
      {!!selectedType && (
        <div className={"max-w-[12rem] text-xs font-normal"}>
          {!!selectedType.label && (
            <p className="leading-6">{selectedType.label}</p>
          )}
          <p>{selectedType.description}</p>
        </div>
      )}
    </>
  );
};
