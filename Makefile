add-module:
	git submodule add $(repo) ./modules/$(notdir $(basename $(repo)))

update:
	git submodule update --init --recursive

checkout-branch:
	git submodule foreach 'git checkout $(branch) || true'

create-branch:
	git submodule foreach 'git checkout -b $(branch)'
