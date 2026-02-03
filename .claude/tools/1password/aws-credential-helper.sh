#!/bin/bash
# AWS credential helper using 1Password CLI
#
# This script is installed to ~/.aws/credential-helper.sh by `make setup`
# and referenced by ~/.aws/config:
#   [default]
#   credential_process = ~/.aws/credential-helper.sh
#
# Prerequisites:
#   - 1Password CLI installed: brew install --cask 1password-cli
#   - 1Password CLI authenticated: op signin
#   - AWS credentials stored in 1Password vault "Private" as "AWS Key"
#     with fields "Access Key ID" and "Secret Access Key"

set -euo pipefail

ACCESS_KEY=$(op read "op://Private/AWS Key/Access Key ID" 2>/dev/null)
SECRET_KEY=$(op read "op://Private/AWS Key/Secret Access Key" 2>/dev/null)

if [ -n "$ACCESS_KEY" ] && [ -n "$SECRET_KEY" ]; then
  # Output format required by AWS credential_process
  # See: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sourcing-external.html
  cat <<EOF
{
  "Version": 1,
  "AccessKeyId": "$ACCESS_KEY",
  "SecretAccessKey": "$SECRET_KEY"
}
EOF
else
  echo "Error: Failed to retrieve AWS credentials from 1Password" >&2
  echo "Ensure 1Password CLI is authenticated: op signin" >&2
  exit 1
fi
