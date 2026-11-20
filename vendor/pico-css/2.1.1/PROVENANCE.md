# pico-css 2.1.1 — vendored provenance

| Field | Value |
| --- | --- |
| Admitted record | `ui-assets/records/pico-css.md` (`software-ui:pico-css`) |
| Upstream | https://picocss.com/ · https://github.com/picocss/pico |
| Registry | https://registry.npmjs.org/%40picocss%2Fpico/2.1.1 |
| Package / version | `@picocss/pico` 2.1.1 (exact pin from the record) |
| Acquisition | `npm pack @picocss/pico@2.1.1 --ignore-scripts` (record `acquisition.commands`, verbatim) |
| Tarball SRI | `sha512-kIDugA7Ps4U+2BHxiNHmvgPIQDWPDU4IeU6TNRdvXQM1uZX+FibqDQT2xUOnnO2yq/LUHcwnGlu1hvf4KfXnMg==` |
| SRI source | equals `source.integrity` **and** `acquisition.integrity` in the admitted record |
| Vendored on | 2026-08-16 |
| License | MIT — `LICENSE.md` beside this file, copied verbatim from `package/LICENSE.md` |

## Files

| Path | Tarball member | SHA-256 |
| --- | --- | --- |
| `pico.min.css` | `package/css/pico.min.css` | `fbc9a63fc9fc9f72d12fd7fc9806e11fa9f77ae4f9cad146b27003a1119ba3db` |
| `LICENSE.md` | `package/LICENSE.md` | `afaff063e044233f917b7807dccab022f09dca474f92b642846bee4850655bbf` |

## Role

Shell layer of the `static-derived-doc` blueprint. `ui-assets/catalog.html`
inlines `pico.min.css` at render time, so the delivered page has zero external
stylesheet references. `pico.min.css` (not `pico.classless.min.css`) is the
vendored variant: the catalog surface uses Pico's `container` and `grid`
utilities alongside element selectors, which the classless build omits.

The minified file retains its upstream banner
(`Pico CSS ✨ v2.1.1 … Copyright 2019-2025 - Licensed under MIT`), so the MIT
notice travels with the inlined bytes as well as with `LICENSE.md`.

## Record obligations carried here

- `integration.constraints`: "Choose Pico instead of another global CSS
  framework." The catalog surface loads no other global CSS framework.
- `integration.constraints`: default-branch activity is older than 12 months;
  re-review by **2027-01-23** before new selection. That obligation belongs to
  the record and is restated here only as a pointer, not as a new claim.
