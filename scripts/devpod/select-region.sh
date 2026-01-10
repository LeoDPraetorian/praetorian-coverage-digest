#!/usr/bin/env bash
set -e

# select-region.sh
# Quick region selection tool based on latency testing
# Use this to switch regions when traveling or if performance degrades

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS regions
REGIONS=("us-east-1" "us-east-2" "us-west-1" "us-west-2" "eu-south-2" "ap-southeast-1")

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

# Test latency to all regions
test_latency() {
    print_header "Testing Latency to AWS Regions"

    print_info "Measuring connection times..."
    print_info "This may take 10-15 seconds..."
    echo ""

    local fastest_region=""
    local fastest_time=9999

    for region in "${REGIONS[@]}"; do
        local endpoint="dynamodb.${region}.amazonaws.com"

        # Use curl to measure connection time
        local latency=$(curl -o /dev/null -s -w '%{time_connect}\n' "https://${endpoint}" 2>/dev/null || echo "999")

        # Convert to milliseconds
        local latency_ms=$(echo "$latency * 1000" | bc 2>/dev/null || echo "999")
        local latency_rounded=$(printf "%.0f" "$latency_ms")

        # Print result with color coding
        if (( latency_rounded < 100 )); then
            echo -e "  ${GREEN}$region: ${latency_rounded}ms ⚡${NC}"
        elif (( latency_rounded < 200 )); then
            echo -e "  ${YELLOW}$region: ${latency_rounded}ms${NC}"
        else
            echo -e "  ${RED}$region: ${latency_rounded}ms 🐌${NC}"
        fi

        # Track fastest
        if (( latency_rounded < fastest_time )); then
            fastest_time=$latency_rounded
            fastest_region=$region
        fi
    done

    echo ""
    print_success "Fastest region: $fastest_region (${fastest_time}ms)"
    echo "$fastest_region"
}

# Show current provider
show_current() {
    print_header "Current DevPod Configuration"

    local current=$(devpod provider list 2>/dev/null | grep " (Default)" | awk '{print $1}' || echo "none")

    if [[ "$current" == "none" ]]; then
        print_warning "No default provider set"
    else
        print_info "Current default provider: ${GREEN}$current${NC}"

        # Extract region from provider name (e.g., aws-us-east-1 -> us-east-1)
        local region=$(echo "$current" | sed 's/aws-//')
        if [[ -n "$region" ]]; then
            print_info "Testing latency to current region..."
            local endpoint="dynamodb.${region}.amazonaws.com"
            local latency=$(curl -o /dev/null -s -w '%{time_connect}\n' "https://${endpoint}" 2>/dev/null || echo "999")
            local latency_ms=$(echo "$latency * 1000" | bc 2>/dev/null || echo "999")
            local latency_rounded=$(printf "%.0f" "$latency_ms")

            if (( latency_rounded < 100 )); then
                echo -e "  Current latency: ${GREEN}${latency_rounded}ms ⚡${NC}"
            elif (( latency_rounded < 200 )); then
                echo -e "  Current latency: ${YELLOW}${latency_rounded}ms${NC}"
            else
                echo -e "  Current latency: ${RED}${latency_rounded}ms 🐌${NC}"
                print_warning "Consider switching to a faster region"
            fi
        fi
    fi
}

# Switch to specified region
switch_region() {
    local region=$1
    local provider_name="aws-${region}"

    print_header "Switching Region"

    # Check if provider exists
    if ! devpod provider list 2>/dev/null | grep -q "^${provider_name}"; then
        print_error "Provider $provider_name not found"
        print_info "Available providers:"
        devpod provider list | grep "^aws-" || print_warning "No AWS providers configured"
        print_info ""
        print_info "Run: make devpod-setup-provider"
        print_info "Or: ./devpod/scripts/setup-devpod.sh"
        exit 1
    fi

    # Switch provider
    if devpod provider use "$provider_name"; then
        print_success "Switched to $provider_name"

        # Test new region latency
        print_info "Testing latency to new region..."
        local endpoint="dynamodb.${region}.amazonaws.com"
        local latency=$(curl -o /dev/null -s -w '%{time_connect}\n' "https://${endpoint}" 2>/dev/null || echo "999")
        local latency_ms=$(echo "$latency * 1000" | bc 2>/dev/null || echo "999")
        local latency_rounded=$(printf "%.0f" "$latency_ms")

        if (( latency_rounded < 100 )); then
            echo -e "  New latency: ${GREEN}${latency_rounded}ms ⚡${NC}"
        elif (( latency_rounded < 200 )); then
            echo -e "  New latency: ${YELLOW}${latency_rounded}ms${NC}"
        else
            echo -e "  New latency: ${RED}${latency_rounded}ms${NC}"
        fi

        echo ""
        print_info "New workspaces will be created in $region"
        print_warning "Existing workspaces remain in their current regions"
    else
        print_error "Failed to switch to $provider_name"
        exit 1
    fi
}

# Interactive region selection
interactive_select() {
    print_header "Interactive Region Selection"

    # Test latency first
    fastest=$(test_latency)

    echo ""
    read -p "Switch to fastest region ($fastest)? [Y/n]: " choice
    choice=${choice:-Y}

    if [[ "$choice" =~ ^[Yy]$ ]]; then
        switch_region "$fastest"
    else
        echo ""
        print_info "Available providers:"
        devpod provider list | grep "^aws-" || print_warning "No AWS providers configured"
        echo ""
        read -p "Enter region to use (e.g., us-east-1): " selected_region

        if [[ -n "$selected_region" ]]; then
            switch_region "$selected_region"
        else
            print_warning "No region selected, keeping current configuration"
        fi
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [REGION]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -c, --current           Show current provider and latency"
    echo "  -t, --test              Test latency to all regions"
    echo "  -f, --fastest           Auto-switch to fastest region"
    echo "  -i, --interactive       Interactive region selection (default)"
    echo ""
    echo "Region:"
    echo "  us-east-1               Switch to US East (Virginia)"
    echo "  us-east-2               Switch to US East (Ohio)"
    echo "  us-west-1               Switch to US West (California)"
    echo "  us-west-2               Switch to US West (Oregon)"
    echo "  eu-south-2              Switch to EU (Spain)"
    echo "  ap-southeast-1          Switch to Asia Pacific (Singapore)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Interactive selection with latency test"
    echo "  $0 --fastest            # Auto-switch to fastest region"
    echo "  $0 --current            # Show current provider"
    echo "  $0 us-west-2            # Switch to us-west-2"
}

# Main execution
main() {
    # Check if devpod is installed
    if ! command -v devpod &>/dev/null; then
        print_error "DevPod CLI not installed"
        print_info "Run: make devpod-install"
        print_info "Or: brew install devpod"
        exit 1
    fi

    # Parse arguments
    case "${1:-}" in
        -h|--help)
            usage
            exit 0
            ;;
        -c|--current)
            show_current
            exit 0
            ;;
        -t|--test)
            test_latency
            exit 0
            ;;
        -f|--fastest)
            fastest=$(test_latency)
            switch_region "$fastest"
            exit 0
            ;;
        -i|--interactive)
            interactive_select
            exit 0
            ;;
        us-east-1|us-east-2|us-west-1|us-west-2|eu-south-2|ap-southeast-1)
            switch_region "$1"
            exit 0
            ;;
        "")
            interactive_select
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
