import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { CloudCCLib, Resource, ResourceKey } from "../deploylib";

export interface CloudfrontDistribution {
  Id: string;
  Origins: ResourceKey[];
  DefaultRootObject: string;
}

interface TargetOrigin {
  type?: Resource.static_unit | Resource.gateway;
  id?: string;
}

export class Cloudfront {
  constructor(
    lib: CloudCCLib,
    cloudfrontDistributions: CloudfrontDistribution[],
  ) {
    for (const dist of cloudfrontDistributions) {
      const origins: aws.types.input.cloudfront.DistributionOrigin[] = [];
      let targetOrigin: TargetOrigin = {};
      const indexDocument =
        dist.DefaultRootObject == "" ? undefined : dist.DefaultRootObject;
      for (const origin of dist.Origins) {
        if (origin.Kind == Resource.gateway) {
          origins.push(
            this.createCustomOrigin(
              origin.Name,
              lib.gatewayToUrl.get(origin.Name)!,
            ),
          );
          if (!targetOrigin.id) {
            targetOrigin = {
              type: Resource.gateway,
              id: origin.Name,
            };
          }
        } else if (origin.Kind == Resource.static_unit) {
          const bucket = lib.siteBuckets.get(origin.Name)!;
          origins.push(this.createS3Origin(origin.Name, bucket));
          targetOrigin = {
            type: Resource.static_unit,
            id: origin.Name,
          };
        }
      }
      this.createDistribution(dist.Id, origins, targetOrigin, indexDocument);
    }
  }

  createCustomOrigin(
    name: string,
    domainName: pulumi.Output<string>,
  ): aws.types.input.cloudfront.DistributionOrigin {
    const origin: aws.types.input.cloudfront.DistributionOrigin = {
      originId: name,
      customOriginConfig: {
        httpPort: 80,
        httpsPort: 443,
        originProtocolPolicy: "https-only",
        originSslProtocols: ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2"],
      },
      domainName: domainName.apply((d) => d.split("//")[1].split("/")[0]),
      originPath: domainName.apply((d) => "/" + d.split("//")[1].split("/")[1]),
    };
    return origin;
  }

  createS3Origin(
    name: string,
    siteBucket: aws.s3.Bucket,
  ): aws.types.input.cloudfront.DistributionOrigin {
    const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity(
      `${siteBucket}-originAccessIdentity`,
      {
        comment: "this is needed to setup s3 polices and make s3 not public.",
      },
    );

    new aws.s3.BucketPolicy("bucketPolicy", {
      bucket: siteBucket.id, // refer to the bucket created earlier
      policy: pulumi
        .all([originAccessIdentity.iamArn, siteBucket.arn])
        .apply(([oaiArn, bucketArn]) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: oaiArn,
                }, // Only allow Cloudfront read access.
                Action: ["s3:GetObject"],
                Resource: [`${bucketArn}/*`], // Give Cloudfront access to the entire bucket.
              },
            ],
          }),
        ),
    });

    const origin = {
      domainName: siteBucket.bucketRegionalDomainName,
      originId: name,
      s3OriginConfig: {
        originAccessIdentity: originAccessIdentity.cloudfrontAccessIdentityPath,
      },
    };

    return origin;
  }

  createDistribution(
    name,
    origins,
    targetOrigin: TargetOrigin,
    indexDocument?,
  ): aws.cloudfront.Distribution {
    let defaultTtl = 3600;
    if (targetOrigin.type == Resource.gateway) {
      defaultTtl = 0;
    }

    const distribution = new aws.cloudfront.Distribution(name, {
      origins,
      enabled: true,
      defaultCacheBehavior: {
        allowedMethods: [
          "DELETE",
          "GET",
          "HEAD",
          "OPTIONS",
          "PATCH",
          "POST",
          "PUT",
        ],
        cachedMethods: ["HEAD", "GET"],
        targetOriginId: targetOrigin.id!,
        forwardedValues: {
          queryString: true,
          cookies: {
            forward: "none",
          },
        },
        viewerProtocolPolicy: "redirect-to-https",
        minTtl: 0,
        defaultTtl,
        maxTtl: 86400,
      },
      restrictions: {
        geoRestriction: {
          restrictionType: "none",
        },
      },
      defaultRootObject: indexDocument,
      /* CUSTOM CONFIGURATION START */
      viewerCertificate: {
        minimumProtocolVersion: "TLSv1.2_2021",
        sslSupportMethod: "sni-only",
        cloudfrontDefaultCertificate: process.env.STAGE !== "dev",
        acmCertificateArn:
          process.env.STAGE === "dev"
            ? "arn:aws:acm:us-east-1:338991950301:certificate/7dd16501-4926-4db3-95f8-fdb0f955d3ee"
            : undefined,
      },
      aliases:
        process.env.STAGE === "dev" ? ["app.infracopilot.io"] : undefined,

      customErrorResponses: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: "/index.html",
        },
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: "/index.html",
        },
      ],
      orderedCacheBehaviors: [
        {
          pathPattern: "/architecture**",
          allowedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
            "PATCH",
            "POST",
            "PUT",
            "DELETE",
          ],
          cachedMethods: ["HEAD", "GET"],
          cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // Managed-CachingDisabled
          originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac", // Managed-AllViewerExceptHostHeader
          targetOriginId: "myapi",
          compress: false,
          viewerProtocolPolicy: "redirect-to-https",
        },
      ],
      /* CUSTOM CONFIGURATION END */
    });
    return distribution;
  }
}
