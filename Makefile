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

chariot:
	cd modules/chariot/backend && make dev
	cd modules/chariot/backend && make env-populate
	cd modules/chariot/ui && npm i && npm run start