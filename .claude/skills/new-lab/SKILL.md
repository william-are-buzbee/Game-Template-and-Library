---
name: new-lab
description: Start a lab in this repository (labs/<name>), for a one-shot, a model trial ("how good is model X at..."), a tech demo, or any experiment. Use when the person asks to try something quickly, or when unsure whether it will become a game.
---

# New lab

1. **Name it** for what it tries (`webgpu-ocean`, `chord-gen`).
2. **Read `CATALOG.md`** anyway: a lab may use any package.
3. **Branch.** `git fetch origin main && git checkout -b claude/lab-<name> origin/main`.
4. **Scaffold.** `npm run new -- lab <name> "<one line: what it tries>"`.
5. **Write the README first:** what the lab is trying, and how you will know it worked.
6. **Build it.** No rules except that `npm run build -w labs/<name>` works. Its own dependencies are fine (another
   three.js, WebGPU, a library), as `labs/<name>/package.json` dependencies.
7. **Look.** `npm run build -w labs/<name> && npm run look -- labs/<name>`.
8. **Record what it found** in its README, so it is worth something later. Then commit, push, open the pull request.
