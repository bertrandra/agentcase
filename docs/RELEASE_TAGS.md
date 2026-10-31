# Release tags

The repository has released v19.0.0 to v20.34.0 without annotated tags on GitHub (`git ls-remote --tags origin` lists none; a lightweight local
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
| v20.13.0 | 2026-10-24 | `c216227ec671ea7b373f6e6c6bfadf754cdb0829` | #69 (squash merge; #68 "Architecture lot 0: CI green and stable" merged before it), "v20.13.0: architecture lots 2 and 3 (single version source, doc facts, state model hardening)" |
| v20.14.0 | 2026-10-24 | `1985a924c75b3f9d0ec39e1eb904cde4bab85a81` | #70, "v20.14.0: architecture lots 1 and 4 (robustness, cash-flow kernel, acyclic zone graph)" |
| v20.15.0 | 2026-10-25 | `c33774b594d2daee03f9dedf1c1e98abb3677220` | #72 (#71 "Architecture lot 6: every quality gate in CI, nightly workflow, npm run gates" merged before it), "v20.15.0: architecture lot 5a (theme out of the domain, no remount, selector hooks, compressed ExcelJS)" |
| v20.16.0 | 2026-10-25 | `f885145f5b9e8ba6c2cc3f45c8ae3d16268fd28b` | #73, "v20.16.0 — Architecture lot 5b: inline styles to CSS classes, max-len 0" |
| v20.17.0 | 2026-10-25 | `93363cdb65062016b3d2cffd2db4e31920046bff` | #74, "v20.17.0 — Architecture lot 7: the functional gaps (decision D6)" |
| v20.18.0 | 2026-10-25 | `1bf27e34c8d91e8fdf5349428dd9b174f796e3c4` | #75, "v20.18.0 — Architecture lot 8: clean toolchain audit, Node 24 CI actions, last portfolio gaps" |
| v20.18.1 | 2026-10-25 | `801c859576e1ac8e8b350b669107d88d2ca1b01c` | #76, "v20.18.1 — Architecture lot 9: tidy-up (no app change)" |
| v20.19.0 | 2026-10-26 | `cad3b0a7a51b51b4ee4b26a7747d2dafdae3f292` | #77, "v20.19.0 — Architecture lot 10: audit fixes, one source of truth, live Data Model, real 160-char limit" |
| v20.20.0 | 2026-10-30 | `57a5f2f853e62a3bc2d535195fdec65a652b9233` | #79 (#78, the BPMN specification, merged before it), "v20.20.0 — BPMN B0 + B1: XSD, validator, samples; domain/process and the default BPMN process" |
| v20.21.0 | 2026-10-30 | `7e03dbe720105a3884b6ef4e747a34a616ddd2fd` | #80, "v20.21.0 — BPMN B2: reader / writer, security, byte-identical round trip, BPSim, Export process (BPMN)" |
| v20.22.0 | 2026-10-30 | `6194160d82ec3f6c927717b45218a7f57f778cec` | #81, "BPMN B3 — schema v3: the case stores its process as one native BPMN document (v20.22.0)" |
| v20.23.0 | 2026-10-30 | `276f3fa4eae4bea4856899d8505dd41dda88ea59` | #82, "BPMN B6b — organisation model, RACI, Organisation and Who-does-what sections (v20.23.0)" |
| v20.24.0 | 2026-10-30 | `e38745e07c6fd979c17ed3ed18d4a715fc0effc6` | #83, "BPMN B4 + B5 — Process section, BPMN import, the engine reads the process model (v20.24.0)" |
| v20.25.0 | 2026-10-30 | `d7eed216e23e3d8c6c5b277b1e5daedfb0af250c` | #84, "BPMN B6 — optional BPMN editor (bpmn-js, lazy, offline) (v20.25.0)" |
| v20.26.0 | 2026-10-30 | `c6e4a5bc013306453cf1fb109e9f622e9ed83103` | #85, "BPMN B5b — extended profile: data, events, volumes, rules, library, interfaces, diagrams (v20.26.0)" |
| v20.27.0 | 2026-10-30 | `a0d942e29f64ead3e1f3f453ff6ca3df9b96c4c5` | #86, "BPMN B7 — audit layer: tool catalogue, observations, explicit calibration (v20.27.0)" |
| v20.28.0 | 2026-10-31 | `3e523366b04a373505069c6ea3200018eb2d3e99` | #87, "BPMN B7b — DMN decisions and the CMMN run view (v20.28.0)" |
| v20.29.0 | 2026-10-31 | `34cdd5cbffdae35a51e542eaa9d04d05e69175cd` | #88, "BPMN B7 follow-up — audit evidence in the ledger (D-B33); spec for agent-rollout activities (v20.29.0)" |
| v20.30.0 | 2026-10-31 | `75468dd8b0330050406923048debb35de5f3ee62` | #89, "BPMN B9a — transformation programme process, one timing owner, swim lanes, context screens (v20.30.0)" |
| v20.31.0 | 2026-10-31 | `2d1104d4dfd5c6f9eb3e3a8479da4e1d06fd1646` | #90, "BPMN B9b — programme decisions applied: one timing, labour from resources, coaching days, opt-in activities (v20.31.0)" |
| v20.32.0 | 2026-10-31 | `e777bbb8946aa3a1e4032569c9e3f9c4b4253c9f` | #91, "BPMN B9e — the 📋 Programme screen (v20.32.0)" |
| v20.33.0 | 2026-10-31 | `796021880bbbd970d6ac45497e33091107cf0af7` | #92, "BPMN B9d — 📅 Plan screen: programme Gantt, WBS, OBS / RAM, resource histogram, MS Project XML (v20.33.0)" |
| v20.34.0 | 2026-10-31 | `2f7354630ee35d33c34cae4e20da00a2ea21a01b` | #93, "BPMN B9c — the programme's stored values in the case's BPMN document, schema v4 (v20.34.0)" |
| v21.0.0 | to be filled after the merge | to be filled after the merge | BPMN B8, release of the BPMN migration (major: file schema v4, the process stored natively in BPMN, the figure changes of B9b). **Note:** fill this row with the merge commit that first carries `"version": "21.0.0"` (the recipe above) once its pull request is merged, then add its tag command below |

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
git tag -a v20.13.0 c216227ec671ea7b373f6e6c6bfadf754cdb0829 -m "AgentCase v20.13.0: architecture lots 0, 2, 3"
git tag -a v20.14.0 1985a924c75b3f9d0ec39e1eb904cde4bab85a81 -m "AgentCase v20.14.0: architecture lots 1 and 4"
git tag -a v20.15.0 c33774b594d2daee03f9dedf1c1e98abb3677220 -m "AgentCase v20.15.0: architecture lots 5a and 6"
git tag -a v20.16.0 f885145f5b9e8ba6c2cc3f45c8ae3d16268fd28b -m "AgentCase v20.16.0: architecture lot 5b"
git tag -a v20.17.0 93363cdb65062016b3d2cffd2db4e31920046bff -m "AgentCase v20.17.0: architecture lot 7, portfolio gaps"
git tag -a v20.18.0 1bf27e34c8d91e8fdf5349428dd9b174f796e3c4 -m "AgentCase v20.18.0: architecture lot 8"
git tag -a v20.18.1 801c859576e1ac8e8b350b669107d88d2ca1b01c -m "AgentCase v20.18.1: architecture lot 9, tidy-up"
git tag -a v20.19.0 cad3b0a7a51b51b4ee4b26a7747d2dafdae3f292 -m "AgentCase v20.19.0: architecture lot 10, one source of truth"
git tag -a v20.20.0 57a5f2f853e62a3bc2d535195fdec65a652b9233 -m "AgentCase v20.20.0: BPMN B0 and B1"
git tag -a v20.21.0 7e03dbe720105a3884b6ef4e747a34a616ddd2fd -m "AgentCase v20.21.0: BPMN B2, reader / writer"
git tag -a v20.22.0 6194160d82ec3f6c927717b45218a7f57f778cec -m "AgentCase v20.22.0: BPMN B3, schema v3"
git tag -a v20.23.0 276f3fa4eae4bea4856899d8505dd41dda88ea59 -m "AgentCase v20.23.0: BPMN B6b, organisation model"
git tag -a v20.24.0 e38745e07c6fd979c17ed3ed18d4a715fc0effc6 -m "AgentCase v20.24.0: BPMN B4 and B5, Process section"
git tag -a v20.25.0 d7eed216e23e3d8c6c5b277b1e5daedfb0af250c -m "AgentCase v20.25.0: BPMN B6, diagram editor"
git tag -a v20.26.0 c6e4a5bc013306453cf1fb109e9f622e9ed83103 -m "AgentCase v20.26.0: BPMN B5b, extended profile"
git tag -a v20.27.0 a0d942e29f64ead3e1f3f453ff6ca3df9b96c4c5 -m "AgentCase v20.27.0: BPMN B7, audit layer"
git tag -a v20.28.0 3e523366b04a373505069c6ea3200018eb2d3e99 -m "AgentCase v20.28.0: BPMN B7b, DMN and CMMN"
git tag -a v20.29.0 34cdd5cbffdae35a51e542eaa9d04d05e69175cd -m "AgentCase v20.29.0: audit evidence in the ledger"
git tag -a v20.30.0 75468dd8b0330050406923048debb35de5f3ee62 -m "AgentCase v20.30.0: BPMN B9a, transformation programme"
git tag -a v20.31.0 2d1104d4dfd5c6f9eb3e3a8479da4e1d06fd1646 -m "AgentCase v20.31.0: BPMN B9b, programme decisions"
git tag -a v20.32.0 e777bbb8946aa3a1e4032569c9e3f9c4b4253c9f -m "AgentCase v20.32.0: BPMN B9e, Programme screen"
git tag -a v20.33.0 796021880bbbd970d6ac45497e33091107cf0af7 -m "AgentCase v20.33.0: BPMN B9d, Plan screen"
git tag -a v20.34.0 2f7354630ee35d33c34cae4e20da00a2ea21a01b -m "AgentCase v20.34.0: BPMN B9c, schema v4"
# v21.0.0, after its merge: git tag -a v21.0.0 <merge commit> -m "AgentCase v21.0.0: BPMN migration complete"
git push origin --tags
```

Check before pushing: `git tag -n1 --sort=v:refname 'v19*' 'v20*'` lists 37 tags (and `'v21*'` one more once v21.0.0 is tagged), and `git show -s --format=%s vX.Y.Z` prints the subject of the
table above. From now on, tag each release merge as part of the release (docs/BUMP_PROCEDURE.md §5).
