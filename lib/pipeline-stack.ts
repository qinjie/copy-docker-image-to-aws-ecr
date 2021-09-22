import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as kms from "@aws-cdk/aws-kms";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as lambda from "@aws-cdk/aws-lambda";
import {
  createCdkBuildProject,
  createPythonLambdaBuildProject,
} from "../cdk-common/codebuild-utils";

export interface PipelineStackProps extends cdk.StackProps {
  lambda_code: lambda.CfnParametersCode;
  project_code?: string;
  src_path: string;
  code_repo_name: string;
  code_repo_branch: string;
  code_repo_owner?: string;
  code_repo_secret_var?: string;
  codepipeline_role_arn: string;
  cloudformation_role_arn: string;
  artifact_bucket_name: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, `${props.project_code}-key`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      alias: `${props.project_code}-key`,
    });

    const artifactBucket = s3.Bucket.fromBucketAttributes(
      this,
      "ArtifactBucket",
      {
        bucketName: props.artifact_bucket_name,
        encryptionKey: key,
      }
    );

    const pipelineRole = iam.Role.fromRoleArn(
      this,
      "CodePipelineRole",
      props.codepipeline_role_arn
    );

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      artifactBucket,
      role: pipelineRole,
      pipelineName: props.project_code,
    });

    /* Source Stage */
    const sourceOutput = new codepipeline.Artifact();

    // const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
    //   actionName: "CodeCommit_Source",
    //   repository: codecommit.Repository.fromRepositoryName(
    //     this,
    //     "CodeRepo",
    //     props.code_repo_name
    //   ),
    //   branch: props.code_repo_branch,
    //   output: sourceOutput,
    //   role: pipelineRole,
    // });

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      repo: props.code_repo_name,
      branch: props.code_repo_branch,
      owner: props.code_repo_owner!,
      oauthToken: cdk.SecretValue.secretsManager(props.code_repo_secret_var!),
      output: sourceOutput,
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    });

    /* Build Stage */
    const cdkBuild = createCdkBuildProject(this);
    const cdkBuildOutput = new codepipeline.Artifact();

    const lambdaBuild = createPythonLambdaBuildProject(this, props.src_path);
    const lambdaBuildOuptut = new codepipeline.Artifact();

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "CDK_Build",
          project: cdkBuild,
          input: sourceOutput,
          outputs: [cdkBuildOutput],
          role: pipelineRole,
        }),
        new codepipeline_actions.CodeBuildAction({
          actionName: "Lambda_Build",
          project: lambdaBuild,
          input: sourceOutput,
          outputs: [lambdaBuildOuptut],
          role: pipelineRole,
        }),
      ],
    });

    /* Deploy Stage */
    const cloudformationRole = iam.Role.fromRoleArn(
      this,
      "CloudformationRole",
      props.cloudformation_role_arn
    );

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: "Deploy",
          templatePath: cdkBuildOutput.atPath(
            `${props.project_code}-lambda.template.json`
          ),
          stackName: `${props.project_code}-lambda`,
          adminPermissions: true,
          parameterOverrides: {
            // Pass location of lambda code to Lambda Stack
            ...props.lambda_code.assign(lambdaBuildOuptut.s3Location),
          },
          extraInputs: [lambdaBuildOuptut],
          deploymentRole: cloudformationRole,
        }),
      ],
    });
  }
}
