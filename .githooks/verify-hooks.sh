#!/bin/bash
#
# Verify git hooks are installed
# Can be run manually or added to shell profile for automatic checking
#
# Usage:
#   .githooks/verify-hooks.sh
#

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
    # Not in a git repository, exit silently
    exit 0
fi

# Only check if we're in the chariot-development-platform super-repo
if [ ! -f "$REPO_ROOT/.githooks/pre-commit" ]; then
    # Not the chariot-development-platform repo
    exit 0
fi

HOOK_PATH="$REPO_ROOT/.git/hooks/pre-commit"
HOOK_TARGET="../../.githooks/pre-commit"

# Check if hook is installed
if [ ! -L "$HOOK_PATH" ]; then
    echo ""
    echo "⚠️  WARNING: Git pre-commit hook is NOT installed!"
    echo ""
    echo "This hook prevents accidental submodule commits that cause PR conflicts."
    echo ""
    echo "To install the hook, run:"
    echo "  make install-git-hooks"
    echo ""
    echo "Or run full setup:"
    echo "  make setup"
    echo ""
    return 1 2>/dev/null || exit 1
fi

# Verify hook points to the correct target
CURRENT_TARGET=$(readlink "$HOOK_PATH")
if [ "$CURRENT_TARGET" != "$HOOK_TARGET" ]; then
    echo ""
    echo "⚠️  WARNING: Git pre-commit hook points to wrong target!"
    echo ""
    echo "Expected: $HOOK_TARGET"
    echo "Current:  $CURRENT_TARGET"
    echo ""
    echo "To fix, run:"
    echo "  make install-git-hooks"
    echo ""
    return 1 2>/dev/null || exit 1
fi

exit 0
