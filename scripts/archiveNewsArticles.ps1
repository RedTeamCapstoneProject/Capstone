$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "Archiving news_articles to newsarticles_old..."

$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

npx ts-node --transpile-only -e "const api = require('./backend/src/archiveNewsArticles'); api.archiveAllNewsArticles().then((r) => { console.log('Archive result:', r); process.exit(0); }).catch((e) => { console.error('Archive error:', e); process.exit(1); })"
