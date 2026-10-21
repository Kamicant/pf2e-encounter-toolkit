# PF2e Encounter Toolkit — 0.1.0 Community Prototype

**Ten encounter-management aids in one Foundry module, independently switchable.**

This is a first usable prototype **targeting Foundry V14 with the Pathfinder 2e system**. All features have code-level mock/syntax tests, but **none has been tested in a live Foundry V14 + PF2e session**. Use it on a **copy of your world first**. Compatibility with Bossbar, Metamorph, PF2e Workbench, Creature Builder and other modules has **not** been established.

## Installation — manual, no hosted manifest

1. Back up your world or make a duplicate testing world.
2. Extract this ZIP so this file exists: `<Foundry User Data>/Data/modules/pf2e-encounter-toolkit/module.json`.
3. Restart Foundry if it was already running.
4. Open your PF2e world and enable **PF2e Encounter Toolkit (Community Prototype)** in **Manage Modules**.
5. Look for the bottom-right **⚔ Encounter Tools** launcher. If you're a player, the launcher reads **✋ Scene Interactions**.
6. In **Configure Settings → Module Settings**, switch off any feature you don't want.

**Do not paste a filesystem path or an invented URL into Foundry's Manifest URL box.** This ZIP is not online and therefore has no public manifest URL yet.

## Ten working prototype features

| System | How it works now | What remains manual |
|---|---|---|
| Boss Telegraphs | Select boss token; create an on-map red/orange/purple circle, line or cone; players see warning announcement; a notice fires at boss's next turn. | GM resolves the attack and removes/interrupts the template. |
| Boss Phase Director | Set HP threshold, onetime announcement, optional swap of token image. Actor HP drops below threshold → triggers. | New abilities, music, hazards, and stat blocks aren't automatically imported. |
| Dynamic Battlefield | GM creates circular template that expands automatically each combat round until a maximum size. | Damage, saves and conditions are adjudicated manually. |
| Weak Points | Set individual component HP/AC, manually subtract damage; triggers cinematic “broken” message; visible component summary. | Attacks to target components and consequences are GM-adjudicated. |
| Horde Commander | Save a squad from selected tokens; move whole squad by grid-square offset; announce a squad order. | Actions, collision, cost of movement, morale and group attack resolution. |
| Break Gauge | Configure a break meter for a token; add/subtract break points; announce break when full; visible meter. | Applying/removing PF2e conditions and resetting recovery rules. |
| Cinematic Announcements | Save speeches, send chat + timed banner with optional portrait to all clients. | Triggering from more event types; audio and elaborate animations. |
| Environmental Interactions | Create scene-level player interaction entries (skill, DC, narrative outcome); players send GM requests; GM announces outcome. | Clicking a tile directly and automatic skill checks/map changes. |
| Monster Behavior & Morale | One-time HP-threshold reaction cue, optionally whispered to GM only. | Monster AI, automatically selecting actions, ally-death logic. |
| Encounter Objectives | Add objectives, progress and a public tracker; optional round-countdown deadline; announce completed/failed objectives. | Linking an objective to kills, tile triggers, and quests automatically. |

## Quick test (start here)

1. Select an NPC token. Open **⚔ Encounter Tools → Boss Telegraphs → Mark danger...**.
2. Make a red 20-ft circle. Confirm the Foundry template appears and chat announces a warning.
3. Advance to that NPC's **next turn** in Combat Tracker. You should receive a **READY** banner.
4. Open **Resolve or cancel a warning** to clear the circle.
5. Test Boss Phase Director with a duplicated NPC: assign threshold 50%, reduce its HP from full to below half, and check the announcement.
6. Test Objectives by creating one with progress 3 and adding a point; the display should refresh.

## Operational notes

- **GM-only writes**: the module creates and updates scene flags and relevant documents only for the GM. Non-GM users can request configured interactions and see announcements/objectives.
- Scene data is stored in `flags.pf2e-encounter-toolkit.state` on each Scene, so it persists after closing Foundry.
- **Reset**: use `Encounter Tools → Clear this scene’s toolkit encounter data` to delete toolkit-owned templates and clear scene data. It doesn't remove your actors, scenes, or world items.
- Phase triggers use `updateActor`. In a multi-token or unlinked-token encounter, verify the intended NPC triggers before using it live.
- Multiple simultaneous GMs: the active GM with the smallest user ID processes automatic combat events, to reduce duplicate effects. Other GMs can still operate controls.
- Announcements are sent over Foundry's module socket and into chat. Text is escaped to avoid HTML injection.
- You **do not need** PF2e Workbench, libWrapper, or any third-party package to enable this module.
- Known limitation: no automated damage, no modifications to PF2e math, no automatic conditions, no embedded browser AI, no cross-scene links, no external hosting.

## Testing / development

These syntax tests and mocked smoke tests can be run with Node.js:

```sh
node --check scripts/main.mjs
node tests/smoke.mjs
```

This does **not** replace manual testing with Foundry V14 + the installed PF2e system. If Foundry logs errors, open **F12 → Console** and copy the first error containing `pf2e-encounter-toolkit`.
