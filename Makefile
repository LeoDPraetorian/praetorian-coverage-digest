chariot:
	open -ja Docker
	@echo "Deploying backend."
	cd modules/chariot/backend && make dev
	@echo "Backend deployment complete. Starting local frontend."
	cd modules/chariot/backend && make populate-env
	cd modules/chariot/ui && npm i && npm run start &
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
    echo "User created successfully and credentials stored in .env"

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


feature:
	npx claude-flow@alpha sparc $(description)

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))

add-go-module:
	go work use $(module)

update:
	git submodule update --init --recursive --depth 1 -j 4

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

.PHONY: submodule-init
submodule-init: ## Initialize all submodules
	@echo "Initializing all submodules..."
	git submodule update --init --recursive

.PHONY: submodule-pull
submodule-pull: ## Pull latest changes from all submodules
	@echo "Pulling latest changes from all submodules..."
	git submodule foreach 'git pull origin $$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")'

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
