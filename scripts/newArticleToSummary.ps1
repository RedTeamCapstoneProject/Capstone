# Move up from \scripts\ to project root
#$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
#Set-Location $projectRoot

#Write-Host "Triggering Summarizer: backend\src\newsArticlesToSummary.ts"

# Set Node to handle the TypeScript modules correctly
#$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

# Execute the specific function
# Note: Ensure the function name 'newsArticlesToSummaryFolder' matches the export in your .ts file
#npx ts-node --transpile-only -e "const api = require('./backend/src/newsArticlesToSummary'); console.log('Summarizer module loaded...'); api.fetchNewsArticlesAndSummarize().then(c => { console.log('Process finished. Items handled:', c); process.exit(0); }).catch(e => { console.error('TS Error:', e); process.exit(1); })"




$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$envFilePath = ".env"

# --- Keep your working DB logic exactly as is ---
if (Test-Path $envFilePath) {
    Write-Host "Loading DATABASE_URL from .env file..."
    $dbLine = Get-Content $envFilePath | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
    if ($dbLine) {
        $raw = $dbLine.Substring(13)
        $env:DATABASE_URL = $raw -replace "!", "%21" -replace "\?", "%3F"
    }
} elseif ($env:DATABASE_URL) {
    Write-Host "Running in GitHub Actions: Using DATABASE_URL from Secrets."
    $env:DATABASE_URL = $env:DATABASE_URL -replace "!", "%21" -replace "\?", "%3F"
}

# --- THE FIX ---
# We must use NodeNext and the ESM loader because of the .mts files
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"NodeNext","moduleResolution":"NodeNext","allowImportingTsExtensions":true}'
$env:NODE_OPTIONS = "--loader ts-node/esm --no-warnings"

# Use import() instead of require()
npx ts-node --esm --transpile-only -e "import('./backend/src/newsArticlesToSummary.ts').then(api => { api.fetchNewsArticlesAndSummarize().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }) })"