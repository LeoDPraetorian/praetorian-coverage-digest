FROM mcr.microsoft.com/devcontainers/base:noble

# Alleviate bad proxies
RUN touch /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::Pipeline-Depth 0;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99fixbadproxy

# Install Node.js 22+ (required by openclaw)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

# Install system packages
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        nodejs \
        git \
        curl \
        jq \
        gh \
        python3 \
        python3-pip \
        python3-venv \
        openjdk-21-jre-headless \
        zstd \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Ollama (local model runner)
RUN curl -fsSL https://ollama.com/install.sh | sh

# Install npm packages globally
RUN npm install -g \
    openclaw \
    @anthropic-ai/claude-code \
    typescript

# Install LiteLLM (unified LLM API proxy)
RUN pip3 install --break-system-packages litellm

# Setup directories with proper ownership
RUN mkdir -p /home/vscode/workspace /home/vscode/.ollama && \
    chown -R vscode:vscode /home/vscode

USER vscode
WORKDIR /home/vscode

# Configure npm for user-local installs
RUN mkdir -p /home/vscode/.npm-global && \
    npm config set prefix '/home/vscode/.npm-global'

# Set PATH to include npm global bin
ENV PATH="/home/vscode/.npm-global/bin:$PATH"
ENV OLLAMA_HOST="0.0.0.0:11434"
