# Move up from \scripts\ to project root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Triggering Summarizer: backend\src\newsArticlesToSummary.ts"

# Set Node to handle ES Modules for your .mts files
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"ESNext","moduleResolution":"node"}'

# Use dynamic import() instead of require()
npx ts-node --esm --transpile-only -e "import('./backend/src/newsArticlesToSummary.ts').then(api => { api.fetchNewsArticlesAndSummarize().then(() => { process.exit(0); }).catch(e => { console.error('TS Error:', e); process.exit(1); }); }).catch(err => { console.error('Import Error:', err); process.exit(1); })"