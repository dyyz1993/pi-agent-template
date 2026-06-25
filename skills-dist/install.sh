#!/usr/bin/env bash
#
# pi-agent-skills installer
#
# One-line install:
#   curl -fsSL https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/skills-dist/install.sh | bash
#
# Or clone manually and run:
#   bash skills-dist/install.sh
#
# What it does:
#   1. Detects the skills directory (~/.agents/skills on macOS/Linux,
#      %USERPROFILE%\.agents\skills on Windows via Git Bash)
#   2. Downloads (or copies) each skill from the manifest
#   3. Backs up any existing skill of the same name to <name>.backup-<timestamp>
#   4. Prints a summary of what was installed and how to use it
#
# Env vars:
#   SKILLS_DIR   Override the install target directory
#   SOURCE_DIR   Use a local checkout instead of downloading (for dev)
#   MANIFEST_URL Override the manifest URL
#   SKIP_BACKUP=1  Skip backing up existing skills (overwrite directly)

set -euo pipefail

# ----------------------------------------------------------------------------
# Pretty output
# ----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
  RED='\033[0;31m'; BLUE='\033[0;34m'; DIM='\033[2m'; RESET='\033[0m'
else
  BOLD=''; GREEN=''; YELLOW=''; RED=''; BLUE=''; DIM=''; RESET=''
fi

info()  { printf "${BLUE}ℹ${RESET}  %s\n" "$*"; }
ok()    { printf "${GREEN}✓${RESET}  %s\n" "$*"; }
warn()  { printf "${YELLOW}⚠${RESET}  %s\n" "$*" >&2; }
die()   { printf "${RED}✗${RESET}  %s\n" "$*" >&2; exit 1; }

# ----------------------------------------------------------------------------
# Banner
# ----------------------------------------------------------------------------
cat <<'BANNER'
  ╔─────────────────────────────────────────────╗
  ║   pi-agent-skills · one-line installer     ║
  ╚─────────────────────────────────────────────╝
BANNER

# ----------------------------------------------------------------------------
# 1. Resolve the target skills directory
# ----------------------------------------------------------------------------
SKILLS_DIR="${SKILLS_DIR:-}"

if [[ -z "$SKILLS_DIR" ]]; then
  case "$(uname -s)" in
    Darwin|Linux)
      SKILLS_DIR="$HOME/.agents/skills"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      SKILLS_DIR="$USERPROFILE\\.agents\\skills"
      SKILLS_DIR="${SKILLS_DIR//\\//}"
      ;;
    *)
      die "Unsupported OS: $(uname -s). Set SKILLS_DIR manually."
      ;;
  esac
fi

info "Target directory: ${SKILLS_DIR}"
mkdir -p "$SKILLS_DIR"

# ----------------------------------------------------------------------------
# 2. Locate skills source — local checkout or download from GitHub
# ----------------------------------------------------------------------------
SOURCE_DIR="${SOURCE_DIR:-}"
TMP_DIR=""

if [[ -n "$SOURCE_DIR" ]]; then
  info "Using local source: ${SOURCE_DIR}"
else
  # Find the repo root if running from a local checkout (skills-dist/install.sh)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$SCRIPT_DIR/manifest.json" ]]; then
    SOURCE_DIR="$SCRIPT_DIR"
    info "Running from local checkout: ${SOURCE_DIR}"
  else
    # Download from GitHub
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "$TMP_DIR"' EXIT
    REPO_TARBALL="https://github.com/dyyz1993/pi-agent-template/archive/refs/heads/main.tar.gz"
    info "Downloading from GitHub: ${REPO_TARBALL}"
    if command -v curl &>/dev/null; then
      curl -fsSL "$REPO_TARBALL" | tar -xz -C "$TMP_DIR" --strip-components=1 || \
        die "Download failed. Check your network or set SOURCE_DIR to a local checkout."
    elif command -v wget &>/dev/null; then
      wget -qO- "$REPO_TARBALL" | tar -xz -C "$TMP_DIR" --strip-components=1 || \
        die "Download failed. Check your network or set SOURCE_DIR to a local checkout."
    else
      die "Need curl or wget to download. Or set SOURCE_DIR to a local checkout."
    fi
    SOURCE_DIR="$TMP_DIR/skills-dist"
    [[ -d "$SOURCE_DIR" ]] || SOURCE_DIR="$TMP_DIR"
  fi
fi

MANIFEST="$SOURCE_DIR/manifest.json"
# Also check project-root .opencode/skills as the canonical source
LOCAL_SKILLS="$SOURCE_DIR/../.opencode/skills"
[[ -d "$LOCAL_SKILLS" ]] || LOCAL_SKILLS=""

[[ -f "$MANIFEST" ]] || die "manifest.json not found at $MANIFEST"

# ----------------------------------------------------------------------------
# 3. Parse the manifest and install each skill
# ----------------------------------------------------------------------------
# Extract skill paths from manifest.json (portable — no jq dependency)
SKILL_PATHS=$(grep '"path"' "$MANIFEST" | sed -E 's/.*"path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')

[[ -z "$SKILL_PATHS" ]] && die "No skills found in manifest."

INSTALLED=0
SKIPPED=0
BACKED_UP=0

while IFS= read -r skill_path; do
  [[ -z "$skill_path" ]] && continue
  skill_name="$(basename "$skill_path")"

  # Find the source skill directory
  SRC=""
  if [[ -n "$LOCAL_SKILLS" && -d "$LOCAL_SKILLS/$skill_path" ]]; then
    SRC="$LOCAL_SKILLS/$skill_path"
  elif [[ -d "$SOURCE_DIR/$skill_path" ]]; then
    SRC="$SOURCE_DIR/$skill_path"
  elif [[ -d "$SOURCE_DIR/.opencode/skills/$skill_path" ]]; then
    SRC="$SOURCE_DIR/.opencode/skills/$skill_path"
  else
    warn "Skill source not found: $skill_path — skipping"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Verify it has a SKILL.md
  [[ -f "$SRC/SKILL.md" ]] || { warn "$skill_path: missing SKILL.md — skipping"; SKIPPED=$((SKIPPED + 1)); continue; }

  DEST="$SKILLS_DIR/$skill_name"

  # Backup existing if present and SKIP_BACKUP not set
  if [[ -e "$DEST" ]]; then
    if [[ "${SKIP_BACKUP:-0}" == "1" ]]; then
      rm -rf "$DEST"
    else
      TS="$(date +%Y%m%d-%H%M%S)"
      BACKUP="$DEST.backup-$TS"
      mv "$DEST" "$BACKUP"
      BACKED_UP=$((BACKED_UP + 1))
      info "Backed up existing → $(basename "$BACKUP")"
    fi
  fi

  # Copy
  cp -R "$SRC" "$DEST"
  INSTALLED=$((INSTALLED + 1))
  ok "Installed: ${BOLD}${skill_name}${RESET}"
done <<< "$SKILL_PATHS"

# ----------------------------------------------------------------------------
# 4. Summary
# ----------------------------------------------------------------------------
echo ""
printf "${BOLD}━━━ Installation Summary ━━━${RESET}\n"
printf "  ${GREEN}Installed:${RESET}  %d skills\n" "$INSTALLED"
[[ "$BACKED_UP" -gt 0 ]] && printf "  ${YELLOW}Backed up:${RESET}  %d (find *.backup-* in %s)\n" "$BACKED_UP" "$SKILLS_DIR"
[[ "$SKIPPED" -gt 0 ]]   && printf "  ${RED}Skipped:${RESET}    %d\n" "$SKIPPED"
printf "  ${BLUE}Location:${RESET}  %s\n" "$SKILLS_DIR"
echo ""
printf "${DIM}Skills are auto-discovered by ZCode / Claude Code / OpenCode / Pi agent.${RESET}\n"
printf "${DIM}Restart your AI agent (or start a new session) to load them.${RESET}\n"
echo ""
printf "${BOLD}Next step:${RESET} open your AI agent and just describe what you want to do.\n"
printf "${DIM}e.g. \"帮我加一个 todo 功能模块\" will auto-trigger pi-rpc-module-dev.${RESET}\n"
echo ""
