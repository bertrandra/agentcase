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

The test `app/tests/bpmn/samples.test.ts` recomputes these hashes from this table on every run.

Licence: the OMG publishes these machine-readable files with the specification, for its implementation; see the copyright notice of
the specification document.
