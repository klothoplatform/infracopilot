export const tsSeq = `
ds-ts-sequelize:
  provider: aws
  resources:
    secret/ds-ts-sequelize-sequelize-proxy-credentials: # aws:secret:ds-ts-sequelize-sequelize-proxy-credentials

    vpc/ds_ts_sequelize: # aws:vpc:ds_ts_sequelize

    availability_zones/availabilityzones: # aws:availability_zones:AvailabilityZones

    iam_policy/ds-ts-sequelize-ds-ts-sequelize-sequelize-proxy-a66a3633: # aws:iam_policy:ds-ts-sequelize-ds-ts-sequelize-sequelize-proxy-a66a3633
    iam_policy/ds-ts-sequelize-ds-ts-sequelize-sequelize-proxy-a66a3633 -> secret/ds-ts-sequelize-sequelize-proxy-credentials:

    rest_api/ds-ts-sequelize-sequelizeapp: # aws:rest_api:ds-ts-sequelize-sequelizeApp

    subnet/ds_ts_sequelize_private1: # aws:subnet_private:ds_ts_sequelize:ds_ts_sequelize_private1
        cidr_block: 10.0.64.0/18
        public: false

    subnet/ds_ts_sequelize_private1 -> vpc/ds_ts_sequelize:
    subnet/ds_ts_sequelize_private1 -> availability_zones/availabilityzones:

    subnet/ds_ts_sequelize_private0: # aws:subnet_private:ds_ts_sequelize:ds_ts_sequelize_private0
        cidr_block: 10.0.0.0/18
        public: false

    subnet/ds_ts_sequelize_private0 -> vpc/ds_ts_sequelize:
    subnet/ds_ts_sequelize_private0 -> availability_zones/availabilityzones:

    security_group/ds-ts-sequelize: # aws:security_group:ds_ts_sequelize:ds-ts-sequelize
    security_group/ds-ts-sequelize -> vpc/ds_ts_sequelize:

    iam_role/ds-ts-sequelize-sequelize-proxy-proxyrole: # aws:iam_role:ds-ts-sequelize-sequelize-proxy-ProxyRole
    iam_role/ds-ts-sequelize-sequelize-proxy-proxyrole -> iam_policy/ds-ts-sequelize-ds-ts-sequelize-sequelize-proxy-a66a3633:

    ecr_repo/ds-ts-sequelize: # aws:ecr_repo:ds-ts-sequelize

    api_resource/ds-ts-sequelize-/item: # aws:api_resource:ds-ts-sequelize-/item
    api_resource/ds-ts-sequelize-/item -> rest_api/ds-ts-sequelize-sequelizeapp:

    rds_proxy/ds-ts-sequelize-sequelize-proxy: # aws:rds_proxy:ds-ts-sequelize-sequelize-proxy
    rds_proxy/ds-ts-sequelize-sequelize-proxy -> subnet/ds_ts_sequelize_private1:
    rds_proxy/ds-ts-sequelize-sequelize-proxy -> secret/ds-ts-sequelize-sequelize-proxy-credentials:
    rds_proxy/ds-ts-sequelize-sequelize-proxy -> iam_role/ds-ts-sequelize-sequelize-proxy-proxyrole:
    rds_proxy/ds-ts-sequelize-sequelize-proxy -> security_group/ds-ts-sequelize:
    rds_proxy/ds-ts-sequelize-sequelize-proxy -> subnet/ds_ts_sequelize_private0:

    log_group/ds-ts-sequelize-main: # aws:log_group:ds-ts-sequelize-main

    iam_role/ds-ts-sequelize-main-executionrole: # aws:iam_role:ds-ts-sequelize-main-ExecutionRole

    ecr_image/ds-ts-sequelize-main: # aws:ecr_image:ds-ts-sequelize-main
    ecr_image/ds-ts-sequelize-main -> ecr_repo/ds-ts-sequelize:

    api_resource/ds-ts-sequelize-/item/-key: # aws:api_resource:ds-ts-sequelize-/item/-key
    api_resource/ds-ts-sequelize-/item/-key -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_resource/ds-ts-sequelize-/item/-key -> api_resource/ds-ts-sequelize-/item:

    lambda_function/ds-ts-sequelize-main: # aws:lambda_function:ds-ts-sequelize-main
    lambda_function/ds-ts-sequelize-main -> iam_role/ds-ts-sequelize-main-executionrole:
    lambda_function/ds-ts-sequelize-main -> ecr_image/ds-ts-sequelize-main:
    lambda_function/ds-ts-sequelize-main -> security_group/ds-ts-sequelize:
    lambda_function/ds-ts-sequelize-main -> subnet/ds_ts_sequelize_private0:
    lambda_function/ds-ts-sequelize-main -> subnet/ds_ts_sequelize_private1:
    lambda_function/ds-ts-sequelize-main -> rds_proxy/ds-ts-sequelize-sequelize-proxy:
    lambda_function/ds-ts-sequelize-main -> log_group/ds-ts-sequelize-main:

    api_method/ds-ts-sequelize-/item/-key-get: # aws:api_method:ds-ts-sequelize-/item/-key-GET
    api_method/ds-ts-sequelize-/item/-key-get -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_method/ds-ts-sequelize-/item/-key-get -> api_resource/ds-ts-sequelize-/item/-key:

    api_method/ds-ts-sequelize-/item-post: # aws:api_method:ds-ts-sequelize-/item-POST
    api_method/ds-ts-sequelize-/item-post -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_method/ds-ts-sequelize-/item-post -> api_resource/ds-ts-sequelize-/item:

    subnet/ds_ts_sequelize_public1: # aws:subnet_public:ds_ts_sequelize:ds_ts_sequelize_public1
        cidr_block: 10.0.192.0/18
        public: true

    subnet/ds_ts_sequelize_public1 -> vpc/ds_ts_sequelize:
    subnet/ds_ts_sequelize_public1 -> availability_zones/availabilityzones:

    elastic_ip/ds_ts_sequelize_1: # aws:elastic_ip:ds_ts_sequelize_1

    subnet/ds_ts_sequelize_public0: # aws:subnet_public:ds_ts_sequelize:ds_ts_sequelize_public0
        cidr_block: 10.0.128.0/18
        public: true

    subnet/ds_ts_sequelize_public0 -> vpc/ds_ts_sequelize:
    subnet/ds_ts_sequelize_public0 -> availability_zones/availabilityzones:

    elastic_ip/ds_ts_sequelize_0: # aws:elastic_ip:ds_ts_sequelize_0

    rds_subnet_group/ds-ts-sequelize-sequelize: # aws:rds_subnet_group:ds-ts-sequelize-sequelize
    rds_subnet_group/ds-ts-sequelize-sequelize -> subnet/ds_ts_sequelize_private0:
    rds_subnet_group/ds-ts-sequelize-sequelize -> subnet/ds_ts_sequelize_private1:

    api_integration/ds-ts-sequelize-/item/-key-get: # aws:api_integration:ds-ts-sequelize-/item/-key-GET
    api_integration/ds-ts-sequelize-/item/-key-get -> lambda_function/ds-ts-sequelize-main:
    api_integration/ds-ts-sequelize-/item/-key-get -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_integration/ds-ts-sequelize-/item/-key-get -> api_resource/ds-ts-sequelize-/item/-key:
    api_integration/ds-ts-sequelize-/item/-key-get -> api_method/ds-ts-sequelize-/item/-key-get:

    api_integration/ds-ts-sequelize-/item-post: # aws:api_integration:ds-ts-sequelize-/item-POST
    api_integration/ds-ts-sequelize-/item-post -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_integration/ds-ts-sequelize-/item-post -> api_resource/ds-ts-sequelize-/item:
    api_integration/ds-ts-sequelize-/item-post -> api_method/ds-ts-sequelize-/item-post:
    api_integration/ds-ts-sequelize-/item-post -> lambda_function/ds-ts-sequelize-main:

    internet_gateway/ds_ts_sequelize_igw: # aws:internet_gateway:ds_ts_sequelize_igw
    internet_gateway/ds_ts_sequelize_igw -> vpc/ds_ts_sequelize:

    nat_gateway/ds_ts_sequelize_1: # aws:nat_gateway:ds_ts_sequelize_1
    nat_gateway/ds_ts_sequelize_1 -> elastic_ip/ds_ts_sequelize_1:
    nat_gateway/ds_ts_sequelize_1 -> subnet/ds_ts_sequelize_public1:

    nat_gateway/ds_ts_sequelize_0: # aws:nat_gateway:ds_ts_sequelize_0
    nat_gateway/ds_ts_sequelize_0 -> elastic_ip/ds_ts_sequelize_0:
    nat_gateway/ds_ts_sequelize_0 -> subnet/ds_ts_sequelize_public0:

    rds_instance/ds-ts-sequelize-sequelize: # aws:rds_instance:ds-ts-sequelize-sequelize
    rds_instance/ds-ts-sequelize-sequelize -> rds_subnet_group/ds-ts-sequelize-sequelize:
    rds_instance/ds-ts-sequelize-sequelize -> security_group/ds-ts-sequelize:

    api_deployment/ds-ts-sequelize-sequelizeapp: # aws:api_deployment:ds-ts-sequelize-sequelizeApp
    api_deployment/ds-ts-sequelize-sequelizeapp -> api_method/ds-ts-sequelize-/item/-key-get:
    api_deployment/ds-ts-sequelize-sequelizeapp -> api_integration/ds-ts-sequelize-/item/-key-get:
    api_deployment/ds-ts-sequelize-sequelizeapp -> rest_api/ds-ts-sequelize-sequelizeapp:
    api_deployment/ds-ts-sequelize-sequelizeapp -> api_method/ds-ts-sequelize-/item-post:
    api_deployment/ds-ts-sequelize-sequelizeapp -> api_integration/ds-ts-sequelize-/item-post:

    secret_version/ds-ts-sequelize-sequelize-proxy-credentials: # aws:secret_version:ds-ts-sequelize-sequelize-proxy-credentials
    secret_version/ds-ts-sequelize-sequelize-proxy-credentials -> secret/ds-ts-sequelize-sequelize-proxy-credentials:

    s3_bucket/ds-ts-sequelize-internalklothopayloads: # aws:s3_bucket:ds-ts-sequelize-internalklothopayloads

    route_table/ds_ts_sequelize_public: # aws:route_table:ds_ts_sequelize_public
    route_table/ds_ts_sequelize_public -> vpc/ds_ts_sequelize:
    route_table/ds_ts_sequelize_public -> internet_gateway/ds_ts_sequelize_igw:
    route_table/ds_ts_sequelize_public -> subnet/ds_ts_sequelize_public0:
    route_table/ds_ts_sequelize_public -> subnet/ds_ts_sequelize_public1:

    route_table/ds_ts_sequelize_private1: # aws:route_table:ds_ts_sequelize_private1
    route_table/ds_ts_sequelize_private1 -> vpc/ds_ts_sequelize:
    route_table/ds_ts_sequelize_private1 -> nat_gateway/ds_ts_sequelize_1:
    route_table/ds_ts_sequelize_private1 -> subnet/ds_ts_sequelize_private1:

    route_table/ds_ts_sequelize_private0: # aws:route_table:ds_ts_sequelize_private0
    route_table/ds_ts_sequelize_private0 -> vpc/ds_ts_sequelize:
    route_table/ds_ts_sequelize_private0 -> nat_gateway/ds_ts_sequelize_0:
    route_table/ds_ts_sequelize_private0 -> subnet/ds_ts_sequelize_private0:

    rds_proxy_target_group/ds-ts-sequelize-ds-ts-sequelize-sequelize: # aws:rds_proxy_target_group:ds-ts-sequelize-ds-ts-sequelize-sequelize
    rds_proxy_target_group/ds-ts-sequelize-ds-ts-sequelize-sequelize -> rds_proxy/ds-ts-sequelize-sequelize-proxy:
    rds_proxy_target_group/ds-ts-sequelize-ds-ts-sequelize-sequelize -> rds_instance/ds-ts-sequelize-sequelize:

    lambda_permission/ts_sequelize_sequelizeapp: # aws:lambda_permission:ts_sequelize_sequelizeApp
    lambda_permission/ts_sequelize_sequelizeapp -> rest_api/ds-ts-sequelize-sequelizeapp:
    lambda_permission/ts_sequelize_sequelizeapp -> lambda_function/ds-ts-sequelize-main:

    api_stage/ds-ts-sequelize-sequelizeapp: # aws:api_stage:ds-ts-sequelize-sequelizeApp
    api_stage/ds-ts-sequelize-sequelizeapp -> api_deployment/ds-ts-sequelize-sequelizeapp:
    api_stage/ds-ts-sequelize-sequelizeapp -> rest_api/ds-ts-sequelize-sequelizeapp:
    `;
export const tsMs = `
ds-ts-microservices:
  provider: aws
  resources:
    rest_api/ds-ts-microservices-app: # aws:rest_api:ds-ts-microservices-app

    dynamodb_table/ds-ts-microservices-kv: # aws:dynamodb_table:ds-ts-microservices-kv

    ecr_repo/ds-ts-microservices: # aws:ecr_repo:ds-ts-microservices

    api_resource/ds-ts-microservices-/users: # aws:api_resource:ds-ts-microservices-/users
    api_resource/ds-ts-microservices-/users -> rest_api/ds-ts-microservices-app:

    log_group/ds-ts-microservices-main: # aws:log_group:ds-ts-microservices-main

    iam_role/ds-ts-microservices-main-executionrole: # aws:iam_role:ds-ts-microservices-main-ExecutionRole
    iam_role/ds-ts-microservices-main-executionrole -> dynamodb_table/ds-ts-microservices-kv:

    ecr_image/ds-ts-microservices-main: # aws:ecr_image:ds-ts-microservices-main
    ecr_image/ds-ts-microservices-main -> ecr_repo/ds-ts-microservices:

    api_resource/ds-ts-microservices-/users/-user: # aws:api_resource:ds-ts-microservices-/users/-user
    api_resource/ds-ts-microservices-/users/-user -> rest_api/ds-ts-microservices-app:
    api_resource/ds-ts-microservices-/users/-user -> api_resource/ds-ts-microservices-/users:

    lambda_function/ds-ts-microservices-main: # aws:lambda_function:ds-ts-microservices-main
    lambda_function/ds-ts-microservices-main -> log_group/ds-ts-microservices-main:
    lambda_function/ds-ts-microservices-main -> iam_role/ds-ts-microservices-main-executionrole:
    lambda_function/ds-ts-microservices-main -> ecr_image/ds-ts-microservices-main:
    lambda_function/ds-ts-microservices-main -> dynamodb_table/ds-ts-microservices-kv:

    api_method/ds-ts-microservices-/users/-user-put: # aws:api_method:ds-ts-microservices-/users/-user-PUT
    api_method/ds-ts-microservices-/users/-user-put -> rest_api/ds-ts-microservices-app:
    api_method/ds-ts-microservices-/users/-user-put -> api_resource/ds-ts-microservices-/users/-user:

    api_method/ds-ts-microservices-/users-get: # aws:api_method:ds-ts-microservices-/users-GET
    api_method/ds-ts-microservices-/users-get -> rest_api/ds-ts-microservices-app:
    api_method/ds-ts-microservices-/users-get -> api_resource/ds-ts-microservices-/users:

    api_integration/ds-ts-microservices-/users/-user-put: # aws:api_integration:ds-ts-microservices-/users/-user-PUT
    api_integration/ds-ts-microservices-/users/-user-put -> rest_api/ds-ts-microservices-app:
    api_integration/ds-ts-microservices-/users/-user-put -> api_resource/ds-ts-microservices-/users/-user:
    api_integration/ds-ts-microservices-/users/-user-put -> api_method/ds-ts-microservices-/users/-user-put:
    api_integration/ds-ts-microservices-/users/-user-put -> lambda_function/ds-ts-microservices-main:

    api_integration/ds-ts-microservices-/users-get: # aws:api_integration:ds-ts-microservices-/users-GET
    api_integration/ds-ts-microservices-/users-get -> rest_api/ds-ts-microservices-app:
    api_integration/ds-ts-microservices-/users-get -> api_resource/ds-ts-microservices-/users:
    api_integration/ds-ts-microservices-/users-get -> api_method/ds-ts-microservices-/users-get:
    api_integration/ds-ts-microservices-/users-get -> lambda_function/ds-ts-microservices-main:

    api_deployment/ds-ts-microservices-app: # aws:api_deployment:ds-ts-microservices-app
    api_deployment/ds-ts-microservices-app -> api_method/ds-ts-microservices-/users/-user-put:
    api_deployment/ds-ts-microservices-app -> api_integration/ds-ts-microservices-/users/-user-put:
    api_deployment/ds-ts-microservices-app -> rest_api/ds-ts-microservices-app:
    api_deployment/ds-ts-microservices-app -> api_method/ds-ts-microservices-/users-get:
    api_deployment/ds-ts-microservices-app -> api_integration/ds-ts-microservices-/users-get:

    s3_bucket/ds-ts-microservices-internalklothopayloads: # aws:s3_bucket:ds-ts-microservices-internalklothopayloads

    lambda_permission/ds-ts-microservices-app: # aws:lambda_permission:ds-ts-microservices-app
    lambda_permission/ds-ts-microservices-app -> lambda_function/ds-ts-microservices-main:
    lambda_permission/ds-ts-microservices-app -> rest_api/ds-ts-microservices-app:

    api_stage/ds-ts-microservices-app: # aws:api_stage:ds-ts-microservices-app
    api_stage/ds-ts-microservices-app -> rest_api/ds-ts-microservices-app:
    api_stage/ds-ts-microservices-app -> api_deployment/ds-ts-microservices-app:
`;

export const small = `
ds-ts-microservices:
  provider: aws
  resources:
    rest_api/api -> lambda_function/my_lambda:
    lambda_function/my_lambda -> lambda_function/func2:

`;

export const withGroups = `
testEngine:
  provider: aws
  resources:
    vpc/testengine:
    vpc/alt-vpc:
    vpc/unused-vpc:
    subnet/public_01:
        parent: vpc/testengine
    secret/testengine-my_proxy-credentials:
    rds_instance/test-ngine:
        parent: vpc/testengine
    rds_proxy/my_proxy: # aws:rds_proxy:my_proxy
        parent: vpc/testengine
    rds_proxy/my_proxy -> rds_instance/test-ngine:
    rds_proxy/my_proxy -> secret/testengine-my_proxy-credentials:
    ecs_cluster/my-ecs-cluster:
      parent: vpc/alt-vpc
    lambda_function/testengine-b:
        parent: subnet/public_01
    lambda_function/testengine-b -> rds_proxy/my_proxy:
    lambda_function/testengine-a:
    lambda_function/testengine-a -> lambda_function/testengine-b:
`.trim();

export const withGroupsSimple = `
testEngine:
  provider: aws
  resources:
    vpc/testengine:
    vpc/alt-vpc:
    vpc/unused-vpc:
    subnet/public_01:
        parent: vpc/testengine
    secret/testengine-my_proxy-credentials:
    rds_instance/test-ngine:
        parent: vpc/testengine
    rds_proxy/my_proxy: # aws:rds_proxy:my_proxy
        parent: vpc/testengine
    ecs_cluster/my-ecs-cluster:
      parent: vpc/alt-vpc
    lambda_function/testengine-b:
        parent: subnet/public_01
    lambda_function/testengine-a:
    #lambda_function/testengine-a -> lambda_function/testengine-b:
    lambda_function/testengine-a -> vpc/unused-vpc:
`.trim();

export const simple = `
sample:
  provider: aws
  resources:
    lambda/a -> lambda/b:
    lambda/c -> lambda/d:
    lambda/a -> lambda/d:

`.trim();

export const k8s = `
infracopilot:
  provider: aws
  resources:
    kubernetes:pod/pod_01:
        parent: eks_cluster/eks_cluster-deployment_01


    kubernetes:deployment/deployment_01:
        parent: eks_cluster/eks_cluster-deployment_01


    load_balancer/load_balancer_api_01_pod_01:
        parent: vpc/infracopilot

    load_balancer/load_balancer_api_01_pod_01 -> kubernetes:pod/pod_01:

    load_balancer/load_balancer_api_01_deployment_01:
        parent: vpc/infracopilot

    load_balancer/load_balancer_api_01_deployment_01 -> kubernetes:deployment/deployment_01:

    kubernetes:helm_chart/helm_chart_01:
        parent: eks_cluster/eks_cluster-deployment_01


    vpc/infracopilot:

    rest_api/api_01:
    rest_api/api_01 -> load_balancer/load_balancer_api_01_deployment_01:
    rest_api/api_01 -> load_balancer/load_balancer_api_01_pod_01:

    rds_instance/db_01:
        parent: vpc/infracopilot


    eks_cluster/eks_cluster-deployment_01:
        parent: vpc/infracopilot
    kubernetes:service/s1:
    kubernetes:pod/pod_02:
      parent: kubernetes:service/s1
    kubernetes:pod/pod_02->kubernetes:pod/pod_01:
`.trim();

export const k8sNested = `
infracopilot:
  provider: kubernetes
  resources:
    aws:vpc/vpc:
    aws:eks_cluster/cluster:
      parent: aws:vpc/vpc
    deployment/l2:
      parent: aws:eks_cluster/cluster
    replica_set/rs2:
      parent: deployment/l2
    pod/pod1:
      parent: replica_set/rs2
    pod/pod2:
      parent: replica_set/rs2
    service/s1:
      parent: deployment/l2
    service/s1-> pod/pod1:
    service/s1-> pod/pod2:
`.trim();

export const k8sNested2 = `
 infracopilot:
  provider: aws
  resources:
    aws:eks_cluster/eks_cluster-deployment_01:
      parent: vpc/infracopilot
    aws:vpc/infracopilot: {}
    indicators:warning/warning-kubernetes-deployment/deployment_01-disconnected:
      parent: eks_cluster/eks_cluster-deployment_01
    indicators:warning/warning-kubernetes-helm_chart/helm_chart_01-disconnected:
      parent: eks_cluster/eks_cluster-deployment_01
    indicators:warning/warning-kubernetes-pod/pod_01-disconnected:
      parent: eks_cluster/eks_cluster-deployment_01
    indicators:warning/warning-kubernetes-pod/pod_02-disconnected:
      parent: eks_cluster/eks_cluster-deployment_01
    kubernetes:deployment/deployment_01:
      parent: eks_cluster/eks_cluster-deployment_01
    kubernetes:deployment/deployment_01 -> indicators:warning/warning-kubernetes-deployment/deployment_01-disconnected: {}
    kubernetes:helm_chart/helm_chart_01:
      parent: eks_cluster/eks_cluster-deployment_01
    kubernetes:helm_chart/helm_chart_01 -> indicators:warning/warning-kubernetes-helm_chart/helm_chart_01-disconnected: {}
    kubernetes:pod/pod_01:
      parent: eks_cluster/eks_cluster-deployment_01
    kubernetes:pod/pod_01 -> indicators:warning/warning-kubernetes-pod/pod_01-disconnected: {}
    kubernetes:pod/pod_02:
      parent: eks_cluster/eks_cluster-deployment_01
    kubernetes:pod/pod_02 -> indicators:warning/warning-kubernetes-pod/pod_02-disconnected: {}
    `.trim();

export const sampleGraphYaml = k8s;
