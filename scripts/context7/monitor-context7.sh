#!/bin/bash

# Context7 MCP Monitoring Script
# Monitors Context7 usage, rate limits, and performance metrics
# Usage: ./scripts/monitor-context7.sh [--interval SECONDS] [--duration MINUTES]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Monitoring configuration
INTERVAL=10  # Check interval in seconds
DURATION=0   # Duration in minutes (0 = continuous)
LOG_FILE="logs/context7-monitor.log"
METRICS_FILE="logs/context7-metrics.json"

# Metrics tracking
TOTAL_REQUESTS=0
SUCCESSFUL_REQUESTS=0
FAILED_REQUESTS=0
AVG_RESPONSE_TIME=0
RESPONSE_TIMES=()
START_TIME=$(date +%s)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_metric() {
    echo -e "${CYAN}[📈]${NC} $1"
}

# Create log directory if it doesn't exist
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$METRICS_FILE")"
    
    # Initialize log file with header
    if [ ! -f "$LOG_FILE" ]; then
        echo "Context7 MCP Monitor Log - Started $(date)" > "$LOG_FILE"
        echo "=========================================" >> "$LOG_FILE"
    fi
}

# Log message to file
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Test Context7 connectivity and measure response time
test_context7_response() {
    local start=$(date +%s%N)
    local status="success"
    local error_msg=""
    
    # Test Context7 command
    if ! npx -y @upstash/context7-mcp@latest --version &>/dev/null; then
        status="failed"
        error_msg="Failed to execute Context7 command"
    fi
    
    local end=$(date +%s%N)
    local response_time=$((($end - $start) / 1000000))  # Convert to milliseconds
    
    # Update metrics
    TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
    if [ "$status" = "success" ]; then
        SUCCESSFUL_REQUESTS=$((SUCCESSFUL_REQUESTS + 1))
    else
        FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
        log_message "ERROR: $error_msg"
    fi
    
    RESPONSE_TIMES+=("$response_time")
    
    # Return response time and status
    echo "$response_time:$status"
}

# Check HTTP endpoint status
check_http_endpoint() {
    local endpoint="https://mcp.context7.com/health"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    
    if [ "$http_code" = "200" ]; then
        echo "online"
    elif [ "$http_code" = "000" ]; then
        echo "unreachable"
    else
        echo "error:$http_code"
    fi
}

# Calculate average response time
calculate_average() {
    local sum=0
    local count=${#RESPONSE_TIMES[@]}
    
    if [ $count -eq 0 ]; then
        echo "0"
        return
    fi
    
    for time in "${RESPONSE_TIMES[@]}"; do
        sum=$((sum + time))
    done
    
    echo $((sum / count))
}

# Check rate limit status
check_rate_limit() {
    # Check if API key is configured
    local has_api_key="false"
    
    if [ -n "${CONTEXT7_API_KEY:-}" ]; then
        has_api_key="true"
    elif [ -f ".env" ] && grep -q "^CONTEXT7_API_KEY=" ".env"; then
        local key_value=$(grep "^CONTEXT7_API_KEY=" ".env" | cut -d'=' -f2)
        if [ "$key_value" != "your_api_key_here" ] && [ -n "$key_value" ]; then
            has_api_key="true"
        fi
    fi
    
    if [ "$has_api_key" = "true" ]; then
        echo "enhanced"
    else
        echo "default"
    fi
}

# Save metrics to JSON file
save_metrics() {
    local current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local uptime=$(($(date +%s) - START_TIME))
    local avg_response=$(calculate_average)
    local success_rate=0
    
    if [ $TOTAL_REQUESTS -gt 0 ]; then
        success_rate=$((SUCCESSFUL_REQUESTS * 100 / TOTAL_REQUESTS))
    fi
    
    # Create JSON metrics
    cat > "$METRICS_FILE" <<EOF
{
  "timestamp": "$current_time",
  "uptime_seconds": $uptime,
  "total_requests": $TOTAL_REQUESTS,
  "successful_requests": $SUCCESSFUL_REQUESTS,
  "failed_requests": $FAILED_REQUESTS,
  "success_rate": $success_rate,
  "average_response_time_ms": $avg_response,
  "rate_limit_tier": "$(check_rate_limit)"
}
EOF
    
    log_message "Metrics saved: Total=$TOTAL_REQUESTS, Success=$SUCCESSFUL_REQUESTS, Failed=$FAILED_REQUESTS, AvgResponse=${avg_response}ms"
}

# Display monitoring dashboard
show_dashboard() {
    clear
    echo "========================================"
    echo "   Context7 MCP Monitor Dashboard"
    echo "========================================"
    echo ""
    
    # Current time and uptime
    local current_time=$(date '+%Y-%m-%d %H:%M:%S')
    local uptime=$(($(date +%s) - START_TIME))
    local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime/3600)) $((uptime%3600/60)) $((uptime%60)))
    
    echo -e "${MAGENTA}🕰️  Time:${NC} $current_time"
    echo -e "${MAGENTA}⏱️  Uptime:${NC} $uptime_formatted"
    echo ""
    
    # Connection status
    echo -e "${CYAN}🌐 Connection Status${NC}"
    echo "-------------------------------"
    
    local http_status=$(check_http_endpoint)
    if [ "$http_status" = "online" ]; then
        echo -e "HTTP Endpoint: ${GREEN}Online${NC}"
    elif [ "$http_status" = "unreachable" ]; then
        echo -e "HTTP Endpoint: ${RED}Unreachable${NC}"
    else
        echo -e "HTTP Endpoint: ${YELLOW}Error (${http_status#error:})${NC}"
    fi
    
    local rate_limit=$(check_rate_limit)
    if [ "$rate_limit" = "enhanced" ]; then
        echo -e "Rate Limit Tier: ${GREEN}Enhanced (API Key)${NC}"
    else
        echo -e "Rate Limit Tier: ${YELLOW}Default (No API Key)${NC}"
    fi
    echo ""
    
    # Performance metrics
    echo -e "${CYAN}📊Performance Metrics${NC}"
    echo "-------------------------------"
    
    local avg_response=$(calculate_average)
    echo "Total Requests: $TOTAL_REQUESTS"
    echo -e "Successful: ${GREEN}$SUCCESSFUL_REQUESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_REQUESTS${NC}"
    
    if [ $TOTAL_REQUESTS -gt 0 ]; then
        local success_rate=$((SUCCESSFUL_REQUESTS * 100 / TOTAL_REQUESTS))
        if [ $success_rate -ge 95 ]; then
            echo -e "Success Rate: ${GREEN}${success_rate}%${NC}"
        elif [ $success_rate -ge 80 ]; then
            echo -e "Success Rate: ${YELLOW}${success_rate}%${NC}"
        else
            echo -e "Success Rate: ${RED}${success_rate}%${NC}"
        fi
    else
        echo "Success Rate: N/A"
    fi
    
    if [ $avg_response -lt 1000 ]; then
        echo -e "Avg Response Time: ${GREEN}${avg_response}ms${NC}"
    elif [ $avg_response -lt 3000 ]; then
        echo -e "Avg Response Time: ${YELLOW}${avg_response}ms${NC}"
    else
        echo -e "Avg Response Time: ${RED}${avg_response}ms${NC}"
    fi
    echo ""
    
    # Recent activity
    echo -e "${CYAN}📈 Recent Activity${NC}"
    echo "-------------------------------"
    
    if [ ${#RESPONSE_TIMES[@]} -gt 0 ]; then
        local last_5=("${RESPONSE_TIMES[@]: -5}")
        echo -n "Last 5 response times: "
        for time in "${last_5[@]}"; do
            if [ $time -lt 1000 ]; then
                echo -ne "${GREEN}${time}ms${NC} "
            elif [ $time -lt 3000 ]; then
                echo -ne "${YELLOW}${time}ms${NC} "
            else
                echo -ne "${RED}${time}ms${NC} "
            fi
        done
        echo ""
    else
        echo "No requests recorded yet"
    fi
    echo ""
    
    # Status indicators
    echo -e "${CYAN}🔍 Status Indicators${NC}"
    echo "-------------------------------"
    
    # Overall health
    if [ $FAILED_REQUESTS -eq 0 ] && [ $avg_response -lt 1000 ]; then
        echo -e "Overall Health: ${GREEN}✅ Excellent${NC}"
    elif [ $FAILED_REQUESTS -lt 5 ] && [ $avg_response -lt 3000 ]; then
        echo -e "Overall Health: ${YELLOW}⚠️  Good${NC}"
    else
        echo -e "Overall Health: ${RED}❌ Poor${NC}"
    fi
    
    # Recommendations
    if [ "$rate_limit" = "default" ]; then
        echo ""
        echo -e "${YELLOW}💡 Recommendation:${NC}"
        echo "  Consider adding an API key for enhanced rate limits."
        echo "  Get one at: https://context7.com/dashboard"
    fi
    
    if [ $avg_response -gt 3000 ]; then
        echo ""
        echo -e "${YELLOW}💡 Performance Issue:${NC}"
        echo "  Response times are slow. Check network connectivity."
    fi
    
    echo ""
    echo "-------------------------------"
    echo "Press Ctrl+C to stop monitoring"
    echo "Logs: $LOG_FILE"
    echo "Metrics: $METRICS_FILE"
}

# Signal handler for graceful shutdown
cleanup() {
    echo ""
    print_status "Stopping monitor..."
    save_metrics
    
    echo ""
    echo "========================================"
    echo "   Monitoring Session Summary"
    echo "========================================"
    echo ""
    
    local uptime=$(($(date +%s) - START_TIME))
    local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime/3600)) $((uptime%3600/60)) $((uptime%60)))
    
    echo "Session Duration: $uptime_formatted"
    echo "Total Requests: $TOTAL_REQUESTS"
    echo "Successful: $SUCCESSFUL_REQUESTS"
    echo "Failed: $FAILED_REQUESTS"
    
    if [ $TOTAL_REQUESTS -gt 0 ]; then
        local success_rate=$((SUCCESSFUL_REQUESTS * 100 / TOTAL_REQUESTS))
        echo "Success Rate: ${success_rate}%"
    fi
    
    local avg_response=$(calculate_average)
    echo "Average Response Time: ${avg_response}ms"
    echo ""
    echo "Logs saved to: $LOG_FILE"
    echo "Metrics saved to: $METRICS_FILE"
    echo ""
    
    exit 0
}

# Register signal handlers
trap cleanup SIGINT SIGTERM

# Main monitoring loop
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interval)
                INTERVAL="$2"
                shift 2
                ;;
            --duration)
                DURATION="$2"
                shift 2
                ;;
            --log-file)
                LOG_FILE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--interval SECONDS] [--duration MINUTES] [--log-file PATH]"
                echo ""
                echo "Options:"
                echo "  --interval SECONDS  Check interval in seconds (default: 10)"
                echo "  --duration MINUTES  Monitor duration in minutes (0 = continuous)"
                echo "  --log-file PATH    Path to log file (default: logs/context7-monitor.log)"
                echo "  --help            Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                          # Monitor continuously with 10s interval"
                echo "  $0 --interval 5             # Check every 5 seconds"
                echo "  $0 --duration 30            # Monitor for 30 minutes"
                echo "  $0 --interval 2 --duration 10  # Check every 2s for 10 minutes"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Setup logging
    setup_logging
    
    print_status "Starting Context7 MCP Monitor"
    print_status "Check interval: ${INTERVAL}s"
    
    if [ $DURATION -gt 0 ]; then
        print_status "Duration: ${DURATION} minutes"
        END_TIME=$(($(date +%s) + DURATION * 60))
    else
        print_status "Duration: Continuous (Ctrl+C to stop)"
    fi
    
    log_message "Monitor started - Interval: ${INTERVAL}s, Duration: ${DURATION}m"
    
    # Main monitoring loop
    while true; do
        # Check if duration has expired
        if [ $DURATION -gt 0 ] && [ $(date +%s) -ge $END_TIME ]; then
            print_status "Monitoring duration completed"
            cleanup
        fi
        
        # Test Context7 response
        local result=$(test_context7_response)
        local response_time="${result%%:*}"
        local status="${result##*:}"
        
        # Update dashboard
        show_dashboard
        
        # Save metrics periodically (every 10 checks)
        if [ $((TOTAL_REQUESTS % 10)) -eq 0 ] && [ $TOTAL_REQUESTS -gt 0 ]; then
            save_metrics
        fi
        
        # Wait for next interval
        sleep "$INTERVAL"
    done
}

# Run main function
main "$@"