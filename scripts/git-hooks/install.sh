#!/usr/bin/env bash
# install.sh — symlinks the tracked hooks into .git/hooks.
# Run this once per clone of the repo.
set -e
cd "$(dirname "$0")/../.."

repo_root="$(git rev-parse --show-toplevel)"
hooks_src="$repo_root/scripts/git-hooks"
hooks_dst="$repo_root/.git/hooks"

for hook in pre-commit pre-push; do
  ln -sf "../../scripts/git-hooks/$hook" "$hooks_dst/$hook"
  chmod +x "$hooks_src/$hook"
  echo "✅ installed $hook"
done

if ! command -v gitleaks >/dev/null 2>&1; then
  echo ""
  echo "⚠️  gitleaks is not installed — hooks will skip the scan until you run:"
  echo "    brew install gitleaks"
fi
