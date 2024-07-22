import type { Mention } from "@azure/communication-react";
import React from "react";
import { MentionType } from "./MentionType.ts";
import { ExplanationMention, ResourceMention } from "./Mentions.tsx";

type MentionRenderer = (mention: Mention) => React.JSX.Element;

const mentionMappings: Record<MentionType, React.FC<any>> = {
  [MentionType.Resource]: ResourceMention,
  [MentionType.Explain]: ExplanationMention,
};

export const DefaultMentionRenderer = (
  mention: Mention,
  defaultOnMentionRender: MentionRenderer,
) => {
  let [type, id]: [MentionType, string] = mention.id.split("#") as any;

  const MentionComponent = mentionMappings[type];
  if (MentionComponent) {
    return (
      <MentionComponent
        key={Math.random().toString()}
        mention={mention}
        id={id}
      />
    );
  }
  return defaultOnMentionRender(mention);
};
