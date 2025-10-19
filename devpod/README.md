# Remote Development

This document walks through how to set up **DevPod** for remote development. DevPod implements the [`devcontainer`](https://containers.dev/)
standard. It is an open-source alternative to GitHub Codespaces, without tight coupling to VS Code. The way devcontainer
works is ingenious. Learn more on how it works [here](https://code.visualstudio.com/docs/devcontainers/containers).


## Install DevPod
- Install the CLI: 
  ```
  curl -L -o /tmp/devpod "https://github.com/loft-sh/devpod/releases/latest/download/devpod-darwin-arm64"
  sudo install -c -m 0755 /tmp/devpod /usr/local/bin
  rm -f /tmp/devpod
  ```
- Install the Desktop App: 
  
  Click the **Download DevPod** button on this page: https://devpod.sh/
  

## Get Your DevPod Configured

### Set up the AWS provider

In DevPod, a **provider** is the entity that provides the compute for the devcontainer. In our use case, we run the devcontainers on AWS.

- Make sure your `~/.aws/credentials` has valid API creds in it. Run `aws configure` to fix if needed.

- Use [this website](https://awsspeedtest.com/latency?regions=eu-south-2,us-east-1,us-east-2,us-west-1,us-west-2) to find the AWS region
  with the lowest latency to you.

- Run the corresponding command below for your region to create the provider. The commands have different AMIs and VPCs.
  - **Virginia (us-east-1):**

    `devpod provider add aws -o AWS_REGION=us-east-1 -o AWS_AMI=ami-0360c520857e3138f -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=100 -o AWS_VPC_ID=vpc-05295a3b3e9c56627 -o INACTIVITY_TIMEOUT=1h --name aws-provider`

  - **Ohio (us-east-2):**

    `devpod provider add aws -o AWS_REGION=us-east-2 -o AWS_AMI=ami-0cfde0ea8edd312d4 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=100 -o AWS_VPC_ID=vpc-04ded0246f0e1cbb9 -o INACTIVITY_TIMEOUT=1h --name aws-provider`

  - **Spain (eu-south-2):**

    `devpod provider add aws -o AWS_REGION=eu-south-2 -o AWS_AMI=ami-0fd47a5cb59868dde -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=100 -o AWS_VPC_ID=vpc-0a680aa940edf918b -o INACTIVITY_TIMEOUT=1h --name aws-provider`

  - **California (us-west-1):**

    `devpod provider add aws -o AWS_REGION=us-west-1 -o AWS_AMI=ami-00271c85bf8a52b84 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=100 -o AWS_VPC_ID=vpc-060e44ce21af50236 -o INACTIVITY_TIMEOUT=1h --name aws-provider`

  - **Oregon (us-west-2):**

    `devpod provider add aws -o AWS_REGION=us-west-2 -o AWS_AMI=ami-03aa99ddf5498ceb9 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=100 -o AWS_VPC_ID=vpc-0092000be10e2c104 -o INACTIVITY_TIMEOUT=1h --name aws-provider`
    

### Create a workspace
- A **DevPod Workspace** is the container that runs the development environment.

- Create a workspace off of the `chariot-development-platform` repo. Give it a name that has meaning to you, such a
  "ui-refactor":

  - **Cursor:** 
    - `devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform --ide cursor --id {{YOUR_WORKSPACE_NAME}}`
    - Once it is done initializing the container, a new IDE window will appear with the name of the workspace and an indication
      that it operates over an SSH tunnel. This IDE should show the repo tree in the file explorer. It is the tree
      in the container.

  - **GoLand:**
    - `devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform --ide goland --id {{YOUR_WORKSPACE_NAME}}`
    - Once it is done initializing the container, it will bring up a **Connect to SSH** dialog window with default
      filled in. Click **Check Connection and Continue**. It will initialize the GoLand project, dropping you in the
      Readme file of the repo.

- _All the communications between your laptop and the container are mediated by the IDE._
  
- Don't do any work in the container yet. You need to workaround a DevPod bug before doing so ([Issue #1925](https://github.com/loft-sh/devpod/issues/1925)).
  - Run `scripts/cycle-devpod.sh {{YOUR_WORKSPACE_NAME}}`
  - Subsequent restart cycles will preserve the container.

### Set up the environment in the container

This section is about cloning the repos, authenticating to various services, and viewing the
desktop of the container.

- Open up a terminal in the IDE. You will be dropped into the directory where the `chariot-development-platform` lives.
  DevPod puts it at `/workspaces/{{YOUR_WORKSPACE_NAME}}`.

- Run `make setup`. During this, the Chrome running on your laptop will pop up for authentication to GitHub.


### View the Fluxbox desktop and running Chrome

- The devcontainer is pre-installed with a lightweight Fluxbox desktop environment. This allows us to run Chrome 
  visually and login to Chariot with drag-and-drop keychain files.

- Forward the VNC port to your laptop:
  - **Cursor:**
    - Press `CMD+SHIFT+P` and type "ports view ↵". This will drop you in a **Ports** tab in the bottom pane.
    - Click the **Forward a Port** button. Enter `6080`.
    - This creates a new entry for port 6080. In the localhost:NNNNN column, click the **Preview in Editor** icon to open
      the Cursor browser to view the noVNC webpage. Click **Connect**.
    - Reference: https://code.visualstudio.com/docs/debugtest/port-forwarding
    
  - **GoLand:** 
    - Open the **Backend Control Center** by clicking the DevPod workspace name on the top chrome of GoLand window.
    - Click the **Ports** tab.
    - Click Add for **Forward Remote -> Local**. 
    - Enter `6080` for remote and a random open port on local, say, `60123`
    - In your local browser, point it to **http://localhost:60123**. It will open up a noVNC page. Click **Connect**.
    - Reference: https://www.jetbrains.com/help/idea/security-model.html#manage_ports

- You now see the Fluxbox desktop. You can run the file manager and terminal via the application menu in the lower
  left corner.

- Back in the IDE terminal, run `scripts/launch-chrome.sh https://chariot.praetorian.com`. Chrome should show up.
  We use a script to launch Chrome with options that support interaction with the chrome-devtools MCP server and graphics
  acceleration.

### Running the frontend

- Run `make start-ui`
- Run `scripts/launch-chrome.sh https://localhost:3000`
- Login to any stack, including Prod, using keychain file drag-and-drop. I recommend putting individual keychain files
  in `/home/vscode`. Then use the File Manager of Fluxbox to drag-and-drop.

### Deploying the backend
- The `whoami` username is `vscode`. So, you need to update the config env files to point to your stack. 
- Support only for deploying the SAM stack. No support yet for creating the docker image for the compute server. So, work
  that requires iterating on the compute server code need to be done on your laptop.
- Run `make build` in `modules/chariot/backend`. The first build takes between 5 to 10 minutes, with the `go mod download`
  step looks like it is hanging for a couple of minute.
- There is an open question to solve -- how to deploy only the SAM stack without updating the docker image?

### Add your IDE extensions/plugins:
- **Cursor:**
    - Go to the **Extension** view. You will see your list of extensions with "Install in SSH:{{WORKSPACE_NAME}}" buttons.
      Click that button to install in the container. If you will need to repeat this step for all containers you launch.

- **GoLand:**
    - In Settings, you will see two Plugins menu entries: Host and Client. Install the plugins on **Host**.
    - Reference: https://youtrack.jetbrains.com/articles/SUPPORT-A-696/Where-should-the-plugin-be-installed-in-the-client-or-on-the-host-for-remote-development

## Variations
- If you want to launch a DevPod workspace with a specific commit of the repo, add the version slug to it, such as
`devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform@peter/vnc --id workspace-at-a-branch`
`devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform@sha256:3f8179ae8deb7d2021406625c9444134b65952c4 --id workspace-at-a-hash`

- You can change the size of the VNC display with the `xrandr` command, such as `xrandr -s 1600x1200`.

# Build and publish the devcontainer
- The devcontainer is pre-built in [Praetorian's ghcr.io](https://github.com/praetorian-inc/chariot-development-platform/pkgs/container/chariot-devpod).
- To update it on MacBook:
  - Login to Docker with a PAT that can write ghcr.io packages.
  - Run `make publish` in `.devcontainer/`.

# Set up notes:
- Workaround DevPod v0.6.15 bug ([Issue #49](https://github.com/loft-sh/devpod-provider-aws/issues/49)) by making copies of
  the Jammy Jellyfish Ubuntu AMI into our AWS Playground account with the description prefix that the code looks for.
- Workaround DevPod persistence by running `scripts/cycle-devpod.sh`
- Running Google Chrome with chrome-devtools-mcp
  - Google Chrome official packages are only available for x86_64 on Linux. So we moved to an Intel instance type.
  - Desktop environment is provided by the [desktop-lite](https://github.com/devcontainers/features/tree/main/src/desktop-lite). 
    It contains TigerVNC and Fluxbox, just enough for us use Chrome visually and login using keychain files.
  - Chrome needs a more memory in /dev/shm. Expanded that to 2GB from the 64MB default.
  - Our sigma.js in the UI needs several specific packages and launch time options to run correctly.
    See those in Dockerfile and launch-chrome.sh
  - In order to the debug port 9222 to work, Chrome needs to be launched with `--user-data-dir`.
