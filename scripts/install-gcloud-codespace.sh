#!/usr/bin/env bash

set -euo pipefail

log() {
  printf '[gcloud-install] %s\n' "$*"
}

error() {
  printf '[gcloud-install][error] %s\n' "$*" >&2
}

# Check if we're in Codespaces
if [ -z "${CODESPACES:-}" ] && [ -z "${GITHUB_CODESPACE_TOKEN:-}" ]; then
  error "This script is designed for GitHub Codespaces."
  error "For local installation, use: brew install --cask google-cloud-sdk"
  exit 1
fi

log "Installing Google Cloud SDK in Codespace..."

# Install to home directory
INSTALL_DIR="$HOME/google-cloud-sdk"

if [ -d "$INSTALL_DIR" ]; then
  log "gcloud SDK already exists at $INSTALL_DIR"
  log "Sourcing initialization script..."
  if [ -f "$INSTALL_DIR/path.bash.inc" ]; then
    source "$INSTALL_DIR/path.bash.inc"
  elif [ -f "$INSTALL_DIR/path.zsh.inc" ]; then
    source "$INSTALL_DIR/path.zsh.inc"
  fi
  
  if command -v gcloud >/dev/null 2>&1; then
    log "✅ gcloud is now available"
    gcloud --version
    exit 0
  fi
fi

# Download and install
log "Downloading Google Cloud SDK installer..."
curl https://sdk.cloud.google.com | bash

# Source the initialization script
if [ -f "$INSTALL_DIR/path.bash.inc" ]; then
  source "$INSTALL_DIR/path.bash.inc"
elif [ -f "$INSTALL_DIR/path.zsh.inc" ]; then
  source "$INSTALL_DIR/path.zsh.inc"
fi

# Verify installation
if command -v gcloud >/dev/null 2>&1; then
  log "✅ gcloud installed successfully"
  gcloud --version
  
  log ""
  log "Next steps:"
  log "  1. Run: gcloud init"
  log "  2. Run: gcloud auth application-default login"
  log "  3. Set project: gcloud config set project mymoolah-db"
else
  error "Installation completed but gcloud not found in PATH"
  error "Try running: source ~/.zshrc or restart your terminal"
  exit 1
fi

