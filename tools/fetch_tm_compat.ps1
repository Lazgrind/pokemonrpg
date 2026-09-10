# Stáhne kanonickou Gen 1 (Red/Blue) TM i HM kompatibilitu z PokeAPI (veřejná CSV data)
# a namapuje ji na NAŠE čísla TM (dle data/tms.js) resp. HM (dle data/hms.js).
# V Gen 1 spadají TM i HM pod metodu "machine" (pokemon_move_method_id=4), takže
# oba získáme z jednoho průchodu; rozlišíme je podle identifikátoru tahu.
# Výstup:
#   - TM: 151 řádků "dex:tm,tm,..." → konzole i tools/tm_compat_gen1.txt
#   - HM: 151 řádků "dex:hm,hm,..." → konzole i tools/hm_compat_gen1.txt
#
# Spuštění (v PowerShellu, ve složce projektu):
#   powershell -ExecutionPolicy Bypass -File tools\fetch_tm_compat.ps1

$ErrorActionPreference = "Stop"
# Vynutit TLS 1.2 (starší Windows PowerShell jinak občas selže na HTTPS).
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
$tmpDir = Join-Path $env:TEMP ("tmfetch_" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
$movesCsv  = Join-Path $tmpDir "moves.csv"
$pmovesCsv = Join-Path $tmpDir "pokemon_moves.csv"

Write-Host ">> stahuji moves.csv ..."
Invoke-WebRequest -Uri "$base/moves.csv" -OutFile $movesCsv
Write-Host ">> stahuji pokemon_moves.csv (~par MB) ..."
Invoke-WebRequest -Uri "$base/pokemon_moves.csv" -OutFile $pmovesCsv

# --- nase mapovani identifikator tahu -> cislo TM (presne dle data/tms.js) ---
$tmMap = @{
  "mega-punch"=1; "razor-wind"=2; "swords-dance"=3; "whirlwind"=4; "mega-kick"=5;
  "toxic"=6; "horn-drill"=7; "body-slam"=8; "take-down"=9; "double-edge"=10;
  "bubble-beam"=11; "water-gun"=12; "ice-beam"=13; "blizzard"=14; "hyper-beam"=15;
  "pay-day"=16; "submission"=17; "counter"=18; "seismic-toss"=19; "rage"=20;
  "mega-drain"=21; "solar-beam"=22; "dragon-rage"=23; "thunderbolt"=24; "thunder"=25;
  "earthquake"=26; "fissure"=27; "dig"=28; "psychic"=29; "teleport"=30;
  "mimic"=31; "double-team"=32; "reflect"=33; "bide"=34; "metronome"=35;
  "self-destruct"=36; "egg-bomb"=37; "fire-blast"=38; "swift"=39; "skull-bash"=40;
  "soft-boiled"=41; "dream-eater"=42; "sky-attack"=43; "rest"=44; "thunder-wave"=45;
  "psywave"=46; "explosion"=47; "rock-slide"=48; "tri-attack"=49; "substitute"=50
}

# --- nase mapovani identifikator tahu -> cislo HM (presne dle data/hms.js) ---
$hmMap = @{
  "cut"=1; "fly"=2; "surf"=3; "strength"=4; "flash"=5
}

Write-Host ">> zpracovavam data ..."
# move_id -> identifier
$id2ident = @{}
Import-Csv $movesCsv | ForEach-Object { $id2ident[$_.id] = $_.identifier }

# pid -> sorted set of TM cisel / HM cisel
$result   = @{}
$resultHm = @{}
1..151 | ForEach-Object {
  $result[$_]   = New-Object 'System.Collections.Generic.SortedSet[int]'
  $resultHm[$_] = New-Object 'System.Collections.Generic.SortedSet[int]'
}

Import-Csv $pmovesCsv | Where-Object {
  $_.version_group_id -eq "1" -and $_.pokemon_move_method_id -eq "4"
} | ForEach-Object {
  $pkId = [int]$_.pokemon_id
  if ($pkId -ge 1 -and $pkId -le 151) {
    $ident = $id2ident[$_.move_id]
    if ($ident -and $tmMap.ContainsKey($ident)) {
      [void]$result[$pkId].Add($tmMap[$ident])
    }
    if ($ident -and $hmMap.ContainsKey($ident)) {
      [void]$resultHm[$pkId].Add($hmMap[$ident])
    }
  }
}

# Vystup TM
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("===TM_COMPAT_GEN1_BEGIN===")
for ($i = 1; $i -le 151; $i++) {
  $tms = ($result[$i] -join ",")
  $lines.Add("$($i):$tms")
}
$lines.Add("===TM_COMPAT_GEN1_END===")

$outFile = Join-Path (Get-Location) "tools\tm_compat_gen1.txt"
$lines | Set-Content -Path $outFile -Encoding UTF8
$lines | ForEach-Object { Write-Output $_ }
Write-Host ">> ulozeno do: $outFile"

# Vystup HM
$linesHm = New-Object System.Collections.Generic.List[string]
$linesHm.Add("===HM_COMPAT_GEN1_BEGIN===")
for ($i = 1; $i -le 151; $i++) {
  $hms = ($resultHm[$i] -join ",")
  $linesHm.Add("$($i):$hms")
}
$linesHm.Add("===HM_COMPAT_GEN1_END===")

$outFileHm = Join-Path (Get-Location) "tools\hm_compat_gen1.txt"
$linesHm | Set-Content -Path $outFileHm -Encoding UTF8
$linesHm | ForEach-Object { Write-Output $_ }
Write-Host ">> ulozeno do: $outFileHm"

Remove-Item -Recurse -Force $tmpDir
