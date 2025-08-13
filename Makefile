chariot:
	open -ja Docker
	@echo "Deploying backend."
	cd modules/chariot/backend && make -j4 dev
	@echo "Backend deployment complete. Deploying frontend."
	cd modules/chariot/backend && make populate-env
	cd modules/chariot/ui && npm i && npm run start
	@echo "Deployment complete."

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

add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))

add-go-module:
	go work use $(module)

update:
	git submodule update --init --recursive

checkout:
	git submodule foreach 'git checkout $(branch) || true'

create:
	git submodule foreach 'git checkout -b $(branch)'

create-prs:
	git submodule foreach 'gh pr create'
