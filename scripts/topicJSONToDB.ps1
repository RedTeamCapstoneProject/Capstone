Set-Location "c:\Users\12059\Desktop\UAB\Spring 2026\CS499\Capstone GitHub\Capstone"
$raw = (Get-Content ..env | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1).Substring(13)
$env:DATABASE_URL = $raw -replace "!", "%21" -replace "?", "%3F"
npx ts-node --transpile-only -e "require('./backend/src/importArticlesFromJson').importArticlesFromJsonFolder('outputJSONs/JSONAfterTopic','outputTestData.json').then(c=>{console.log('Inserted rows:',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"