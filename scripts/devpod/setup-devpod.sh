#!/usr/bin/env bash
set -e

# setup-devpod.sh
# Automated DevPod setup script for Chariot development team
# Configures AWS providers for all 5 regions with smart defaults

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_TYPE="c7i.4xlarge"
DISK_SIZE="100"
INACTIVITY_TIMEOUT="1h"

# AWS region configurations (parallel arrays for bash 3.2 compatibility)
REGIONS=(
    "us-east-1"
    "us-east-2"
    "us-west-1"
    "us-west-2"
    "eu-south-2"
    "ap-southeast-1"
)

AMIS=(
    "ami-0360c520857e3138f"
    "ami-0cfde0ea8edd312d4"
    "ami-00271c85bf8a52b84"
    "ami-03aa99ddf5498ceb9"
    "ami-0fd47a5cb59868dde"
    "ami-0f848f8b9ef98b461"
)

VPCS=(
    "vpc-05295a3b3e9c56627"
    "vpc-04ded0246f0e1cbb9"
    "vpc-060e44ce21af50236"
    "vpc-0092000be10e2c104"
    "vpc-0a680aa940edf918b"
    "vpc-0c8842df529f8211d"
)

# Print colored message
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check for AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        print_error "AWS credentials not configured"
        print_info "Please run: aws configure"
        exit 1
    fi
    print_success "AWS credentials configured"

    # Check if DevPod CLI is installed
    if ! command -v devpod &>/dev/null; then
        print_warning "DevPod CLI not installed"
        print_info "Installing DevPod CLI via Homebrew..."

        if command -v brew &>/dev/null; then
            brew install devpod
            print_success "DevPod CLI installed"
        else
            print_error "Homebrew not found. Please install DevPod manually:"
            print_info "https://devpod.sh/docs/getting-started/install#optional-install-devpod-cli"
            exit 1
        fi
    else
        print_success "DevPod CLI already installed ($(devpod version))"
    fi
}

# Configure providers for all regions
configure_providers() {
    print_header "Configuring AWS Providers"

    local configured_count=0

    # Iterate through parallel arrays
    for i in "${!REGIONS[@]}"; do
        local region="${REGIONS[$i]}"
        local ami="${AMIS[$i]}"
        local vpc="${VPCS[$i]}"
        local provider_name="aws-${region}"

        print_info "Configuring provider: $provider_name"

        # Check if provider already exists
        if devpod provider list 2>/dev/null | grep -q "^${provider_name}"; then
            print_warning "Provider $provider_name already exists, skipping"
            ((configured_count++))
            continue
        fi

        # Add provider
        if devpod provider add aws \
            --name "$provider_name" \
            -o AWS_REGION="$region" \
            -o AWS_AMI="$ami" \
            -o AWS_INSTANCE_TYPE="$INSTANCE_TYPE" \
            -o AWS_DISK_SIZE="$DISK_SIZE" \
            -o AWS_VPC_ID="$vpc" \
            -o INACTIVITY_TIMEOUT="$INACTIVITY_TIMEOUT" \
            --silent 2>/dev/null; then
            print_success "Configured $provider_name"
            ((configured_count++))
        else
            print_error "Failed to configure $provider_name"
        fi
    done

    echo ""
    print_success "Configured $configured_count of ${#REGIONS[@]} providers"
}

# Select optimal region based on latency
select_default_region() {
    print_header "Selecting Optimal Region"

    print_info "Testing latency to all regions..."
    print_info "This may take 10-15 seconds..."
    echo ""

    local fastest_region=""
    local fastest_time=9999

    # Iterate through regions
    for i in "${!REGIONS[@]}"; do
        local region="${REGIONS[$i]}"
        local endpoint="dynamodb.${region}.amazonaws.com"

        # Use curl to measure connection time (more reliable than ping)
        local latency=$(curl -o /dev/null -s -w '%{time_connect}\n' "https://${endpoint}" 2>/dev/null || echo "999")

        # Convert to milliseconds
        local latency_ms=$(echo "$latency * 1000" | bc 2>/dev/null || echo "999")
        local latency_rounded=$(printf "%.0f" "$latency_ms")

        # Print result with color coding
        if (( latency_rounded < 100 )); then
            echo -e "  ${GREEN}$region: ${latency_rounded}ms${NC}"
        elif (( latency_rounded < 200 )); then
            echo -e "  ${YELLOW}$region: ${latency_rounded}ms${NC}"
        else
            echo -e "  ${RED}$region: ${latency_rounded}ms${NC}"
        fi

        # Track fastest
        if (( latency_rounded < fastest_time )); then
            fastest_time=$latency_rounded
            fastest_region=$region
        fi
    done

    echo ""
    print_success "Fastest region: $fastest_region (${fastest_time}ms)"

    # Ask user if they want to use the fastest region or choose manually
    echo ""
    read -p "Use $fastest_region as default provider? [Y/n]: " choice
    choice=${choice:-Y}

    if [[ "$choice" =~ ^[Yy]$ ]]; then
        devpod provider use "aws-${fastest_region}"
        print_success "Default provider set to aws-${fastest_region}"
    else
        print_info "Available providers:"
        devpod provider list | grep "^aws-"
        echo ""
        read -p "Enter region to use as default (e.g., us-east-1): " selected_region

        if [[ -n "$selected_region" ]] && devpod provider list 2>/dev/null | grep -q "^aws-${selected_region}"; then
            devpod provider use "aws-${selected_region}"
            print_success "Default provider set to aws-${selected_region}"
        else
            print_error "Invalid region selected"
            exit 1
        fi
    fi
}

# Display summary
show_summary() {
    print_header "Setup Complete!"

    echo "📋 Configuration Summary:"
    echo ""
    echo "  Providers configured: ${#REGIONS[@]}"
    echo "  Instance type: $INSTANCE_TYPE"
    echo "  Disk size: ${DISK_SIZE}GB"
    echo "  Inactivity timeout: $INACTIVITY_TIMEOUT"
    echo ""

    print_info "Active providers:"
    devpod provider list | grep "^aws-" || true
    echo ""

    print_info "Default provider:"
    devpod provider list 2>/dev/null | grep " (Default)" || echo "  None set"
    echo ""

    print_header "Next Steps"

    echo "1️⃣  Create a workspace:"
    echo "   ${BLUE}devpod up github.com/praetorian-inc/chariot-development-platform --id my-workspace${NC}"
    echo ""
    echo "2️⃣  Or use the Makefile:"
    echo "   ${BLUE}make devpod-create WORKSPACE=my-workspace IDE=cursor${NC}"
    echo ""
    echo "3️⃣  Switch regions anytime:"
    echo "   ${BLUE}devpod provider use aws-us-west-2${NC}"
    echo "   ${BLUE}# Or run: ./devpod/scripts/select-region.sh${NC}"
    echo ""
    echo "4️⃣  List all workspaces:"
    echo "   ${BLUE}devpod list${NC}"
    echo ""

    print_success "DevPod is ready for development!"
}

# Main execution
main() {
    print_header "DevPod Setup for Chariot Development"

    print_info "This script will:"
    echo "  • Verify AWS credentials"
    echo "  • Install DevPod CLI (if needed)"
    echo "  • Configure AWS providers for all 5 regions"
    echo "  • Test latency and select optimal region"
    echo ""

    read -p "Continue? [Y/n]: " confirm
    confirm=${confirm:-Y}

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "Setup cancelled"
        exit 0
    fi

    check_prerequisites
    configure_providers
    select_default_region
    show_summary
}

# Run main function
main
