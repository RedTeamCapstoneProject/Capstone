#
#$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
#Set-Location $projectRoot

#$envFilePath = ".env"
#if (-not (Test-Path $envFilePath)) {
#  Write-Error "Missing .env file at project root."
##  exit 1
#}

#$dbLine = Get-Content $envFilePath | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
#if (-not $dbLine) {
#  Write-Error "DATABASE_URL not found in .env"
#  exit 1
#}

#$raw = $dbLine.Substring(13)
#$env:DATABASE_URL = $raw -replace "!", "%21" -replace "\?", "%3F"
#$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

#npx ts-node --transpile-only -e "require('./backend/src/importArticlesFromJson').importArticlesFromJsonFolder('outputJSONs/JSONAfterTopic','outputTestData.json').then(c=>{console.log('Inserted rows:',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"



$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$envFilePath = ".env"

# --- NEW HYBRID LOGIC ---
if (Test-Path $envFilePath) {
    # If .env exists (Local Development), parse it manually
    Write-Host "Loading DATABASE_URL from .env file..."
    $dbLine = Get-Content $envFilePath | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
    if ($dbLine) {
        $raw = $dbLine.Substring(13)
        $env:DATABASE_URL = $raw -replace "!", "%21" -replace "\?", "%3F"
    }
} elseif ($env:DATABASE_URL) {
    # If .env is missing but variable exists (GitHub Actions), use the environment
    Write-Host "Running in GitHub Actions: Using DATABASE_URL from Secrets."
    $env:DATABASE_URL = $env:DATABASE_URL -replace "!", "%21" -replace "\?", "%3F"
} else {
    # If both are missing, then throw the error
    Write-Error "Error: DATABASE_URL not found in .env OR environment variables."
    exit 1
}
# ------------------------

$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

npx ts-node --transpile-only -e "require('./backend/src/importArticlesFromJson').importArticlesFromJsonFolder('outputJSONs/JSONAfterTopic','outputTestData.json').then(c=>{console.log('Inserted rows:',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
