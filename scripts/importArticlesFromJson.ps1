Set-Location "c:\Users\12059\Desktop\UAB\Spring 2026\CS499\Capstone GitHub\Capstone"

$envFilePath = ".env"
if (-not (Test-Path $envFilePath)) {
  Write-Error "Missing .env file at project root."
  exit 1
}

$dbLine = Get-Content $envFilePath | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
if (-not $dbLine) {
  Write-Error "DATABASE_URL not found in .env"
  exit 1
}

$raw = $dbLine.Substring(13)
$env:DATABASE_URL = $raw -replace "!", "%21" -replace "\?", "%3F"
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

npx ts-node --transpile-only -e "require('./backend/src/importArticlesFromJson').importArticlesFromJsonFolder('outputJSONs/JSONAfterTopic','outputTestData.json').then(c=>{console.log('Inserted rows:',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
