#!/bin/bash
set -euo pipefail

# Setup GitHub webhook su 12 repo monitorati (escluso soli-prof, già fatto manualmente).
#
# Richiede env vars:
#   GITHUB_PAT             Personal Access Token con scope admin:repo_hook
#   GITHUB_WEBHOOK_SECRET  Stesso secret usato su Vercel
#
# Uso:
#   GITHUB_PAT=ghp_xxx GITHUB_WEBHOOK_SECRET=abc123 ./scripts/setup-webhooks.sh

OWNER="soli92"
WEBHOOK_URL="https://soli-prof.vercel.app/api/webhooks/github"

REPOS=(
  "soli-agent"
  "casa-mia-be"
  "casa-mia-fe"
  "bachelor-party-claudiano"
  "solids"
  "soli-dm-be"
  "soli-dm-fe"
  "soli-dome"
  "pippify"
  "soli-platform"
  "koollector"
  "health-wand-and-fire"
)

# Validazione env
if [ -z "${GITHUB_PAT:-}" ]; then
  echo "❌ ERROR: GITHUB_PAT env var required"
  echo "   Crea PAT con scope admin:repo_hook su:"
  echo "   https://github.com/settings/tokens"
  exit 1
fi

if [ -z "${GITHUB_WEBHOOK_SECRET:-}" ]; then
  echo "❌ ERROR: GITHUB_WEBHOOK_SECRET env var required"
  echo "   Usa lo stesso secret di Vercel (verificabile su"
  echo "   https://vercel.com/<org>/soli-prof/settings/environment-variables)"
  exit 1
fi

# Body JSON del webhook (config + events + active)
read -r -d '' WEBHOOK_BODY <<EOF || true
{
  "name": "web",
  "active": true,
  "events": ["push"],
  "config": {
    "url": "${WEBHOOK_URL}",
    "content_type": "json",
    "secret": "${GITHUB_WEBHOOK_SECRET}",
    "insecure_ssl": "0"
  }
}
EOF

echo "Setup webhook su ${#REPOS[@]} repo (owner=${OWNER})"
echo "Target URL: ${WEBHOOK_URL}"
echo ""

CREATED=0
EXISTING=0
ERRORS=0

for REPO in "${REPOS[@]}"; do
  printf "→ %-30s " "${OWNER}/${REPO}:"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.github.com/repos/${OWNER}/${REPO}/hooks" \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_PAT}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -d "${WEBHOOK_BODY}")
  
  HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
  BODY=$(echo "${RESPONSE}" | sed '$d')
  
  case "${HTTP_CODE}" in
    201)
      HOOK_ID=$(echo "${BODY}" | grep -o '"id":[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')
      echo "✅ created (id=${HOOK_ID})"
      CREATED=$((CREATED + 1))
      ;;
    422)
      if echo "${BODY}" | grep -qi "Hook already exists"; then
        echo "⏭️  already exists (skipping)"
        EXISTING=$((EXISTING + 1))
      else
        ERROR_MSG=$(echo "${BODY}" | grep -o '"message"[^,}]*' | head -1 | sed 's/"message":[[:space:]]*//' | tr -d '"')
        echo "⚠️  422: ${ERROR_MSG}"
        ERRORS=$((ERRORS + 1))
      fi
      ;;
    404)
      echo "❌ 404: repo not found or no permission"
      ERRORS=$((ERRORS + 1))
      ;;
    401)
      echo "❌ 401: PAT invalid or no admin:repo_hook scope"
      echo ""
      echo "STOPPING — fix PAT scope first:"
      echo "  https://github.com/settings/tokens"
      exit 1
      ;;
    403)
      echo "❌ 403: Resource not accessible. PAT manca scope admin:repo_hook?"
      echo ""
      echo "STOPPING — verify PAT has admin:repo_hook scope on this repo"
      exit 1
      ;;
    *)
      echo "❌ HTTP ${HTTP_CODE}"
      echo "   Body: $(echo "${BODY}" | head -c 200)"
      ERRORS=$((ERRORS + 1))
      ;;
  esac
done

echo ""
echo "─────────────────────────────────────────"
echo "Summary:"
echo "  Created:  ${CREATED}"
echo "  Existing: ${EXISTING}"
echo "  Errors:   ${ERRORS}"
echo ""

if [ ${ERRORS} -eq 0 ]; then
  echo "✅ Done. Verifica su https://github.com/${OWNER}/<repo>/settings/hooks"
  echo ""
  echo "Smoke test cross-repo consigliato:"
  echo "  cd ~/Documents/Personal/Repos/casa-mia-be"
  echo "  echo \"\" >> AI_LOG.md"
  echo "  git add AI_LOG.md && git commit -m \"test: trigger webhook\" && git push origin main"
else
  echo "⚠️  ${ERRORS} repo con errori. Riprova manualmente."
  exit 1
fi
