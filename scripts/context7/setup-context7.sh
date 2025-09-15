#!/bin/bash

# Context7 MCP Team Setup Script
# Automates Context7 integration for the Chariot Development Platform
# Usage: ./scripts/setup-context7.sh [--api-key YOUR_KEY] [--no-interactive]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTEXT7_VERSION="latest"
MIN_NODE_VERSION="18.0.0"
CONFIG_DIR="$(pwd)"
ENV_FILE="$(pwd)/.env"
ENV_EXAMPLE_FILE="$(pwd)/.env.example"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check Node.js version
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v${MIN_NODE_VERSION} or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [ "$(printf '%s\n' "$MIN_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$MIN_NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is below minimum required version $MIN_NODE_VERSION"
        exit 1
    fi
    
    print_success "Node.js version $NODE_VERSION meets requirements"
}

# Function to validate API key format
validate_api_key() {
    local key="$1"
    if [[ ! "$key" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        return 1
    fi
    return 0
}

# Function to test Context7 installation
test_context7() {
    print_status "Testing Context7 MCP server installation..."
    
    # Test basic npx execution with help flag
    if npx -y @upstash/context7-mcp@latest --help &>/dev/null; then
        print_success "Context7 MCP server is accessible"
        return 0
    else
        print_error "Failed to access Context7 MCP server"
        return 1
    fi
}

# Function to backup existing configuration
backup_config() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        print_status "Backed up $file to $backup"
    fi
}

# Function to update MCP configuration
update_mcp_config() {
    local config_file="$CONFIG_DIR/mcp.json"
    local api_key="$1"
    
    print_status "Updating MCP configuration at $config_file"
    
    # Backup existing configuration
    backup_config "$config_file"
    
    # Create config directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"
    
    # Check if configuration exists
    if [ ! -f "$config_file" ]; then
        print_status "Creating new MCP configuration file"
        echo '{"mcpServers": {}}' > "$config_file"
    fi
    
    # Update configuration using Node.js for proper JSON handling
    node -e "
        const fs = require('fs');
        const configPath = '$config_file';
        
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Add Context7 configuration
        config.mcpServers = config.mcpServers || {};
        
        // STDIO configuration
        config.mcpServers.context7 = {
            command: 'npx',
            args: [
                '-y',
                '@upstash/context7-mcp@$CONTEXT7_VERSION'
            ],
            alwaysAllow: [
                'get_documentation',
                'search_documentation',
                'get_examples',
                'get_latest_version'
            ]
        };
        
        // Add API key if provided
        if ('$api_key') {
            config.mcpServers.context7.args.push('--api-key');
            config.mcpServers.context7.args.push('\${env:CONTEXT7_API_KEY}');
        }
        
        // HTTP configuration for fallback
        config.mcpServers['context7-http'] = {
            url: 'https://mcp.context7.com/mcp'
        };
        
        if ('$api_key') {
            config.mcpServers['context7-http'].headers = {
                'CONTEXT7_API_KEY': '\${env:CONTEXT7_API_KEY}'
            };
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Configuration updated successfully');
    " || {
        print_error "Failed to update MCP configuration"
        exit 1
    }
    
    print_success "MCP configuration updated"
}

# Function to update environment files
update_env_files() {
    local api_key="$1"
    
    if [ -z "$api_key" ]; then
        print_warning "No API key provided. Skipping environment file update."
        return
    fi
    
    print_status "Updating environment files"
    
    # Update .env file
    if [ -f "$ENV_FILE" ]; then
        backup_config "$ENV_FILE"
        
        # Check if CONTEXT7_API_KEY already exists
        if grep -q "^CONTEXT7_API_KEY=" "$ENV_FILE"; then
            # Update existing key
            sed -i.tmp "s/^CONTEXT7_API_KEY=.*/CONTEXT7_API_KEY=$api_key/" "$ENV_FILE"
            rm -f "${ENV_FILE}.tmp"
            print_status "Updated existing CONTEXT7_API_KEY in .env"
        else
            # Add new key
            echo "" >> "$ENV_FILE"
            echo "# Context7 MCP Configuration" >> "$ENV_FILE"
            echo "CONTEXT7_API_KEY=$api_key" >> "$ENV_FILE"
            print_status "Added CONTEXT7_API_KEY to .env"
        fi
    else
        # Create new .env file
        echo "# Context7 MCP Configuration" > "$ENV_FILE"
        echo "CONTEXT7_API_KEY=$api_key" >> "$ENV_FILE"
        print_status "Created new .env file with CONTEXT7_API_KEY"
    fi
    
    # Update .env.example file
    if [ ! -f "$ENV_EXAMPLE_FILE" ] || ! grep -q "^CONTEXT7_API_KEY=" "$ENV_EXAMPLE_FILE"; then
        echo "" >> "$ENV_EXAMPLE_FILE"
        echo "# Context7 MCP Configuration (Optional - enhances rate limits)" >> "$ENV_EXAMPLE_FILE"
        echo "CONTEXT7_API_KEY=your_api_key_here" >> "$ENV_EXAMPLE_FILE"
        print_status "Updated .env.example with Context7 template"
    fi
    
    print_success "Environment files updated"
}

# Function to update module configurations
update_module_configs() {
    local api_key="$1"
    
    print_status "Updating module-specific configurations"
    
    # List of modules that should have Context7 configuration
    local modules=(
        "chariot"
        "claude-flow"
        "nebula"
        "janus-framework"
        "chariot-ui-components"
        "chariot-devops"
    )
    
    for module in "${modules[@]}"; do
        local module_path="modules/$module"
        
        if [ -d "$module_path" ]; then
            # Check for .cursor directory
            if [ -d "$module_path/.cursor" ]; then
                local module_config="$module_path/.cursor/mcp.json"
                print_status "Updating configuration for module: $module"
                
                # Create .cursor directory if needed
                mkdir -p "$module_path/.cursor"
                
                # Copy global configuration if module doesn't have one
                if [ ! -f "$module_config" ]; then
                    cp "$CONFIG_DIR/mcp.json" "$module_config"
                    print_status "Created MCP configuration for $module"
                else
                    # Merge Context7 configuration into existing
                    backup_config "$module_config"
                    
                    node -e "
                        const fs = require('fs');
                        const configPath = '$module_config';
                        const globalConfig = JSON.parse(fs.readFileSync('$CONFIG_DIR/mcp.json', 'utf8'));
                        let moduleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        
                        // Merge Context7 configurations
                        moduleConfig.mcpServers = moduleConfig.mcpServers || {};
                        if (globalConfig.mcpServers.context7) {
                            moduleConfig.mcpServers.context7 = globalConfig.mcpServers.context7;
                        }
                        if (globalConfig.mcpServers['context7-http']) {
                            moduleConfig.mcpServers['context7-http'] = globalConfig.mcpServers['context7-http'];
                        }
                        
                        fs.writeFileSync(configPath, JSON.stringify(moduleConfig, null, 2));
                    " || print_warning "Failed to update $module configuration"
                fi
            fi
            
            # Check for .roo directory (alternative configuration location)
            if [ -d "$module_path/.roo" ]; then
                local module_config="$module_path/.roo/mcp.json"
                if [ -f "$module_config" ]; then
                    backup_config "$module_config"
                    # Similar merge logic for .roo configurations
                    node -e "
                        const fs = require('fs');
                        const configPath = '$module_config';
                        const globalConfig = JSON.parse(fs.readFileSync('$CONFIG_DIR/mcp.json', 'utf8'));
                        let moduleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        
                        moduleConfig.mcpServers = moduleConfig.mcpServers || {};
                        if (globalConfig.mcpServers.context7) {
                            moduleConfig.mcpServers.context7 = globalConfig.mcpServers.context7;
                        }
                        if (globalConfig.mcpServers['context7-http']) {
                            moduleConfig.mcpServers['context7-http'] = globalConfig.mcpServers['context7-http'];
                        }
                        
                        fs.writeFileSync(configPath, JSON.stringify(moduleConfig, null, 2));
                    " || print_warning "Failed to update $module .roo configuration"
                fi
            fi
        fi
    done
    
    print_success "Module configurations updated"
}

# Function to display setup summary
show_summary() {
    local api_key="$1"
    
    echo ""
    echo "========================================"
    echo "   Context7 MCP Setup Complete"
    echo "========================================"
    echo ""
    print_success "Configuration files have been updated"
    echo ""
    echo "📁 Updated Files:"
    echo "   - $CONFIG_DIR/mcp.json"
    if [ -n "$api_key" ]; then
        echo "   - .env (API key configured)"
    fi
    echo "   - Module configurations"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Restart your IDE (VS Code, Cursor, or Claude Desktop)"
    echo "   2. Test with: 'use context7 - show me React hooks documentation'"
    if [ -z "$api_key" ]; then
        echo "   3. (Optional) Get an API key at https://context7.com/dashboard for enhanced rate limits"
    fi
    echo ""
    echo "📚 Documentation:"
    echo "   - Setup Guide: docs/context7-setup-guide.md"
    echo "   - Testing: ./scripts/test-context7-integration.sh"
    echo "   - Monitoring: ./scripts/monitor-context7.sh"
    echo ""
}

# Main setup flow
main() {
    local api_key=""
    local interactive=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --api-key)
                api_key="$2"
                shift 2
                ;;
            --no-interactive)
                interactive=false
                shift
                ;;
            --help)
                echo "Usage: $0 [--api-key YOUR_KEY] [--no-interactive]"
                echo ""
                echo "Options:"
                echo "  --api-key KEY      Provide Context7 API key (optional)"
                echo "  --no-interactive   Run without prompts"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    echo "========================================"
    echo "   Context7 MCP Team Setup"
    echo "========================================"
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node_version
    
    # Interactive mode - ask for API key if not provided
    if [ "$interactive" = true ] && [ -z "$api_key" ]; then
        echo ""
        print_status "Context7 works without an API key but has rate limits."
        print_status "Get a free API key at: https://context7.com/dashboard"
        echo ""
        read -p "Enter your Context7 API key (or press Enter to skip): " api_key
    fi
    
    # Validate API key if provided
    if [ -n "$api_key" ]; then
        if ! validate_api_key "$api_key"; then
            print_error "Invalid API key format. API keys should only contain alphanumeric characters, hyphens, and underscores."
            exit 1
        fi
        print_success "API key validated"
    else
        print_warning "No API key provided. Context7 will work with default rate limits."
    fi
    
    # Test Context7 installation
    test_context7
    
    # Update configurations
    update_mcp_config "$api_key"
    update_env_files "$api_key"
    update_module_configs "$api_key"
    
    # Show summary
    show_summary "$api_key"
    
    print_success "Setup completed successfully!"
}

# Run main function
main "$@"