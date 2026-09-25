# Stahne zvuky (cries) Pokemonu z Pokemon Showdown a ulozi je jako .mp3 soubory
# do assets/gen<N>/cries/ (per generace druhu). Jmeno souboru = species id
# z data/gen<N>/pokemon.js (napr. bulbasaur.mp3).
#
# Pozn.: Zamerne bez diakritiky a bez emoji. Windows PowerShell 5.1 cte .ps1 bez BOM
# jako ANSI a vicebajtove UTF-8 znaky by rozbily parser (napr. try/catch). ASCII = jistota.
#
# Spusteni (v korenu repa pokemonrpg):   pwsh tools/fetch_cries.ps1
#                                    nebo: powershell -File tools/fetch_cries.ps1

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Generace, ktere se maji stahnout (data/pokemon.js je uz jen aggregator bez literalu).
$gens = 1, 2

$successCount = 0
$failCount = 0

foreach ($gen in $gens) {
  # Cesty odvozene z $PSScriptRoot (tools/)
  $dataPath = Join-Path $PSScriptRoot "..\data\gen$gen\pokemon.js"
  $outDir = Join-Path $PSScriptRoot "..\assets\gen$gen\cries"

  if (-not (Test-Path $dataPath)) {
    Write-Host ">> gen$gen : data/gen$gen/pokemon.js neexistuje, preskakuji."
    continue
  }

  Write-Host ">> gen$gen : ctu species ID z data/gen$gen/pokemon.js ..."
  $pokemonContent = Get-Content $dataPath -Raw
  # Regex: '(?m)^\s+id: "([a-z0-9-]+)",' -- najde vsechna id druhu (jeden per radek v objektu)
  $ids = @()
  [regex]::Matches($pokemonContent, '(?m)^\s+id: "([a-z0-9-]+)",') | ForEach-Object {
    $ids += $_.Groups[1].Value
  }
  Write-Host ">> gen$gen : nalezeno species ID: $($ids.Count)"

  # Vytvor vystupni slozku
  Write-Host ">> gen$gen : vytvarim slozku assets/gen$gen/cries/ ..."
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null

  Write-Host ">> gen$gen : stahuji cries ..."
  foreach ($id in $ids) {
    # showdownId = id bez specialnich znaku (jen mala pismena a cislice)
    # nidoran-f -> nidoranf, nidoran-m -> nidoranm, mr-mime -> mrmime atd.
    $showdownId = $id -replace '[^a-z0-9]', ''
    $url = "https://play.pokemonshowdown.com/audio/cries/$showdownId.mp3"
    $outFile = Join-Path $outDir "$id.mp3"

    try {
      Write-Host "  gen$gen/$id ... " -NoNewline
      Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
      Write-Host "OK"
      $successCount++
    }
    catch {
      Write-Warning "Selhalo stazeni $id (showdownId: $showdownId) -- chyba: $_"
      $failCount++
    }

    # Bud slusny k serveru: 150ms mezi requesty
    Start-Sleep -Milliseconds 150
  }
}

Write-Host ""
Write-Host ">> HOTOVO!"
Write-Host "   Uspesne stazeno: $successCount"
Write-Host "   Selhalo: $failCount"
