# OpenClaw DevPod Configuration
# Workspace naming: $USER-openclaw (e.g., nathan-openclaw)
#
# This Makefile stays LOCAL - only the workspace/ directory is synced to the instance.

# Auto-detect username from system
USERNAME := $(shell whoami)
WORKSPACE := $(USERNAME)-openclaw

# Instance configurations
INSTANCE_CPU := t3.large
INSTANCE_GPU := g4dn.xlarge
INSTANCE_INFERENTIA := inf2.xlarge
AWS_PROVIDER := aws-us-east-1

# AMI configurations
# CPU instances use default Ubuntu AMI
# GPU instances REQUIRE Deep Learning AMI for NVIDIA Container Toolkit (Docker GPU passthrough)
AMI_GPU := ami-0e352d4aa794f5377  # Deep Learning Base OSS Nvidia Driver GPU AMI (Ubuntu 24.04)

# IDE configuration (cursor, vscode, goland, none)
IDE := cursor

# Source directory (what gets synced to instance)
SOURCE_DIR := ./workspace

# Allow overrides
ifdef REGION
	AWS_PROVIDER := aws-$(REGION)
endif

.PHONY: help devpod-up-cpu-t3-large devpod-up-gpu-g4dn-xlarge devpod-up-inferentia-inf2-xlarge \
        devpod-recreate-cpu-t3-large devpod-recreate-gpu-g4dn-xlarge devpod-recreate-inferentia-inf2-xlarge

help: ## Show this help
	@echo "OpenClaw DevPod Management"
	@echo "=========================="
	@echo "Workspace: $(WORKSPACE)"
	@echo "Provider:  $(AWS_PROVIDER)"
	@echo "IDE:       $(IDE)"
	@echo ""
	@echo "Create Workspace:"
	@echo "  make devpod-up-cpu-t3-large              CPU only - for cloud APIs          ~\$$0.08/hr"
	@echo "  make devpod-up-gpu-g4dn-xlarge           NVIDIA T4 GPU - for local models   ~\$$0.53/hr"
	@echo "  make devpod-up-inferentia-inf2-xlarge    AWS Inferentia2 - AWS AI chip      ~\$$0.76/hr"
	@echo ""
	@echo "Recreate (delete + create):"
	@echo "  make devpod-recreate-cpu-t3-large"
	@echo "  make devpod-recreate-gpu-g4dn-xlarge"
	@echo "  make devpod-recreate-inferentia-inf2-xlarge"
	@echo ""
	@echo "Native DevPod Commands (use these for management):"
	@echo "  devpod up $(WORKSPACE)       Start workspace"
	@echo "  devpod stop $(WORKSPACE)     Stop workspace"
	@echo "  devpod ssh $(WORKSPACE)      SSH into workspace"
	@echo "  devpod delete $(WORKSPACE)   Delete workspace"
	@echo "  devpod list                  List all workspaces"
	@echo ""
	@echo "Options:"
	@echo "  REGION=us-west-2    Override AWS region"
	@echo "  USERNAME=other      Override username (default: $(USERNAME))"
	@echo "  IDE=vscode          Override IDE (default: cursor, options: cursor, vscode, goland, none)"
	@echo ""
	@echo "Cost Comparison (24/7):"
	@echo "  CPU (t3.large):        ~\$$60/month  - Use with Anthropic/Bedrock APIs"
	@echo "  GPU (g4dn.xlarge):     ~\$$390/month - NVIDIA T4, runs all Ollama models"
	@echo "  Inferentia (inf2.xl):  ~\$$550/month - AWS chip, faster but needs Neuron SDK"
	@echo ""
	@echo "Installed Tools:"
	@echo "  openclaw, claude (Claude Code), ollama, litellm, gh (GitHub CLI)"

devpod-up-cpu-t3-large: ## Create workspace with CPU instance (t3.large) - for cloud APIs
	@echo "🦞 Creating OpenClaw workspace: $(WORKSPACE)"
	@echo "   Instance: $(INSTANCE_CPU) (CPU only - use with cloud APIs)"
	@echo "   Provider: $(AWS_PROVIDER)"
	@echo "   IDE:      $(IDE)"
	@devpod up $(SOURCE_DIR) \
		--provider $(AWS_PROVIDER) \
		--id $(WORKSPACE) \
		--ide $(IDE) \
		--provider-option AWS_INSTANCE_TYPE=$(INSTANCE_CPU)
	@echo ""
	@echo "✅ Workspace ready!"
	@echo "   Cursor should open automatically."
	@echo "   Or run: devpod ssh $(WORKSPACE)"
	@echo "   Then: ./setup.sh"

devpod-up-gpu-g4dn-xlarge: ## Create workspace with NVIDIA GPU (g4dn.xlarge) - for local models
	@echo "🦞 Creating OpenClaw workspace: $(WORKSPACE)"
	@echo "   Instance: $(INSTANCE_GPU) (NVIDIA T4 GPU, 16GB VRAM)"
	@echo "   AMI:      Deep Learning Base OSS (NVIDIA Container Toolkit pre-installed)"
	@echo "   Provider: $(AWS_PROVIDER)"
	@echo "   IDE:      $(IDE)"
	@echo ""
	@echo "   GPU supports all Ollama models: DeepSeek, Qwen, Llama, Mistral, etc."
	@echo ""
	@devpod up $(SOURCE_DIR) \
		--provider $(AWS_PROVIDER) \
		--id $(WORKSPACE) \
		--ide $(IDE) \
		--provider-option AWS_INSTANCE_TYPE=$(INSTANCE_GPU) \
		--provider-option AWS_AMI=$(AMI_GPU) \
		--provider-option AWS_AVAILABILITY_ZONE=us-east-1a
	@echo ""
	@echo "✅ GPU workspace ready!"
	@echo "   Cursor should open automatically."
	@echo "   Or run: devpod ssh $(WORKSPACE)"
	@echo "   Then: ./setup.sh"

devpod-up-inferentia-inf2-xlarge: ## Create workspace with AWS Inferentia (inf2.xlarge) - AWS AI chip
	@echo "🦞 Creating OpenClaw workspace: $(WORKSPACE)"
	@echo "   Instance: $(INSTANCE_INFERENTIA) (AWS Inferentia2 chip)"
	@echo "   Provider: $(AWS_PROVIDER)"
	@echo "   IDE:      $(IDE)"
	@echo ""
	@echo "   ⚠️  Note: Inferentia requires AWS Neuron SDK for model compilation."
	@echo "   Models must be compiled specifically for Inferentia."
	@echo "   See: https://awsdocs-neuron.readthedocs-hosted.com/"
	@echo ""
	@devpod up $(SOURCE_DIR) \
		--provider $(AWS_PROVIDER) \
		--id $(WORKSPACE) \
		--ide $(IDE) \
		--provider-option AWS_INSTANCE_TYPE=$(INSTANCE_INFERENTIA)
	@echo ""
	@echo "✅ Inferentia workspace ready!"
	@echo "   Cursor should open automatically."
	@echo "   Or run: devpod ssh $(WORKSPACE)"
	@echo "   Then: ./setup.sh"

devpod-recreate-cpu-t3-large: ## Delete and recreate CPU workspace
	@echo "🗑️  Deleting $(WORKSPACE)..."
	@devpod delete $(WORKSPACE) || true
	@$(MAKE) devpod-up-cpu-t3-large

devpod-recreate-gpu-g4dn-xlarge: ## Delete and recreate GPU workspace
	@echo "🗑️  Deleting $(WORKSPACE)..."
	@devpod delete $(WORKSPACE) || true
	@$(MAKE) devpod-up-gpu-g4dn-xlarge

devpod-recreate-inferentia-inf2-xlarge: ## Delete and recreate Inferentia workspace
	@echo "🗑️  Deleting $(WORKSPACE)..."
	@devpod delete $(WORKSPACE) || true
	@$(MAKE) devpod-up-inferentia-inf2-xlarge
