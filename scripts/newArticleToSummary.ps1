 
 #Move up from \scripts\ to project root
#$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
#Set-Location $projectRoot
#Write-Host "Triggering Summarizer: backend\src\newsArticlesToSummary.ts"

# Set Node to handle the TypeScript modules correctly
#$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'


# CRITICAL: This line tells Node how to handle the .mts extension in GitHub Actions
#$env:NODE_OPTIONS = "--loader ts-node/esm --no-warnings"

# Execute the specific function
#npx ts-node --transpile-only -e "const api = require('./backend/src/newsArticlesToSummary'); console.log('Summarizer module loaded...'); api.fetchNewsArticlesAndSummarize().then(c => { console.log('Process finished. Items handled:', c); process.exit(0); }).catch(e => { console.error('TS Error:', e); process.exit(1); })"


# 1. Standardize the root location
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Triggering Summarizer: backend\src\newsArticlesToSummary.ts"

# 2. Tell the TS compiler to allow ESM features (fixes the import.meta and .mts path errors)
$env:TS_NODE_COMPILER_OPTIONS = '{"module": "NodeNext", "moduleResolution": "NodeNext", "allowImportingTsExtensions": true}'

# 3. Tell Node to use the ESM loader
$env:NODE_OPTIONS = "--loader ts-node/esm --no-warnings"

# 4. Execute
npx ts-node --transpile-only -e "const api = require('./backend/src/newsArticlesToSummary'); api.fetchNewsArticlesAndSummarize().then(() => process.exit(0)).catch(e => { console.error('TS Error:', e); process.exit(1); })"