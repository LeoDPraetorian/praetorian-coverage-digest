#!/bin/bash

echo "🧭 LOCATION CONTEXT CHECKER"
echo "================================"
echo ""

# Current path context
echo "📍 CURRENT LOCATION:"
echo "   Working Directory: $(pwd)"
echo "   Relative to HOME: $(pwd | sed "s|$HOME|~|")"
echo ""

# Git repository context
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "📦 GIT REPOSITORY INFO:"
    echo "   Remote URL: $(git remote get-url origin 2>/dev/null || echo 'No remote configured')"
    echo "   Repository: $(git remote get-url origin 2>/dev/null | sed 's|.*/||' | sed 's|\.git$||' || echo 'Unknown')"
    echo "   Current Branch: $(git branch --show-current 2>/dev/null || echo 'detached HEAD')"
    echo "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'No commits')"
    echo ""
    
    # Repository type detection
    echo "🏗️ REPOSITORY TYPE:"
    if [ -f .gitmodules ]; then
        echo "   Type: SUPER-REPO (chariot-development-platform)"
        echo "   Contains: $(grep -c '\[submodule' .gitmodules) submodules"
        echo "   Worktree: $(if [[ $(pwd) == *".claude-squad/worktrees"* ]]; then echo "YES"; else echo "NO"; fi)"
    else
        echo "   Type: SUBMODULE or STANDALONE REPO"
        # Check if we're inside a submodule
        if git rev-parse --show-superproject-working-tree > /dev/null 2>&1; then
            SUPER_ROOT=$(git rev-parse --show-superproject-working-tree)
            echo "   Parent: $SUPER_ROOT"
            echo "   Submodule Path: $(pwd | sed "s|$SUPER_ROOT/||")"
        fi
    fi
    echo ""
else
    echo "❌ NOT IN A GIT REPOSITORY"
    echo ""
fi

# Claude Squad worktree detection
echo "🤖 CLAUDE SQUAD STATUS:"
if [[ $(pwd) == *".claude-squad/worktrees"* ]]; then
    WORKTREE_NAME=$(basename $(pwd))
    echo "   Status: IN CLAUDE SQUAD WORKTREE"
    echo "   Worktree Name: $WORKTREE_NAME"
    echo "   Worktree Path: $(pwd)"
else
    echo "   Status: NOT in Claude Squad worktree"
fi
echo ""

# Navigation shortcuts
echo "🧭 QUICK NAVIGATION:"
if [[ $(pwd) == *".claude-squad/worktrees"* ]]; then
    WORKTREE_ROOT=$(pwd | grep -o '^[^/]*/.claude-squad/worktrees/[^/]*' | head -1)
    if [ -f .gitmodules ]; then
        echo "   You're in the SUPER-REPO root"
        echo "   • Modules: cd modules/"
        echo "   • Chariot: cd modules/chariot/"
        echo "   • Nebula: cd modules/nebula/"
    else
        echo "   • Super-repo root: cd $WORKTREE_ROOT"
        echo "   • Go back: cd .."
    fi
else
    echo "   • Find worktrees: ls ~/.claude-squad/worktrees/"
fi
echo ""

echo "💡 HELPFUL COMMANDS:"
echo "   • Check git status: git status"
echo "   • List submodules: git submodule status"
echo "   • See all branches: git branch -a"
echo "   • Check remotes: git remote -v"