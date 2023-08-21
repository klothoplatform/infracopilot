import React from "react";

export interface IconProps
  extends Omit<
    React.DetailedHTMLProps<
      React.ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >,
    "src" | "srcSet"
  > {}

export const ErrorIcon = (props: IconProps) => {
  return (
    <img
      height="24px"
      width="24px"
      alt="error"
      {...props}
      src="indicator_icons/error-round-icon.svg"
    />
  );
};

export const WarningIcon = (props: IconProps) => {
  return (
    <img
      height="24px"
      width="24px"
      alt="warning"
      {...props}
      src="indicator_icons/exclamation-round-icon.svg"
    />
  );
};

export const UnknownIcon = (props: IconProps | undefined) => {
  return (
    <div style={{ background: "gray" }} {...props}>
      Unknown Icon
    </div>
  );
};

export const NoIcon = (props: IconProps | undefined) => {
  return <></>;
};

export const Helm = (props: IconProps) => {
  return (
    <img
      src="other_icons/helm-icon-color.svg"
      height="100px"
      width="100px"
      alt="helm"
    />
  );
};

export const Docker = (props: IconProps) => {
  return (
    <img
      src="other_icons/docker-icon.svg"
      height="100px"
      width="100px"
      alt="docker"
    />
  );
};
