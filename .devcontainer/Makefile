PACKAGE_TAG := $(shell date -u +"%Y_%m_%d-%H_%M_%S-UTC")
GIT_TRACKING_TAG := "published-devcontainer-$(PACKAGE_TAG)"

images:
	docker buildx build --platform linux/amd64 -t ghcr.io/praetorian-inc/chariot-devpod:$(PACKAGE_TAG) .
	docker buildx build --platform linux/amd64 -t ghcr.io/praetorian-inc/chariot-devpod:latest .

publish: images
	docker push ghcr.io/praetorian-inc/chariot-devpod:$(PACKAGE_TAG)
	docker push ghcr.io/praetorian-inc/chariot-devpod:latest
	@make tag

tag:
	git tag -a $(GIT_TRACKING_TAG) -m "Published by $(shell whoami)"
	git push origin $(GIT_TRACKING_TAG)

