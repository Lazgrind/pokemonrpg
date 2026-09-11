# Stáhne kanonické EV yieldy (Effort Values, které padnou za poražení druhu) z PokeAPI
# (veřejná CSV data) a vygeneruje data/evYields.js. Bereme AKTUÁLNÍ (nejnovější mainline)
# hodnoty dle naší datové strategie – sloupec `effort` v pokemon_stats.csv.
#
# Omezeno na Gen 1 (pokemon.csv id 1..151 = základní formy Kanto dexu). Do JS se
# zapisují jen NENULOVÉ staty, s naším názvoslovím (spAttack/spDefense atd.).
#
# Spuštění (v kořeni repa):   pwsh tools/fetch_ev_yields.ps1
# Vzor: tools/fetch_tm_compat.ps1

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
$tmpDir = Join-Path $env:TEMP ("evfetch_" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
$pokeCsv  = Join-Path $tmpDir "pokemon.csv"
$statsCsv = Join-Path $tmpDir "pokemon_stats.csv"

Write-Host ">> stahuji pokemon.csv ..."
Invoke-WebRequest -Uri "$base/pokemon.csv" -OutFile $pokeCsv
Write-Host ">> stahuji pokemon_stats.csv ..."
Invoke-WebRequest -Uri "$base/pokemon_stats.csv" -OutFile $statsCsv

# stat_id (PokeAPI) -> nas klic statu
$statMap = @{
  "1" = "hp"
  "2" = "attack"
  "3" = "defense"
  "4" = "spAttack"
  "5" = "spDefense"
  "6" = "speed"
}

# nase poradi statu ve vystupu (aby byl JS deterministicky)
$statOrder = @("hp", "attack", "defense", "spAttack", "spDefense", "speed")

Write-Host ">> zpracovavam data ..."

# id pokemona -> identifier (jen Gen 1: id 1..151, coz jsou zakladni formy)
$id2ident = @{}
Import-Csv $pokeCsv | ForEach-Object {
  $pkid = [int]$_.id
  if ($pkid -ge 1 -and $pkid -le 151) { $id2ident["$pkid"] = $_.identifier }
}

# id pokemona -> @{ statKey = effort }
$yields = @{}
Import-Csv $statsCsv | ForEach-Object {
  $pkid = $_.pokemon_id
  if (-not $id2ident.ContainsKey($pkid)) { return }
  $effort = [int]$_.effort
  if ($effort -le 0) { return }
  $key = $statMap[$_.stat_id]
  if (-not $key) { return }
  if (-not $yields.ContainsKey($pkid)) { $yields[$pkid] = @{} }
  $yields[$pkid][$key] = $effort
}

# sestaveni JS souboru
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/**")
[void]$sb.AppendLine(" * evYields.js - DATA: kanonicke EV yieldy druhu (kolik EV padne za jeho porazeni).")
[void]$sb.AppendLine(" * Klic = species id (data/pokemon.js), hodnota = objekt jen s NENULOVYMI staty")
[void]$sb.AppendLine(" * v nasem nazvoslovi (hp, attack, defense, spAttack, spDefense, speed).")
[void]$sb.AppendLine(" *")
[void]$sb.AppendLine(" * Zdroj: PokeAPI CSV (pokemon_stats.csv, sloupec effort) - aktualni hodnoty.")
[void]$sb.AppendLine(" * VYGENEROVANO skriptem tools/fetch_ev_yields.ps1 - needituj rucne.")
[void]$sb.AppendLine(" *")
[void]$sb.AppendLine(" * @type {Record<string, Partial<Record<`"hp`"|`"attack`"|`"defense`"|`"spAttack`"|`"spDefense`"|`"speed`", number>>>}")
[void]$sb.AppendLine(" */")
[void]$sb.AppendLine("export const EV_YIELDS = {")

# seradime dle id (Gen 1 dex = 1..151)
1..151 | ForEach-Object {
  $pkid = "$_"
  if (-not $id2ident.ContainsKey($pkid)) { return }
  $ident = $id2ident[$pkid]
  $y = $yields[$pkid]
  if (-not $y -or $y.Count -eq 0) { return }  # bezstatovy druh (nemel by nastat) -> vynech
  $parts = @()
  foreach ($k in $statOrder) {
    if ($y.ContainsKey($k)) { $parts += ("{0}: {1}" -f $k, $y[$k]) }
  }
  # klic s pomlckou (nidoran-f, nidoran-m, mr-mime) musi byt v uvozovkach,
  # jinak ho JS cte jako odcitani a cely modul spadne
  $keyOut = if ($ident -match '^[A-Za-z_$][A-Za-z0-9_$]*$') { $ident } else { '"' + $ident + '"' }
  [void]$sb.AppendLine(("  {0}: {{ {1} }}," -f $keyOut, ($parts -join ", ")))
}

[void]$sb.AppendLine("};")

$outFile = Join-Path (Split-Path $PSScriptRoot -Parent) "data/evYields.js"
[System.IO.File]::WriteAllText($outFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))

Remove-Item -Recurse -Force $tmpDir
Write-Host (">> HOTOVO: zapsano {0} druhu do {1}" -f $yields.Count, $outFile)
