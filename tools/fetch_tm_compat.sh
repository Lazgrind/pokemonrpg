#!/usr/bin/env bash
# Stáhne kanonickou Gen 1 (Red/Blue) TM kompatibilitu z PokeAPI (veřejná CSV data)
# a namapuje ji na NAŠE čísla TM (dle data/tms.js podle identifikátoru tahu).
# Výstup: 151 řádků "dex:tm,tm,..." (vzestupně), přímo k porovnání s data/tmCompat.js.
#
# Spuštění (na stroji se sítí):  ! bash tools/fetch_tm_compat.sh
set -e
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
base="https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"

echo ">> stahuji moves.csv ..." >&2
curl -sL "$base/moves.csv" -o moves.csv
echo ">> stahuji pokemon_moves.csv (~pár MB) ..." >&2
curl -sL "$base/pokemon_moves.csv" -o pmoves.csv

# --- naše mapování identifikátor tahu -> číslo TM (přesně dle data/tms.js) ---
cat > tmmap.txt <<'EOF'
mega-punch 1
razor-wind 2
swords-dance 3
whirlwind 4
mega-kick 5
toxic 6
horn-drill 7
body-slam 8
take-down 9
double-edge 10
bubble-beam 11
water-gun 12
ice-beam 13
blizzard 14
hyper-beam 15
pay-day 16
submission 17
counter 18
seismic-toss 19
rage 20
mega-drain 21
solar-beam 22
dragon-rage 23
thunderbolt 24
thunder 25
earthquake 26
fissure 27
dig 28
psychic 29
teleport 30
mimic 31
double-team 32
reflect 33
bide 34
metronome 35
self-destruct 36
egg-bomb 37
fire-blast 38
swift 39
skull-bash 40
soft-boiled 41
dream-eater 42
sky-attack 43
rest 44
thunder-wave 45
psywave 46
explosion 47
rock-slide 48
tri-attack 49
substitute 50
EOF

# move_id -> identifier
awk -F, 'NR>1{print $1" "$2}' moves.csv | sort -k1,1 > mid.txt
# identifier -> move_id
awk '{print $2" "$1}' mid.txt | sort -k1,1 > id2mid.txt
sort -k1,1 tmmap.txt > tmmap_s.txt
# identifier move_id tmnum  ->  move_id tmnum
join -1 1 -2 1 id2mid.txt tmmap_s.txt | awk '{print $2" "$3}' | sort -k1,1 > moveid_tm.txt

# pokémon machine tahy v Red/Blue: version_group_id==1, method==4 (machine), dex<=151
awk -F, 'NR>1 && $2==1 && $4==4 && ($1+0)<=151 {print $3" "$1}' pmoves.csv | sort -k1,1 > pm.txt

# join přes move_id -> (tmnum, pid) -> agregace na dex
join moveid_tm.txt pm.txt | awk '{print $3" "$2}' | sort -k1,1n -k2,2n -u > pidtm.txt
echo "===TM_COMPAT_GEN1_BEGIN==="
awk '{a[$1]=a[$1]","$2} END{for(i=1;i<=151;i++){s=a[i];sub(/^,/,"",s);print i":"s}}' pidtm.txt
echo "===TM_COMPAT_GEN1_END==="
