#!/bin/bash
set -e

echo "Initializing LocalStack S3..."
awslocal s3 mb s3://mail-maker-assets
awslocal s3api put-bucket-acl --bucket mail-maker-assets --acl public-read
echo "S3 bucket 'mail-maker-assets' created with public-read ACL."
