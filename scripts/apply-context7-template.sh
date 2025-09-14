#!/bin/bash

# Context7 Template Application Script
# Applies pre-configured Context7 templates for different development scenarios
# Usage: ./scripts/apply-context7-template.sh [frontend|backend|devops|full-stack]

set -e

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
TEMPLATES_DIR="scripts/context7-templates"
CONFIG_DIR=".roo"
BACKUP_DIR=".roo/backups"

# Function to print colored output
print_info() {
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

# Function to show available templates
show_templates() {
    echo "Available Context7 Templates:"
    echo ""
    echo "  frontend   - React/TypeScript UI development"
    echo "  backend    - Go/Python API development"
    echo "  devops     - Infrastructure and CI/CD"
    echo "  full-stack - Complete development environment"
    echo ""
    echo "Usage: $0 [template-name]"
}

# Function to backup existing configuration
backup_config() {
    if [ -f "$CONFIG_DIR/mcp.json" ]; then
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/mcp.json.$(date +%Y%m%d_%H%M%S)"
        cp "$CONFIG_DIR/mcp.json" "$backup_file"
        print_info "Backed up existing configuration to $backup_file"
    fi
}

# Function to merge template with existing configuration
merge_template() {
    local template="$1"
    local template_file="$TEMPLATES_DIR/${template}.json"
    local config_file="$CONFIG_DIR/mcp.json"
    
    if [ ! -f "$template_file" ]; then
        print_error "Template file not found: $template_file"
        return 1
    fi
    
    # Create config directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"
    
    # If no existing config, just copy template
    if [ ! -f "$config_file" ]; then
        print_info "Creating new configuration from template"
        node -e "
            const fs = require('fs');
            const template = JSON.parse(fs.readFileSync('$template_file', 'utf8'));
            const config = {
                mcpServers: template.mcpServers || {},
                settings: template.settings || {}
            };
            fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
        "
    else
        # Merge template with existing configuration
        print_info "Merging template with existing configuration"
        node -e "
            const fs = require('fs');
            const template = JSON.parse(fs.readFileSync('$template_file', 'utf8'));
            const existing = JSON.parse(fs.readFileSync('$config_file', 'utf8'));
            
            // Merge MCP servers (template servers take precedence for Context7)
            const merged = {
                mcpServers: { ...existing.mcpServers },
                settings: { ...existing.settings }
            };
            
            // Add/update Context7 servers from template
            Object.keys(template.mcpServers).forEach(key => {
                if (key.includes('context7')) {
                    merged.mcpServers[key] = template.mcpServers[key];
                } else if (!merged.mcpServers[key]) {
                    merged.mcpServers[key] = template.mcpServers[key];
                }
            });
            
            // Merge settings
            if (template.settings) {
                merged.settings = { ...merged.settings, ...template.settings };
            }
            
            fs.writeFileSync('$config_file', JSON.stringify(merged, null, 2));
        "
    fi
}

# Function to update module configurations
update_modules() {
    local template="$1"
    
    print_info "Updating module configurations"
    
    # Modules that should inherit the template
    local modules=()
    
    case $template in
        frontend)
            modules=("chariot" "chariot-ui-components")
            ;;
        backend)
            modules=("nebula" "janus-framework" "chariot")
            ;;
        devops)
            modules=("chariot-devops" "nebula")
            ;;
        full-stack)
            modules=("chariot" "nebula" "janus-framework" "claude-flow" "chariot-ui-components")
            ;;
    esac
    
    for module in "${modules[@]}"; do
        if [ -d "modules/$module" ]; then
            # Update .cursor directory if it exists
            if [ -d "modules/$module/.cursor" ]; then
                local module_config="modules/$module/.cursor/mcp.json"
                print_info "Updating $module configuration"
                
                # Copy relevant parts of template to module
                node -e "
                    const fs = require('fs');
                    const template = JSON.parse(fs.readFileSync('$CONFIG_DIR/mcp.json', 'utf8'));
                    
                    let moduleConfig = {};
                    if (fs.existsSync('$module_config')) {
                        moduleConfig = JSON.parse(fs.readFileSync('$module_config', 'utf8'));
                    }
                    
                    // Copy Context7 configurations
                    moduleConfig.mcpServers = moduleConfig.mcpServers || {};
                    Object.keys(template.mcpServers).forEach(key => {
                        if (key.includes('context7')) {
                            moduleConfig.mcpServers[key] = template.mcpServers[key];
                        }
                    });
                    
                    fs.writeFileSync('$module_config', JSON.stringify(moduleConfig, null, 2));
                " || print_warning "Failed to update $module"
            fi
        fi
    done
}

# Function to show post-application instructions
show_instructions() {
    local template="$1"
    
    echo ""
    echo "========================================"
    echo "   Template Applied Successfully"
    echo "========================================"
    echo ""
    print_success "Context7 $template template has been applied"
    echo ""
    
    case $template in
        frontend)
            echo "🎨 Frontend Development Ready!"
            echo ""
            echo "Optimized for:"
            echo "  - React & TypeScript development"
            echo "  - Tailwind CSS styling"
            echo "  - Next.js applications"
            echo "  - Playwright E2E testing"
            echo ""
            echo "Try: \"use context7 - help me create a React custom hook\""
            ;;
        backend)
            echo "⚙️  Backend Development Ready!"
            echo ""
            echo "Optimized for:"
            echo "  - Go API development"
            echo "  - Python services"
            echo "  - Database operations"
            echo "  - AWS integration"
            echo ""
            echo "Try: \"use context7 - show me Go error handling best practices\""
            ;;
        devops)
            echo "🚀 DevOps Environment Ready!"
            echo ""
            echo "Optimized for:"
            echo "  - Terraform infrastructure"
            echo "  - Kubernetes deployments"
            echo "  - CI/CD pipelines"
            echo "  - Monitoring setup"
            echo ""
            echo "Try: \"use context7 - help me write a GitHub Actions workflow\""
            ;;
        full-stack)
            echo "💻 Full-Stack Development Ready!"
            echo ""
            echo "Complete environment for:"
            echo "  - Frontend & Backend development"
            echo "  - Database management"
            echo "  - Testing & deployment"
            echo "  - Cloud infrastructure"
            echo ""
            echo "Try: \"use context7 - help me build a full-stack application\""
            ;;
    esac
    
    echo ""
    echo "Next Steps:"
    echo "  1. Restart your IDE (VS Code, Cursor, or Claude Desktop)"
    echo "  2. Verify with: ./scripts/test-context7-integration.sh"
    echo "  3. Monitor performance: ./scripts/monitor-context7.sh"
    echo ""
    
    if [ -z "${CONTEXT7_API_KEY:-}" ]; then
        print_warning "No API key detected. Get one at https://context7.com/dashboard for better performance."
    fi
}

# Main function
main() {
    local template="$1"
    
    # Show help if no template specified
    if [ -z "$template" ] || [ "$template" = "--help" ] || [ "$template" = "-h" ]; then
        echo "========================================"
        echo "   Context7 Template Manager"
        echo "========================================"
        echo ""
        show_templates
        exit 0
    fi
    
    # Validate template name
    case $template in
        frontend|backend|devops|full-stack)
            # Valid template
            ;;
        *)
            print_error "Invalid template: $template"
            echo ""
            show_templates
            exit 1
            ;;
    esac
    
    echo "========================================"
    echo "   Applying Context7 Template"
    echo "========================================"
    echo ""
    print_info "Template: $template"
    echo ""
    
    # Backup existing configuration
    backup_config
    
    # Apply template
    if merge_template "$template-dev" 2>/dev/null || merge_template "$template" 2>/dev/null; then
        print_success "Template applied to global configuration"
    else
        print_error "Failed to apply template"
        exit 1
    fi
    
    # Update module configurations
    update_modules "$template"
    
    # Show post-application instructions
    show_instructions "$template"
}

# Run main function
main "$@"