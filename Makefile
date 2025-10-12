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

# In the devcontainer, need to use --break-system-packages to force installing
# the packages globally. The disadvantage of this is that the packages may break
# packages that the Ubuntu system relies on. The advantage is that we can install
# use the packagges, such as the Claude Agent SDK, without having to deal with
# virtualenvs. Testing has shown that the packages are not known to be incompatible
# with the packages Ubuntu depends on.
ifeq (Linux,$(OS_KERNEL))
	PIP_ARG := --break-system-packages
endif

chariot:
ifeq (Darwin,$(OS_KERNEL))
	# No support to run docker inside the devcontainer yet
	open -ja Docker
endif
	@echo "Deploying backend."
	cd modules/chariot/backend && make dev
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

install-cli:
	@echo "📦 Installing the Praetorian CLI..."
	@python3 -m pip install --no-cache-dir praetorian-cli $(PIP_ARG) > /dev/null
	@echo "✅ Praetorian CLI installed"

install-claude: ## Install Claude Code CLI globally
	@echo "📦 Installing Claude Code CLI..."
	@sudo npm install -g @anthropic-ai/claude-code > /dev/null
	@echo "✅ Claude Code CLI installed"

install-claude-agent-sdk: ## Install Claude Agent SDK for Python
	@echo "📦 Installing/Upgrading Claude Agent SDK..."
	@python3 -m pip install --no-cache-dir claude-agent-sdk $(PIP_ARG) > /dev/null
	@echo "✅ Claude Agent SDK installed"

update: ## Update all packages (Go, npm, Python, Claude Code, Homebrew)
	@echo "🔄 Updating all development packages..."
	@echo ""
ifeq (Darwin,$(OS_KERNEL))
	@echo "📦 Updating Homebrew packages..."
	@brew update && brew upgrade awscli aws-sam-cli jq docker go npm python
	@echo ""
	@echo "📦 Updating Claude Code CLI..."
	@npm update -g @anthropic-ai/claude-code > /dev/null
	@echo ""
else ifeq (Linux,$(OS_KERNEL))
	@echo "📦 Updating Claude Code CLI..."
	@sudo npm update -g @anthropic-ai/claude-code > /dev/null
	@echo ""
endif
	@echo "📦 Updating Claude Agent SDK..."
	@python3 -m pip install --no-cache-dir --upgrade claude-agent-sdk $(PIP_ARG) > /dev/null
	@echo ""
	@echo "📦 Updating praetorian-cli..."
	@python3 -m pip install --no-cache-dir --upgrade praetorian-cli $(PIP_ARG) > /dev/null
	@echo "✅ All packages updated successfully!"

configure-cli: install-cli
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

uninstall-mcp-manager: ## Remove MCP manager and clean up broken symlinks
	@echo "🧹 Uninstalling MCP manager..."
	@sudo npm uninstall -g mcp-manager > /dev/null 2>&1
	@echo "✅ MCP manager uninstalled successfully"

install-mcp-manager: ## Install MCP server manager for toggling Claude Desktop MCP servers
	@echo "📦 Installing MCP manager..."
	@cd mcp-manager && npm install > /dev/null 2>&1 && npx tsc > /dev/null 2>&1
	@cd mcp-manager && sudo npm install -g . > /dev/null 2>&1
	@if ! grep -q 'export PATH="$$HOME/.local/bin:$$PATH"' $(PROFILE_FILE) 2>/dev/null; then \
		echo 'export PATH="$$HOME/.local/bin:$$PATH"' >> $(PROFILE_FILE) > /dev/null 2>&1; \
	fi
	@echo "✅ MCP manager installed successfully"

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

feature:
	npx claude-flow@alpha sparc $(description)

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))
	git submodule set-branch --branch main -- ./modules/$(notdir $(basename $(repo)))

add-go-module:
	go work use $(module)

install-core-mac:
	brew install awscli aws-sam-cli jq npm python docker go gh

upgrade-core-mac:
	brew upgrade awscli aws-sam-cli jq npm python docker go gh

install-core-ubuntu:
	# go, npm, jq, python, gh are installed in the devcontainer
	#@make install-aws-cli-ubuntu
	#@make install-sam-cli-ubuntu

upgrade-core-ubuntu:
	@apt update
	@apt -y install python3 pip nodejs jq gh
	@apt clean
	@npm update -g npm
	@npm update -g typescript
	# upgrade of the AWS CLIs involves downloading the latest and installing again.
	@make install-aws-cli-ubuntu upgrade_option=--update
	@make install-sam-cli-ubuntu upgrade_option=--update

install-aws-cli-ubuntu:
	@cd /tmp && \
	rm -rf aws && \
	wget -q https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip && \
	unzip -q awscli-exe-linux-aarch64.zip && \
	sudo ./aws/install $(upgrade_option) && \
	rm -rf /tmp/aws /tmp/awscli-exe-linux-aarch64.zip

install-sam-cli-ubuntu:
	@cd /tmp && \
	rm -rf sam-installation && \
	wget -q https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-arm64.zip && \
	unzip -q aws-sam-cli-linux-arm64.zip -d sam-installation && \
	sudo ./sam-installation/install  $(upgrade_option) && \
	rm -rf /tmp/sam-installation /tmp/aws-sam-cli-linux-arm64.zip

setup-common: install-cli install-claude install-claude-agent-sdk
	@if ! grep -q "export GOPRIVATE=github.com/praetorian-inc" $(PROFILE_FILE) 2>/dev/null; then \
		echo "export GOPRIVATE=github.com/praetorian-inc" >> $(PROFILE_FILE); \
		echo "Added GOPRIVATE to $(PROFILE_FILE)"; \
	fi
ifeq (Linux,$(OS_KERNEL))
	@if ! grep -q "/usr/local/go/bin" $(PROFILE_FILE) 2>/dev/null; then \
		echo "export PATH=\$PATH:/usr/local/go/bin" >> $(PROFILE_FILE); \
		echo "Added /usr/local/go/bin PATH in $(PROFILE_FILE)"; \
	fi
endif
	@make submodule-init-robust
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
	# Running docker inside devcontainer isn't supported yet
	@echo "Setting up Docker registry authentication..."
	$(eval GITHUB_USERNAME := $(shell gh api user --jq '.login'))
	gh auth token | docker login ghcr.io -u $(GITHUB_USERNAME) --password-stdin
endif
	@make install-mcp-manager

setup: 
ifeq (Darwin,$(OS_KERNEL))
	@make install-core-mac
else ifeq (Linux,$(OS_KERNEL))
	@make install-core-ubuntu
else
	@echo "Unknown OS: $(OS_KERNEL)"
	exit 1
endif	
	@make setup-common

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

test:
	@echo "HOME: $(HOME)" # from the shell
	@echo "SHELL: $(SHELL)" # from the shell
	@echo "USER: $(USER)" # from the shell
	@echo "SHELL_NAME: $(SHELL_NAME)"
	@echo "PROFILE_FILE: $(PROFILE_FILE)"
	@echo "OS_KERNEL: $(OS_KERNEL)"
	@echo "ARCH: $(ARCH)"
	@echo "PIP_ARG: $(PIP_ARG)"
