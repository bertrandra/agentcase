# Release tags

The repository has released v19.0.0 to v20.12.0 without annotated tags on GitHub (`git ls-remote --tags origin` lists none; a lightweight local
`v19.0.0` may exist in some clones and points at the same commit as below). This page lists, for every released version, the commit on `main`
that **first** carries that version in `app/package.json` (the release merge), so the owner can tag the history once. Nothing here is run
automatically: no tag is created or pushed by the tooling.

How the list was derived (re-run it to check):

```bash
git log --first-parent --diff-merges=first-parent -p --format='==%h %H %ad %s' --date=short origin/main -- app/package.json \
  | grep -E '^==|^\+  "version"'
```

Each `+ "version": "X.Y.Z"` line names the merge commit just above it; the CHANGELOG heading `## [vX.Y.Z]` and the pull-request title
(`vX.Y.Z: …`, or the second parent's subject `Release X.Y.Z: …` for the early merges) confirm it. Commits merged after a release and before the
next one (for example #63–#66 between v20.11.0 and v20.12.0) belong to the next release, so the tag is the commit that changed the version.

| Version | Date | Merge commit on `main` | Pull request / release commit |
|---|---|---|---|
| v19.0.0 | 2026-10-21 | `015f79243e296eed08d83ee25f01af81ab5fa7f2` | #18 (cut-over of the TypeScript + React build; `19.0.0-dev` → `19.0.0`) |
| v20.0.0 | 2026-10-22 | `7ae084e3808f1dab30d28cd8fa19b277ed831bd5` | #41, "Release v20.0.0: multi-product portfolio, waves, consolidation, portfolio stress" |
| v20.1.0 | 2026-10-22 | `9da27341194b58e3edc9158da17df798d79b17fd` | #48, "Release 20.1.0: version stamps, changelog, docs, version-dependent tests" |
| v20.2.0 | 2026-10-22 | `353e472928c0f818b9ca0b873e46977a42fb7de8` | #49, "Release 20.2.0: Cost model (monthly) Excel export" |
| v20.3.0 | 2026-10-22 | `330d298449fac250922787029d5ede6939a0ec2d` | #50, "Release 20.3.0: Architecture sections rewritten" |
| v20.4.0 | 2026-10-22 | `fbba5bc45795c6d221958fc4117848ea9cfafc03` | #52, "v20.4.0: calculation zones, generated dependency graph, affected-test selection" |
| v20.5.0 | 2026-10-23 | `064e4f3e032296b3b81ebf8e5b3335c8d353d65a` | #53, "v20.5.0: menu structures, legacy Section assignment tab, Business journey persona" |
| v20.6.0 | 2026-10-23 | `0fe8f589fac7db49c5e439ad701a0f539864528c` | #55, "v20.6.0: theme tokens (T1 of the configurable theme)" |
| v20.7.0 | 2026-10-23 | `ca275b9e4ba60062244fb1008c0207d434ca1890` | #56, "v20.7.0: theme axes and control variants (T3)" |
| v20.8.0 | 2026-10-23 | `2a0632450b2cef812f0959280d634d8c8fd82918` | #57, "v20.8.0: display modes (T2)" |
| v20.9.0 | 2026-10-23 | `86861ced0909cbdc0432b88052f13434aed9d05f` | #58, "v20.9.0: Brand & theme screen, theme library, client logo (T4 + T5)" |
| v20.10.0 | 2026-10-24 | `4ffa821c6a0d1840fe55b0155714746c3ce064a7` | #60, "v20.10.0: one-colour palette generator with a contrast slider" |
| v20.11.0 | 2026-10-24 | `4ad7f5bc3407199aa30d175a5ad5717967659489` | #62, "v20.11.0: portfolio "Edit:" dropdown with in-place editing" |
| v20.12.0 | 2026-10-24 | `dbb8c6caa917657973c3ff478cc1dba5172e5d3f` | #67, "v20.12.0: "Show" / "Change" top bar" |

## Commands for the owner

Run from a clone with push rights, on an up-to-date `main` (`git fetch origin`). If a local lightweight `v19.0.0` exists, delete it first
(`git tag -d v19.0.0`) so that the annotated tag below replaces it.

```bash
git tag -a v19.0.0 015f79243e296eed08d83ee25f01af81ab5fa7f2 -m "AgentCase v19.0.0: TypeScript + React build"
git tag -a v20.0.0 7ae084e3808f1dab30d28cd8fa19b277ed831bd5 -m "AgentCase v20.0.0: multi-product portfolio, waves and consolidation"
git tag -a v20.1.0 9da27341194b58e3edc9158da17df798d79b17fd -m "AgentCase v20.1.0: View selector and aggregated view of every section"
git tag -a v20.2.0 353e472928c0f818b9ca0b873e46977a42fb7de8 -m "AgentCase v20.2.0: cost model (monthly) Excel export"
git tag -a v20.3.0 330d298449fac250922787029d5ede6939a0ec2d -m "AgentCase v20.3.0: architecture sections rewritten"
git tag -a v20.4.0 fbba5bc45795c6d221958fc4117848ea9cfafc03 -m "AgentCase v20.4.0: calculation zones, generated dependency graph, affected-test selection"
git tag -a v20.5.0 064e4f3e032296b3b81ebf8e5b3335c8d353d65a -m "AgentCase v20.5.0: menu structures, Business journey persona"
git tag -a v20.6.0 0fe8f589fac7db49c5e439ad701a0f539864528c -m "AgentCase v20.6.0: theme tokens (T1)"
git tag -a v20.7.0 ca275b9e4ba60062244fb1008c0207d434ca1890 -m "AgentCase v20.7.0: theme axes and control variants (T3)"
git tag -a v20.8.0 2a0632450b2cef812f0959280d634d8c8fd82918 -m "AgentCase v20.8.0: display modes (T2)"
git tag -a v20.9.0 86861ced0909cbdc0432b88052f13434aed9d05f -m "AgentCase v20.9.0: Brand & theme screen, theme library, client logo"
git tag -a v20.10.0 4ffa821c6a0d1840fe55b0155714746c3ce064a7 -m "AgentCase v20.10.0: one-colour palette generator"
git tag -a v20.11.0 4ad7f5bc3407199aa30d175a5ad5717967659489 -m "AgentCase v20.11.0: portfolio Edit dropdown with in-place editing"
git tag -a v20.12.0 dbb8c6caa917657973c3ff478cc1dba5172e5d3f -m "AgentCase v20.12.0: Show / Change top bar, file menu, two-zone header"
git push origin --tags
```

Check before pushing: `git tag -n1 --sort=v:refname 'v19*' 'v20*'` lists 14 tags, and `git show -s --format=%s vX.Y.Z` prints the subject of the
table above. From now on, tag each release merge as part of the release (docs/BUMP_PROCEDURE.md §5).
