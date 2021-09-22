import * as codedeploy from "@aws-cdk/aws-codedeploy";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

export interface LambdaStackProps extends cdk.StackProps {
  project_code: string;
  handler?: string;
  runtime?: lambda.Runtime;
  timeout?: cdk.Duration;
  environment?: {
    [key: string]: string;
  };
}

export class LambdaStack extends cdk.Stack {
  public default_props: LambdaStackProps = {
    project_code: "",
    handler: "main.lambda_handler",
    runtime: lambda.Runtime.PYTHON_3_8,
    timeout: cdk.Duration.seconds(30),
    environment: {},
  };

  public lambdaCode: lambda.CfnParametersCode;

  constructor(app: cdk.App, id: string, props: LambdaStackProps) {
    super(app, id, props);

    props = {
      ...this.default_props,
      ...props,
    };

    this.lambdaCode = lambda.Code.fromCfnParameters();

    const func = new lambda.Function(this, `${props.project_code}-lambda`, {
      code: this.lambdaCode,
      handler: props!.handler!,
      runtime: props!.runtime!,
      description: `Function for project ${props.project_code}`,
      environment: props.environment,
      functionName: `${props.project_code}-lambda`,
    });

    func.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryPowerUser"
      )
    );

    const alias = new lambda.Alias(this, "LambdaAlias", {
      aliasName: "uat",
      version: func.currentVersion,
    });

    const application = new codedeploy.LambdaApplication(
      this,
      "CodeDeployApplication",
      {
        applicationName: `${props.project_code}`,
      }
    );

    new codedeploy.LambdaDeploymentGroup(this, "DeploymentGroup", {
      application,
      alias,
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
    });
  }
}
