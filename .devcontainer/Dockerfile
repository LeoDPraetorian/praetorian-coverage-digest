FROM mcr.microsoft.com/devcontainers/base:noble

# alleviate bad proxies in North California
RUN touch /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::Pipeline-Depth 0;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99fixbadproxy

RUN apt update && apt -y install python3 pipx npm jq emacs gh && apt clean

RUN wget -O install-docker.sh https://get.docker.com/ && \
    sh install-docker.sh && \
    rm -rf install-docker.sh

# Update Go version regularly using the latest tarball file name from https://go.dev/dl/
ARG GO_TARBALL=go1.25.2.linux-arm64.tar.gz
RUN wget https://go.dev/dl/$GO_TARBALL && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf $GO_TARBALL && \
    rm -rf $GO_TARBALL && \
    echo "export PATH=\$PATH:/usr/local/go/bin" >> ~/.bashrc

RUN npm i -g typescript

RUN wget https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip && \
    unzip awscli-exe-linux-aarch64.zip && \
    ./aws/install && \
    rm -rf ~/aws ~/awscli-exe-linux-aarch64.zip

RUN wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-arm64.zip && \
    unzip aws-sam-cli-linux-arm64.zip -d sam-installation && \
    ./sam-installation/install && \
    rm -rf ~/sam-installation ~/aws-sam-cli-linux-arm64.zip

RUN npm install -g @anthropic-ai/claude-code

RUN pipx install --include-deps praetorian-cli claude-agent-sdk

# Connect to the chariot-development-platform repo
# https://docs.github.com/en/packages/learn-github-packages/connecting-a-repository-to-a-package
LABEL org.opencontainers.image.source=https://github.com/praetorian-inc/chariot-development-platform
