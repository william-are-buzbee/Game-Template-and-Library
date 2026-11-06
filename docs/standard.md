# The repository standard

For all of the person's repositories, this one and any new one, including repositories made from a template. Set by
the person, 6 Nov 2026.

- The person owns every repository (`william-are-buzbee`). The person doesn't write code; Claude does. The person
  reviews and merges.
- `main` is locked by a ruleset called **"Only Will Merges"**: it targets the default branch, has an empty bypass list,
  restricts deletions, blocks force pushes, and requires a pull request with 0 required approvals, all merge methods
  allowed. Off: required status checks, restrict updates, required signed commits. Enforcement: Active.
  (0 approvals because pull requests open under the person's account, and GitHub won't let anyone approve their own.)
- Claude works only on `claude/…` branches, pushes them and opens a pull request into `main`. It never pushes to `main`
  and never force-pushes.
- Commits are authored as `WB <willbuzbee@gmail.com>`, with a `Co-Authored-By:` line for Claude on every commit.
  GitHub shows them as "Unverified"; that is accepted.
- Sites deploy from Actions to `gh-pages`. No ruleset may cover `gh-pages` or all branches.
- Templates don't copy rulesets. Every new repository's setup checklist includes adding this ruleset in Settings →
  Rules, and its `CLAUDE.md` states the branch, pull request and identity rules above.

**What enforces what.** Claude's GitHub access acts as the person's account, so GitHub cannot tell Claude from the
person. The ruleset stops anyone pushing to `main` directly; it cannot stop a merge made with the person's
credentials. That part is held on Claude's side by `.claude/settings.json`, which denies the merge tool,
`gh pr merge`, pushes to `main`, force pushes, rebases and hard resets, and by the rules in `CLAUDE.md`.

## Setup checklist: this repository (one time)

1. Create `main` with a first commit (Add a README in the GitHub UI), before anything else is pushed.
2. Add the ruleset "Only Will Merges" (Settings → Rules → Rulesets). Done 6 Nov 2026; it names `refs/heads/main`
   rather than "default branch", which is the same thing while `main` is the default.
3. After the first pull request's `pages` run has created the `gh-pages` branch: Settings → Pages → Build and
   deployment → Source **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**, Save. Until then preview
   links 404.

New games and labs need none of this: they are folders here (`npm run new`), under this repository's ruleset, CI and
site.

## Setup checklist: a new repository of its own

Only for something that has to live outside this repository (a game spun off on its own, say).

1. Create the repository under `william-are-buzbee`, then create `main` with a first commit (Add a README) before
   anything else is pushed. A branch pushed into an empty repository becomes its default branch.
2. **Add the ruleset "Only Will Merges".** Settings → Rules → Rulesets → New ruleset → Import a ruleset, and pick
   `docs/only-will-merges.json` from this repository. Check it reads as above (target: the default branch; Active).
   Or, from your own machine with the GitHub CLI signed in:
   ```
   gh api -X POST repos/william-are-buzbee/<repo>/rulesets --input docs/only-will-merges.json
   ```
   (A Claude session cannot do this step: its GitHub access has no administration rights.)
3. Copy in from this repository: the *Delivering a change* section of `CLAUDE.md` (the branch, pull request and
   identity rules, word for word), `.claude/settings.json`, `.gitattributes`, `.gitignore`, and `.github/`
   (workflows and `publish.sh`, adjusted to what the new repository builds).
4. After the first `pages` run: Settings → Pages → Deploy from a branch → `gh-pages`, `/ (root)`.
5. Check that Claude's GitHub app can see the new repository (its installation covers all repositories, or add this one).
