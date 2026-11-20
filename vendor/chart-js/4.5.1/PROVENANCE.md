# chart-js 4.5.1 — vendored provenance

| Field | Value |
| --- | --- |
| Admitted record | `ui-assets/records/chart-js.md` (`software-ui:chart-js`) |
| Upstream | https://www.chartjs.org/ · https://github.com/chartjs/Chart.js |
| Registry | https://registry.npmjs.org/chart.js/4.5.1 |
| Package / version | `chart.js` 4.5.1 (exact pin from the record) |
| Acquisition | `npm pack chart.js@4.5.1 --ignore-scripts` (record `acquisition.commands`, verbatim) |
| Tarball SRI | `sha512-GIjfiT9dbmHRiYi6Nl2yFCq7kkwdkp1W/lp2J99rX0yo9tgJGn3lKQATztIjb5tVtevcBtIdICNWqlq5+E8/Pw==` |
| SRI source | equals `source.integrity` **and** `acquisition.integrity` in the admitted record |
| Vendored on | 2026-08-16 |
| License | MIT — `LICENSE.md` beside this file, copied verbatim from `package/LICENSE.md` |

## Files

| Path | Tarball member | SHA-256 |
| --- | --- | --- |
| `chart.umd.js` | `package/dist/chart.umd.js` | `ecc3cd1eeb8c34d2178e3f59fd63ec5a3d84358c11730af0b9958dc886d7652a` |
| `LICENSE.md` | `package/LICENSE.md` | `41a84aa2caba645f966a18d9c2056b73e6d3a81d80bc0046bc0011a2634d4cce` |

## Role

Chart layer of the `static-derived-doc` blueprint. `ui-assets/catalog.html`
inlines `chart.umd.js` at render time. The UMD build is the vendored variant
because the page is a single file with no module graph and no bundler; it
registers all controllers, scales, and the tooltip/legend plugins on load, so
no separate registration bundle is needed.

The minified file retains its upstream banner
(`Chart.js v4.5.1 … (c) 2025 Chart.js Contributors … Released under the MIT
License`), so the MIT notice travels with the inlined bytes as well as with
`LICENSE.md`.

## Record and blueprint obligations carried here

- `integration.constraints`: "Use for standard chart types; do not add a second
  general chart framework to the same surface." The catalog surface draws only
  bar and doughnut charts and loads no other chart framework.
- Blueprint `static-derived-doc` fixture discipline: every value the charts draw
  is derived at render time from the repository's own admitted records — the
  page performs no fetch, and the datasets are serialized into the document.
