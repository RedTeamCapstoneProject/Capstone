# Move up to project root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Starting Summarizer Pipeline..."

# This flag is the "magic" for GitHub Actions Node 20+
# It tells Node: "Use ts-node to handle all .ts and .mts imports"
$env:NODE_OPTIONS = "--loader ts-node/esm --no-warnings"

# This is the "Lock" that ensures the function only runs when WE say so
$env:TRIGGER_RUN = "true"

# Execute the file directly
npx ts-node --esm --transpile-only "./backend/src/newsArticlesToSummary.ts"