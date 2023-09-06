import type { IconProps } from "../../components/Icon";
import {
  Docker,
  ErrorIcon,
  Helm,
  NoIcon,
  UnknownIcon,
  WarningIcon,
} from "../../components/Icon";
import {
  AwsIdentityAccessManagementAwsSts,
  AwsIdentityAccessManagementPermissions,
  AwsIdentityAccessManagementRole,
} from "../../components/icons/AwsResource/SecurityIdentityCompliance";
import {
  AmazonEc2Ami,
  AmazonEc2ElasticIpAddress,
  AmazonEc2Instance,
  AwsLambdaLambdaFunction,
} from "../../components/icons/AwsResource/Compute";
import {
  AmazonApiGateway,
  AmazonSimpleNotificationService,
  AmazonSimpleQueueService,
} from "../../components/icons/AwsArchitectureService/AppIntegration";
import {
  AmazonApiGatewayEndpoint,
  AmazonSimpleNotificationServiceTopic,
  AmazonSimpleQueueServiceQueue,
} from "../../components/icons/AwsResource/ApplicationIntegration";
import {
  AmazonEc2,
  AwsAppRunner,
} from "../../components/icons/AwsArchitectureService/Compute";
import {
  AmazonCloudFrontDownloadDistribution,
  AmazonRoute_53HostedZone,
  AmazonRoute_53ReadinessChecks,
  AmazonRoute_53RouteTable,
  AmazonVpcCustomerGateway,
  AmazonVpcElasticNetworkInterface,
  AmazonVpcInternetGateway,
  AmazonVpcNatGateway,
  AmazonVpcVirtualPrivateCloudVpc,
  ElasticLoadBalancingNetworkLoadBalancer,
} from "../../components/icons/AwsResource/NetworkingContentDelivery";
import {
  AmazonCloudFront,
  AmazonRoute_53,
  AmazonVirtualPrivateCloud,
  ElasticLoadBalancing,
} from "../../components/icons/AwsArchitectureService/NetworkingContentDelivery";
import {
  AmazonAuroraAmazonRdsInstance,
  AmazonAuroraInstance,
  AmazonAuroraMariaDbInstance,
  AmazonAuroraMySqlInstance,
  AmazonAuroraOracleInstance,
  AmazonAuroraPostgreSqlInstance,
  AmazonAuroraSqlServerInstance,
  AmazonDynamoDbTable,
  AmazonElastiCacheElastiCacheForRedis,
  AmazonRdsProxyInstance,
} from "../../components/icons/AwsResource/Database";
import {
  AmazonElasticContainerRegistryImage,
  AmazonElasticContainerRegistryRegistry,
  AmazonElasticContainerServiceService,
  AmazonElasticContainerServiceTask,
} from "../../components/icons/AwsResource/Containers";
import {
  AmazonElasticContainerService,
  AmazonElasticKubernetesService,
  AwsFargate,
} from "../../components/icons/AwsArchitectureService/Containers";
import {
  AmazonElastiCache,
  AmazonRds,
} from "../../components/icons/AwsArchitectureService/Database";
import {
  AwsIdentityAndAccessManagement,
  AwsKeyManagementService,
  AwsSecretsManager,
} from "../../components/icons/AwsArchitectureService/SecurityIdentityCompliance";
import { AmazonKinesis } from "../../components/icons/AwsArchitectureService/Analytics";
import { AmazonCloudWatchLogs } from "../../components/icons/AwsResource/ManagementGovernance";
import {
  AmazonElasticFileSystemFileSystem,
  AmazonSimpleStorageServiceBucket,
  AmazonSimpleStorageServiceObject,
} from "../../components/icons/AwsResource/Storage";
import {
  AmazonEfs,
  AmazonSimpleStorageService,
} from "../../components/icons/AwsArchitectureService/Storage";
import type React from "react";
import { PublicSubnet } from "../../components/icons/AwsCustom/PublicSubnet";
import { PrivateSubnet } from "../../components/icons/AwsCustom/PrivateSubnet";
import type { TopologyNodeData } from "../architecture/TopologyNode";
import type {
  RdsInstanceData,
  SubnetData,
} from "../architecture/TopologyMetadata";
import { LogoWithBorder } from "../../components/icons/K8SLogo/Unlabeled";
import {
  Deploy,
  Pod,
  Pv,
  Pvc,
  Rs,
  Sa,
  Sc,
  Svc,
} from "../../components/icons/K8SResources/Unlabeled";
import { AmazonSimpleEmailService } from "../../components/icons/AwsArchitectureService/BusinessApplications";

type Discriminator = <T extends TopologyNodeData>(n: T) => string;

export interface IconMapping {
  marginLeft?: string;
  marginTop?: string;
  nodeIcon: CallableFunction;
  groupIcon?: CallableFunction;
  groupStyle?: Partial<React.CSSProperties>;
  groupIconStyle?: Partial<React.CSSProperties>;
  variants?: Map<String, IconMapping>;
  discriminator?: Discriminator;
}

const AWS_COMPUTE_PRIMARY_COLOR = "#ED7100";
const AWS_NETWORKING_PRIMARY_COLOR = "#8C4FFF";
const AWS_STORAGE_PRIMARY_COLOR = "#7AA116";

const kubernetesDefaults: Partial<IconMapping> = {
  nodeIcon: LogoWithBorder,
  marginLeft: "2px",
  marginTop: "2px",
  groupStyle: {
    borderColor: "#326ce5",
  },
  groupIconStyle: {
    marginLeft: "2px",
    marginTop: "2px",
  },
};

export const typeMappings = new Map<
  string,
  Map<string, CallableFunction | IconMapping>
>([
  [
    "indicators",
    new Map<string, CallableFunction | IconMapping>([
      ["error", ErrorIcon],
      ["warning", WarningIcon],
    ]),
  ],
  [
    "aws",
    new Map<string, CallableFunction | IconMapping>([
      ["account_id", AwsIdentityAccessManagementAwsSts],
      ["ami", AmazonEc2Ami],
      ["api_deployment", AmazonApiGateway],
      ["api_integration", AmazonApiGatewayEndpoint],
      ["api_method", AmazonApiGatewayEndpoint],
      ["api_resource", AmazonApiGatewayEndpoint],
      ["api_stage", AmazonApiGateway],
      ["app_runner_service", AwsAppRunner],
      ["availability_zones", AmazonEc2],
      ["cloudfront_distribution", AmazonCloudFrontDownloadDistribution],
      ["cloudfront_origin_access_identity", AmazonCloudFront],
      ["dynamodb_table", AmazonDynamoDbTable],
      ["ecr_image", AmazonElasticContainerRegistryImage],
      ["ecr_repo", AmazonElasticContainerRegistryRegistry],
      [
        "ec2_instance",
        {
          groupStyle: { borderColor: AWS_COMPUTE_PRIMARY_COLOR },
          nodeIcon: AmazonEc2Instance,
        },
      ],
      [
        "ecs_cluster",
        {
          nodeIcon: AmazonElasticContainerService,
          groupStyle: {
            borderColor: AWS_COMPUTE_PRIMARY_COLOR,
          },
        },
      ],
      ["ecs_service", AmazonElasticContainerServiceService],
      ["ecs_task_definition", AmazonElasticContainerServiceTask],
      [
        "efs_file_system",
        {
          nodeIcon: AmazonElasticFileSystemFileSystem,
          groupStyle: {
            borderColor: AWS_STORAGE_PRIMARY_COLOR,
          },
          groupIcon: AmazonEfs,
        },
      ],
      ["efs_mount_target", AmazonEfs],
      ["efs_access_point", AmazonEfs],
      ["eks_addon", AmazonElasticKubernetesService],
      [
        "eks_cluster",
        {
          nodeIcon: AmazonElasticKubernetesService,
          groupStyle: {
            borderColor: AWS_COMPUTE_PRIMARY_COLOR,
          },
        },
      ],
      [
        "eks_fargate_profile",
        {
          nodeIcon: AwsFargate,
          groupStyle: {
            backgroundColor: "#e5e6eb",
            color: "#232f3e",
            textAlign: "center",
            borderColor: "#e5e6eb",
          },
          groupIcon: NoIcon,
        },
      ],
      ["eks_node_group", AmazonElasticKubernetesService],
      ["elastic_ip", AmazonEc2ElasticIpAddress],
      ["elasticache_cluster", AmazonElastiCacheElastiCacheForRedis], // we should probably change this if we add support for memcached
      ["elasticache_subnet_group", AmazonElastiCache],
      ["iam_oidc_provider", AwsIdentityAndAccessManagement],
      ["iam_policy", AwsIdentityAccessManagementPermissions],
      ["iam_role", AwsIdentityAccessManagementRole],
      ["iam_instance_profile", AwsIdentityAndAccessManagement],
      ["internet_gateway", AmazonVpcInternetGateway],
      ["kinesis_stream", AmazonKinesis],
      ["kms_key", AwsKeyManagementService],
      ["kms_replica_key", AwsKeyManagementService],
      ["kubeconfig", AmazonElasticKubernetesService],
      ["kustomize_directory", AmazonElasticKubernetesService],
      ["lambda_function", AwsLambdaLambdaFunction],
      ["lambda_permission", AwsLambdaLambdaFunction],
      ["load_balancer", ElasticLoadBalancingNetworkLoadBalancer], // TODO: add differentiation for ALB and NLB
      ["load_balancer_listener", ElasticLoadBalancing],
      ["log_group", AmazonCloudWatchLogs],
      ["nat_gateway", AmazonVpcNatGateway],
      ["private_dns_namespace", AmazonElasticContainerService],
      ["rds", AmazonRds],
      [
        "rds_instance",
        {
          nodeIcon: AmazonAuroraAmazonRdsInstance,
          discriminator: (n: RdsInstanceData) => {
            const engine = n?.engine?.toLowerCase();
            if (engine?.startsWith("aurora")) {
              return "aurora";
            }
            if (engine?.includes("mysql")) {
              return "mysql";
            }
            if (engine?.includes("postgres")) {
              return "postgres";
            }
            if (engine?.includes("mariadb")) {
              return "mariadb";
            }
            if (engine?.includes("oracle")) {
              return "oracle";
            }
            if (engine?.includes("sqlserver")) {
              return "sqlserver";
            }
            return "";
          },
          variants: new Map<string, IconMapping>([
            ["aurora", { nodeIcon: AmazonAuroraInstance }],
            ["mysql", { nodeIcon: AmazonAuroraMySqlInstance }],
            ["postgres", { nodeIcon: AmazonAuroraPostgreSqlInstance }],
            ["mariadb", { nodeIcon: AmazonAuroraMariaDbInstance }],
            ["oracle", { nodeIcon: AmazonAuroraOracleInstance }],
            ["sqlserver", { nodeIcon: AmazonAuroraSqlServerInstance }],
          ]),
        },
      ],
      ["rds_proxy", AmazonRdsProxyInstance],
      ["rds_proxy_target_group", AmazonRds],
      ["rds_subnet_group", AmazonRds],
      ["region", AmazonEc2],
      ["rest_api", AmazonApiGateway],
      ["route_table", AmazonRoute_53RouteTable],
      ["route53_hosted_zone", AmazonRoute_53HostedZone],
      ["route53_record", AmazonRoute_53],
      ["route53_health_check", AmazonRoute_53ReadinessChecks],
      ["s3_bucket", AmazonSimpleStorageServiceBucket],
      ["s3_bucket_policy", AmazonSimpleStorageService],
      ["s3_object", AmazonSimpleStorageServiceObject],
      ["secret", AwsSecretsManager],
      ["secret_version", AwsSecretsManager],
      ["security_group", AmazonVirtualPrivateCloud],
      ["subnet_private", PrivateSubnet],
      ["subnet_public", PublicSubnet],
      [
        "subnet",
        {
          nodeIcon: PublicSubnet,
          groupStyle: {
            borderColor: "#82A036",
          },
          discriminator: (n: SubnetData) =>
            n.public === true ? "public" : "private",
          variants: new Map<String, IconMapping>([
            [
              "private",
              {
                nodeIcon: PrivateSubnet,
                groupStyle: {
                  borderColor: "#00AAAA",
                },
              },
            ],
          ]),
        },
      ],
      ["ses_email_identity", AmazonSimpleEmailService],
      ["sns_topic", AmazonSimpleNotificationServiceTopic],
      ["sns_topic_subscription", AmazonSimpleNotificationService],
      ["sqs_queue", AmazonSimpleQueueServiceQueue],
      ["sqs_queue_policy", AmazonSimpleQueueService],
      ["target_group", ElasticLoadBalancing],
      [
        "vpc",
        {
          nodeIcon: AmazonVpcVirtualPrivateCloudVpc,
          groupIcon: AmazonVirtualPrivateCloud,
          groupStyle: {
            borderColor: AWS_NETWORKING_PRIMARY_COLOR,
          },
        },
      ],
      ["vpc_endpoint_gateway", AmazonVpcCustomerGateway],
      ["vpc_endpoint_interface", AmazonVpcElasticNetworkInterface],
      ["vpc_link", AmazonApiGateway],
    ]),
  ],
  [
    "kubernetes",
    new Map<string, CallableFunction | IconMapping>([
      [
        "cluster",
        {
          ...kubernetesDefaults,
          nodeIcon: LogoWithBorder,
        },
      ],
      [
        "deployment",
        {
          ...kubernetesDefaults,
          nodeIcon: Deploy,
        },
      ],
      ["helm_chart", Helm],
      ["kubeconfig", LogoWithBorder],
      ["kustomize_directory", LogoWithBorder],
      ["manifest", LogoWithBorder],
      ["persistent_volume", Pv],
      ["persistent_volume_claim", Pvc],
      ["pod", Pod],
      [
        "replica_set",
        {
          ...kubernetesDefaults,
          nodeIcon: Rs,
        },
      ],
      [
        "service",
        {
          ...kubernetesDefaults,
          nodeIcon: Svc,
        },
      ],
      [
        "service_account",
        {
          ...kubernetesDefaults,
          nodeIcon: Sa,
        },
      ],
      ["service_export", LogoWithBorder],
      ["storage_class", Sc],
      ["target_group_binding", LogoWithBorder],
    ]),
  ],
  [
    "docker",
    new Map<string, CallableFunction | IconMapping>([["image", Docker]]),
  ],
]);

export const getIconMapping = (
  provider: string,
  type: string,
  data?: TopologyNodeData,
  variant?: string,
): IconMapping | undefined => {
  let mapping = typeMappings.get(provider)?.get(type) as any;
  if (!variant) {
    variant = mapping?.discriminator?.(data);
  }
  mapping = mapping?.variants?.get(variant) ?? mapping;
  return mapping;
};
export const getIcon = (
  provider: string,
  type: string,
  props?: IconProps,
  data?: TopologyNodeData,
  variant?: string,
): React.JSX.Element => {
  let mapping = typeMappings.get(provider)?.get(type) as any;
  if (!variant) {
    variant = mapping?.discriminator?.(data);
  }
  mapping = mapping?.variants?.get(variant) ?? mapping;
  return mapping?.nodeIcon?.(props) ?? mapping?.(props) ?? UnknownIcon(props);
};

export const getGroupIcon = (
  provider: string,
  type: string,
  props?: IconProps,
  data?: TopologyNodeData,
  variant?: string,
): React.JSX.Element => {
  let mapping = typeMappings.get(provider)?.get(type) as any;
  if (!variant) {
    variant = mapping?.discriminator?.(data);
  }
  mapping = mapping?.variants?.get(variant) ?? mapping;
  return (
    mapping?.groupIcon?.(props) ??
    mapping?.nodeIcon?.(props) ??
    mapping?.(props) ??
    UnknownIcon(props)
  );
};
