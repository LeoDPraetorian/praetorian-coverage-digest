#!/bin/bash

# find-region-resources.sh
# Helper script to find AMI and VPC IDs for new AWS regions
# Usage: ./find-region-resources.sh <region>

set -e

REGION=${1:-}

if [[ -z "$REGION" ]]; then
    echo "Usage: $0 <region>"
    echo ""
    echo "Examples:"
    echo "  $0 eu-west-1"
    echo "  $0 eu-central-1"
    echo "  $0 ap-southeast-1"
    exit 1
fi

echo "🔍 Finding resources in region: $REGION"
echo ""

# Find Jammy Jellyfish AMI (Ubuntu 22.04)
echo "📦 Looking for Ubuntu Jammy Jellyfish AMI..."
AMI=$(aws ec2 describe-images \
    --region "$REGION" \
    --owners self \
    --filters "Name=description,Values=*Jammy*" \
    --query 'Images[0].ImageId' \
    --output text 2>/dev/null || echo "not-found")

if [[ "$AMI" == "not-found" ]] || [[ "$AMI" == "None" ]]; then
    echo "⚠️  No custom Jammy AMI found in $REGION"
    echo ""
    echo "   You may need to:"
    echo "   1. Copy the AMI from an existing region"
    echo "   2. Or use the canonical Ubuntu AMI"
    echo ""

    # Try to find canonical Ubuntu 22.04 AMI
    echo "   Searching for canonical Ubuntu 22.04 AMI..."
    AMI=$(aws ec2 describe-images \
        --region "$REGION" \
        --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text 2>/dev/null || echo "not-found")

    if [[ "$AMI" != "not-found" ]] && [[ "$AMI" != "None" ]]; then
        echo "   Found canonical: $AMI"
    fi
else
    echo "✅ Found custom AMI: $AMI"
fi

echo ""

# Find default VPC
echo "🌐 Looking for VPC..."
VPC=$(aws ec2 describe-vpcs \
    --region "$REGION" \
    --filters "Name=is-default,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text 2>/dev/null || echo "not-found")

if [[ "$VPC" == "not-found" ]] || [[ "$VPC" == "None" ]]; then
    echo "⚠️  No default VPC found in $REGION"
    echo ""
    echo "   Searching for any VPC..."
    VPC=$(aws ec2 describe-vpcs \
        --region "$REGION" \
        --query 'Vpcs[0].VpcId' \
        --output text 2>/dev/null || echo "not-found")

    if [[ "$VPC" != "not-found" ]] && [[ "$VPC" != "None" ]]; then
        echo "   Found VPC: $VPC"
    else
        echo "   No VPC found - you may need to create one"
    fi
else
    echo "✅ Found VPC: $VPC"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration for $REGION:"
echo ""
echo "    [\"$REGION\"]=\"$AMI\""
echo "    [\"$REGION\"]=\"$VPC\""
echo ""
echo "Add these to devpod/scripts/setup-devpod.sh"
echo ""
