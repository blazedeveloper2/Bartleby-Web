# Anatomy Bench

A test bench for the Workout app's 3D body. It is not part of the app: it
uses the app's own modules (`apps/workout/avatar.js`, `stage.js`, `rig.js`,
`muscles3d.js`), so what you see here is exactly what the app draws.

Serve the repo root and open `/tools/anatomy/`.

| Tab | What it is for |
| --- | --- |
| **Atlas** | Every muscle region the app can light, on the body. Hover to name one, click to isolate it, Shift-click to add more. |
| **Exercise** | Any exercise, posed anywhere in its rep. Highlight what the 3D animation lights, what the 2D body map lights, the two compared, or nothing. |
| **Paint** | Correct where a muscle is with a brush. Edits save in the browser; Export writes them as JSON for the app. |
| **Rig** | Bone weights, wireframe and joints, for checking how the skin bends. |

Keyboard: Space play/pause, ← → step, 1–4 front/side/back/top, R reset the
view, S shorts, D pick debug readout, ? help.

Links: `?tab=exercise&ex=Pull-Ups&t=0.5&src=diff&az=90&el=10&zoom=2`,
`?solo=lat,glute`, `?model=trainer`, `?shorts=0`.

## Collision and snap scans

`scan.js` poses the body through every rep and reports where it goes into
the kit (bench, bar, wall, what is held) or below the floor, worst first,
and (`snaps`) the biggest one-frame jump in each rep.
In the bench's console:

```js
const S = await import('./scan.js');
await S.scanAll({ min: 2.5 })     // every exercise
await S.scan('Pull-Ups')           // one
await S.snaps('Push-Ups')          // biggest one-frame jump: [size, bone, seconds]
await S.snapsAll()                 // every exercise, worst first
```

Under about 2.5 is contact, not collision: calves against the seat edge,
fingers round the end of a pad, dumbbells brushing the thighs.
Measured against a part's bounding box, so a little more shows at a pad's
rounded edges than is really there.

A snap under about 4 is ordinary motion; 10 or more is something flipping
(a forearm's twist, a foot turning the other way to keep the toes off the
floor) or jumping, worth a look frame by frame with the scrubber.
