# Setting up the fresh repository

The Git-enabled ZIP is a **new, standalone repository**, not a branch of the old one. It has a single initial commit on `main`, contains `.git`, and has no configured remote. The dataset's historical source information is still recorded in `data/corpus.json` and editorial history; the old Git history is not included. No remote has been created or pushed.

```sh
unzip Mafatih-fresh-repository-2026-11-01.zip
cd Mafatih-fresh-repository

git status
git log --oneline
git remote -v             # no remotes yet
git config user.name
git config user.email
npm ci
npm run check
```

The Git name and email are taken from the author's existing commit. Check and change the local values if you prefer. Dependencies and generated output are not tracked; `npm ci` and the build commands regenerate them.

When you choose a remote and have independently checked rights, create an empty repository and add its actual URL yourself. A private repository helps limit exposure but is not itself permission to reproduce protected material. Do **not** publish the corpus, search index, website or app publicly before the necessary rights review. See [rights-review.md](rights-review.md) and [publishing.md](publishing.md).

`npm run check:repository` flags common tracked build outputs, search indexes, reports, databases and archives. It checks tracked/staged files, not ignored temporary files, and cannot identify every kind of duplication. Intentional repeated prayer occurrences and audit/provenance references are data, not redundant build artifacts.
