# Move up from \scripts\ to project root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Starting Summarizer Pipeline..."

# Explicitly tell the TS compiler to allow modern ESM features and .mts extensions
$env:TS_NODE_COMPILER_OPTIONS = '{
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ESNext",
    "allowImportingTsExtensions": true,
    "noEmit": true
}'

# Use the ESM loader for Node 20+
$env:NODE_OPTIONS = "--loader ts-node/esm --no-warnings"
$env:TRIGGER_RUN = "true"

# Execute the file directly
npx ts-node --esm --transpile-only "./backend/src/newsArticlesToSummary.ts"