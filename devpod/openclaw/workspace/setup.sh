#!/bin/bash
# OpenClaw Setup Script
# One script to set up everything

set -e

echo ""
echo "🦞 OpenClaw Setup"
echo "================="
echo ""

# Fix PATH for npm global packages
if [[ ":$PATH:" != *":/home/vscode/.npm-global/bin:"* ]]; then
    export PATH="/home/vscode/.npm-global/bin:$PATH"
    # Add to .bashrc for future sessions
    if ! grep -q '.npm-global/bin' ~/.bashrc 2>/dev/null; then
        echo 'export PATH="/home/vscode/.npm-global/bin:$PATH"' >> ~/.bashrc
        echo "✅ Added npm global bin to PATH"
    fi
fi

# Check if we have a GPU
HAS_GPU=false
if command -v nvidia-smi &> /dev/null; then
    HAS_GPU=true
    echo "✅ GPU detected:"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo ""
fi

# Step 1: Install OpenClaw
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Installing OpenClaw"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
curl -fsSL https://openclaw.ai/install.sh | bash

echo ""
echo "✅ OpenClaw installed!"
echo ""

# Step 2: Local Models (optional, GPU only)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Local AI Models"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HAS_GPU" = false ]; then
    echo "⚠️  No GPU detected. Skipping local model setup."
    echo "   You can use cloud APIs (Anthropic, OpenRouter, Bedrock) instead."
    echo ""
else
    echo "Would you like to install local AI models?"
    echo "This allows you to run DeepSeek, Qwen, Llama, etc. locally."
    echo ""
    echo "  1) Yes - Install local models"
    echo "  2) No  - Use cloud APIs only"
    echo ""
    read -p "Select [1-2]: " install_models

    if [ "$install_models" = "1" ]; then
        echo ""
        echo "Starting Ollama service..."
        ollama serve &
        sleep 3

        echo ""
        echo "Which models would you like to install?"
        echo ""
        echo "  1) Essential (~15GB) - DeepSeek-R1 8B, Qwen 2.5 7B"
        echo "  2) Standard (~30GB)  - Essential + Llama 3.2, Mistral"
        echo "  3) Full (~60GB)      - Standard + larger models + CodeLlama"
        echo "  4) Custom            - Choose specific models"
        echo "  5) Skip              - Install models later"
        echo ""
        read -p "Select [1-5]: " model_choice

        pull_model() {
            local model=$1
            local desc=$2
            echo ""
            echo "📦 Pulling $model ($desc)..."
            ollama pull $model
        }

        case $model_choice in
            1)
                pull_model "deepseek-r1:8b" "8B reasoning model"
                pull_model "qwen2.5:7b" "7B general model"
                ;;
            2)
                pull_model "deepseek-r1:8b" "8B reasoning model"
                pull_model "qwen2.5:7b" "7B general model"
                pull_model "llama3.1:8b" "8B Meta model"
                pull_model "mistral:7b" "7B fast model"
                ;;
            3)
                pull_model "deepseek-r1:8b" "8B reasoning"
                pull_model "deepseek-r1:14b" "14B reasoning"
                pull_model "qwen2.5:7b" "7B general"
                pull_model "qwen2.5:14b" "14B general"
                pull_model "llama3.1:8b" "8B Meta"
                pull_model "mistral:7b" "7B fast"
                pull_model "codellama:13b" "13B coding"
                ;;
            4)
                echo ""
                echo "Available models:"
                echo "  deepseek-r1:8b, deepseek-r1:14b, deepseek-r1:32b"
                echo "  qwen2.5:7b, qwen2.5:14b, qwen2.5:32b, qwen2.5-coder:7b"
                echo "  llama3.1:8b, llama3.2:3b, llama3.2:1b"
                echo "  mistral:7b, codellama:13b, phi3:medium"
                echo ""
                read -p "Enter model names (space-separated): " models
                for model in $models; do
                    pull_model "$model" "custom"
                done
                ;;
            5)
                echo "Skipping. Install later with: ollama pull <model>"
                ;;
        esac

        if [ "$model_choice" != "5" ]; then
            echo ""
            echo "Installed models:"
            ollama list
        fi
    fi
fi

# Done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run 'openclaw' to start the configuration wizard."
echo ""
echo "Available tools:"
echo "  openclaw     - Personal AI assistant"
echo "  claude       - Claude Code CLI"
echo "  ollama       - Local model runner"
echo "  litellm      - Unified LLM proxy"
echo "  gh           - GitHub CLI"
echo ""
