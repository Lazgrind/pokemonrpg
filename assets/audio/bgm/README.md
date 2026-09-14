# BGM (Background Music)

This folder contains background music tracks for Pokemon RPG.

## Files

- **main.mp3** -- Main menu and map background music. User-provided.
- **wild.mp3** -- Wild Pokemon battle music (from Pokemon Showdown).
- **trainer.mp3** -- Trainer/NPC battle music (from Pokemon Showdown).
- **rival.mp3** -- Rival battle music (from Pokemon Showdown).
- **gym.mp3** -- Gym Leader battle music (from Pokemon Showdown).
- **champion.mp3** -- Elite Four / Champion battle music (from Pokemon Showdown).

## Download

To fetch the battle tracks from Pokemon Showdown, run:

```
pwsh tools/fetch_music.ps1
```

or

```
powershell -File tools/fetch_music.ps1
```

## Usage

Background music is played by `playBgm()` in `src/systems/audioSystem.js`. Battle tracks are switched via `mainPanel.syncBattleBgm()` when entering/exiting combat.
