# Procedure for building and pushing the chariot-devpod container image

- Get a classic GitHub PAT that has write:packages permission.
- Run `docker login` using that PAT:
  - `echo "$YOUR_PAT" | docker login ghcr.io -u $YOUR_GITHUB_USERNAME --password-stdin`
- `open -ja Docker`
- `docker buildx build -t ghcr.io/praetorian-inc/chariot-devpod:latest .`
- `docker push ghcr.io/praetorian-inc/chariot-devpod:latest`
