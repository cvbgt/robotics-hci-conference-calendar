# open-color 1.9.1 — vendored provenance

| Field | Value |
| --- | --- |
| Admitted record | `ui-assets/records/open-color.md` (`software-ui:open-color`) |
| Upstream | https://yeun.github.io/open-color/ · https://github.com/yeun/open-color |
| Registry | https://registry.npmjs.org/open-color/1.9.1 |
| Package / version | `open-color` 1.9.1 (exact pin from the record) |
| Acquisition | `npm pack open-color@1.9.1 --ignore-scripts` (record `acquisition.commands`, verbatim) |
| Tarball SRI | `sha512-vCseG/EQ6/RcvxhUcGJiHViOgrtz4x0XbZepXvKik66TMGkvbmjeJrKFyBEx6daG5rNyyd14zYXhz0hZVwQFOw==` |
| SRI source | equals `source.integrity` **and** `acquisition.integrity` in the admitted record |
| Vendored on | 2026-08-17 |
| License | MIT — `LICENSE` beside this file, copied verbatim from `package/LICENSE` |

## Files

| Path | Tarball member | SHA-256 |
| --- | --- | --- |
| `open-color.css` | `package/open-color.css` | `7ea49aec2547e5b7ae21ec7600c1eebb2bd196354e328d771b041eeeeac987e1` |
| `LICENSE` | `package/LICENSE` | `62f1f7f590dd772b61fe8e07eff8c52de11d545f3ba079bc25b38a82a6ea4bae` |

## Role

Palette layer of the `static-derived-doc` blueprint as applied by
`ui-assets/catalog.html`. The renderer parses the needed `--oc-*` custom
properties out of these vendored bytes at render time and emits only the
resolved token values into the page — the full stylesheet is not shipped, and
a drifted vendored file fails the render before a color reaches the document.

## Record obligations carried here

- The record flags upstream dormancy as a stability trait for a static value
  set; the pin is the palette's identity and no live-upstream claim is made.
- `integration.constraints`: the npm artifact ships css/scss/less/js/json
  formats only; this surface consumes the css custom-property format.
