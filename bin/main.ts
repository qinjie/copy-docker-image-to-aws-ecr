#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { PipelineStack } from "../lib/pipeline-stack";
import { LambdaStack } from "../lib/lambda-statck";
import { PermissionsBoundary } from "../cdk-common/permission-boundary";
import * as path from "path";
import { loadEnv } from "../cdk-common/stack-utils";

/* Load .env file */
require("dotenv").config();

const tags = {
  "Agency-Code": process.env.AGENCY_CODE! || "",
  "Project-Code": process.env.PROJECT_CODE! || "",
  Environment: process.env.ENVIRONMENT! || "",
  Zone: process.env.ZONE! || "",
  Tier: process.env.TIER! || "",
  "Project-Owner": process.env.PROJECT_OWNER! || "",
};

const project_code = process.env.PROJECT_CODE!;
const code_repo_name = process.env.CODE_REPO_NAME!;
const code_repo_branch = process.env.CODE_REPO_BRANCH!;
const code_repo_owner = process.env.CODE_REPO_OWNER!;
const code_repo_secret_var = process.env.CODE_REPO_SECRET_VAR!;
const src_path = process.env.SRC_PATH!;
const codepipeline_role_arn = process.env.AWS_CODEPIPELINE_ROLE_ARN!;
const cloudformation_role_arn = process.env.AWS_CLOUDFORMATION_ROLE_ARN!;
const artifact_bucket_name = process.env.AWS_ARTIFACT_BUCKET_NAME!;
const AWS_POLICY_PERM_BOUNDARY = process.env.AWS_POLICY_PERM_BOUNDARY!;

const app = new cdk.App();

/* Lambda Stack */
let environment = loadEnv(path.join(__dirname, "..", src_path, ".env"));
// Add AWS_ACOUNT_ID to environment variable
environment = { ...environment, AWS_ACCOUNT_ID: `${cdk.Aws.ACCOUNT_ID}` };

const lambdaStack = new LambdaStack(app, `${project_code}-lambda`, {
  project_code,
  handler: "main.lambda_handler",
  runtime: lambda.Runtime.PYTHON_3_8,
  timeout: cdk.Duration.seconds(30),
  environment,
  tags,
});

if (AWS_POLICY_PERM_BOUNDARY) {
  cdk.Aspects.of(lambdaStack).add(
    new PermissionsBoundary(AWS_POLICY_PERM_BOUNDARY)
  );
}

/* Pipeline Stack */
const pipelineStack = new PipelineStack(app, `${project_code}`, {
  project_code,
  code_repo_name,
  lambda_code: lambdaStack.lambdaCode,
  src_path,
  artifact_bucket_name,
  code_repo_branch,
  code_repo_owner,
  code_repo_secret_var,
  codepipeline_role_arn,
  cloudformation_role_arn,
  tags,
});

if (AWS_POLICY_PERM_BOUNDARY) {
  cdk.Aspects.of(pipelineStack).add(
    new PermissionsBoundary(AWS_POLICY_PERM_BOUNDARY)
  );
}

app.synth();
