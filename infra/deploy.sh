#!/bin/bash
# Deploy SportsManager Frontend
# Uso: ./infra/deploy.sh [stack-name] [region]

STACK_NAME=${1:-sports-manager-frontend}
REGION=${2:-us-east-1}

echo "=== 1. Creando/Actualizando stack CloudFormation ==="
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides ProjectName=sports-manager \
  --no-fail-on-empty-changeset

echo "=== 2. Obteniendo outputs ==="
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text)

echo "Bucket: $BUCKET_NAME"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "URL: $WEBSITE_URL"

echo "=== 3. Build del proyecto ==="
npm run build

echo "=== 4. Subiendo archivos a S3 ==="
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete --region $REGION

echo "=== 5. Invalidando cache de CloudFront ==="
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region $REGION

echo ""
echo "=== Deploy completado ==="
echo "URL: $WEBSITE_URL"
