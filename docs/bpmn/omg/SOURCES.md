# Official OMG schemas (BPMN 2.0.2 + BPMN DI)

These files are the machine-readable schemas of **BPMN 2.0.2** (formal/13-12-09), downloaded unchanged from the OMG site on 2026-10-30.
The OMG page of the specification (https://www.omg.org/spec/BPMN/2.0.2/About-BPMN/) links these exact URLs: BPMN 2.0.2 kept the
schema files of BPMN 2.0 (namespaces `http://www.omg.org/spec/BPMN/20100524/MODEL` and `http://www.omg.org/spec/BPMN/20100524/DI`).

They are kept byte-for-byte (CRLF line ends, the BOM of `DI.xsd`); the root `.gitattributes` marks them `-text` so git never rewrites
them. Never edit them: the AgentCase extension lives in [`../agentcase-bpmn-1.0.xsd`](../agentcase-bpmn-1.0.xsd), and the validation
entry point is [`../agentcase-bpmn-validate.xsd`](../agentcase-bpmn-validate.xsd) (used by `tools/bpmn-validate.mjs`).

| File | Source URL | SHA-256 |
|---|---|---|
| `BPMN20.xsd` | https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd | `a07c159cb0594573dd7c97b1370dd116112378f377e43c89a8bf512ac5030705` |
| `Semantic.xsd` | https://www.omg.org/spec/BPMN/20100501/Semantic.xsd | `c4318842f7d2bbc262d7954c9452c501db16f0868eac0b8732ec5d7fb384d9a7` |
| `BPMNDI.xsd` | https://www.omg.org/spec/BPMN/20100501/BPMNDI.xsd | `f0dff1cd559d1514d8ebfc8c646f58402bcaced27ec22e2aa6456c2dcc80b038` |
| `DC.xsd` | https://www.omg.org/spec/BPMN/20100501/DC.xsd | `a2f90e5ad9bb48c6915e4e034b4e27ac838264a1d4f27bfc70dbdfc69351312d` |
| `DI.xsd` | https://www.omg.org/spec/BPMN/20100501/DI.xsd | `8220b179c175572df74e08a51bffabe957867962035cee7b5fee0b6acb4c4498` |

## BPSim 2.0 (WfMC)

The Business Process Simulation specification **BPSim 2.0** (WfMC-BPSWG-2016-01, namespace `http://www.bpsim.org/schemas/2.0`) is not an
OMG standard; its schema sits here with the other standard schemas, under the same rule (unchanged, never edited). It was downloaded on
2026-10-30 from the link of the BPSim home page (https://www.bpsim.org/). `../agentcase-bpmn-validate.xsd` imports it, so the
`bpsim:BPSimData` scenario an AgentCase export writes (spec § 5.4, decision D-B5) is validated strictly.

| File | Source URL | SHA-256 |
|---|---|---|
| `BPSim-2.0.xsd` | https://www.bpsim.org/schemas/2.0/BPSim-2.0.xsd | `35999c20096c2cba9e6012d8cbb1b37d2deaac152d8da2ea4f95eb5a990ffcd2` |

The test `app/tests/bpmn/samples.test.ts` recomputes these hashes from these tables on every run.

## DMN 1.3 and CMMN 1.1 (phase B7b)

The machine-readable schemas of **DMN 1.3** (formal/21-01-01, namespace `https://www.omg.org/spec/DMN/20191111/MODEL/`) and **CMMN 1.1**
(formal/16-12-01, namespace `http://www.omg.org/spec/CMMN/20151109/MODEL`), downloaded unchanged from the OMG site on 2026-10-30, the URLs the
OMG pages of the specifications link (https://www.omg.org/spec/DMN/1.3/About-DMN/, https://www.omg.org/spec/CMMN/1.1/About-CMMN/). DMN 1.3 keeps the
DC / DI schemas of DMN 1.2 (namespaces `http://www.omg.org/spec/DMN/20180521/DC/` and `…/DI/`). Each standard sits in its own folder, because both
ship files named `DC.xsd` and `DI.xsd` (other namespaces than the BPMN ones above). Same rule: unchanged, never edited (CRLF line ends kept).
`../agentcase-bpmn-validate.xsd` imports DMN13.xsd (the decisions a BPMN process embeds, spec F-B62); `../agentcase-dmn-validate.xsd` and
`../agentcase-cmmn-validate.xsd` are the entry points of a `.dmn` and a `.cmmn` file (F-B62, F-B63). The test `app/tests/bpmn/omg-dmn-cmmn.test.ts`
recomputes these hashes.

| File | Source URL | SHA-256 |
|---|---|---|
| `dmn13/DMN13.xsd` | https://www.omg.org/spec/DMN/20191111/DMN13.xsd | `9d303f7a2146b98c00a3a53a5dce5364bfe4a22b1b1938933a5be4a2d1945834` |
| `dmn13/DMNDI13.xsd` | https://www.omg.org/spec/DMN/20191111/DMNDI13.xsd | `fa65df22ef7ea6f98379e7c60dd874d8118c50d1cccaab1f0e1f0a1a5d36cc46` |
| `dmn13/DC.xsd` | https://www.omg.org/spec/DMN/20180521/DC.xsd | `9f57b8e99b00163a65dfaf5de2a3e3ea4be041a1bb23228044c50693334d59e6` |
| `dmn13/DI.xsd` | https://www.omg.org/spec/DMN/20180521/DI.xsd | `73a5908426f12021da85c9cce74ae70db5ddac1ebe9c9d28d8495f34bea60f07` |
| `cmmn11/CMMN11.xsd` | https://www.omg.org/spec/CMMN/20151109/CMMN11.xsd | `90081878aaaf8efcf9cc69245d9455d90555b68f9155ae92fab3547a8170982f` |
| `cmmn11/CMMN11CaseModel.xsd` | https://www.omg.org/spec/CMMN/20151109/CMMN11CaseModel.xsd | `78d4444e4cc01736012d8c6372f7cec17c307ebcc203ece0023aebee07f334fc` |
| `cmmn11/CMMNDI11.xsd` | https://www.omg.org/spec/CMMN/20151109/CMMNDI11.xsd | `4fd610bbd91d90273d73cde100d62687c8a6b62c818370c3ee5961a78efe252b` |
| `cmmn11/DC.xsd` | https://www.omg.org/spec/CMMN/20151109/DC.xsd | `2351f2fe3a3a4e2a30e2f8368666f933316746f64f3a987513ab1bbf5d53f600` |
| `cmmn11/DI.xsd` | https://www.omg.org/spec/CMMN/20151109/DI.xsd | `d189d3f8566129d0b6cfb9437068331f7f9cec4a9b7843506c1e0ebb87ffff79` |

Licence: the OMG publishes these machine-readable files with the specification, for its implementation; see the copyright notice of
the specification document.
