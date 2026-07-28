# AGENTS.md

Always write a detailed plan before making any code changes. Do not edit code until I say 'APPROVED'.

When writting unit tests, nothing should be mocked apart from fetch calls, except when mentionned what to mock.

Name primitive constants in capitals — `WATCH_TAG`, `SHORT_HEIGHT` — including the ones local to
a test body. Values computed from them stay camelCase, as do arrays and objects.

## UI tests

Run `npm run test:ui` with the sandbox disabled. Sandboxed runs fail deterministically, not
flakily: the suite needs `https://localhost:3007` and loopback cannot be granted individually,
and WebKit aborts at launch (`Abort trap: 6`) without the Mach IPC the seatbelt profile denies.
`npm run test:node` is unaffected, having no browser and no network.

The suite runs against the built components in `layouts/`, not against `src/`. After changing a
component, rebuild and confirm the built bundle carries the change *before* running any test: a
green run against a stale build proves nothing, and checking afterwards only tells you the run
was wasted. One component needs just
`NODE_ENV=test npm run build:component -- name=<layout>/<component>` (for instance
`name=watch/detailed_view`, which builds `hdl_watch_detailed_view`); `npm run setup:test:ui`
rebuilds everything and is only needed when the shared code or several components changed.

The flavour of a build is told by `grep -c "localhost:3007" layouts/<layout>/<component>/index.js`,
where 0 means a production one, which invalidates any run and any golden it writes. It only drifts
when someone rebuilds, so checking it once a day is enough — no need to check before every run.
When a check and a run go in the same command, join them with `&&` rather than `;`, so a wrong
build stops the run instead of merely annotating a wasted one.

Implement one `test.fixme` at a time, replacing it and removing its description comment.
Validate with two scoped runs, `npm run test:ui -- <suite dir> -g "<test name>" 2>&1`: the first
writes the new goldens, the second compares them. Review every new golden in between.

Prefer a screenshot over fine grained assertions when the behaviour under test is rendered —
button counts, placeholder text, active or locked styling — and keep functional assertions for
what a capture cannot prove. Reuse an existing golden when a new state should render
identically: it turns "these two paths agree" into a checked claim.
