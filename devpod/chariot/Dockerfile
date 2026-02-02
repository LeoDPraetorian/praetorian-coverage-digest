FROM mcr.microsoft.com/devcontainers/base:noble

# alleviate bad proxies in North California
RUN touch /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::Pipeline-Depth 0;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99fixbadproxy

# Use the newer package definitions from nodesource, because Ubuntu's official versions are
# too old that some of the MCP servers do not work; pin to 24, which is the latest LTS version
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

# install development software
RUN apt update && apt -y install python3 pip nodejs jq gh uuid-runtime && apt install -y --no-install-recommends emacs-nox && apt clean && npm i -g npm && npm i -g typescript

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Update Go version regularly using the latest tarball file name from https://go.dev/dl/
ARG GO_TARBALL=go1.25.3.linux-amd64.tar.gz
RUN wget https://go.dev/dl/$GO_TARBALL -O go-installer.tar.gz && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf go-installer.tar.gz && \
    rm -rf go-installer.tar.gz

# install Google Chrome
ARG CHROME_DEB=google-chrome-stable_current_amd64.deb
RUN apt install -y fonts-liberation libegl-mesa0 libgl1-mesa-dri mesa-utils libnspr4 libnss3 xdg-utils && \
    wget https://dl.google.com/linux/direct/$CHROME_DEB -O chrome-installer.deb && \
    dpkg -i chrome-installer.deb && \
    rm -rf chrome-installer.deb

# Connect to the chariot-development-platform repo
# https://docs.github.com/en/packages/learn-github-packages/connecting-a-repository-to-a-package
LABEL org.opencontainers.image.source=https://github.com/praetorian-inc/chariot-development-platform
