#!/usr/bin/env bash

# install-gcloud-codespace.sh — install the Google Cloud SDK into a Codespace.
#
# Idempotent: safe to re-run. Detects an existing install at $HOME/google-cloud-sdk
# and exits cleanly if gcloud is already available.
#
# Flags:
#   --non-interactive   Skip all interactive prompts. Uses the official installer's
#                       CLOUDSDK_CORE_DISABLE_PROMPTS env var so every prompt takes
#                       its default answer:
#                         - Install directory : $HOME/google-cloud-sdk
#                         - Modify rc file    : yes (appends PATH to $HOME/.bashrc)
#                         - Usage reporting   : no
#                       Intended for use from .devcontainer/devcontainer.json
#                       postCreateCommand, CI, or other non-TTY contexts.
#   --help              Show this help text.
#
# Without --non-interactive the installer asks its 3 default prompts as before.

set -euo pipefail

log() {
  printf '[gcloud-install] %s\n' "$*"
}

error() {
  printf '[gcloud-install][error] %s\n' "$*" >&2
}

NON_INTERACTIVE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --non-interactive|-y)
      NON_INTERACTIVE=1
      shift
      ;;
    --help|-h)
      sed -n '3,19p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      error "Unknown argument: $1 (use --help to see supported flags)"
      exit 2
      ;;
  esac
done

if [ -z "${CODESPACES:-}" ] && [ -z "${GITHUB_CODESPACE_TOKEN:-}" ]; then
  error "This script is designed for GitHub Codespaces."
  error "For local installation, use: brew install --cask google-cloud-sdk"
  exit 1
fi

log "Installing Google Cloud SDK in Codespace..."
if [ "$NON_INTERACTIVE" -eq 1 ]; then
  log "Mode: non-interactive (all prompts auto-answered with defaults)"
fi

INSTALL_DIR="$HOME/google-cloud-sdk"

if [ -d "$INSTALL_DIR" ]; then
  log "gcloud SDK already exists at $INSTALL_DIR"
  log "Sourcing initialization script..."
  if [ -f "$INSTALL_DIR/path.bash.inc" ]; then
    # shellcheck source=/dev/null
    source "$INSTALL_DIR/path.bash.inc"
  elif [ -f "$INSTALL_DIR/path.zsh.inc" ]; then
    # shellcheck source=/dev/null
    source "$INSTALL_DIR/path.zsh.inc"
  fi

  if command -v gcloud >/dev/null 2>&1; then
    log "✅ gcloud is now available"
    gcloud --version
    exit 0
  fi
fi

log "Downloading Google Cloud SDK installer..."
if [ "$NON_INTERACTIVE" -eq 1 ]; then
  # CLOUDSDK_CORE_DISABLE_PROMPTS is the official env var honoured by
  # Google's install_google_cloud_sdk.bash wrapper — every prompt is
  # answered with its default and the installer returns cleanly even
  # when stdin is not a TTY.
  CLOUDSDK_CORE_DISABLE_PROMPTS=1 \
  CLOUDSDK_INSTALL_DIR="$HOME" \
  curl -fsSL https://sdk.cloud.google.com | bash
else
  curl -fsSL https://sdk.cloud.google.com | bash
fi

if [ -f "$INSTALL_DIR/path.bash.inc" ]; then
  # shellcheck source=/dev/null
  source "$INSTALL_DIR/path.bash.inc"
elif [ -f "$INSTALL_DIR/path.zsh.inc" ]; then
  # shellcheck source=/dev/null
  source "$INSTALL_DIR/path.zsh.inc"
fi

if command -v gcloud >/dev/null 2>&1; then
  log "✅ gcloud installed successfully"
  gcloud --version

  log ""
  log "Next steps:"
  log "  1. Run: gcloud auth login"
  log "  2. Run: gcloud config set project mymoolah-db"
  log "  3. Run: ./scripts/ensure-proxies-running.sh"
else
  error "Installation completed but gcloud not found in PATH"
  error "Try running: source ~/.bashrc (or open a new terminal)"
  exit 1
fi
