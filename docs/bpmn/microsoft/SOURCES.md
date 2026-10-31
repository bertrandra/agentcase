# Microsoft Project XML Data Interchange schema (MSPDI)

The MS Project XML export of the transformation programme (docs/SPEC_BPMN.md § 19.8 F-B77, phase B9d) is validated against Microsoft's
schema of the Project XML Data Interchange format, **Microsoft Office Project 2007 XML Data Interchange Schema** (`mspdi_pj12.xsd`, revision
2007-11-28), downloaded unchanged on 2026-10-31 from the schema location Microsoft publishes (the namespace host
`schemas.microsoft.com`; the format is documented at
https://learn.microsoft.com/en-us/office-project/xml-data-interchange/project-xml-data-interchange-schema-reference). Later versions of
Project read and write the same format (they add optional elements); no later schema file is published at a stable Microsoft address.

The file is kept byte-for-byte (CRLF line ends, BOM): the root `.gitattributes` marks it `-text`. Never edit it. Copyright: (c) 2007 Microsoft
Corporation, as stated in the file; it is kept here only to validate the export (no part of it is shipped in the application).

| File | Source URL | SHA-256 |
|---|---|---|
| `mspdi_pj12.xsd` | https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd | `a3e9138f0f02df06d7b1254be6190c2dd48fdcf6a2445ab79a6abab765a8c7b4` |

Namespace: the schema's target namespace is `http://schemas.microsoft.com/project/2007`; Project writes and reads its XML files in
`http://schemas.microsoft.com/project`, the namespace the export uses. The test `app/tests/domain/programme/mspdi.test.ts` recomputes the hash
above, maps the export's namespace to the schema's target namespace (nothing else changes) and validates it with
`xmllint --noout --nonet --schema` (skipped locally without xmllint, always run in CI, like the OMG schemas).
