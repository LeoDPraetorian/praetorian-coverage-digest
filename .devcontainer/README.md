# Remote Development

This document walks through how to set up **DevPod** for remote development. DevPod implements the [`devcontainer`](https://containers.dev/)
standard. It is an open-source alternative to GitHub Codespaces, without tight coupling to VS Code. The way devcontainer works is
incredibly ingenious. Learn more on how it works [here](https://code.visualstudio.com/docs/devcontainers/containers).


## Install DevPod
- Install the CLI: 
  ```
  curl -L -o devpod "https://github.com/loft-sh/devpod/releases/latest/download/devpod-darwin-arm64"
  sudo install -c -m 0755 devpod /usr/local/bin
  rm -f devpod
  ```
- Install the Desktop App: 
  
  Click the **Download DevPod** button on this page: https://devpod.sh/
  

## Get Your DevPod Configured

### Set up the AWS provider

In DevPod, a **provider** is the entity that provides the compute for the devcontainer. In our use case, we run the devcontainers on AWS.

- Make sure your `~/.aws/credentials` has valid API creds in it. Run `aws configure` to fix if needed.

- Use [this website](https://awsspeedtest.com/latency?regions=eu-south-2,us-east-1,us-east-2,us-west-1,us-west-2) to find the AWS region
  with the lowest latency to you.

- Use the corresponding command below for your region to create an AWS provider in DevPod.
  - **Virginia (us-east-1):** `devpod provider add aws -o AWS_REGION=us-east-1 -o AWS_AMI=ami-0360c520857e3138f -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=50 -o AWS_VPC_ID=vpc-05295a3b3e9c56627 --name aws-provider`
  - **Ohio (us-east-2):** `devpod provider add aws -o AWS_REGION=us-east-2 -o AWS_AMI=ami-0cfde0ea8edd312d4 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=50 -o AWS_VPC_ID=vpc-04ded0246f0e1cbb9 --name aws-provider`
  - **Spain (eu-south-2):** `devpod provider add aws -o AWS_REGION=eu-south-2 -o AWS_AMI=ami-0fd47a5cb59868dde -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=50 -o AWS_VPC_ID=vpc-0a680aa940edf918b --name aws-provider`
  - **California (us-west-1):** `devpod provider add aws -o AWS_REGION=us-west-1 -o AWS_AMI=ami-00271c85bf8a52b84 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=50 -o AWS_VPC_ID=vpc-060e44ce21af50236 --name aws-provider`
  - **Oregon (us-west-2):** `devpod provider add aws -o AWS_REGION=us-west-2 -o AWS_AMI=ami-03aa99ddf5498ceb9 -o AWS_INSTANCE_TYPE=c7i.2xlarge -o AWS_DISK_SIZE=50 -o AWS_VPC_ID=vpc-0092000be10e2c104 --name aws-provider`

### Create a workspace
- A **DevPod Workspace** is the container that runs the development environment. Such containers
  is called [`devcontainer`](https://containers.dev/)

- Create a workspace off of the `chariot-development-platform` repo. Give it a name that has meaning to you, such as "ui-refactor".
  `devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform --ide cursor --id {{YOUR_WORKSPACE_NAME}}`
  *(Note: I am still working out Goland...)*

- It will print tons of log messages as it installs the devcontainer and additional software needed for the
  workspace. At the end of this, a new Cursor window will appear with the name of the workspace and an indication
  that it operates over an SSH tunnel. This Cursor window should show the repo tree in the file explorer.

- _All the communications between your laptop and the devcontainer are mediated by Cursor. So, you need to get terminals and brower from Cursor._

### Set up the environment in the container

This section is about cloning the repos, authenticating to various services, and viewing the
desktop of the devcontainer.

- Open up a terminal in Cursor. You will be dropped into the directory where the `chariot-development-platform` lives.
  DevPod puts it at `/workspaces/{{YOUR_WORKSPACE_NAME}}`.

- Run `make setup && make start-ui`. During this, the Chrome running on your laptop will pop up for authentication. This 
  command take about 5 minutes because it clones the modules and install NPM packages for the UI.


### View the desktop

- Run `xrandr -s 1600x1200` 

- Press `CMD+SHIFT+P` and type "ports view ↵". This will drop you in a **Ports** tab in the bottom pane.

- Click the **Forward a Port** button. Enter `6080`.

- This creates a new entry for port 6080. In the localhost:6080 column, click the **Preview in Editor** icon to open the Cursor browser to view the noVNC webpage. Click `Connect` in the webpage. You now see a lightweight FluxBox desktop.

- Back in the Cursor terminal, run `scripts/launch-chrome.sh https://localhost:3000`. Chrome should show up in
  noVNC with the Chariot login page.


### Add your favorite Cursor extension
- Go to the **Extension** view. You will see your list of extensions with "Install in SSH:{{WORKSPACE_NAME}}" buttons. 
  Click that button to install in this devcontainer. If you will need to repeat this step for all devcontainers you launch.


## Variations
- If you want to launch a DevPod workspace with a specific commit of the repo, add the version slug to it, such as
`devpod up --provider aws-provider github.com/praetorian-inc/chariot-development-platform@peter/vnc --id workspace-at-a-branch`
`devpod up github.com/praetorian-inc/chariot-development-platform@sha256:3f8179ae8deb7d2021406625c9444134b65952c4 --id workspace-at-a-hash`


# Build and publish the devcontainer
- They are on [Praetorian's ghcr.io](https://github.com/orgs/praetorian-inc/packages?repo_name=chariot-development-platform).
- Use the `Makefile` in `.devcontainer` to build and publish.


# Set up notes:
- Workaround DevPod v0.6.15 bug ([Issue #49](https://github.com/loft-sh/devpod-provider-aws/issues/49)) by making copies of
  the Jammy Jellyfish Ubuntu AMI into our AWS Playground account with the description prefix that the code looks for.

- Running Google Chrome
  - Google Chrome official packages are only available for x86_64 on Linux. So we moved to an Intel EC2.
  - Desktop environment is providede by the [desktop-lite](https://github.com/devcontainers/features/tree/main/src/desktop-lite). 
    It contains TigerVNC and Fluxbox, just enough for us Chrome to function.
  - Chrome needs a more memory in /dev/shm. Expanded that to 2GB from the 64MB default.
  - Our sigma.js in the UI needs several specific packages and launch time options to run correctly.
    See those in Dockerfile and launch-chrome.sh
