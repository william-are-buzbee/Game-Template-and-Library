---
name: look
description: Look at a game or lab the way the person will - build it, boot it in headless Chromium, read the page errors, take and view a screenshot. Use after any change that shows on screen, and before saying a change works.
---

# Look at it

1. `npm run build -w <dir>`: always look at the real build, the thing that gets published.
2. `npm run look -- <dir>`: serves `dist/`, opens headless Chromium with software WebGL, waits 2.5 s, fails on any page
   error, failed request or `console.error`, and writes `_look/<name>.png`. Options:
   - `--query "?dev"` for a URL query
   - `--wait 6000` for something slow to settle
   - `--size 1600x900` for another screen size
   - `--shot path.png` for another file name
3. **Open the screenshot and look at it.** Booting without errors is not the same as looking right.
4. To see something that needs input or time (a key held, a menu opened), write a short Playwright script for it in
   your scratchpad, not in the repository. Take the browser and the server from `tools/lib/browser.ts`, as
   `tools/look.ts` does; its `freezable` and `freeze` stop a heavy game's frame loop so a screenshot can be taken.
   The picture the site's index shows: `npm run cards -- <dir>`, then open `_cards/<name>-960.webp`.
5. **Say plainly what was not seen:** sound, the person's GPU and frame rate, touch on a real phone, feel. List those in
   the pull request as what to try on the preview.
