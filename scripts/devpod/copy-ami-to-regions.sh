#!/usr/bin/env bash
set -e

# copy-ami-to-regions.sh
# Copy custom DevPod AMI to new regions for consistency
# This ensures all regions use the same base image

# Check bash version (requires 4.0+ for associative arrays)
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "❌ Error: This script requires Bash 4.0 or higher"
    echo "Current version: ${BASH_VERSION}"
    echo ""
    echo "On macOS, install modern bash:"
    echo "  brew install bash"
    echo ""
    echo "Note: This script is for advanced AMI management."
    echo "For standard DevPod setup, use: make devpod-setup-provider"
    exit 1
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOURCE_REGION="us-east-1"
SOURCE_AMI="ami-0360c520857e3138f"
TARGET_REGIONS=("ap-southeast-1")

# Global associative array for new AMI IDs
declare -A NEW_AMIS

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

    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        print_error "AWS credentials not configured"
        print_info "Please run: aws configure"
        exit 1
    fi
    print_success "AWS credentials configured"

    # Check source AMI exists
    print_info "Verifying source AMI: $SOURCE_AMI in $SOURCE_REGION"
    if ! aws ec2 describe-images --region "$SOURCE_REGION" --image-ids "$SOURCE_AMI" &>/dev/null; then
        print_error "Source AMI not found: $SOURCE_AMI"
        exit 1
    fi
    print_success "Source AMI verified"

    # Get source AMI details
    print_info "Fetching source AMI details..."
    AMI_NAME=$(aws ec2 describe-images \
        --region "$SOURCE_REGION" \
        --image-ids "$SOURCE_AMI" \
        --query 'Images[0].Name' \
        --output text)

    AMI_DESC=$(aws ec2 describe-images \
        --region "$SOURCE_REGION" \
        --image-ids "$SOURCE_AMI" \
        --query 'Images[0].Description' \
        --output text)

    echo "  Name: $AMI_NAME"
    echo "  Description: $AMI_DESC"
}

# Copy AMI to target region
copy_ami_to_region() {
    local target_region=$1

    print_header "Copying AMI to $target_region"

    # Check if AMI already exists in target region
    print_info "Checking if AMI already exists in $target_region..."
    EXISTING_AMI=$(aws ec2 describe-images \
        --region "$target_region" \
        --owners self \
        --filters "Name=name,Values=$AMI_NAME" \
        --query 'Images[0].ImageId' \
        --output text 2>/dev/null || echo "None")

    if [[ "$EXISTING_AMI" != "None" ]] && [[ -n "$EXISTING_AMI" ]]; then
        print_warning "AMI already exists in $target_region: $EXISTING_AMI"
        echo "  Skipping copy operation"
        NEW_AMIS["$target_region"]="$EXISTING_AMI"
        return 0
    fi

    # Copy AMI
    print_info "Initiating AMI copy to $target_region..."
    print_warning "This may take 5-10 minutes per region..."

    NEW_AMI=$(aws ec2 copy-image \
        --source-region "$SOURCE_REGION" \
        --source-image-id "$SOURCE_AMI" \
        --region "$target_region" \
        --name "$AMI_NAME" \
        --description "$AMI_DESC" \
        --query 'ImageId' \
        --output text)

    if [[ -z "$NEW_AMI" ]]; then
        print_error "Failed to initiate AMI copy to $target_region"
        return 1
    fi

    print_success "AMI copy initiated: $NEW_AMI"
    print_info "Waiting for AMI to become available..."

    # Wait for AMI to be available
    local wait_count=0
    local max_wait=60  # 10 minutes (60 * 10 seconds)

    while [ $wait_count -lt $max_wait ]; do
        AMI_STATE=$(aws ec2 describe-images \
            --region "$target_region" \
            --image-ids "$NEW_AMI" \
            --query 'Images[0].State' \
            --output text 2>/dev/null || echo "error")

        if [[ "$AMI_STATE" == "available" ]]; then
            print_success "AMI available in $target_region: $NEW_AMI"
            NEW_AMIS["$target_region"]="$NEW_AMI"
            return 0
        elif [[ "$AMI_STATE" == "failed" ]] || [[ "$AMI_STATE" == "error" ]]; then
            print_error "AMI copy failed in $target_region"
            return 1
        fi

        echo -ne "  Status: $AMI_STATE... (${wait_count}/${max_wait})\r"
        sleep 10
        ((wait_count++))
    done

    print_error "Timeout waiting for AMI in $target_region"
    return 1
}

# Update setup script with new AMI IDs
update_setup_script() {
    print_header "Updating Setup Scripts"

    local script_path="devpod/scripts/setup-devpod.sh"

    print_info "Backing up setup script..."
    cp "$script_path" "${script_path}.backup"
    print_success "Backup created: ${script_path}.backup"

    print_info "Updating AMI IDs in setup script..."

    for region in "${!NEW_AMIS[@]}"; do
        local new_ami="${NEW_AMIS[$region]}"
        print_info "  $region: $new_ami"

        # Update the AMI ID in the script
        sed -i.tmp "s/\[\"$region\"\]=\"ami-[a-z0-9]*\"/[\"$region\"]=\"$new_ami\"/" "$script_path"
    done

    rm -f "${script_path}.tmp"
    print_success "Setup script updated with new AMI IDs"
}

# Show summary
show_summary() {
    print_header "AMI Copy Complete!"

    echo "📋 New AMI IDs by Region:"
    echo ""
    for region in "${!NEW_AMIS[@]}"; do
        echo "  $region: ${NEW_AMIS[$region]}"
    done
    echo ""

    print_info "The following files have been updated:"
    echo "  • devpod/scripts/setup-devpod.sh"
    echo ""

    print_info "Backup created:"
    echo "  • devpod/scripts/setup-devpod.sh.backup"
    echo ""

    print_header "Next Steps"

    echo "1️⃣  Verify the updated AMI IDs:"
    echo "   ${BLUE}cat devpod/scripts/setup-devpod.sh | grep -A 8 'REGION_AMIS='${NC}"
    echo ""
    echo "2️⃣  Test the setup script:"
    echo "   ${BLUE}make devpod-setup-provider${NC}"
    echo ""
    echo "3️⃣  Update devpod/README.md with new AMI IDs (manual step)"
    echo ""
    echo "4️⃣  Commit the changes:"
    echo "   ${BLUE}git add devpod/scripts/setup-devpod.sh${NC}"
    echo "   ${BLUE}git commit -m 'chore: update DevPod AMIs for new regions'${NC}"
    echo ""

    print_success "All AMIs successfully copied!"
}

# Main execution
main() {
    print_header "DevPod AMI Copy Tool"

    print_info "This script will:"
    echo "  • Copy AMI from $SOURCE_REGION to new regions"
    echo "  • Target regions: ${TARGET_REGIONS[*]}"
    echo "  • Update setup-devpod.sh with new AMI IDs"
    echo ""
    print_warning "This process may take 15-30 minutes total"
    echo ""

    read -p "Continue? [Y/n]: " confirm
    confirm=${confirm:-Y}

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "AMI copy cancelled"
        exit 0
    fi

    check_prerequisites

    # Copy to each target region
    local failed_regions=()
    for region in "${TARGET_REGIONS[@]}"; do
        if ! copy_ami_to_region "$region"; then
            failed_regions+=("$region")
        fi
    done

    # Check if any copies failed
    if [ ${#failed_regions[@]} -gt 0 ]; then
        print_error "AMI copy failed for regions: ${failed_regions[*]}"
        print_warning "You can retry later or continue with canonical AMIs"
        exit 1
    fi

    # Update scripts if we have new AMIs
    if [ ${#NEW_AMIS[@]} -gt 0 ]; then
        update_setup_script
        show_summary
    else
        print_warning "No AMIs were copied (all already exist)"
    fi
}

# Run main function
main
