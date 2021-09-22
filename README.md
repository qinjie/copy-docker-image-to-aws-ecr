# Copy Public Docker Images to AWS ECR

Tags: docker-image, docker-hug, pull-rate-limit, aws-cdk, aws-lambda, aws-ecr



## Problem

Docker Hub is starting to [introduce rate limits for anonymous users](https://docs.docker.com/docker-hub/download-rate-limit/). You docker image building in AWS Codepipeline may failed with following message if the build is too frequent. 

```
You have reached your pull rate limit. 
You may increase the limit by authenticating and upgrading.
```



## Solution

### AWS CLI Method

If you have access to AWS CLI for your AWS account, you may follow these steps to copy images to your AWS ECR. (Credit to [Aurore Malherbes](https://www.padok.fr/en/blog/docker-hub-rate-limit))

* Create a new ECR called `node-alpine` through the console or with Terraform depending on your IaC maturity
* Pull locally the node image, the one at the top of your Dockerfile `docker pull node:12-alpine`
* Tag it with your ECR url `docker tag node:12-alpine <AWS_ACCOUNT_ID>dkr.ecr.<AWS_REGION>.amazonaws.com/node-alpine:12`
* Push this image to your ECR: `docker push <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/node-alpine:12`
* Modify the first line of your Dockerfile from `FROM node:12-alpine` to `FROM node:<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/node-alpine:12`



### Python Script Method
Here is a [Python script in GitHub](https://github.com/wellcomecollection/platform-infrastructure/blob/4b16beef44efbe8faa9a62f5459ab6f706e07032/builds/copy_docker_images_to_ecr.py) to help to do similiar job as above. 

But it still requires access to your AWS account in command line.

### Lambda Method

This project package above Python script in Lambda function, and put it in a CDK project. The generated CloudFormation template can be used to deploy the Lambda function in CI/CD form to your AWS account.

* Generate CloudFormation template
	```
	cdk synth
	```
* Deploy template `copy-docker-image-to-ecr.template.json` in `cdk.out` to CloudFormation, which will create a codepipeline, and subsequently creates another stack to deploy the Lambda function.

