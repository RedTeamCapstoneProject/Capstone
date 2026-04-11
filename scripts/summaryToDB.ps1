$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$targetJson = "outputJSONs\summarizedJSON\summarizedTopic.json"

# Ensure the file exists before even trying
if (-not (Test-Path $targetJson)) {
    Write-Error "JSON File not found at $targetJson"
    exit 1
}

$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

# This command looks for the function in both standard and default exports
npx ts-node --transpile-only -e "const api = require('./backend/src/summaryJsonToDB'); const fn = api.summaryJsonToDB || api.default; if(typeof fn !== 'function') { process.exit(1) } fn('$($targetJson.Replace('\','/'))').then(() => process.exit(0)).catch(() => process.exit(1))"