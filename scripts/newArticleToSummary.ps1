# Move up from \scripts\ to project root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Triggering Summarizer: backend\src\newsArticlesToSummary.ts"

# Set Node to handle the TypeScript modules correctly
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

# Execute the specific function
# Note: Ensure the function name 'newsArticlesToSummaryFolder' matches the export in your .ts file
npx ts-node --transpile-only -e "const api = require('./backend/src/newsArticlesToSummary'); console.log('Summarizer module loaded...'); api.fetchNewsArticlesAndSummarize().then(c => { console.log('Process finished. Items handled:', c); process.exit(0); }).catch(e => { console.error('TS Error:', e); process.exit(1); })"