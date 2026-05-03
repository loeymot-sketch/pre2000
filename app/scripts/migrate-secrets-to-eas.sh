#!/usr/bin/env bash
# ============================================================================
# migrate-secrets-to-eas.sh
# ----------------------------------------------------------------------------
# Migrate Firebase credentials from eas.json (committed plaintext, BAD)
# to EAS Secrets (encrypted, good).
#
# WHY: app/eas.json profile "preview" currently embeds:
#   - EXPO_PUBLIC_FIREBASE_API_KEY (AIzaSy...)
#   - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
#   - EXPO_PUBLIC_FIREBASE_PROJECT_ID
#   - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
#   - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
#   - EXPO_PUBLIC_FIREBASE_APP_ID
#
# Even though Firebase Web API keys are restricted by domain/SHA-1 (low
# real-world risk), they should not live in version control as a hygiene
# baseline.
#
# WHAT THIS SCRIPT DOES (interactively):
#   1. Verifies you're logged in to EAS (`eas whoami`).
#   2. For each secret name, runs `eas env:create` with environment "preview".
#   3. Prints the manual eas.json edit you must do AFTER successful migration.
#   4. (Optional) reminds you to rotate the API key in Firebase Console.
#
# REQUIREMENTS:
#   - npm i -g eas-cli (>= 14.0.0)
#   - Authenticated: `eas login`
#   - Run from the app/ directory:
#       cd app && bash scripts/migrate-secrets-to-eas.sh
#
# SAFETY:
#   - This script does NOT modify eas.json. You do that manually after
#     verifying the secrets are visible in `eas env:list --environment preview`.
#   - This script does NOT delete or rotate the existing API key. Rotation
#     in Firebase Console is a separate, deliberate action.
# ============================================================================

set -euo pipefail

# Colors for human readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== EAS Secrets Migration ===${NC}"
echo

# --- 1. Sanity checks -------------------------------------------------------
if ! command -v eas &>/dev/null; then
    echo -e "${RED}eas-cli not installed. Run: npm install -g eas-cli${NC}" >&2
    exit 1
fi

if ! eas whoami &>/dev/null; then
    echo -e "${RED}Not logged in to EAS. Run: eas login${NC}" >&2
    exit 1
fi

EAS_USER=$(eas whoami)
echo -e "Logged in as: ${GREEN}${EAS_USER}${NC}"
echo

# --- 2. Confirm with user ---------------------------------------------------
echo -e "${YELLOW}This script will create EAS Secrets in the 'preview' environment for:${NC}"
echo "  - EXPO_PUBLIC_FIREBASE_API_KEY"
echo "  - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "  - EXPO_PUBLIC_FIREBASE_PROJECT_ID"
echo "  - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "  - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "  - EXPO_PUBLIC_FIREBASE_APP_ID"
echo
read -p "Proceed? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# --- 3. Source the secrets from current eas.json (one-time read) -----------
EAS_JSON="${EAS_JSON:-./eas.json}"
if [[ ! -f "$EAS_JSON" ]]; then
    echo -e "${RED}eas.json not found at ${EAS_JSON}${NC}" >&2
    exit 1
fi

# Use jq to extract values; bail if jq missing (cleaner than grep/sed).
if ! command -v jq &>/dev/null; then
    echo -e "${RED}jq is required. Install: brew install jq${NC}" >&2
    exit 1
fi

extract() { jq -r ".build.preview.env[\"$1\"] // empty" "$EAS_JSON"; }

API_KEY=$(extract "EXPO_PUBLIC_FIREBASE_API_KEY")
AUTH_DOMAIN=$(extract "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN")
PROJECT_ID=$(extract "EXPO_PUBLIC_FIREBASE_PROJECT_ID")
BUCKET=$(extract "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET")
SENDER_ID=$(extract "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
APP_ID=$(extract "EXPO_PUBLIC_FIREBASE_APP_ID")

if [[ -z "$API_KEY" ]]; then
    echo -e "${YELLOW}No values found in eas.json preview env. Already migrated?${NC}"
    echo "Verify with: eas env:list --environment preview"
    exit 0
fi

# --- 4. Create the secrets --------------------------------------------------
create_secret() {
    local name="$1"
    local value="$2"
    if [[ -z "$value" ]]; then
        echo -e "${YELLOW}  Skipping ${name} (empty value)${NC}"
        return
    fi
    echo -e "${BLUE}  Creating ${name}...${NC}"
    eas env:create \
        --environment preview \
        --visibility plaintext \
        --name "$name" \
        --value "$value" \
        --type string \
        --non-interactive 2>&1 | sed 's/^/    /'
}

echo
echo "Creating EAS environment variables (preview)..."
create_secret "EXPO_PUBLIC_FIREBASE_API_KEY" "$API_KEY"
create_secret "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" "$AUTH_DOMAIN"
create_secret "EXPO_PUBLIC_FIREBASE_PROJECT_ID" "$PROJECT_ID"
create_secret "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" "$BUCKET"
create_secret "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$SENDER_ID"
create_secret "EXPO_PUBLIC_FIREBASE_APP_ID" "$APP_ID"

# --- 5. Final instructions --------------------------------------------------
echo
echo -e "${GREEN}=== Done. Verify with:${NC}"
echo "  eas env:list --environment preview"
echo
echo -e "${YELLOW}=== Manual cleanup (do this AFTER verifying):${NC}"
echo "  Edit app/eas.json and remove the 6 EXPO_PUBLIC_FIREBASE_* lines from"
echo "  build.preview.env. Keep only:"
echo "    \"APP_ENV\": \"preview\","
echo "    \"SENTRY_DISABLE_AUTO_UPLOAD\": \"true\""
echo
echo -e "${YELLOW}=== Optional but recommended: rotate the Firebase API key${NC}"
echo "  Console:  https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo "  Old key revealed in git history. Restrict the new one by:"
echo "    - HTTP referrers (your domains only)"
echo "    - iOS bundle ID + Android package name + SHA-1"
echo
echo -e "${GREEN}Done.${NC}"
