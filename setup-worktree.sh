#!/bin/bash
echo "Initializing submodules in worktree..."
git submodule update --init --recursive
echo "✅ All modules now available!"
ls -la modules/