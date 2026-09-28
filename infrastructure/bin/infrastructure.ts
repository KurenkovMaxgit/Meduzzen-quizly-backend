#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { QuizlyInfrastructureStack } from "../lib/infrastructure-stack";

const app = new cdk.App();
new QuizlyInfrastructureStack(app, "QuizlyInfrastructureStack", {
  env: {
    account: "011337674247",
    region: "eu-north-1",
  },
});
