#/bin/zsh
#
# This script helps with working around a DevPod bug where the state of the container isn't preserved across the first stop/up cycle.
#

workspace=$1

if [ -z "$workspace" ]; then
  echo "Error: Workspace name is required"
  echo "Usage: $0 <workspace-name>"
  exit 1
fi

echo "Stopping workspace $workspace..."
devpod stop $workspace

echo "Waiting for workspace to stop completely..."
while true; do
  status_output=$(devpod status $workspace 2>&1)
  if echo "$status_output" | grep -q "you can start it via"; then
    echo "Workspace $workspace stopped successfully"
    break
  fi
  echo "Polling..."
  sleep 5
done

echo "Starting workspace $workspace again..."
devpod up $workspace

echo "Workspace $workspace started successfully. You can now work in the container without losing your state."
