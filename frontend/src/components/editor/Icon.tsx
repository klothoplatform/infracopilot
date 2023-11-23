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
      src="/indicator_icons/error-round-icon.svg"
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
      src="/indicator_icons/exclamation-round-icon.svg"
    />
  );
};

export const UnknownIcon = (props: IconProps | undefined) => {
  return (
    <img
      height="100px"
      width="100px"
      alt="unknown"
      {...props}
      src="/indicator_icons/question-round-icon.svg"
    />
  );
};

export const NoIcon = (props: IconProps | undefined) => {
  return <></>;
};

export const HelmColor = (props: IconProps) => {
  return (
    <img
      height="100px"
      width="100px"
      alt="helm"
      {...props}
      src="/other_icons/helm-icon-color.svg"
    />
  );
};

export const HelmWhite = (props: IconProps) => {
  return (
    <img
      height="100px"
      width="100px"
      alt="helm"
      {...props}
      src="/other_icons/helm-icon-white.svg"
    />
  );
};

export const Docker = (props: IconProps) => {
  return (
    <img
      height="100px"
      width="100px"
      alt="docker"
      {...props}
      src="/other_icons/docker-icon.svg"
    />
  );
};

export const AwsLogo = (props: IconProps) => {
  return (
    <img
      height="100px"
      width="100px"
      alt="aws"
      {...props}
      src="/other_icons/aws-logo.svg"
    />
  );
};
