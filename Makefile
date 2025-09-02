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

configure-cli:
	@echo "Ensuring Praetorian CLI is installed and accessible..."
	@if ! command -v praetorian >/dev/null 2>&1; then \
		echo "Praetorian CLI not found in PATH. Installing with architecture compatibility..."; \
		ARCH=$$(uname -m); \
		echo "Detected architecture: $$ARCH"; \
		pip install praetorian-cli; \
		if [ "$$ARCH" = "x86_64" ]; then \
			echo "Checking for architecture compatibility issues on x86_64..."; \
			if ! python3 -c "import rpds" 2>/dev/null; then \
				echo "Fixing rpds-py architecture compatibility..."; \
				pip uninstall rpds-py -y 2>/dev/null || true; \
				pip install --force-reinstall --no-binary rpds-py rpds-py || pip install --force-reinstall rpds-py; \
			else \
				echo "rpds-py is compatible"; \
			fi; \
		fi; \
		echo "Finding praetorian binary location..."; \
		PRAETORIAN_PATH=$$(pip show -f praetorian-cli | grep -E "^Location:" | cut -d' ' -f2); \
		if [ -n "$$PRAETORIAN_PATH" ]; then \
			BIN_PATH="$$PRAETORIAN_PATH/../../../bin"; \
			if [ -f "$$BIN_PATH/praetorian" ]; then \
				echo "Found praetorian at $$BIN_PATH/praetorian"; \
			else \
				BIN_PATH=$$(python3 -c "import site; print(site.USER_BASE + '/bin')"); \
				echo "Checking user site bin path: $$BIN_PATH"; \
			fi; \
		else \
			BIN_PATH=$$(python3 -c "import site; print(site.USER_BASE + '/bin')"); \
		fi; \
		echo "Adding $$BIN_PATH to PATH in shell profile..."; \
		if [ -f ~/.zshrc ]; then \
			if ! grep -q "$$BIN_PATH" ~/.zshrc 2>/dev/null; then \
				echo "export PATH=\"$$BIN_PATH:\$$PATH\"" >> ~/.zshrc; \
				echo "Added $$BIN_PATH to ~/.zshrc"; \
			fi; \
		fi; \
		if [ -f ~/.bash_profile ]; then \
			if ! grep -q "$$BIN_PATH" ~/.bash_profile 2>/dev/null; then \
				echo "export PATH=\"$$BIN_PATH:\$$PATH\"" >> ~/.bash_profile; \
				echo "Added $$BIN_PATH to ~/.bash_profile"; \
			fi; \
		fi; \
		export PATH="$$BIN_PATH:$$PATH"; \
		echo "Please restart your terminal or run 'source ~/.zshrc' (or ~/.bash_profile) to use praetorian command"; \
	else \
		echo "Praetorian CLI is already accessible in PATH"; \
	fi
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

feature:
	npx claude-flow@alpha sparc $(description)

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))
	git submodule set-branch --branch main -- ./modules/$(notdir $(basename $(repo)))


add-go-module:
	go work use $(module)

setup:
	open -ja Docker
	brew install awscli aws-sam-cli jq docker go npm
	@if ! grep -q "export GOPRIVATE=github.com/praetorian-inc" ~/.zshrc 2>/dev/null; then \
		echo "export GOPRIVATE=github.com/praetorian-inc" >> ~/.zshrc; \
		echo "Added GOPRIVATE to ~/.zshrc"; \
	fi
	git submodule update --init --recursive -j 4; \
	cd modules/chariot/ui && npm i && npm run setup
	@echo "Setting up chariot-ui-components local linking..."
	cd modules/chariot-ui-components && npm i && npm link
	cd modules/chariot/ui && npm link "@praetorian-chariot/ui"
	@echo "Chariot UI components linked successfully for local development"
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
	@echo "Installing Praetorian CLI..."
	@if ! command -v praetorian >/dev/null 2>&1; then \
		echo "Installing praetorian-cli with architecture compatibility..."; \
		ARCH=$$(uname -m); \
		echo "Detected architecture: $$ARCH"; \
		pip install praetorian-cli; \
		if [ "$$ARCH" = "x86_64" ]; then \
			echo "Checking for architecture compatibility issues on x86_64..."; \
			if ! python3 -c "import rpds" 2>/dev/null; then \
				echo "Fixing rpds-py architecture compatibility..."; \
				pip uninstall rpds-py -y 2>/dev/null || true; \
				pip install --force-reinstall --no-binary rpds-py rpds-py || pip install --force-reinstall rpds-py; \
			fi; \
		fi; \
		echo "Finding praetorian binary location..."; \
		BIN_PATH=$$(python3 -c "import site; print(site.USER_BASE + '/bin')"); \
		echo "Adding $$BIN_PATH to PATH in shell profile..."; \
		if [ -f ~/.zshrc ]; then \
			if ! grep -q "$$BIN_PATH" ~/.zshrc 2>/dev/null; then \
				echo "export PATH=\"$$BIN_PATH:\$$PATH\"" >> ~/.zshrc; \
				echo "Added $$BIN_PATH to ~/.zshrc"; \
			fi; \
		fi; \
		if [ -f ~/.bash_profile ]; then \
			if ! grep -q "$$BIN_PATH" ~/.bash_profile 2>/dev/null; then \
				echo "export PATH=\"$$BIN_PATH:\$$PATH\"" >> ~/.bash_profile; \
				echo "Added $$BIN_PATH to ~/.bash_profile"; \
			fi; \
		fi; \
		echo "Praetorian CLI installed. Please restart your terminal or run 'source ~/.zshrc' to use the 'praetorian' command"; \
	else \
		echo "Praetorian CLI is already installed and accessible"; \
	fi

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
	git submodule update --init --recursive

.PHONY: submodule-pull
submodule-pull: ## Pull latest changes from all submodules
	@echo "Pulling latest changes from all submodules..."
	git submodule foreach --recursive 'git fetch && git checkout main && git pull origin main'

.PHONY: submodule-status
submodule-status: ## Show status of all submodules
	@echo "Submodule status:"
	git submodule status

.PHONY: submodule-update
submodule-update: submodule-init submodule-pull submodule-status ## Complete submodule update workflow
	@echo "Submodule update completed"

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
