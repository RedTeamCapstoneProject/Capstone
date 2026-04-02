param(
  [switch]$SkipFetch,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

function Load-EnvFile {
  param(
    [string]$Path = ".env"
  )

  if (-not (Test-Path $Path)) {
    throw "Missing .env file at project root."
  }

  Get-Content $Path | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Name ===" -ForegroundColor Cyan
  & $Action
}

function Invoke-NewsJsonPipeline {
  Invoke-Step -Name "Run topic grouping and write outputJSONs/JSONAfterTopic/outputTestData.json" -Action {
    $previousTsNodeOptions = $env:TS_NODE_COMPILER_OPTIONS
    $previousTranspileOnly = $env:TS_NODE_TRANSPILE_ONLY
    $runnerPath = Join-Path $projectRoot "scripts/.tmp-run-grouping.mts"
    try {
      $env:TS_NODE_COMPILER_OPTIONS = '{"module":"NodeNext","moduleResolution":"NodeNext","allowImportingTsExtensions":true}'
      $env:TS_NODE_TRANSPILE_ONLY = "1"

      @'
import { run } from '../AI/Grouping/main.mts';

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
'@ | Set-Content -Path $runnerPath -Encoding UTF8

      npx ts-node --esm $runnerPath
    }
    finally {
      if (Test-Path $runnerPath) {
        Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue
      }
      $env:TS_NODE_COMPILER_OPTIONS = $previousTsNodeOptions
      $env:TS_NODE_TRANSPILE_ONLY = $previousTranspileOnly
    }

    if ($LASTEXITCODE -ne 0) {
      throw "AI grouping step failed."
    }
  }

  Invoke-Step -Name "Import grouped JSON into news_articles" -Action {
    powershell -ExecutionPolicy Bypass -File "scripts/importArticlesFromJson.ps1"
    if ($LASTEXITCODE -ne 0) {
      throw "Database import step failed."
    }
  }

  Invoke-Step -Name "Summarize grouped articles from DB to outputJSONs/summarizedJSON/summarizedTopic.json" -Action {
    $previousTsNodeOptions = $env:TS_NODE_COMPILER_OPTIONS
    $previousTranspileOnly = $env:TS_NODE_TRANSPILE_ONLY
    try {
      $env:TS_NODE_COMPILER_OPTIONS = '{"module":"NodeNext","moduleResolution":"NodeNext","allowImportingTsExtensions":true}'
      $env:TS_NODE_TRANSPILE_ONLY = "1"
      npx ts-node --esm backend/src/newsArticlesToSummary.ts
    }
    finally {
      $env:TS_NODE_COMPILER_OPTIONS = $previousTsNodeOptions
      $env:TS_NODE_TRANSPILE_ONLY = $previousTranspileOnly
    }

    if ($LASTEXITCODE -ne 0) {
      throw "Summary generation step failed."
    }
  }
}

function Invoke-SummaryImport {
  Invoke-Step -Name "Import summarized JSON into database" -Action {
    $runnerPath = Join-Path $projectRoot "scripts/.tmp-run-summary-import.ts"
    try {
      @'
const { summaryFolderToDB } = require('../backend/src/summaryJsonToDB');

summaryFolderToDB('outputJSONs/summarizedJSON', 'summarizedTopic.json')
  .then((count: number) => {
    console.log('Inserted summary rows:', count);
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
'@ | Set-Content -Path $runnerPath -Encoding UTF8

      npx ts-node --transpile-only $runnerPath
    }
    finally {
      if (Test-Path $runnerPath) {
        Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue
      }
    }

    if ($LASTEXITCODE -ne 0) {
      throw "Summary DB import step failed."
    }
  }
}

Load-EnvFile

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set in .env"
}

if (-not $env:NEWS_API_KEY -and -not $SkipFetch) {
  throw "NEWS_API_KEY is not set in .env"
}

$env:DATABASE_URL = $env:DATABASE_URL -replace "!", "%21" -replace "\?", "%3F"
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'

Invoke-Step -Name "Ensure output folders exist" -Action {
  New-Item -ItemType Directory -Force -Path "outputJSONs/newsAPI" | Out-Null
  New-Item -ItemType Directory -Force -Path "outputJSONs/JSONAfterTopic" | Out-Null
  New-Item -ItemType Directory -Force -Path "outputJSONs/summarizedJSON" | Out-Null
}

if (-not $SkipFetch) {
  Invoke-Step -Name "Fetch News API data to outputJSONs/newsAPI/trending_news.json" -Action {
    python APIdata_fetcher.py test
    if ($LASTEXITCODE -ne 0) {
      throw "News fetch failed."
    }
  }
} else {
  Write-Host "Skipping fetch step because -SkipFetch was provided." -ForegroundColor Yellow
}

if ($RunOnce) {
  Invoke-NewsJsonPipeline
  Invoke-SummaryImport
  Write-Host ""
  Write-Host "Run-once pipeline complete." -ForegroundColor Green
  exit 0
}

$newsDir = Join-Path $projectRoot "outputJSONs/newsAPI"
$summaryDir = Join-Path $projectRoot "outputJSONs/summarizedJSON"

$newsWatcher = New-Object System.IO.FileSystemWatcher
$newsWatcher.Path = $newsDir
$newsWatcher.Filter = "trending_news.json"
$newsWatcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::Size
$newsWatcher.IncludeSubdirectories = $false
$newsWatcher.EnableRaisingEvents = $true

$summaryWatcher = New-Object System.IO.FileSystemWatcher
$summaryWatcher.Path = $summaryDir
$summaryWatcher.Filter = "summarizedTopic.json"
$summaryWatcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::Size
$summaryWatcher.IncludeSubdirectories = $false
$summaryWatcher.EnableRaisingEvents = $true

Register-ObjectEvent -InputObject $newsWatcher -EventName Changed -SourceIdentifier "NewsJsonChanged" | Out-Null
Register-ObjectEvent -InputObject $newsWatcher -EventName Created -SourceIdentifier "NewsJsonCreated" | Out-Null
Register-ObjectEvent -InputObject $newsWatcher -EventName Renamed -SourceIdentifier "NewsJsonRenamed" | Out-Null

Register-ObjectEvent -InputObject $summaryWatcher -EventName Changed -SourceIdentifier "SummaryJsonChanged" | Out-Null
Register-ObjectEvent -InputObject $summaryWatcher -EventName Created -SourceIdentifier "SummaryJsonCreated" | Out-Null
Register-ObjectEvent -InputObject $summaryWatcher -EventName Renamed -SourceIdentifier "SummaryJsonRenamed" | Out-Null

$script:lastNewsRun = [datetime]::MinValue
$script:lastSummaryRun = [datetime]::MinValue
$debounceSeconds = 5

Write-Host ""
Write-Host "Watching for pipeline triggers..." -ForegroundColor Green
Write-Host " - News trigger file: outputJSONs/newsAPI/trending_news.json"
Write-Host " - Summary trigger file: outputJSONs/summarizedJSON/summarizedTopic.json"
Write-Host "Press Ctrl+C to stop."

try {
  while ($true) {
    $event = Wait-Event -Timeout 5
    if ($null -eq $event) {
      continue
    }

    try {
      if ($event.SourceIdentifier -like "NewsJson*") {
        $now = (Get-Date).ToUniversalTime()
        if (($now - $script:lastNewsRun).TotalSeconds -lt $debounceSeconds) {
          continue
        }

        $script:lastNewsRun = $now
        Invoke-NewsJsonPipeline
      }

      if ($event.SourceIdentifier -like "SummaryJson*") {
        $now = (Get-Date).ToUniversalTime()
        if (($now - $script:lastSummaryRun).TotalSeconds -lt $debounceSeconds) {
          continue
        }

        $script:lastSummaryRun = $now
        Invoke-SummaryImport
      }
    }
    finally {
      Remove-Event -EventIdentifier $event.EventIdentifier -ErrorAction SilentlyContinue
    }
  }
}
finally {
  Unregister-Event -SourceIdentifier "NewsJsonChanged" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "NewsJsonCreated" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "NewsJsonRenamed" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "SummaryJsonChanged" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "SummaryJsonCreated" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "SummaryJsonRenamed" -ErrorAction SilentlyContinue

  $newsWatcher.Dispose()
  $summaryWatcher.Dispose()
}
