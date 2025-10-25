MAKEFLAGS += --no-print-directory

# The following section sets up variables depending on whether we are running in macOS or in
# the Ubuntu devcontainer.
OS_KERNEL := $(shell uname -s)
ARCH := $(shell uname -m)

# Detect the shell and determine the appropriate profile file
# Use $$SHELL environment variable from the parent shell, not Make's internal SHELL
SHELL_NAME := $(shell basename "$$SHELL")
ifeq ($(SHELL_NAME),zsh)
	PROFILE_FILE := $(HOME)/.zshrc
else ifeq ($(SHELL_NAME),bash)
	ifeq ($(shell test -f $(HOME)/.bash_profile && echo yes),yes)
		PROFILE_FILE := $(HOME)/.bash_profile
	else
		PROFILE_FILE := $(HOME)/.bashrc
	endif
else
	PROFILE_FILE := $(HOME)/.profile
endif

chariot:
ifeq (Darwin,$(OS_KERNEL))
# running docker inside the devcontainer isn't supported yet
	open -ja Docker
endif
	@echo "Deploying backend."
	cd modules/chariot/backend && make deploy ENV=dev-autoscale
	@echo "Backend deployment complete. Starting local frontend."
	cd modules/chariot/backend && make populate-env
	@make restart-ui
	echo "Deployment complete"

user:
	@UUID=$$(uuidgen | tr '[:upper:]' '[:lower:]') && \
    EMAIL="$$UUID@praetorian.com" && \
    PASSWORD="$$(echo $$UUID | sed 's/-//g')Aa1!" && \
    echo "Generating user with email: $$EMAIL" && \
    echo "PRAETORIAN_CLI_USERNAME=$$EMAIL" >> .env && \
    echo "PRAETORIAN_CLI_PASSWORD=$$PASSWORD" >> .env && \
    cd modules/chariot/backend && source .env && \
    aws cognito-idp admin-create-user \
      --user-pool-id $$CHARIOT_POOL \
      --username "$$EMAIL" \
      --user-attributes Name=email,Value="$$EMAIL" Name=email_verified,Value=True \
      --message-action SUPPRESS && \
    aws cognito-idp admin-set-user-password \
      --user-pool-id $$CHARIOT_POOL \
      --username "$$EMAIL" \
      --password "$$PASSWORD" --permanent && \
    echo "User created successfully and credentials stored in .env" && \
    echo "" && \
    KEYCHAIN_CONTENT="[United States]\nname = $$CHARIOT_STACK\nclient_id = $$CHARIOT_CLIENT\napi = $$CHARIOT_API\nuser_pool_id = $$CHARIOT_POOL\nusername = $$EMAIL\npassword = $$PASSWORD" && \
    ENCODED_KEYCHAIN=$$(echo "$$KEYCHAIN_CONTENT" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))") && \
    echo "🔑 Quick Login URL:" && \
    echo "https://localhost:3000/login-with-keychain?keychain=$$ENCODED_KEYCHAIN" && \
    cd ../../.. && echo "CHARIOT_LOGIN_URL=https://localhost:3000/login-with-keychain?keychain=$$ENCODED_KEYCHAIN" >> .env

feature:
	npx claude-flow@alpha sparc $(description)

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))
	git submodule set-branch --branch main -- ./modules/$(notdir $(basename $(repo)))

add-go-module:
	go work use $(module)

checkout:
	git submodule foreach 'git checkout $(branch) || true'

create:
	git submodule foreach 'git checkout -b $(branch)'

current-branch:
	git submodule foreach 'git branch --show-current'

create-prs:
	git submodule foreach 'gh pr create'

logs:
	@echo "Collecting logs from all CHARIOT_STACK CloudWatch log groups using AWS Live Tail..."
	@cd modules/chariot/backend && source .env && \
	ACCOUNT_ID=$$(aws sts get-caller-identity --query Account --output text) && \
	REGION=$$(aws configure get region || echo "us-east-2") && \
	aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$$CHARIOT_STACK" --query 'logGroups[].logGroupName' --output text | \
	tr '\t' '\n' | \
	while read -r group; do \
		if [ -n "$$group" ]; then \
			echo "arn:aws:logs:$$REGION:$$ACCOUNT_ID:log-group:$$group"; \
		fi; \
	done | \
	xargs -n 10 aws logs start-live-tail --log-group-identifiers

purge:
	go run modules/chariot-devops/chariot-utils/user-purge/main.go -stack $(stack) -u $(user) -neo4j-mode delete -keep-user

.PHONY: submodule-init
submodule-init: ## Initialize all submodules
	@echo "Initializing all submodules..."
	git submodule update --init --recursive --progress


.PHONY: submodule-init-robust
submodule-init-robust: ## Initialize submodules with retry logic, progress tracking, and error handling
	@echo "🚀 Initializing submodules with robust error handling and progress tracking..."
	@echo "📊 Repository sizes: chariot(2GB), chariot-aegis-capabilities(813MB)"
	@echo "Note: Using sequential downloads for large repositories (2GB+ total)"
	@echo ""
	@for i in 1 2 3; do \
		echo "🔄 Attempt $$i: Initializing submodules..."; \
		SUBMODULES=$$(git config --file .gitmodules --get-regexp path | awk '{ print $$2 }' | sort); \
		TOTAL=$$(echo "$$SUBMODULES" | wc -l | tr -d ' '); \
		COUNT=0; \
		SUCCESS=true; \
		for submodule in $$SUBMODULES; do \
			COUNT=$$((COUNT + 1)); \
			REPO_NAME=$$(basename $$submodule); \
			echo "📦 [$$COUNT/$$TOTAL] Initializing $$REPO_NAME..."; \
			if git submodule update --init --progress "$$submodule"; then \
				echo "✅ [$$COUNT/$$TOTAL] $$REPO_NAME completed"; \
			else \
				echo "❌ [$$COUNT/$$TOTAL] $$REPO_NAME failed"; \
				SUCCESS=false; \
				break; \
			fi; \
			echo ""; \
		done; \
		if [ "$$SUCCESS" = "true" ]; then \
			echo "🎉 All $$TOTAL submodules initialized successfully!"; \
			break; \
		else \
			echo "❌ Attempt $$i failed, waiting 10 seconds before retry..."; \
			sleep 10; \
			if [ $$i -eq 3 ]; then \
				echo "💥 All attempts failed. Manual intervention required."; \
				echo "Try running: make submodule-fix"; \
				exit 1; \
			fi; \
		fi; \
	done

.PHONY: submodule-pull
submodule-pull: ## Pull latest changes from all submodules
	@echo "Pulling latest changes from all submodules..."
	git submodule foreach --recursive 'git fetch && git checkout main && git pull origin main'

.PHONY: submodule-status
submodule-status: ## Show status of all submodules
	@echo "Submodule status:"
	git submodule status

.PHONY: submodule-update
submodule-update: submodule-init-robust submodule-pull submodule-status ## Complete submodule update workflow
	@echo "Submodule update completed"

.PHONY: submodule-fix
submodule-fix: ## Fix corrupted or failed submodules
	@echo "🔧 Attempting to fix submodule issues..."
	@echo "🧹 Cleaning submodule directories..."
	git submodule foreach --recursive 'git clean -xfd'
	@echo "🔄 Resetting submodule state (ignoring failures)..."
	git submodule foreach --recursive 'git reset --hard HEAD || true'
	@echo "📤 Deinitializing all submodules..."
	git submodule deinit --all --force
	@echo "📥 Re-initializing submodules with force (sequential for large repos)..."
	@echo "Note: This may take 10-15 minutes for 2GB+ of repositories"
	git submodule update --init --recursive --force --progress --jobs 1
	@echo "✅ Submodule fix completed"

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

tree-add:
ifndef NAME
	$(error NAME is required. Usage: make tree-add NAME=<branch-name>)
endif
	@echo "Creating worktree: chariot-tree/$(NAME) from main"
	@git worktree add -b $(NAME) ../chariot-tree/$(NAME) origin/main
	@echo "Opening worktree in Cursor..."
	@cursor ../chariot-tree/$(NAME)
	@echo "Worktree 'chariot-tree/$(NAME)' setup complete!"

tree-remove:
ifdef NAME
	@echo "Removing worktree: $(NAME)"
	@git worktree remove ../chariot-tree/$(NAME) --force 2>/dev/null || git worktree remove ../chariot-tree/$(NAME) 2>/dev/null || true
	@echo "Pruning worktree references..."
	@git worktree prune
	@echo "Worktree 'chariot-tree/$(NAME)' has been removed!"
else
	@echo "Finding and removing all worktrees starting with 'chariot-tree/'..."
	@git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2 | grep "/chariot-tree/" | while read -r worktree_path; do \
		worktree_name=$$(basename "$$worktree_path"); \
		echo "Removing worktree: $$worktree_name at $$worktree_path"; \
		git worktree remove "$$worktree_path" --force 2>/dev/null || git worktree remove "$$worktree_path" 2>/dev/null || true; \
	done
	@echo "Pruning worktree references..."
	@git worktree prune
	@echo "All chariot-tree/* worktrees have been removed!"
endif

tree-list:
	@echo "Listing all worktrees in 'chariot-tree/':"
	@echo "================================================"
	@found=0; \
	git worktree list --porcelain | awk ' \
		BEGIN { found=0 } \
		/^worktree/ { \
			path=$$2; \
			if (path ~ /\/chariot-tree\//) { \
				found=1; \
				name=path; \
				gsub(/.*\//, "", name); \
				printf "%-30s %s\n", "Name:", name; \
				printf "%-30s %s\n", "Path:", path; \
			} \
		} \
		/^HEAD/ && found { \
			commit=$$2; \
			printf "%-30s %s\n", "Commit:", substr(commit, 1, 8); \
		} \
		/^branch/ && found { \
			branch=$$2; \
			gsub(/refs\/heads\//, "", branch); \
			printf "%-30s %s\n", "Branch:", branch; \
			print "------------------------------------------------"; \
			found=0; \
		} \
		/^detached/ && found { \
			printf "%-30s %s\n", "Branch:", "(detached HEAD)"; \
			print "------------------------------------------------"; \
			found=0; \
		} \
	' | { \
		if read -r line; then \
			echo "$$line"; \
			cat; \
		else \
			echo "No worktrees found starting with 'chariot-tree/'"; \
		fi \
	}

start-ui: ## Start the UI in the background
	@echo "Starting UI as a background task on https://localhost:3000..."
	cd modules/chariot/ui && npm i && (npm run start &)

stop-ui: ## Stop the UI background task
	@echo "Stopping the UI background task..."
	@ps aux | grep chariot/ui | grep vite | grep -v grep | awk '{print $$2}' | xargs -r kill

restart-ui: ## Restart the UI background task
	@make stop-ui
	@make start-ui

setup-ui: ## Install UI dependencies and run setup
	@echo "Setting up UI dependencies..."
	cd modules/chariot/ui && npm run setup
	@echo "UI setup completed successfully"

.PHONY: mcp-manager
mcp-manager: ## Launch Claude Code with MCP server selection
	@./scripts/mcp-manager.sh

info:
	@echo "HOME: $(HOME)" # from the shell
	@echo "SHELL: $(SHELL)" # from the shell
	@echo "USER: $(USER)" # from the shell
	@echo "SHELL_NAME: $(SHELL_NAME)"
	@echo "PROFILE_FILE: $(PROFILE_FILE)"
	@echo "OS_KERNEL: $(OS_KERNEL)"
	@echo "ARCH: $(ARCH)"

setup: 
ifeq (Darwin,$(OS_KERNEL))
	@make setup-mac
else ifeq (Linux,$(OS_KERNEL))
	@make setup-ubuntu
else
	@echo "Unknown OS: $(OS_KERNEL)"
	exit 1
endif	
	@if ! grep -q "export GOPRIVATE=github.com/praetorian-inc" $(PROFILE_FILE) 2>/dev/null; then \
		echo "export GOPRIVATE=github.com/praetorian-inc" >> $(PROFILE_FILE); \
		echo "Added GOPRIVATE to $(PROFILE_FILE)"; \
	fi
	@make submodule-init-robust
	@make submodule-pull
	@make setup-ui
	@if ! aws sts get-caller-identity >/dev/null 2>&1; then \
		echo "AWS credentials not found, running aws configure..."; \
		aws configure; \
	else \
		echo "AWS credentials already configured, skipping aws configure"; \
	fi
	@echo "Checking GitHub authentication status..."
	@if ! gh auth status >/dev/null 2>&1; then \
		echo "GitHub not logged in. Logging in with read:packages scope..."; \
		gh auth login --scopes read:packages; \
	elif ! gh auth status 2>&1 | grep -q "read:packages"; then \
		echo "GitHub logged in but missing read:packages scope. Refreshing authentication..."; \
		gh auth refresh --scopes read:packages; \
	else \
		echo "GitHub already authenticated with read:packages scope"; \
	fi
ifeq (Darwin,$(OS_KERNEL))
	@echo "Setting up Docker registry authentication..."
	$(eval GITHUB_USERNAME := $(shell gh api user --jq '.login'))
	gh auth token | docker login ghcr.io -u $(GITHUB_USERNAME) --password-stdin
else
	@echo "ℹ️ Running docker inside devcontainer isn't supported yet. Skipping Docker registry authentication."
endif
	@echo "✅ Setup completed successfully."
	@echo "ℹ️ Please run 'source $(PROFILE_FILE)' to apply the changes now."

update: ## Update all packages (Go, npm, Python, Claude Code, Praetorian CLI, Homebrew)
	@echo "🔄 Updating all development packages..."
	@echo "📦 Updating core packages..."
ifeq (Darwin,$(OS_KERNEL))
	@make update-mac
else
	@make update-ubuntu
endif
	@echo "✅ All packages updated successfully!"

setup-mac:
	@echo "Installing core packages on macOS..."
	@brew install awscli aws-sam-cli jq node python docker go gh
	@echo "Installing Praetorian CLI..."
	@python3 -m pip install --no-cache-dir praetorian-cli > /dev/null
	@echo "Installing Claude Code..."
	@npm install -g @anthropic-ai/claude-code > /dev/null
	@echo "Installing Claude Agent SDK..."
	@python3 -m pip install --no-cache-dir claude-agent-sdk > /dev/null
	@make mcp-manager-install

update-mac:
	@echo "Upgrading core packages on macOS..."
	@brew upgrade awscli aws-sam-cli jq node python docker go gh
	@echo "Installing Praetorian CLI..."
	@python3 -m pip install --no-cache-dir --upgrade praetorian-cli > /dev/null
	@echo "Installing Claude Code..."
	@npm update -g @anthropic-ai/claude-code > /dev/null
	@echo "Installing Claude Agent SDK..."
	@python3 -m pip install --no-cache-dir --upgrade claude-agent-sdk > /dev/null
	
setup-ubuntu:
	@echo "Installing additional core packages in devcontainer..."
# go, npm, jq, python, gh are installed in the devcontainer, upgrade them manually in devcontainer
	@test -d /usr/local/aws-cli/v2/current || make install-aws-cli-ubuntu
	@test -d /usr/local/aws-sam-cli/current || make install-sam-cli-ubuntu
	@echo "Installing Praetorian CLI..."
	@sudo python3 -m pip install --no-cache-dir praetorian-cli --break-system-packages > /dev/null
	@echo "Installing Claude Code..."
	@sudo npm install -g @anthropic-ai/claude-code > /dev/null
	@echo "Installing Claude Agent SDK..."
	@sudo python3 -m pip install --no-cache-dir claude-agent-sdk --break-system-packages > /dev/null
	@sudo make mcp-manager-install
# devcontainer specific for go path
	@if ! grep -q "/usr/local/go/bin" $(PROFILE_FILE) 2>/dev/null; then \
		echo "export PATH=\$$PATH:/usr/local/go/bin" >> $(PROFILE_FILE); \
	fi
	@if [ "$$(whoami)" = "vscode" ]; then \
		echo "⚠️ You are in devcontainer running as vscode. You need to update the STACK_NAME in backend/config/dev.env to make sure you deploy to the right SAM stack,"; \
	fi

update-ubuntu:
	@echo "Upgrading core packages on Ubuntu..."
	@sudo apt update
	@sudo apt -y install python3 pip nodejs jq gh
	@sudo apt clean
	@sudo npm update -g npm
	@sudo npm update -g typescript
	@make install-aws-cli-ubuntu upgrade_option=--update
	@make install-sam-cli-ubuntu upgrade_option=--update
	@echo "Updating Praetorian CLI..."
	@sudo python3 -m pip install --no-cache-dir --upgrade praetorian-cli --break-system-packages > /dev/null
	@echo "Updating Claude Code..."
	@sudo npm update -g @anthropic-ai/claude-code > /dev/null
	@echo "Updating Claude Agent SDK..."
	@sudo python3 -m pip install --no-cache-dir --upgrade claude-agent-sdk --break-system-packages > /dev/null

install-aws-cli-ubuntu:
	@echo "Installing/updating AWS CLI..."
	@cd /tmp && \
	rm -rf aws && \
	wget -q https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -O aws-cli-installer.zip && \
	unzip -q aws-cli-installer.zip && \
	sudo ./aws/install $(upgrade_option) && \
	rm -rf /tmp/aws /tmp/aws-cli-installer.zip

install-sam-cli-ubuntu:
	@echo "Installing/updating AWS SAM CLI..."
	@cd /tmp && \
	rm -rf sam-installation && \
	wget -q https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip -O aws-sam-installer.zip && \
	unzip -q aws-sam-installer.zip -d sam-installation && \
	sudo ./sam-installation/install  $(upgrade_option) && \
	rm -rf /tmp/sam-installation /tmp/aws-sam-installer.zip

configure-cli:
	@UUID=$$(uuidgen | tr '[:upper:]' '[:lower:]') && \
	echo "Setting up Praetorian CLI configuration..." && \
	echo "Generated profile UUID: $$UUID" && \
	echo "" && \
	read -p "Enter username: " USERNAME && \
	read -s -p "Enter password: " PASSWORD && \
	echo "" && \
	echo "" && \
	echo "Creating keychain file..." && \
	echo "[$$UUID]" > keychain.ini && \
	echo "username = $$USERNAME" >> keychain.ini && \
	echo "password = $$PASSWORD" >> keychain.ini && \
	echo "Moving keychain file to ~/.keychain.ini..." && \
	mv keychain.ini ~/.keychain.ini && \
	echo "Configuration complete!" && \
	echo "" && \
	echo "Use this command prefix for Praetorian CLI:" && \
	echo "  praetorian --profile $$UUID"

mcp-manager-uninstall: ## Remove MCP manager and clean up broken symlinks
	@echo "🧹 Uninstalling MCP manager..."
	@npm uninstall -g mcp-manager > /dev/null 2>&1 || true
	@echo "✅ MCP manager uninstalled successfully"

mcp-manager-install: ## Install MCP server manager for toggling Claude Desktop MCP servers
	@echo "📦 Installing MCP manager..."
	@cd mcp-manager && npm install > /dev/null 2>&1 && npx tsc > /dev/null 2>&1
	@cd mcp-manager && npm install -g . > /dev/null 2>&1
	@SHELL_NAME=$$(basename $$SHELL); \
	if [ "$$SHELL_NAME" = "zsh" ]; then \
		PROFILE=~/.zshrc; \
	elif [ "$$SHELL_NAME" = "bash" ]; then \
		if [ -f ~/.bash_profile ]; then \
			PROFILE=~/.bash_profile; \
		else \
			PROFILE=~/.bashrc; \
		fi; \
	else \
		PROFILE=~/.profile; \
	fi; \
	if ! grep -q 'export PATH="$$HOME/.local/bin:$$PATH"' $$PROFILE 2>/dev/null; then \
		echo 'export PATH="$$HOME/.local/bin:$$PATH"' >> $$PROFILE > /dev/null 2>&1; \
	fi; \
	export PATH="$$HOME/.local/bin:$$PATH"; \
	hash -r 2>/dev/null || true
	@echo "✅ MCP manager installed successfully"

# ============================================================
# DevPod Management
# ============================================================

.PHONY: devpod-install
devpod-install: ## Install DevPod CLI and Desktop App (VNC-free setup)
	@echo "📦 Installing DevPod CLI..."
ifeq (Darwin,$(OS_KERNEL))
ifeq ($(ARCH),arm64)
	curl -L -o /tmp/devpod "https://github.com/loft-sh/devpod/releases/latest/download/devpod-darwin-arm64"
else
	curl -L -o /tmp/devpod "https://github.com/loft-sh/devpod/releases/latest/download/devpod-darwin-amd64"
endif
	sudo install -c -m 0755 /tmp/devpod /usr/local/bin
	rm -f /tmp/devpod
	@echo "✅ DevPod CLI installed"
	@echo ""
	@echo "📱 Opening DevPod Desktop download page..."
	@open https://devpod.sh/
	@echo ""
	@echo "✅ Installation complete!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "   1. Download and install DevPod Desktop from the opened browser"
	@echo "   2. Run 'make devpod-setup-provider' to configure AWS providers"
	@echo ""
	@echo "💡 Modern approach:"
	@echo "   - No VNC required! Uses SSH + X11 forwarding for GUI apps"
	@echo "   - Headless Chrome for automated testing"
	@echo "   - Automatic port forwarding for web apps"
else
	@echo "❌ DevPod installation currently only supports macOS"
	@echo "   Please install manually: https://devpod.sh/"
endif

.PHONY: devpod-setup-provider
devpod-setup-provider: ## Automated AWS provider setup for all regions with latency testing
	@echo "🚀 Running automated DevPod setup..."
	@./scripts/devpod/setup-devpod.sh

.PHONY: devpod-select-region
devpod-select-region: ## Switch DevPod region based on latency testing
	@./scripts/devpod/select-region.sh

.PHONY: devpod-create
devpod-create: ## Create new DevPod workspace with prebuilds (Usage: make devpod-create WORKSPACE=my-workspace IDE=cursor)
ifndef WORKSPACE
	$(error WORKSPACE is required. Usage: make devpod-create WORKSPACE=my-workspace IDE=cursor)
endif
ifndef IDE
	$(eval IDE := cursor)
endif
	@echo "🚀 Creating DevPod workspace: $(WORKSPACE) with IDE: $(IDE)"
	@echo "ℹ️  Using prebuild for faster startup (if available)"
	@devpod up --provider aws-provider \
		github.com/praetorian-inc/chariot-development-platform \
		--ide $(IDE) \
		--id $(WORKSPACE)
	@echo "⚠️  Running cycle-devpod workaround for DevPod persistence bug..."
	@./scripts/cycle-devpod.sh $(WORKSPACE)
	@echo "✅ Workspace '$(WORKSPACE)' created and ready!"

.PHONY: devpod-start
devpod-start: ## Start existing DevPod workspace (Usage: make devpod-start WORKSPACE=my-workspace)
ifndef WORKSPACE
	$(error WORKSPACE is required. Usage: make devpod-start WORKSPACE=my-workspace)
endif
	@echo "▶️  Starting DevPod workspace: $(WORKSPACE)"
	@devpod up $(WORKSPACE)
	@echo "✅ Workspace '$(WORKSPACE)' started"

.PHONY: devpod-stop
devpod-stop: ## Stop DevPod workspace (Usage: make devpod-stop WORKSPACE=my-workspace)
ifndef WORKSPACE
	$(error WORKSPACE is required. Usage: make devpod-stop WORKSPACE=my-workspace)
endif
	@echo "⏸️  Stopping DevPod workspace: $(WORKSPACE)"
	@devpod stop $(WORKSPACE)
	@echo "✅ Workspace '$(WORKSPACE)' stopped"

.PHONY: devpod-delete
devpod-delete: ## Delete DevPod workspace (Usage: make devpod-delete WORKSPACE=my-workspace)
ifndef WORKSPACE
	$(error WORKSPACE is required. Usage: make devpod-delete WORKSPACE=my-workspace)
endif
	@echo "🗑️  Deleting DevPod workspace: $(WORKSPACE)"
	@read -p "Are you sure you want to delete workspace '$(WORKSPACE)'? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		devpod delete $(WORKSPACE); \
		echo "✅ Workspace '$(WORKSPACE)' deleted"; \
	else \
		echo "❌ Deletion cancelled"; \
	fi

.PHONY: devpod-list
devpod-list: ## List all DevPod workspaces
	@echo "📋 DevPod workspaces:"
	@devpod list

.PHONY: devpod-ssh
devpod-ssh: ## SSH into DevPod workspace (Usage: make devpod-ssh WORKSPACE=my-workspace)
ifndef WORKSPACE
	$(error WORKSPACE is required. Usage: make devpod-ssh WORKSPACE=my-workspace)
endif
	@echo "🔌 Connecting to workspace: $(WORKSPACE)"
	@devpod ssh $(WORKSPACE)

.PHONY: devpod-setup-remote
devpod-setup-remote: ## Run setup inside DevPod workspace (run this from inside DevPod)
	@if [ "$$DEVPOD" != "true" ]; then \
		echo "❌ This command must be run inside a DevPod workspace"; \
		echo "   Use: make devpod-ssh WORKSPACE=your-workspace"; \
		exit 1; \
	fi
	@echo "🔧 Setting up DevPod environment..."
	@make setup
	@echo "✅ DevPod environment setup complete!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "   1. Run 'make chariot' to deploy the backend and start the UI"
	@echo "   2. Access UI at https://localhost:3000 (auto-forwarded)"
	@echo "   3. Or launch Chrome: make devpod-chrome"
	@echo ""
	@echo "💡 No VNC needed! Ports forward automatically via DevPod"

.PHONY: devpod-chrome
devpod-chrome: ## Launch Chrome in DevPod (Usage: make devpod-chrome URL=https://localhost:3000 MODE=headless)
	@if [ "$$DEVPOD" != "true" ]; then \
		echo "❌ This command must be run inside a DevPod workspace"; \
		exit 1; \
	fi
ifndef URL
	$(eval URL := https://localhost:3000)
endif
ifdef MODE
	@./scripts/launch-chrome.sh $(URL) --$(MODE)
else
	@./scripts/launch-chrome.sh $(URL)
endif

.PHONY: devpod-help
devpod-help: ## Show DevPod quick reference guide
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║              DevPod Quick Reference Guide                    ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Initial Setup (run on your laptop):"
	@echo "   make devpod-install              # Install DevPod CLI + Desktop"
	@echo "   make devpod-setup-provider       # Auto-configure all 6 AWS regions + latency test"
	@echo "   make devpod-select-region        # Switch regions anytime based on latency"
	@echo ""
	@echo "📦 Workspace Management (run on your laptop):"
	@echo "   make devpod-create WORKSPACE=my-workspace IDE=cursor"
	@echo "   make devpod-start WORKSPACE=my-workspace"
	@echo "   make devpod-stop WORKSPACE=my-workspace"
	@echo "   make devpod-delete WORKSPACE=my-workspace"
	@echo "   make devpod-list"
	@echo "   make devpod-ssh WORKSPACE=my-workspace"
	@echo ""
	@echo "🔧 Inside DevPod (run inside workspace):"
	@echo "   make devpod-setup-remote         # Run full setup"
	@echo "   make chariot                     # Deploy backend + start UI"
	@echo "   make devpod-chrome               # Launch Chrome (auto-detects headless/X11)"
	@echo "   make devpod-chrome MODE=headless # Force headless mode"
	@echo "   make devpod-chrome MODE=x11      # Force X11 forwarding mode"
	@echo ""
	@echo "🖥️  GUI Access (No VNC Needed!):"
	@echo "   Modern approach - Choose based on your needs:"
	@echo ""
	@echo "   Option 1 - Headless Chrome (for automated testing):"
	@echo "     • Chrome runs without GUI"
	@echo "     • DevTools Protocol on port 9222 (auto-forwarded)"
	@echo "     • Perfect for Playwright/Puppeteer tests"
	@echo ""
	@echo "   Option 2 - X11 Forwarding (for manual debugging):"
	@echo "     • Forward DISPLAY from your Mac to container"
	@echo "     • Chrome GUI appears on your local screen"
	@echo "     • Requires XQuartz on macOS: brew install --cask xquartz"
	@echo ""
	@echo "   Option 3 - Web UI Only:"
	@echo "     • Port 3000 auto-forwards (Chariot UI)"
	@echo "     • No Chrome GUI needed at all"
	@echo "     • Use your local browser"
	@echo ""
	@echo "💡 Tips:"
	@echo "   - Default IDE is 'cursor', also supports 'goland'"
	@echo "   - Workspaces auto-stop after 1h inactivity"
	@echo "   - Ports 3000, 8080, 9222 forward automatically"
	@echo "   - VNC eliminated - simpler, faster, more secure!"
	@echo ""
	@echo "📚 Full documentation: devpod/README.md"
