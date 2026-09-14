# Stahne hudbu (BGM tracks) z Pokemon Showdown a ulozi je jako .mp3 soubory
# do assets/audio/bgm/. Vybirane tracky se mapovajiaz Showdown jmen na nase jmena.
#
# Pozn.: Zamerne bez diakritiky a bez emoji. Windows PowerShell 5.1 cte .ps1 bez BOM
# jako ANSI a vicebajtove UTF-8 znaky by rozbily parser (napr. try/catch). ASCII = jistota.
#
# Spusteni (v korenu repa pokemonrpg):   pwsh tools/fetch_music.ps1
#                                    nebo: powershell -File tools/fetch_music.ps1

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Cesty odvozene z $PSScriptRoot (tools/)
$outDir = Join-Path $PSScriptRoot "..\assets\audio\bgm"

# Mapovani: Showdown jmen na nase nazy
$tracks = @(
  @{ src = "dpp-trainer"; out = "main" },
  @{ src = "xy-trainer"; out = "wild" },
  @{ src = "hgss-kanto-trainer"; out = "trainer" },
  @{ src = "bw2-rival"; out = "rival" },
  @{ src = "bw2-kanto-gym-leader"; out = "gym" },
  @{ src = "spl-elite4"; out = "champion" }
)

# Vytvor vystupni slozku
Write-Host ">> vytvarim slozku assets/audio/bgm/ ..."
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Pocitadla uspechu a selhani
$successCount = 0
$failCount = 0

Write-Host ">> stahuji BGM tracky ..."
foreach ($track in $tracks) {
  $showdownName = $track.src
  $ourName = $track.out
  $url = "https://play.pokemonshowdown.com/audio/$showdownName.mp3"
  $outFile = Join-Path $outDir "$ourName.mp3"

  try {
    Write-Host "  $ourName (from $showdownName) ... " -NoNewline
    Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing

    # Validace: firemni URL filtr vraci HTTP 200 s HTML strankou "Web Page Blocked",
    # kterou Invoke-WebRequest ulozi jako .mp3 (falesny uspech). Realny track ma
    # >500 KB a zacina ID3 (0x49 0x44 0x33) nebo MPEG sync (0xFF). Odpad zahod.
    $bytes = [System.IO.File]::ReadAllBytes($outFile)
    $len = $bytes.Length
    $isHtml = ($len -ge 1 -and $bytes[0] -eq 0x3C)  # '<' = HTML
    $isMp3 = ($len -ge 3 -and (($bytes[0] -eq 0x49 -and $bytes[1] -eq 0x44 -and $bytes[2] -eq 0x33) -or $bytes[0] -eq 0xFF))
    if ($isHtml -or $len -lt 50000 -or -not $isMp3) {
      Remove-Item $outFile -Force
      Write-Warning "BLOKOVANO/nevalidni ($ourName, $len B) -- pravdepodobne firemni URL filtr. Soubor smazan."
      $failCount++
    }
    else {
      Write-Host "OK ($([math]::Round($len/1KB)) KB)"
      $successCount++
    }
  }
  catch {
    Write-Warning "Selhalo stazeni $ourName (showdownName: $showdownName) -- chyba: $_"
    $failCount++
  }

  # Bud slusny k serveru: 200ms mezi requesty
  Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host ">> HOTOVO!"
Write-Host "   Uspesne stazeno: $successCount"
Write-Host "   Selhalo: $failCount"
Write-Host "   Cilova slozka: $outDir"
