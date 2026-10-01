# Contributing

- Do not commit real credentials, customer data, or anything private about Fountain's business.
  This repository is public. Use test-mode credentials in recordings.
- Keep generated output (`node_modules/`, `test-results/`, `playwright-report/`) out of the
  repository.
- Editing only the words? See [docs/EDITING-COPY.md](docs/EDITING-COPY.md). The checks below
  still run on your change, and `node scripts/validate-content.js` catches most copy mistakes.

## Build and test

The tour is static HTML, CSS and JavaScript; there's nothing to build. Node 22 or newer runs the
checks and unit tests, and Python 3 serves the page for the browser tests.

```sh
npm install                 # once, for the browser tests
npm test                    # unit tests
npx playwright test         # browser tests, at desktop and phone size
npm run check               # every check CI runs except the browser tests
```

Pull requests and pushes to `main` run the same checks in CI: banned patterns, the test count
ratchet, content validation, the unit tests with the coverage ratchet, and the browser tests in
Chromium at desktop and phone size.

## Banned patterns

`./scripts/check-banned-patterns.sh` fails if the page's code (`app.js`, `markdown.js`) contains
leftover debug output, a `debugger` statement, `eval(`, or a `TODO`/`FIXME` comment, or if any
tracked file contains a string shaped like a real credential. These hold at zero on `main`, with
no baseline file: there's no legitimate reason for any of them to appear.

## Content validation

`node scripts/validate-content.js` checks that every chapter in `content/tour.json` exists and has
a title, a Story and a Takeaway, and that every recording is valid JSON whose events are in time
order with known kinds and states.

## Test coverage

Line coverage only moves up. CI measures it over the source files the unit tests load and fails
when it drops more than 0.25 points below the floor in
[coverage-baseline.txt](coverage-baseline.txt), so a change that adds untested logic has to account
for it rather than quietly diluting the suite. `app.js` is excluded: it's the page's DOM wiring,
exercised by the browser tests, which never reach this profile.

```sh
node scripts/check-coverage.js
```

Don't run `--update` and commit the result yourself. A `coverage-ratchet` GitHub Actions job
re-measures on every push to `main` and commits the raised baseline itself, so two pull requests
never both edit the same line. Lowering the baseline is allowed but never incidental: do it in its
own commit with `node scripts/check-coverage.js --update` and say why.

## Test count

The unit and browser test counts only move up too: CI fails if either drops below the floor in
[test-count-baseline.txt](test-count-baseline.txt). This catches a test quietly deleted, skipped or
commented out even when coverage barely moves.

```sh
node scripts/check-test-count.js
```

The check counts top-level `test(` calls statically, so write each test as its own `test(...)`
rather than generating tests in a loop. As with coverage, a `test-count-ratchet` job raises the
baseline on `main`; lowering it is allowed but never incidental: do it in its own commit with
`node scripts/check-test-count.js --update` and say why.

## Pull requests

Keep each pull request focused. Explain what changes for someone watching the tour, which claims
you checked and where, and what you tested.
