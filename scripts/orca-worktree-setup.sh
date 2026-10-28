#!/usr/bin/env bash
set -euo pipefail
umask 077

worktree_root="$(git rev-parse --show-toplevel)"
common_git_dir="$(git -C "$worktree_root" rev-parse --path-format=absolute --git-common-dir)"
canonical_root="$(cd "$(dirname "$common_git_dir")" && pwd -P)"
if [[ "$worktree_root" == "$canonical_root" ]]; then
  echo "Canonical checkout; no worktree environment copy needed."
  exit 0
fi

copied=0
for env_file in .env.local .env.e2e.local; do
  source_env="$canonical_root/$env_file"
  target_env="$worktree_root/$env_file"

  if [[ -e "$target_env" || -L "$target_env" ]]; then
    echo "Worktree $env_file already exists; leaving it unchanged."
    continue
  fi

  if [[ ! -f "$source_env" ]]; then
    echo "No $env_file found in the canonical checkout; skipping."
    continue
  fi

  install -m 600 -- "$source_env" "$target_env"
  echo "Copied canonical $env_file with owner-only permissions."
  copied=$((copied + 1))
done

if [[ "$copied" -eq 0 ]]; then
  echo "No environment files copied."
fi
