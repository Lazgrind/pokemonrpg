"""
gen_sfx.py – vygeneruje zvukové efekty hry v retro stylu (Game Boy: pulzní vlna + šum)
do assets/audio/sfx/<název>.wav. Jen standardní knihovna Pythonu, žádné stahování.

Hra je přehrává přes src/systems/audioSystem.js (playSfx). Zvuk upravíš změnou
popisu níž (noty, délky, hlasitost) a novým spuštěním:

  python tools/gen_sfx.py
"""

import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "audio", "sfx")
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(
    ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def freq(name, octave):
    return NOTE[name] * 2 ** (octave - 4)


def pulse(f, t, duty=0.5):
    """Pulzní (obdélníková) vlna jako zvukový kanál Game Boye."""
    return 1.0 if (f * t) % 1.0 < duty else -1.0


def env(i, n, attack=0.005, release=0.04):
    """Obálka hlasitosti: krátký náběh, doznění na konci (bez lupnutí)."""
    t, total = i / RATE, n / RATE
    a = min(1.0, t / attack) if attack else 1.0
    r = min(1.0, (total - t) / release) if release else 1.0
    return max(0.0, min(a, r))


def tone(f0, dur, f1=None, duty=0.5, vol=0.5, vibrato=0.0):
    """Tón (s volitelným glissandem f0 → f1 a vibratem)."""
    n = int(RATE * dur)
    out, phase = [], 0.0
    for i in range(n):
        p = i / n
        f = f0 if f1 is None else f0 + (f1 - f0) * p
        if vibrato:
            f *= 1 + vibrato * math.sin(2 * math.pi * 7 * i / RATE)
        phase += f / RATE
        out.append(vol * env(i, n) * (1.0 if phase % 1.0 < duty else -1.0))
    return out


def noise(dur, vol=0.5, decay=True, period=1):
    """Šum (kanál 4 Game Boye); `period` > 1 = hrubší, nižší šum."""
    n = int(RATE * dur)
    out, v = [], 0.0
    for i in range(n):
        if i % period == 0:
            v = random.uniform(-1, 1)
        k = (1 - i / n) ** 2 if decay else env(i, n)
        out.append(vol * k * v)
    return out


def silence(dur):
    return [0.0] * int(RATE * dur)


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]


def seq(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out


SOUNDS = {
    # zásah útokem: úder šumu + krátký hluboký „thump"
    "hit": lambda: mix(noise(0.14, 0.6, period=3), tone(180, 0.09, 60, duty=0.5, vol=0.35)),
    # omdlení: klesající glissando
    "faint": lambda: tone(700, 0.55, 90, duty=0.25, vol=0.35),
    # chycení: tři „cvaknutí" míčku a jasné potvrzení
    "catch": lambda: seq(
        noise(0.04, 0.4, period=2), silence(0.12), noise(0.04, 0.4, period=2), silence(0.12),
        noise(0.04, 0.4, period=2), silence(0.08),
        tone(freq("G", 5), 0.08, vol=0.3), tone(freq("C", 6), 0.22, vol=0.3)),
    # nepovedené chycení: dvě cvaknutí a „vyskočení" z míčku
    "catch-fail": lambda: seq(
        noise(0.04, 0.4, period=2), silence(0.12), noise(0.04, 0.4, period=2), silence(0.08),
        tone(900, 0.16, 300, duty=0.25, vol=0.3)),
    # achievement: krátká fanfára
    "achievement": lambda: seq(tone(freq("G", 5), 0.09, vol=0.28), tone(freq("G", 5), 0.09, vol=0.28),
                               tone(freq("G", 5), 0.09, vol=0.28), tone(freq("C", 6), 0.32, vol=0.3)),
    # level up: vzestupné arpeggio
    "levelup": lambda: seq(*[tone(freq(n, o), 0.075, duty=0.5, vol=0.3)
                             for n, o in [("C", 5), ("E", 5), ("G", 5), ("C", 6)]],
                           tone(freq("E", 6), 0.18, duty=0.5, vol=0.3)),
    # evoluce: třpytivé stoupání s vibratem a závěrečný akord
    "evolve": lambda: seq(
        tone(300, 0.7, 1200, duty=0.125, vol=0.25, vibrato=0.03),
        mix(tone(freq("C", 6), 0.35, vol=0.18), tone(freq("E", 6), 0.35, vol=0.18),
            tone(freq("G", 6), 0.35, vol=0.18))),
    # vylíhnutí: prasknutí skořápky a dvoutónová radost
    "hatch": lambda: seq(noise(0.06, 0.5, period=4), silence(0.06), noise(0.08, 0.5, period=2),
                         silence(0.05), tone(freq("A", 5), 0.1, vol=0.3), tone(freq("D", 6), 0.2, vol=0.3)),
    # klik v UI: krátké pípnutí
    "click": lambda: tone(1400, 0.03, duty=0.5, vol=0.25),
}


def write(name, samples):
    path = os.path.join(OUT, f"{name}.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32000)) for s in samples))
    return path


def main():
    random.seed(7)  # stejný výsledek při každém spuštění
    os.makedirs(OUT, exist_ok=True)
    for name, make in SOUNDS.items():
        samples = make()
        write(name, samples)
        print(f"{name}.wav  {len(samples) / RATE:.2f} s")
    print(f"Hotovo: {len(SOUNDS)} zvuků v assets/audio/sfx/")


if __name__ == "__main__":
    main()
