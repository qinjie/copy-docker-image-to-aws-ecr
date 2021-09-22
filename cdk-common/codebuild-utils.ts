import * as codebuild from "@aws-cdk/aws-codebuild";
import * as cdk from "@aws-cdk/core";

export const createCdkBuildProject = (stack: cdk.Stack) =>
  new codebuild.PipelineProject(stack, `${stack.stackName}-CdkBuild`, {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: "npm install",
        },
        build: {
          commands: ["npm run build", "npm run cdk synth -- -o dist"],
        },
      },
      artifacts: {
        "base-directory": "dist",
        files: ["*.template.json"],
      },
    }),
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
    },
  });

export const createJavaScriptLambdaBuildProject = (
  stack: cdk.Stack,
  lambdaFolder: string
) =>
  new codebuild.PipelineProject(stack, `${stack.stackName}-LambdaBuild`, {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: [`cd ${lambdaFolder}`, "npm install"],
        },
        build: {
          commands: "npm run build",
        },
      },
      artifacts: {
        "base-directory": `${lambdaFolder}`,
        files: ["index.js", "node_modules/**/*"],
      },
    }),
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
    },
  });

export const createPythonLambdaBuildProject = (
  stack: cdk.Stack,
  lambdaFolder: string
) =>
  new codebuild.PipelineProject(stack, `${stack.stackName}-LambdaBuild`, {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: [
            `pip install -r ${lambdaFolder}/requirements.txt -t ${lambdaFolder}`,
          ],
        },
        build: {},
      },
      artifacts: {
        "base-directory": `${lambdaFolder}`,
        files: ["**/*"],
      },
    }),
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
    },
  });
