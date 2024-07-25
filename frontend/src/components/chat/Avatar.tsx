import type { CustomAvatarOptions } from "@azure/communication-react";
import React from "react";
import useApplicationStore from "../../pages/store/ApplicationStore.ts";
import { Persona, PersonaSize } from "@fluentui/react";

interface AvatarProps {
  userId?: string;
  renderOptions?: CustomAvatarOptions;
  defaultOnRenderAvatar?: (options: CustomAvatarOptions) => React.JSX.Element;
}

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  renderOptions,
  defaultOnRenderAvatar,
}) => {
  const { user } = useApplicationStore();
  if (userId === "assistant") {
    return (
      <Persona
        size={PersonaSize.size32}
        hidePersonaDetails
        text={"Alfred"}
        imageUrl={`/images/al.svg`}
        showOverflowTooltip={false}
      />
    );
  }

  if (userId === "user") {
    return (
      <Persona
        size={PersonaSize.size32}
        hidePersonaDetails
        text={
          user?.displayName ||
          user?.name ||
          user?.nickname ||
          user?.preferred_username ||
          user?.given_name ||
          "User"
        }
        imageUrl={user?.picture}
        showOverflowTooltip={false}
      />
    );
  }

  return defaultOnRenderAvatar && renderOptions ? (
    defaultOnRenderAvatar(renderOptions)
  ) : (
    <></>
  );
};
