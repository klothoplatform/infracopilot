import type { FC } from "react";
import React from "react";

type MarkersProps = {
  types: string[];
  uid: string;
};

const markers: { [key: string]: (uid: string) => React.JSX.Element } = {
  "arrow-closed": (uid: string) => (
    <marker
      /* eslint-disable-next-line tailwindcss/no-custom-classname */
      className="arrow-closed"
      id={`arrow-closed-${uid}`}
      viewBox="0 0 4 4"
      refX="2"
      refY="2"
      markerWidth="4"
      markerHeight="4"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 4 2 L 0 4 z" />
    </marker>
  ),
};
export const Markers: FC<MarkersProps> = ({ types, uid }) => {
  return (
    <>
      {types?.length && (
        <defs>
          {types
            .map((type) => markers[type]?.(uid))
            .filter((marker) => marker !== undefined)}
        </defs>
      )}
    </>
  );
};
