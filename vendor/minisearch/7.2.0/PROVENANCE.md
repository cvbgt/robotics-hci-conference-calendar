# minisearch 7.2.0 — vendored provenance

| Field | Value |
| --- | --- |
| Admitted record | `ui-assets/records/minisearch.md` (`software-ui:minisearch`) |
| Upstream | https://lucaong.github.io/minisearch/ · https://github.com/lucaong/minisearch |
| Registry | https://registry.npmjs.org/minisearch/7.2.0 |
| Package / version | `minisearch` 7.2.0 (exact pin from the record) |
| Acquisition | `npm pack minisearch@7.2.0 --ignore-scripts` (record `acquisition.commands`, verbatim) |
| Tarball SRI | `sha512-dqT2XBYUOZOiC5t2HRnwADjhNS2cecp9u+TJRiJ1Qp/f5qjkeT5APcGPjHw+bz89Ms8Jp+cG4AlE+QZ/QnDglg==` |
| SRI source | equals `source.integrity` **and** `acquisition.integrity` in the admitted record |
| Vendored on | 2026-08-17 |
| License | MIT — `LICENSE.txt` beside this file, copied verbatim from `package/LICENSE.txt` |

## Files

| Path | Tarball member | SHA-256 |
| --- | --- | --- |
| `index.js` | `package/dist/es/index.js` | `0393b3ba253b809d5e55707c7b0875ef9b518a296a006c6739b28876e154edb3` |
| `LICENSE.txt` | `package/LICENSE.txt` | `70d37354d6395629fb99edb28cb37a5d356ffa24a48cd02a5def5b83a300a899` |

## Role

Search layer of the `static-derived-doc` blueprint as applied by
`ui-assets/catalog.html`. The ES module build is inlined as a module script at render time — the record's own constraint prefers dist/es over the UMD bundle for surfaces vendored under this fleet's discipline; the page
builds its index in the browser from the records serialized into the document
(98 records is milliseconds of indexing — the record's serialized-index
version caveat therefore does not bind this surface, since no baked index is
persisted across versions).

## Record obligations carried here

- `integration.constraints`: default tokenization is space/punctuation-based;
  this surface's corpus is asset metadata (ids, names, license ids, English
  descriptor strings), which that tokenizer handles. The record's Korean
  morpheme caveat binds surfaces indexing Hangul prose, not this one — noted
  here so the caveat is consciously scoped, not skipped.
- Index lives in page memory only; nothing is persisted.
