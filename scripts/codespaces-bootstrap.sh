#!/usr/bin/env bash

# codespaces-bootstrap.sh — one-shot post-create setup for GitHub Codespaces.
#
# Invoked automatically by .devcontainer/devcontainer.json's postCreateCommand
# on every Codespace create AND every rebuild. Also safe to run manually from
# an existing Codespace to re-hydrate a broken environment.
#
# What it does (in order, each step idempotent and non-fatal on its own):
#   1. Installs Google Cloud SDK non-interactively into $HOME/google-cloud-sdk.
#      Re-runs skip the download if gcloud is already installed.
#   2. Runs `npm install` at the repo root, which is a no-op when the existing
#      node_modules matches package-lock.json.
#   3. Prints a short human-readable "next steps" checklist so the developer
#      knows exactly what's left to do manually (gcloud auth login, then
#      ./scripts/ensure-proxies-running.sh — both require personal
#      credentials so we deliberately never automate them).
#
# Design principles:
#   - Never fail the Codespace boot. Any step that fails logs a WARN and the
#     script continues. postCreateCommand exit status is ignored by GitHub so
#     partial success is fine; the user can always re-run this script manually.
#   - No surprises. We do not install anything the repo does not already use,
#     we do not modify tracked files, and we do not call gcloud auth (the user
#     must do that themselves with their own credentials).
#   - Verbose logging so rebuild issues are easy to debug from the VS Code
#     "Creation Log" pane.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_NAME="codespaces-bootstrap"

log() {
  printf '[%s] %s\n' "${SCRIPT_NAME}" "$*"
}

warn() {
  printf '[%s][warn] %s\n' "${SCRIPT_NAME}" "$*" >&2
}

section() {
  printf '\n[%s] ── %s ──\n' "${SCRIPT_NAME}" "$*"
}

section "Starting Codespaces post-create bootstrap"
log "Repo root : ${REPO_ROOT}"
log "User      : $(id -un 2>/dev/null || echo unknown)"
log "Node      : $(command -v node >/dev/null 2>&1 && node --version || echo 'not installed')"
log "npm       : $(command -v npm  >/dev/null 2>&1 && npm --version  || echo 'not installed')"

# ── Step 1: Google Cloud SDK ────────────────────────────────────────────────
section "Step 1/2 — Google Cloud SDK"
if command -v gcloud >/dev/null 2>&1; then
  log "gcloud already on PATH — skipping install"
  gcloud --version | sed "s/^/[${SCRIPT_NAME}] /" || true
else
  if [ -x "${REPO_ROOT}/scripts/install-gcloud-codespace.sh" ]; then
    log "Invoking install-gcloud-codespace.sh --non-interactive"
    if bash "${REPO_ROOT}/scripts/install-gcloud-codespace.sh" --non-interactive; then
      log "gcloud install step completed"
    else
      warn "gcloud install step failed — Codespace will boot but gcloud is unavailable"
      warn "Re-run manually: ./scripts/install-gcloud-codespace.sh"
    fi
  else
    warn "scripts/install-gcloud-codespace.sh missing or not executable — skipping gcloud"
  fi
fi

# ── Step 2: npm install ─────────────────────────────────────────────────────
section "Step 2/2 — npm install (repo root)"
if [ -f "${REPO_ROOT}/package.json" ]; then
  cd "${REPO_ROOT}"
  if npm install --no-audit --no-fund --prefer-offline; then
    log "npm install completed"
  else
    warn "npm install failed — Codespace will boot but dependencies may be incomplete"
    warn "Re-run manually: npm install"
  fi
else
  warn "No package.json at ${REPO_ROOT} — skipping npm install"
fi

# ── Finish: human-readable next steps ───────────────────────────────────────
section "Bootstrap complete"
cat <<'NEXT'
[codespaces-bootstrap] ✅ Automatic setup finished.
[codespaces-bootstrap]
[codespaces-bootstrap] Manual steps still required (personal credentials):
[codespaces-bootstrap]   1. Open a NEW terminal (to pick up the gcloud PATH), then:
[codespaces-bootstrap]        gcloud auth login
[codespaces-bootstrap]        gcloud config set project mymoolah-db
[codespaces-bootstrap]   2. Start the Cloud SQL Auth Proxies:
[codespaces-bootstrap]        ./scripts/ensure-proxies-running.sh
[codespaces-bootstrap]   3. Start the backend:
[codespaces-bootstrap]        ./scripts/one-click-restart-and-start.sh
[codespaces-bootstrap]
[codespaces-bootstrap] Ports 3000 (frontend) and 3001 (backend) are forwarded as public
[codespaces-bootstrap] automatically by .devcontainer/devcontainer.json, so UAT login will
[codespaces-bootstrap] work as soon as the backend is up.
NEXT

# Exit 0 unconditionally so postCreateCommand never blocks the Codespace.
exit 0
