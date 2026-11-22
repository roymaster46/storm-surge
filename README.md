# STORM SURGE — an open-world crime game in Coral Bay

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/roymaster46/storm-surge/rank.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/roymaster46/storm-surge/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Hurricane Mara is drowning Coral Bay.** You are Rook Calloway, a wheelman
with one night to pull the heist of the decade — while the storm floods the
streets, the Coral Bay PD locks the city down, and a police helicopter
paints you with its searchlight. The game boots straight into the peak:
mission 6, stage 3 of 4, five wanted stars, a roadblock ahead, and Dara
Voss on the radio.

## What is in the game

- **Open world**: the original fictional city of Coral Bay — 6 districts
  (Harbor Road, Neon Row, Palmetto Strip, Downtown, Bayview, Old Coral),
  a harbor bridge, a pier with a working crane, and a flood barrier.
- **The hurricane**: slanting rain, lightning strobes with screen flash
  and thunder, wind gusts that bend the palms and push your car, and
  flood water that rises with the mission clock.
- **10 story missions** with stages, briefs, rewards and respect, plus
  side jobs (taxi fares, storm courier, vigilante, street races).
- **5-star police response**: chasing cruisers with light bars, roadblocks,
  spike strips, a circling helicopter with a searchlight, and CBPD
  dispatch chatter.
- **7 drivable cars with nitro** (steal any traffic car with F), a garage
  to buy and collect them, and a weapon wheel (pistol, SMG, rifle,
  shotgun, rocket) with a shop.
- **Crew & respect system**: Dara, Milo, June and Big Tolu, with portrait
  dialogue; respect ranks from NOBODY to LEGEND OF CORAL BAY.
- **Traffic and panicking pedestrians** who flee the player and the storm.
- **WebAudio radio**: three original synthesized stations, rain noise,
  thunder, sirens, engine hum, gunfire and the nitro whoosh — no audio
  files, everything synthesized live.
- **HUD with minimap**, health/armor bars, wanted stars, cash, district,
  storm readout, mission tracker, and a set-piece explosion at Pier 9.
- **Save & autosave** (localStorage), pause menu, start screen, game over.

## Play

Serve `game/` with any static server and open `game/index.html` in
desktop Chrome:

```
node serve.ts
# then open http://localhost:8080
```

| Key | Action |
| --- | ------ |
| W A S D | drive / walk |
| Mouse | look / aim, click to fire |
| SHIFT | nitro |
| SPACE | handbrake |
| E | enter / exit car |
| F | steal nearest car |
| 1–5 | weapon wheel |
| G / B | garage / shop |
| R | change radio |
| M | missions |
| T | next dialogue line |
| P / ESC | pause |

## Entry plumbing

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with
`buildDossier` from `vendor/makefun-game.ts`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game in a headless browser
(`?shot=hero|neon|pier|downtown`), listed in `shots.json`.

## Originality

Every name, character, district, vehicle, story line and sound in this
game is original. Nothing is taken from Rockstar Games' Grand Theft Auto
series or any other commercial game. Three.js r160 (MIT) is vendored
under `game/vendor/`.

## License

MIT — see [LICENSE](LICENSE).
