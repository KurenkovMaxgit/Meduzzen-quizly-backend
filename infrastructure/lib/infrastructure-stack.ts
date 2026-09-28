import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as iam from "aws-cdk-lib/aws-iam";

export class QuizlyInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "QuizlyVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC, 
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, 
        }
      ]
    });

    const dbInstance = new rds.DatabaseInstance(this, "QuizlyPostgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_18,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      databaseName: "quizly",
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Subnets for Redis",
        subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
      },
    );

    const redisSG = new ec2.SecurityGroup(this, "RedisSG", { vpc });

    const redisCluster = new elasticache.CfnCacheCluster(this, "QuizlyRedis", {
      cacheNodeType: "cache.t3.micro",
      engine: "redis",
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSG.securityGroupId],
    });

    new cdk.CfnOutput(this, "PostgresEndpoint", {
      value: dbInstance.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, "RedisEndpoint", {
      value: redisCluster.attrRedisEndpointAddress,
    });

    const cluster = new cdk.aws_ecs.Cluster(this, "QuizlyCluster", { vpc });

    const loadBalancedFargateService =
      new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "QuizlyService",
        {
          cluster,
          memoryLimitMiB: 512,
          cpu: 256,
          taskSubnets: { subnetType: ec2.SubnetType.PUBLIC }, 
          assignPublicIp: true, 
          taskImageOptions: {
            image: cdk.aws_ecs.ContainerImage.fromRegistry(
              "011337674247.dkr.ecr.eu-north-1.amazonaws.com/quizly-backend:latest",
            ),
            containerPort: 8080,
            command: ["node", "dist/src/main.js"],
            environment: {
              NODE_ENV: "production",
              PORT: "8080",
              CLIENT_URL: "*",
              POSTGRES_HOST: dbInstance.dbInstanceEndpointAddress,
              POSTGRES_PORT: "5432",
              POSTGRES_USER: "postgres",
              POSTGRES_DB: "quizly",
              REDIS_HOST: redisCluster.attrRedisEndpointAddress,
              REDIS_PASSWORD: "Very_sTrOng_ReddIsss_dev_passsword",
              JWT_ACCESS_TOKEN_SECRET: "dev_access_secret_hulumulu",
              JWT_ACCESS_TOKEN_EXPIRES_IN: "6h",
              JWT_REFRESH_TOKEN_SECRET: "dev_refresh_secret_hulumulu",
              JWT_REFRESH_TOKEN_EXPIRES_IN: "7d",
              AUTH0_ISSUER_URL: "https://dev-6z6zh67brhm6ovej.us.auth0.com/",
              AUTH0_AUDIENCE: "https://quizly-api.com",
              DEPLOY_TIMESTAMP: new Date().toISOString(),
            },
            secrets: {
              POSTGRES_PASSWORD: cdk.aws_ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "password",
              ),
            },
          },
          publicLoadBalancer: true,
        },
      );

    loadBalancedFargateService.taskDefinition.addToExecutionRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      }),
    );

    dbInstance.connections.allowDefaultPortFrom(
      loadBalancedFargateService.service,
      "Allow ECS to connect to Postgres"
    );

    redisSG.addIngressRule(
      loadBalancedFargateService.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      "Allow ECS to connect to Redis",
    );

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/api/health",
      healthyThresholdCount: 2,
      interval: cdk.Duration.seconds(30),
    });
  }
}
