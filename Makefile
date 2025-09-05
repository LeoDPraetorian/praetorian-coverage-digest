chariot:
	open -ja Docker
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
	@if ! command -v praetorian >/dev/null 2>&1; then \
  		python3 -m pip install --upgrade --no-cache praetorian-cli; \
  	fi

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

claude-flow: ## Build claude-flow binary for local development
	@echo "Building claude-flow binary..."
	cd modules/claude-flow && npm install
	cd modules/claude-flow && npm run build
	@echo "Claude-flow binary built successfully at modules/claude-flow/bin/claude-flow"

feature:
	./modules/claude-flow/bin/claude-flow sparc $(description)

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))
	git submodule set-branch --branch main -- ./modules/$(notdir $(basename $(repo)))


add-go-module:
	go work use $(module)

setup: install-cli
	open -ja Docker
	brew install awscli aws-sam-cli jq docker go npm
	@if ! grep -q "export GOPRIVATE=github.com/praetorian-inc" ~/.zshrc 2>/dev/null; then \
		echo "export GOPRIVATE=github.com/praetorian-inc" >> ~/.zshrc; \
		echo "Added GOPRIVATE to ~/.zshrc"; \
	fi
	@make submodule-init-robust
	@make setup-ui
	@make setup-claude-flow
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
	@echo "Setting up Docker registry authentication..."
	$(eval GITHUB_USERNAME := $(shell gh auth status 2>&1 | grep "Logged" | cut -d ' ' -f 9))
	gh auth token | docker login ghcr.io -u $(GITHUB_USERNAME) --password-stdin

checkout:
	git submodule foreach 'git checkout $(branch) || true'

create:
	git submodule foreach 'git checkout -b $(branch)'

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
	@echo "📊 Repository sizes: chariot(2GB), chariot-aegis-capabilities(813MB), claude-flow(311MB)"
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
	@echo "Creating worktree: chariot-$(NAME) from main"
	@git worktree add -b chariot-$(NAME) ../chariot-$(NAME) origin/main
	@echo "Opening worktree in Cursor..."
	@cursor ../chariot-$(NAME)
	@echo "Installing UI dependencies..."
	@cd ../chariot-$(NAME)/ui && npm i
	@echo "Installing E2E dependencies and Playwright..."
	@cd ../chariot-$(NAME)/e2e && npm i && npx playwright install
	@echo "Worktree 'chariot-$(NAME)' setup complete!"

tree-remove:
ifdef NAME
	@echo "Removing worktree: $(NAME)"
	@git worktree remove ../$(NAME) --force 2>/dev/null || git worktree remove ../$(NAME) 2>/dev/null || true
	@echo "Pruning worktree references..."
	@git worktree prune
	@echo "Worktree 'chariot-$(NAME)' has been removed!"
else
	@echo "Finding and removing all worktrees starting with 'chariot-'..."
	@git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2 | grep "/chariot-" | while read -r worktree_path; do \
		worktree_name=$$(basename "$$worktree_path"); \
		echo "Removing worktree: $$worktree_name at $$worktree_path"; \
		git worktree remove "$$worktree_path" --force 2>/dev/null || git worktree remove "$$worktree_path" 2>/dev/null || true; \
	done
	@echo "Pruning worktree references..."
	@git worktree prune
	@echo "All chariot-* worktrees have been removed!"
endif

tree-list:
	@echo "Listing all worktrees starting with 'chariot-':"
	@echo "================================================"
	@found=0; \
	git worktree list --porcelain | awk ' \
		BEGIN { found=0 } \
		/^worktree/ { \
			path=$$2; \
			if (path ~ /\/chariot-/) { \
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
			echo "No worktrees found starting with 'chariot-'"; \
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

setup-claude-flow: ## Install claude-flow dependencies for local development
	@echo "Setting up claude-flow for local development..."
	@echo "Removing any globally installed claude-flow package to avoid confusion..."
	@npm uninstall -g claude-flow 2>/dev/null || true
	@echo "Installing better-sqlite3 globally for claude-flow local builds..."
	@npm install -g better-sqlite3
	@echo "Installing claude-flow local dependencies..."
	cd modules/claude-flow && npm install
	@echo "Claude-flow local development setup completed successfully"
