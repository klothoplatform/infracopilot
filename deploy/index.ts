import * as aws from '@pulumi/aws'
import * as awsInputs from '@pulumi/aws/types/input'
import * as command from '@pulumi/command'
import * as docker from '@pulumi/docker'
import * as pulumi from '@pulumi/pulumi'
import { OutputInstance } from '@pulumi/pulumi'


const kloConfig = new pulumi.Config('klo')
const protect = kloConfig.getBoolean('protect') ?? false
const awsConfig = new pulumi.Config('aws')
const awsProfile = awsConfig.get('profile')
const accountId = pulumi.output(aws.getCallerIdentity({}))
const region = pulumi.output(aws.getRegion({}))

const vpc_0 = new aws.ec2.Vpc("vpc-0", {
        cidrBlock: "10.0.0.0/16",
        enableDnsHostnames: true,
        enableDnsSupport: true,
        tags: {
            Name: "vpc-0",
        },
    })
const region_0 = pulumi.output(aws.getRegion({}))
const internet_gateway_0 = new aws.ec2.InternetGateway("internet_gateway-0", {
        vpcId: vpc_0.id,
    })
const availability_zone_0 = pulumi.output(
        aws.getAvailabilityZones({
            state: 'available',
        })
    ).names[0]
const subnet_2_route_table = new aws.ec2.RouteTable("subnet-2-route_table", {
        vpcId: vpc_0.id,
        routes: [
    {
        cidrBlock: "0.0.0.0/0",
        gatewayId: internet_gateway_0.id
    },
]

,
    })
const availability_zone_1 = pulumi.output(
        aws.getAvailabilityZones({
            state: 'available',
        })
    ).names[1]
const subnet_3_route_table = new aws.ec2.RouteTable("subnet-3-route_table", {
        vpcId: vpc_0.id,
        routes: [
    {
        cidrBlock: "0.0.0.0/0",
        gatewayId: internet_gateway_0.id
    },
]

,
    })
const subnet_0_route_table_nat_gateway_elastic_ip = new aws.ec2.Eip("subnet-0-route_table-nat_gateway-elastic_ip", {})
const subnet_2 = new aws.ec2.Subnet("subnet-2", {
        vpcId: vpc_0.id,
        cidrBlock: "10.0.0.0/18",
        availabilityZone: availability_zone_0,
        mapPublicIpOnLaunch: false,
        tags: {
            Name: "subnet-2",
        },
    })
const subnet_1_route_table_nat_gateway_elastic_ip = new aws.ec2.Eip("subnet-1-route_table-nat_gateway-elastic_ip", {})
const subnet_3 = new aws.ec2.Subnet("subnet-3", {
        vpcId: vpc_0.id,
        cidrBlock: "10.0.64.0/18",
        availabilityZone: availability_zone_1,
        mapPublicIpOnLaunch: false,
        tags: {
            Name: "subnet-3",
        },
    })
const subnet_0_route_table_nat_gateway = new aws.ec2.NatGateway("subnet-0-route_table-nat_gateway", {
        allocationId: subnet_0_route_table_nat_gateway_elastic_ip.id,
        subnetId: subnet_2.id,
    })
const subnet_1_route_table_nat_gateway = new aws.ec2.NatGateway("subnet-1-route_table-nat_gateway", {
        allocationId: subnet_1_route_table_nat_gateway_elastic_ip.id,
        subnetId: subnet_3.id,
    })
const subnet_0_route_table = new aws.ec2.RouteTable("subnet-0-route_table", {
        vpcId: vpc_0.id,
        routes: [
  {
    cidrBlock: "0.0.0.0/0",
    natGatewayId: subnet_0_route_table_nat_gateway.id
  },
]

,
    })
const ecs_service_0_security_group = new aws.ec2.SecurityGroup("ecs_service_0-security_group", {
        name: "ecs_service_0-security_group",
        vpcId: vpc_0.id,
        egress: [{cidrBlocks: ["0.0.0.0/0"], description: "Allows all outbound IPv4 traffic", fromPort: 0, protocol: "-1", toPort: 0}],
        ingress: [{cidrBlocks: ["10.0.192.0/18"], description: "Allow ingress traffic from ip addresses within the subnet subnet-1", fromPort: 0, protocol: "-1", toPort: 0}, {description: "Allow ingress traffic from within the same security group", fromPort: 0, protocol: "-1", self: true, toPort: 0}, {cidrBlocks: ["10.0.128.0/18"], description: "Allow ingress traffic from ip addresses within the subnet subnet-0", fromPort: 0, protocol: "-1", toPort: 0}],
    })
const rds_instance_9_security_group = new aws.ec2.SecurityGroup("rds-instance-9-security_group", {
        name: "rds-instance-9-security_group",
        vpcId: vpc_0.id,
        egress: [{cidrBlocks: ["0.0.0.0/0"], description: "Allows all outbound IPv4 traffic", fromPort: 0, protocol: "-1", toPort: 0}],
        ingress: [{cidrBlocks: ["10.0.128.0/18"], description: "Allow ingress traffic from ip addresses within the subnet subnet-0", fromPort: 0, protocol: "-1", toPort: 0}, {cidrBlocks: ["10.0.192.0/18"], description: "Allow ingress traffic from ip addresses within the subnet subnet-1", fromPort: 0, protocol: "-1", toPort: 0}, {description: "Allow ingress traffic from within the same security group", fromPort: 0, protocol: "-1", self: true, toPort: 0}],
    })
const subnet_1_route_table = new aws.ec2.RouteTable("subnet-1-route_table", {
        vpcId: vpc_0.id,
        routes: [
  {
    cidrBlock: "0.0.0.0/0",
    natGatewayId: subnet_1_route_table_nat_gateway.id
  },
]

,
    })
const infracopilot_api = new aws.apigateway.RestApi("infracopilot-api", {
        binaryMediaTypes: ["application/octet-stream", "image/*"],
    })
const subnet_0 = new aws.ec2.Subnet("subnet-0", {
        vpcId: vpc_0.id,
        cidrBlock: "10.0.128.0/18",
        availabilityZone: availability_zone_0,
        mapPublicIpOnLaunch: false,
        tags: {
            Name: "subnet-0",
        },
    })
const subnet_1 = new aws.ec2.Subnet("subnet-1", {
        vpcId: vpc_0.id,
        cidrBlock: "10.0.192.0/18",
        availabilityZone: availability_zone_1,
        mapPublicIpOnLaunch: false,
        tags: {
            Name: "subnet-1",
        },
    })
const api_resource_0 = new aws.apigateway.Resource(
        "api_resource-0",
        {
            restApi: infracopilot_api.id,
            parentId: infracopilot_api.rootResourceId,
            pathPart: "{proxy+}",
        },
        { parent: infracopilot_api }
    )
const infracopilot_lb = new aws.lb.LoadBalancer("infracopilot-lb", {
        internal: true,
        loadBalancerType: "network",
        subnets: [subnet_0, subnet_1].map((subnet) => subnet.id),
    })
export const infracopilot_lb_DomainName = infracopilot_lb.dnsName
const rds_subnet_group_0 = new aws.rds.SubnetGroup("rds_subnet_group-0", {
        subnetIds: [subnet_0, subnet_1].map((subnet) => subnet.id),
    })
const rest_api_6_integration_0_method = new aws.apigateway.Method(
        "rest_api_6_integration_0_method",
        {
            restApi: infracopilot_api.id,
            resourceId: api_resource_0.id,
            httpMethod: "ANY",
            authorization: "NONE",
            requestParameters: {"method.request.path.proxy": true},
        },
        {
            parent: api_resource_0,
        }
    )
const vpc_link_rest_api_6_integration_0_ecs_service_0 = new aws.apigateway.VpcLink("rest_api_6_integration_0-ecs_service_0", {
        targetArn: infracopilot_lb.arn,
    })
const ecr_repo_0 = new aws.ecr.Repository("ecr_repo-0", {
        imageScanningConfiguration: {
            scanOnPush: true,
        },
        imageTagMutability: 'MUTABLE',
        forceDelete: true,
        encryptionConfigurations: [{ encryptionType: 'KMS' }],
        tags: {
            env: 'production',
            AppName: "ecr_repo-0",
        },
    })
const infracopilot_db = new aws.rds.Instance(
        "infracopilot-db",
        {
            instanceClass: "db.t3.micro",
            engine: "postgres",
            engineVersion: "13.10",
            dbName: "main",
            username: kloConfig.requireSecret(`${"infracopilot-db"}-username`),
            password: kloConfig.requireSecret(`${"infracopilot-db"}-password`),
            iamDatabaseAuthenticationEnabled: true,
            dbSubnetGroupName: rds_subnet_group_0.name,
            vpcSecurityGroupIds: [rds_instance_9_security_group].map((sg) => sg.id),
            skipFinalSnapshot: true,
            allocatedStorage: 20,
        },
        { protect: protect }
    )
export const infracopilot_db_Address = infracopilot_db.address
export const infracopilot_db_Endpoint = infracopilot_db.endpoint
const ifcp_architecture_storage = new aws.s3.Bucket(
        "ifcp-architecture-storage",
        {
            forceDestroy: true,
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "aws:kms",
                    },
                    bucketKeyEnabled: true,
                },
            },
        },
        { protect: protect }
    )
export const ifcp_architecture_storage_BucketName = ifcp_architecture_storage.bucket
const ifcp_binary_storage = new aws.s3.Bucket(
        "ifcp-binary-storage",
        {
            forceDestroy: true,
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "aws:kms",
                    },
                    bucketKeyEnabled: true,
                },
            },
        },
        { protect: protect }
    )
export const ifcp_binary_storage_BucketName = ifcp_binary_storage.bucket
const ifcp_auth0_client_id = new aws.secretsmanager.Secret(
        "ifcp-auth0-client-id",
        {
            name: "ifcp-auth0-client-id",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const ifcp_auth0_secret = new aws.secretsmanager.Secret(
        "ifcp-auth0-secret",
        {
            name: "ifcp-auth0-secret",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const ifcp_fga_client_id = new aws.secretsmanager.Secret(
        "ifcp-fga-client-id",
        {
            name: "ifcp-fga-client-id",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const ifcp_fga_model_id = new aws.secretsmanager.Secret(
        "ifcp-fga-model-id",
        {
            name: "ifcp-fga-model-id",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const ifcp_fga_secret = new aws.secretsmanager.Secret(
        "ifcp-fga-secret",
        {
            name: "ifcp-fga-secret",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const ifcp_fga_store_id = new aws.secretsmanager.Secret(
        "ifcp-fga-store-id",
        {
            name: "ifcp-fga-store-id",
            recoveryWindowInDays: 0,
        },
        { protect: protect }
    )
const rest_api_6_integration_0 = new aws.apigateway.Integration(
        "rest_api_6_integration_0",
        {
            restApi: infracopilot_api.id,
            resourceId: api_resource_0.id,
            httpMethod: rest_api_6_integration_0_method.httpMethod,
            integrationHttpMethod: "ANY",
            type: "HTTP_PROXY",
            connectionType: "VPC_LINK",
            connectionId: vpc_link_rest_api_6_integration_0_ecs_service_0.id,
            uri: pulumi.interpolate`http://${
            (infracopilot_lb as aws.lb.LoadBalancer).dnsName
        }${"/{proxy+}".replace('+', '')}`,
            requestParameters: {"integration.request.path.proxy": "method.request.path.proxy"},
        },
        { parent: rest_api_6_integration_0_method }
    )
const ecs_service_0_image = (() => {
        const pullBaseImage = new command.local.Command(
            `${"ecs_service_0-image"}-pull-base-image-${Date.now()}`,
            { create: pulumi.interpolate`docker pull ${"python:3.11-alpine"}` }
        )
        const base = new docker.Image(
            `${"ecs_service_0-image"}-base`,
            {
                build: {
                    context: "..",
                    dockerfile: "Dockerfile",
                    platform: 'linux/amd64',
                },
                skipPush: true,
                imageName: pulumi.interpolate`${ecr_repo_0.repositoryUrl}:base`,
            },
            {
                dependsOn: pullBaseImage,
            }
        )

        const sha256 = new command.local.Command(
            `${"ecs_service_0-image"}-base-get-sha256-${Date.now()}`,
            { create: pulumi.interpolate`docker image inspect -f {{.ID}} ${base.imageName}` },
            { parent: base }
        ).stdout.apply((id) => id.substring(7))

        return new docker.Image(
            "ecs_service_0-image",
            {
                build: {
                    context: "..",
                    dockerfile: "Dockerfile",
                    platform: 'linux/amd64',
                },
                registry: aws.ecr
                    .getAuthorizationTokenOutput(
                        { registryId: ecr_repo_0.registryId },
                        { async: true }
                    )
                    .apply((registryToken) => {
                        return {
                            server: ecr_repo_0.repositoryUrl,
                            username: registryToken.userName,
                            password: registryToken.password,
                        }
                    }),
                imageName: pulumi.interpolate`${ecr_repo_0.repositoryUrl}:${sha256}`,
            },
            { parent: base }
        )
    })()
const ecs_service_0_execution_role = new aws.iam.Role("ecs_service_0-execution-role", {
        assumeRolePolicy: pulumi.jsonStringify({Statement: [{Action: ["sts:AssumeRole"], Effect: "Allow", Principal: {Service: ["ecs-tasks.amazonaws.com"]}}], Version: "2012-10-17"}),
        inlinePolicies: [
    {
        name: "ifcp-architecture-storage-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["s3:*"], Effect: "Allow", Resource: [ifcp_architecture_storage.arn, pulumi.interpolate`${ifcp_architecture_storage.arn}/*`]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-binary-storage-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["s3:*"], Effect: "Allow", Resource: [ifcp_binary_storage.arn, pulumi.interpolate`${ifcp_binary_storage.arn}/*`]}], Version: "2012-10-17"})
    },
    {
        name: "infracopilot-db-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["rds-db:connect"], Effect: "Allow", Resource: [pulumi.interpolate`arn:aws:rds-db:${region.name}:${accountId.accountId}:dbuser:${infracopilot_db.resourceId}/${infracopilot_db.username}`]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-fga-model-id-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_fga_model_id.arn]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-fga-store-id-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_fga_store_id.arn]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-fga-secret-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_fga_secret.arn]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-fga-client-id-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_fga_client_id.arn]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-auth0-client-id-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_auth0_client_id.arn]}], Version: "2012-10-17"})
    },
    {
        name: "ifcp-auth0-secret-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"], Effect: "Allow", Resource: [ifcp_auth0_secret.arn]}], Version: "2012-10-17"})
    },
    {
        name: "exec-command-policy",
        policy: pulumi.jsonStringify({Statement: [{Action: ["ssmmessages:CreateControlChannel", "ssmmessages:CreateDataChannel", "ssmmessages:OpenControlChannel", "ssmmessages:OpenDataChannel"], Effect: "Allow", Resource: "*"}], Version: "2012-10-17"})
    }
],
        managedPolicyArns: [
            ...["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"],
        ],
    })
const ecs_service_0_log_group = new aws.cloudwatch.LogGroup("ecs_service_0-log-group", {
        name: "/aws/ecs/ecs_service_0",
        retentionInDays: 5,
    })
const api_deployment_0 = new aws.apigateway.Deployment(
        "api_deployment-0",
        {
            restApi: infracopilot_api.id,
            triggers: {restApi6Integration0: "rest_api_6_integration_0", restApi6Integration0Method: "rest_api_6_integration_0_method"},
        },
        {
            dependsOn: [infracopilot_api, rest_api_6_integration_0, rest_api_6_integration_0_method],
        }
    )
const cloudfront_origin_access_identity_0 = new aws.cloudfront.OriginAccessIdentity("cloudfront_origin_access_identity-0", {
        comment: "this is needed to set up S3 polices so that the S3 bucket is not public",
    })
const ifcp_static_site = new aws.s3.Bucket(
        "ifcp-static-site",
        {
            forceDestroy: true,
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256",
                    },
                    bucketKeyEnabled: true,
                },
            },
        },
        { protect: protect }
    )
export const ifcp_static_site_BucketName = ifcp_static_site.bucket
const rest_api_6_integ636d6a12 = (() => {
        const tg = new aws.lb.TargetGroup("rest-api-6-integ636d6a12", {
            port: 80,
            protocol: "TCP",
            targetType: "ip",
            vpcId: vpc_0.id,
            healthCheck: {
    enabled: true,
    healthyThreshold: 5,
    interval: 30,
    protocol: "TCP",
    timeout: 5,
    unhealthyThreshold: 2
},
        })
        return tg
    })()
const ecs_cluster_0 = new aws.ecs.Cluster("ecs_cluster-0", {})
const ecs_service_0 = new aws.ecs.TaskDefinition("ecs_service_0", {
        family: "ecs_service_0",
        cpu: "4096",
        memory: "8192",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: ecs_service_0_execution_role.arn,
        taskRoleArn: ecs_service_0_execution_role.arn,
        containerDefinitions: pulumi.jsonStringify([
            {
                name: "ecs_service_0",
                image: ecs_service_0_image.imageName,
                portMappings: [{containerPort: 80, hostPort: 80, protocol: "TCP"}],
                environment: [
    { name: "ARCHITECTURE_BUCKET_NAME", value: ifcp_architecture_storage.bucket },
    { name: "BINARY_BUCKET_NAME", value: ifcp_binary_storage.bucket },
    { name: "DB_DATABASE", value: "main" },
    { name: "DB_ENDPOINT", value: infracopilot_db.endpoint },
    { name: "DB_PASSWORD", value: kloConfig.requireSecret(`${"infracopilot-db"}-password`) },
    { name: "DB_USERNAME", value: kloConfig.requireSecret(`${"infracopilot-db"}-username`) },
    { name: "FGA_CLIENT_ID", value: "ifcp-fga-client-id" },
    { name: "FGA_MODEL_ID", value: "ifcp-fga-model-id" },
    { name: "FGA_SECRET", value: "ifcp-fga-secret" },
    { name: "FGA_STORE_ID", value: "ifcp-fga-store-id" },
    { name: "AUTH0_DOMAIN", value: process.env.AUTH0_DOMAIN },
    { name: "AUTH0_AUDIENCE", value: process.env.AUTH0_AUDIENCE },
    { name: "FGA_API_HOST", value: "api.us1.fga.dev"}
],
                logConfiguration: {
                    logDriver: 'awslogs',
                    options: {
                        'awslogs-group': ecs_service_0_log_group.name,
                        'awslogs-region': region_0.name,
                        'awslogs-stream-prefix': "ecs_service_0",
                    },
                },
            },
        ]),
    })
const api_stage_0 = new aws.apigateway.Stage("api_stage-0", {
        deployment: api_deployment_0.id,
        restApi: infracopilot_api.id,
        stageName: "stage",
    })
export const api_stage_0_Url = api_stage_0.invokeUrl
const s3_bucket_policy_0 = new aws.s3.BucketPolicy("s3_bucket_policy-0", {
        bucket: ifcp_static_site.id,
        policy: {Statement: [{Action: ["s3:GetObject"], Effect: "Allow", Principal: {AWS: [cloudfront_origin_access_identity_0.iamArn]}, Resource: [pulumi.interpolate`${ifcp_static_site.arn}/*`]}], Version: "2012-10-17"},
    })
const subnet_3_subnet_3_route_table = new aws.ec2.RouteTableAssociation("subnet-3-subnet-3-route_table", {
        subnetId: subnet_3.id,
        routeTableId: subnet_3_route_table.id,
    })
const subnet_2_subnet_2_route_table = new aws.ec2.RouteTableAssociation("subnet-2-subnet-2-route_table", {
        subnetId: subnet_2.id,
        routeTableId: subnet_2_route_table.id,
    })
const subnet_1_subnet_1_route_table = new aws.ec2.RouteTableAssociation("subnet-1-subnet-1-route_table", {
        subnetId: subnet_1.id,
        routeTableId: subnet_1_route_table.id,
    })
const subnet_0_subnet_0_route_table = new aws.ec2.RouteTableAssociation("subnet-0-subnet-0-route_table", {
        subnetId: subnet_0.id,
        routeTableId: subnet_0_route_table.id,
    })
const load_balancer_listener_rest_api_6_integration_0_ecs_service_0 = new aws.lb.Listener("rest_api_6_integration_0-ecs_service_0", {
        loadBalancerArn: infracopilot_lb.arn,
        defaultActions: [
    {
        targetGroupArn: rest_api_6_integ636d6a12.arn,
        type: "forward",
    },
]

,
        port: 80,
        protocol: "TCP",
    })
const infracopilot = new aws.ecs.Service(
        "infracopilot",
        {
            launchType: "FARGATE",
            cluster: ecs_cluster_0.arn,
            desiredCount: 1,
            forceNewDeployment: true,
            loadBalancers: [
    {
        containerPort: 80,
        targetGroupArn: rest_api_6_integ636d6a12.arn,
        containerName: "ecs_service_0",
    },
]

,
            networkConfiguration: {
                subnets: [subnet_0, subnet_1].map((sn) => sn.id),
                securityGroups: [ecs_service_0_security_group].map((sg) => sg.id),
            },
            taskDefinition: ecs_service_0.arn,
            waitForSteadyState: true,
            enableExecuteCommand: true,
        },
        { dependsOn: [ecs_cluster_0, ecs_service_0, ecs_service_0_security_group, rest_api_6_integ636d6a12, subnet_0, subnet_1] }
    )
const infracopilot_cf = new aws.cloudfront.Distribution("infracopilot-cf", {
        origins: [{customOriginConfig: {httpPort: 80, httpsPort: 443, originProtocolPolicy: "https-only", originSslProtocols: ["TLSv1.2", "TLSv1", "SSLv3", "TLSv1.1"]}, domainName: api_stage_0.invokeUrl.apply((d) => d.split('//')[1].split('/')[0]), originId: "api_stage-0", originPath: "/stage"}, {domainName: ifcp_static_site.bucketRegionalDomainName, originId: "static-site", s3OriginConfig: {originAccessIdentity: cloudfront_origin_access_identity_0.cloudfrontAccessIdentityPath}}],
        enabled: true,
        customErrorResponses: [{errorCode: 403, responseCode: 200, responsePagePath: "/index.html"}],
        viewerCertificate: {
            minimumProtocolVersion: "TLSv1.2_2021",
            sslSupportMethod: "sni-only",
            cloudfrontDefaultCertificate: process.env.STAGE !== "dev",
            acmCertificateArn:
              process.env.STAGE === "dev"
                ? "arn:aws:acm:us-east-1:338991950301:certificate/635f7b40-f430-491d-9f4f-4fed4e689305"
                : undefined // "arn:aws:acm:us-east-1:200804570572:certificate/142fc308-f79c-44b3-be2e-b29283f31660",
          },
          aliases:
            process.env.STAGE === "dev"
              ? ["dev.infracopilot.io"]
              : undefined, // ["app.infracopilot.io"],
        defaultCacheBehavior: {allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"], cachedMethods: ["HEAD", "GET"], defaultTtl: 3600, forwardedValues: {cookies: {forward: "none"}, queryString: true}, maxTtl: 86400, minTtl: 0, targetOriginId: "static-site", viewerProtocolPolicy: "allow-all"},
        restrictions: {geoRestriction: {restrictionType: "none"}},
        orderedCacheBehaviors: [
            {
                pathPattern: "/api**",
                targetOriginId: "api_stage-0",
                allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
                cachedMethods: ["HEAD", "GET"],
                viewerProtocolPolicy: "redirect-to-https",
                cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // Managed-CachingDisabled
                originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac", // Managed-AllViewerExceptHostHeader
                compress: false,
            },
        ],
    })
export const infracopilot_cf_Domain = infracopilot_cf.domainName
