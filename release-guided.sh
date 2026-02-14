#!/usr/bin/env bash
set -euo pipefail

steps=(
  "pnpm exec changeset"
  "pnpm exec changeset version"
  "pnpm run build-and-check"
  "pnpm exec changeset publish"
  "git push --follow-tags"
)

total_steps="${#steps[@]}"

confirm_step() {
  local prompt="$1"
  local reply
  read -r -p "$prompt [Y/n] " reply
  case "$reply" in
    ""|y|Y|yes|YES) return 0 ;;
    n|N|no|NO) return 1 ;;
    *) return 0 ;;
  esac
}

echo "Guided local release flow"
echo "Working directory: $(pwd)"

for i in "${!steps[@]}"; do
  step_number=$((i + 1))
  cmd="${steps[$i]}"

  echo
  echo "Step ${step_number}/${total_steps}: ${cmd}"
  if confirm_step "Run this step?"; then
    bash -lc "$cmd"
  else
    echo "Stopped before step ${step_number}. No further steps were run."
    exit 0
  fi
done

echo
echo "Release flow completed."
