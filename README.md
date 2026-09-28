# NSS Selection Result Page

A private, animated result page for **NSS Unit 01, School of Engineering, CUSAT**.
A student types their name and code and gets an ID card that fills in stage by stage,
ending in a "Selected" celebration (or a gentler "Not selected" card).

It is one static file (`index.html`). No server, no database, no dependencies.

## How the privacy works

Student results are **never stored as readable text** in the page. Each result is
encrypted (AES-GCM, key from PBKDF2 with 200,000 rounds) using the student's own
name and code. Only the right name and code can unlock the right card, and every
wrong attempt gets the same message.

This keeps casual snoops out (view-source shows only scrambled data). It is not
bank-grade: codes are short, so someone who knows names and runs a guessing script
could still get in. For that level of protection you would need a real server.

## Folder layout

```
index.html                  the built page: this is what you publish
config.json                 stage names and maximum marks
src/template.html           the page design (edit this to change the look or wording)
build/build.mjs             encrypts data/students.csv and writes index.html
build/lib.mjs               CSV reading and checking
test/test.mjs               checks the built page
data/students.example.csv   sample format with made-up students
data/students.csv           YOUR real data (git-ignored, never commit this)
```

## Update the results

1. Copy `data/students.example.csv` to `data/students.csv` and fill it in, one student per row:

   | column | meaning |
   |---|---|
   | `name` | student's name as registered |
   | `code` | unique code (letters and digits) |
   | `department` | shown on the card |
   | `stage1` to `stage5` | marks in the order of `config.json`. Write `absent` if they missed it, or leave empty if it is not finished yet |
   | `result` | `selected` or `not selected` |

2. Build and test (needs [Node.js](https://nodejs.org) 20 or newer):

   ```bash
   npm run build
   npm test
   ```

3. Commit `index.html` and push. `data/students.csv` stays on your computer.

Logins are forgiving: a student can type any one word of their name (3+ letters),
or the whole name, in any capitalisation, plus their code.

## Change stage names or maximum marks

Edit `config.json`. If you change the number of stages, also add or remove the
matching `stageN` columns in your CSV and adjust the radar in `src/template.html`
(it draws one corner per stage).

## Publish

**GitHub Pages:** push to GitHub, open **Settings, Pages**, choose branch `main`
and folder `/ (root)`. Your page appears at `https://<username>.github.io/<repo>/`.
On a free account the repository must be public. That is fine, because the
published data is encrypted, but never commit `data/students.csv`.

**Netlify Drop:** open app.netlify.com/drop and drag `index.html` in.

## Before you push

Run `git status` and check that `data/students.csv` is **not** listed. If real data
was ever committed, it stays in the Git history even after you delete the file.
In that case create a fresh repository instead.
