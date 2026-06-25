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
  # Find the repo root if running from a local checkout (skills-dist/install.sh).
  # When piped via `curl | bash`, BASH_SOURCE is empty — fall through to download.
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
  if [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/manifest.json" ]]; then
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
# 3. Parse the manifest and install each skill (with version checking)
# ----------------------------------------------------------------------------
# Extract skill paths from manifest.json (portable — no jq dependency)
SKILL_PATHS=$(grep '"path"' "$MANIFEST" | sed -E 's/.*"path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')

[[ -z "$SKILL_PATHS" ]] && die "No skills found in manifest."

# Read the version field from a SKILL.md frontmatter.
# The canonical version source is the skill's own SKILL.md `version:` field.
# Falls back to manifest.json's per-skill version, then "unknown".
get_skill_version() {
  local skill_md="$1/SKILL.md"
  local manifest_version="$2"
  local v
  # frontmatter version: e.g.  version: "1.2.3"
  v=$(sed -n '/^---$/,/^---$/s/^version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}[[:space:]]*$/\1/p' "$skill_md" 2>/dev/null | head -1)
  if [[ -n "$v" ]]; then echo "$v"; return; fi
  if [[ -n "$manifest_version" ]]; then echo "$manifest_version"; return; fi
  echo "unknown"
}

# Read the version recorded at install time. Returns empty if not installed.
get_installed_version() {
  local version_file="$1/.installed-version"
  [[ -f "$version_file" ]] || { echo ""; return; }
  cat "$version_file" 2>/dev/null
}

INSTALLED=0
UPGRADED=0
SKIPPED=0
FAILED=0

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

  # Resolve versions
  NEW_VER=$(get_skill_version "$SRC" "")
  DEST="$SKILLS_DIR/$skill_name"
  CUR_VER=$(get_installed_version "$DEST")

  # --- Decision tree ---
  # Case A: not installed yet (no version file) → fresh install
  if [[ -z "$CUR_VER" ]]; then
    cp -R "$SRC" "$DEST"
    echo "$NEW_VER" > "$DEST/.installed-version"
    INSTALLED=$((INSTALLED + 1))
    ok "Installed: ${BOLD}${skill_name}${RESET} ${DIM}v${NEW_VER}${RESET}"
    continue
  fi

  # Case B: same version → skip (idempotent)
  if [[ "$CUR_VER" == "$NEW_VER" ]]; then
    SKIPPED=$((SKIPPED + 1))
    info "Up to date: ${skill_name} ${DIM}v${CUR_VER}${RESET}"
    continue
  fi

  # Case C: different version → backup old, install new
  if [[ "${FORCE:-0}" == "1" ]]; then
    rm -rf "$DEST"
  else
    TS="$(date +%Y%m%d-%H%M%S)"
    BACKUP="${DEST}.v${CUR_VER}-${TS}"
    mv "$DEST" "$BACKUP"
    info "Upgrading ${skill_name}: ${DIM}v${CUR_VER} → v${NEW_VER}${RESET} (backup: $(basename "$BACKUP"))"
  fi
  cp -R "$SRC" "$DEST"
  echo "$NEW_VER" > "$DEST/.installed-version"
  UPGRADED=$((UPGRADED + 1))
  ok "Upgraded: ${BOLD}${skill_name}${RESET} ${DIM}v${CUR_VER} → v${NEW_VER}${RESET}"
done <<< "$SKILL_PATHS"

# ----------------------------------------------------------------------------
# 4. Summary
# ----------------------------------------------------------------------------
echo ""
printf "${BOLD}━━━ Installation Summary ━━━${RESET}\n"
[[ "$INSTALLED" -gt 0 ]] && printf "  ${GREEN}Installed:${RESET}  %d (fresh)\n" "$INSTALLED"
[[ "$UPGRADED" -gt 0 ]]  && printf "  ${YELLOW}Upgraded:${RESET}   %d (old versions backed up)\n" "$UPGRADED"
[[ "$SKIPPED" -gt 0 ]]   && printf "  ${BLUE}Up to date:${RESET} %d (same version, skipped)\n" "$SKIPPED"
[[ "$FAILED" -gt 0 ]]    && printf "  ${RED}Failed:${RESET}     %d\n" "$FAILED"
printf "  ${DIM}Location:${RESET}  %s\n" "$SKILLS_DIR"
echo ""
printf "${DIM}Skills are auto-discovered by ZCode / Claude Code / OpenCode / Pi agent.${RESET}\n"
printf "${DIM}Restart your AI agent (or start a new session) to load them.${RESET}\n"
echo ""
printf "${BOLD}Next step:${RESET} open your AI agent and just describe what you want to do.\n"
printf "${DIM}e.g. \"帮我加一个 todo 功能模块\" will auto-trigger pi-rpc-module-dev.${RESET}\n"
echo ""
