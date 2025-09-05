#!/bin/bash

# Context awareness functions
show_context() {
    echo "📍 CURRENT CONTEXT:"
    echo "   Path: $(pwd)"
    echo "   Repo: $(git remote get-url origin 2>/dev/null | sed 's|.*/||' | sed 's|\.git$||')"
    echo "   Branch: $(git branch --show-current 2>/dev/null || echo 'detached HEAD')"
    echo "   Type: $(if [ -f .gitmodules ]; then echo 'SUPER-REPO (chariot-development-platform)'; else echo 'SUBMODULE'; fi)"
    echo ""
}

# Display initial context
echo "🎯 WORKTREE SETUP STARTING"
echo "================================"
show_context

# Get the current branch name from the worktree
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "⚠️  Warning: Not on a named branch, using 'feat/worktree-work' for submodules"
    CURRENT_BRANCH="feat/worktree-work"
fi

echo "🚀 Setting up worktree with branch: $CURRENT_BRANCH"
echo "📦 Initializing submodules..."

# Initialize all submodules
git submodule update --init --recursive

echo "🌿 Creating feature branches for all submodules..."

# Create feature branches for each submodule to avoid working on main
git submodule foreach "
    echo \"=== Setting up \$name ===\" &&
    git checkout main 2>/dev/null || git checkout -b main origin/main &&
    git pull origin main 2>/dev/null || true &&
    if git show-ref --verify --quiet refs/heads/$CURRENT_BRANCH; then
        echo \"Branch $CURRENT_BRANCH already exists, switching to it\" &&
        git checkout $CURRENT_BRANCH
    else
        echo \"Creating new branch $CURRENT_BRANCH\" &&
        git checkout -b $CURRENT_BRANCH
    fi &&
    echo \"✅ \$name now on branch $CURRENT_BRANCH\"
"

echo ""
echo "✅ WORKTREE SETUP COMPLETE!"
echo "================================"
echo "📋 Summary:"
echo "   • All submodules initialized and populated"
echo "   • All submodules switched to branch: $CURRENT_BRANCH"
echo "   • Ready for development work without affecting main branches"
echo ""
echo "📁 Available modules:"
ls -la modules/ | grep '^d' | awk '{print "   • " $9}' | grep -v '^\s*•\s*\.$' | grep -v '^\s*•\s*\.\.$'
echo ""
echo "🧭 NAVIGATION HELPERS:"
echo "   • To check where you are: ./where-am-i.sh"
echo "   • Super-repo root: cd /Users/nathansportsman/.claude-squad/worktrees/edit-button_1862644a50c84b40"
echo "   • Quick context check: pwd && git remote get-url origin && git branch --show-current"
echo ""
show_context