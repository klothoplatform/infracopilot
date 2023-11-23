import { NodeId } from "../../shared/architecture/TopologyNode";

export const distribution = {
  id: NodeId.parse("aws:cloudfront_distribution:my-distribution"),
  CloudfrontDefaultCertificate: true,
  DefaultCacheBehavior: {
    AllowedMethods: ["GET", "HEAD"],
    CachedMethods: ["GET", "HEAD"],
    Compress: true,
    ForwardedValues: {
      Cookies: {
        Forward: "none",
      },
      QueryString: false,
    },
    TargetOriginId: "my-bucket",
    ViewerProtocolPolicy: "redirect-to-https",
  },
};
export const lambdaFunction = {
  id: NodeId.parse("aws:lambda_function:my-function"),
  EnvironmentVariables: {
    MY_VAR: "my-value",
    MY_VAR2: "my-value2",
  },
  Image: "my-image",

  Memory: 128,
};
