#!/usr/bin/env bash
#
# archive_spec.sh — Archive a spec folder to a GitHub issue and link it to a PR.
#
# Usage:
#   ./archive_spec.sh <spec-folder> <pr-number-or-url>
#
# Arguments:
#   spec-folder   Path to the spec directory (relative to repo root), e.g.
#                 specs/002-elements-floating-panel
#   pr            PR number or full GitHub PR URL, e.g. 2 or
#                 https://github.com/owner/repo/pull/2
#
# Steps performed:
#   1. Create a GitHub issue with plan.md as the body
#   2. Post every other file (including contracts/**) as individual comments
#   3. Replace plan.md with a single line linking to the new issue
#   4. Delete all other files/subdirectories inside the spec folder
#   5. Commit and push the cleanup
#   6. Prepend "Closes #<issue>" to the PR body
#
# Requirements: gh CLI authenticated, git remote pointing to GitHub

set -euo pipefail

# ── helpers ────────────────────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
archive_spec.sh — Archive a spec folder to a GitHub issue and link it to a PR.

Usage:
  archive_spec.sh <spec-folder> <pr-number-or-url>
  archive_spec.sh --help

Arguments:
  spec-folder   Path to the spec directory (relative to repo root), e.g.
                specs/002-some-feature-name
  pr            PR number or full GitHub PR URL, e.g. 2 or
                https://github.com/owner/repo/pull/2

Steps performed:
  1. Create a GitHub issue with plan.md as the body
  2. Post every other file (including contracts/**) as individual comments
  3. Replace plan.md with a single line linking to the new issue
  4. Delete all other files/subdirectories inside the spec folder
  5. Commit and push the cleanup
  6. Prepend "Closes #<issue>" to the PR body

Requirements: gh CLI authenticated, git remote pointing to GitHub
EOF
  exit 0
}

die() { echo "error: $1" >&2; exit 1; }

# ── argument parsing ───────────────────────────────────────────────────────────

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && usage
[[ $# -ge 2 ]] || { echo "error: missing arguments"; echo ""; usage; }

SPEC_DIR="${1%/}"   # strip trailing slash
PR_ARG="$2"

# Normalise PR to just a number
PR_NUMBER="${PR_ARG##*/}"
[[ "$PR_NUMBER" =~ ^[0-9]+$ ]] || die "could not parse PR number from: $PR_ARG"

# ── resolve repo root ──────────────────────────────────────────────────────────

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

FULL_SPEC_DIR="$REPO_ROOT/$SPEC_DIR"
[[ -d "$FULL_SPEC_DIR" ]] || die "spec folder not found: $FULL_SPEC_DIR"
[[ -f "$FULL_SPEC_DIR/plan.md" ]] || die "plan.md not found in $FULL_SPEC_DIR"

# ── derive issue title from folder name ───────────────────────────────────────

FOLDER_NAME="$(basename "$SPEC_DIR")"
# e.g. "002-elements-floating-panel" -> "spec(002-elements-floating-panel)"
ISSUE_TITLE="spec($FOLDER_NAME)"

# ── step 1: create issue with plan.md as body ─────────────────────────────────

echo "Creating issue: $ISSUE_TITLE …"
ISSUE_URL="$(gh issue create \
  --title "$ISSUE_TITLE" \
  --body-file "$FULL_SPEC_DIR/plan.md")"
ISSUE_NUMBER="${ISSUE_URL##*/}"
echo "  ✓ issue #$ISSUE_NUMBER created: $ISSUE_URL"

# ── step 2: post all other files as comments ──────────────────────────────────

echo "Posting spec files as comments …"
while IFS= read -r -d '' FILE; do
  REL="${FILE#"$FULL_SPEC_DIR/"}"
  # skip plan.md itself
  [[ "$REL" == "plan.md" ]] && continue
  gh issue comment "$ISSUE_NUMBER" --body-file "$FILE"
  echo "  ✓ $REL"
done < <(find "$FULL_SPEC_DIR" -type f -print0 | sort -z)

# ── step 3: replace plan.md with link ─────────────────────────────────────────

echo "Replacing plan.md with issue link …"
printf 'See [issue #%s](%s) for details.\n' "$ISSUE_NUMBER" "$ISSUE_URL" \
  > "$FULL_SPEC_DIR/plan.md"
echo "  ✓ plan.md updated"

# ── step 4: delete everything else ────────────────────────────────────────────

echo "Deleting archived files …"
find "$FULL_SPEC_DIR" -mindepth 1 ! -name "plan.md" -delete
echo "  ✓ done"

# ── step 5: commit and push ───────────────────────────────────────────────────

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Committing on branch $BRANCH …"
git add -A
git commit -m "chore($FOLDER_NAME): archive spec files to github issue #$ISSUE_NUMBER, replace plan.md with link"
git push origin "$BRANCH"
echo "  ✓ pushed"

# ── step 6: prepend "Closes #<issue>" to the PR body ─────────────────────────

echo "Linking PR #$PR_NUMBER to issue #$ISSUE_NUMBER …"
CURRENT_BODY="$(gh pr view "$PR_NUMBER" --json body --jq '.body')"
gh pr edit "$PR_NUMBER" --body "Closes #${ISSUE_NUMBER}

${CURRENT_BODY}"
echo "  ✓ PR #$PR_NUMBER updated"

echo ""
echo "Done."
echo "  Issue : $ISSUE_URL"
echo "  PR    : $(gh pr view "$PR_NUMBER" --json url --jq '.url')"