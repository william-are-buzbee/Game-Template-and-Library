#!/usr/bin/env bash
# publish.sh — writes _site (tools/site.ts) into the gh-pages branch, replacing only its own slot (run by pages.yml).
#   publish.sh main       the live site at the root; preview/ is left alone
#   publish.sh pr <n>     a preview at preview/<n>/, replaced on each push to the pull request
#   publish.sh close <n>  that preview removed when the pull request closes
# Every write is a new commit on gh-pages, so every version ever published stays in its history.
# From the publish.sh of Tethys, Overworld and Planet-Viewer (26 Sep 2026), without the kept copy per version: with
# every game on one site, a full copy per merge would grow past what Pages allows.
# Since 16 Nov 2026 the slots run side by side (pages.yml: one concurrency group per slot, docs/decisions.md 27), so
# another slot may push between this one's fetch and its push. The push is then refused (never forced), and the write
# starts over from the new gh-pages: fetched again, this slot replaced again, pushed again — up to TRIES times.
set -euo pipefail
mode=$1;n=${2:-}
case $mode in main|pr|close) ;; *) echo "publish.sh: unknown mode $mode";exit 1;; esac
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
TRIES=${PUBLISH_TRIES:-5}
for try in $(seq 1 "$TRIES");do
  rm -rf _gh;git worktree prune
  if git ls-remote --exit-code --heads origin gh-pages >/dev/null;then
    git fetch -q --depth 1 origin gh-pages
    git worktree add -q -f -B gh-pages _gh FETCH_HEAD
  else
    git worktree add -q --detach _gh
    (cd _gh && git checkout -q --orphan gh-pages && git rm -rfq . && git clean -fdq)
  fi
  touch _gh/.nojekyll
  case $mode in
    main)
      rsync -a --delete --exclude .git --exclude .nojekyll --exclude preview/ _site/ _gh/
      msg="live: ${GITHUB_SHA:-local}";;
    pr)
      mkdir -p "_gh/preview/$n";rsync -a --delete _site/ "_gh/preview/$n/";msg="preview $n: ${GITHUB_SHA:-local}";;
    close)
      rm -rf "_gh/preview/$n";msg="preview $n removed";;
  esac
  (cd _gh && git add -A)
  if (cd _gh && git diff --cached --quiet);then echo "nothing to publish";exit 0;fi
  (cd _gh && git commit -qm "$msg")
  if (cd _gh && git push -q origin gh-pages);then exit 0;fi
  echo "publish.sh: gh-pages moved under this run (another slot wrote first); again ($try of $TRIES)"
  sleep $((try*3))
done
echo "publish.sh: could not publish after $TRIES tries";exit 1
