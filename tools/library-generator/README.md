# DA.live library generator & sync

Tooling to build and publish the **drag-and-drop block library** for the
storefront in [Document Authoring (DA)](https://da.live).

## Why this exists

DA's block library is **not** auto-generated from `component-definition.json`.
It reads sheets + example docs that must live on `content.da.live`. Two steps:

1. **`generate:library`** — derive the 11 editable content blocks and the
   templates from `component-definition.json`, producing:
   - `library/blocks.json` / `library/templates.json` (sheets)
   - `library/blocks/<id>.html` / `library/templates/<slug>.html` (example docs)
2. **`sync:da-library`** — upload those artefacts to DA through its Source API,
   placing them under `content.da.live/<org>/<site>/library/...` where DA reads
   them natively (avoids the `*.aem.live` CORS / 404 problem).

Editable blocks only: transactional `commerce-*`, global chrome
(`header`/`footer`/`modal`) and child items are excluded from the draggable
library.

## Usage

```bash
# 1. generate the artefacts (re-run after any component-definition.json change)
npm run generate:library

# 2. publish them to DA (requires a DA IMS token, see below)
DA_IMS_TOKEN=<token> npm run sync:da-library

# upload a subset (useful for a first smoke test)
DA_IMS_TOKEN=<token> npm run sync:da-library -- --blocks enrichment,hero

# verify the token can reach the DA Source API without writing anything
DA_IMS_TOKEN=<token> npm run sync:da-library -- --check
```

## Getting the `DA_IMS_TOKEN`

The DA Source API expects a **user bearer token** (`Authorization: Bearer …`),
not a service-account token. Obtain it from your browser session:

1. Sign in to `https://da.live` with an account that can write to
   `hiberus-magento/sports-emotion-storefront`.
2. Open DevTools → Application → Local Storage → `https://da.live`,
   find the IMS token (the `adobeIMS`-related entry) and copy its value.
3. Pass it as `DA_IMS_TOKEN` when running the sync script.

Do **not** commit the token. It is passed per-run via the environment.

## DA config (done once in the DA UI)

In `da.live/sheet#/hiberus-magento/sports-emotion-storefront/.da/config`, the
`library` sheet should have a single row per OOTB plugin, with the `title` equal
to the plugin name:

| title       | path |
|-------------|------|
| `Blocks`    | `https://content.da.live/hiberus-magento/sports-emotion-storefront/library/blocks.json` |
| `Templates` | `https://content.da.live/hiberus-magento/sports-emotion-storefront/library/templates.json` |
| `Icons`     | `https://content.da.live/hiberus-magento/sports-emotion-storefront/library/icons.json` (optional) |
| `Placeholders` | `https://content.da.live/hiberus-magento/sports-emotion-storefront/library/placeholders.json` (optional) |

Use the **`title`** as the plugin name (`Blocks`, `Templates`, …) — do not use
`library-blocks`-style titles, which DA treats as custom/iframe plugins. The
`path` must be the **absolute `content.da.live` URL of the sheet `.json`**
(not a relative path), matching DA's official library configuration.

## Block metadata (descriptions)

Each generated block document ends with a `library-metadata` table carrying a
`Description`. DA surfaces it as the **info icon** next to each block in the
library. The descriptions are keyed per block in `BLOCK_DESCRIPTIONS` in
`generate.mjs` (any block missing one falls back to a generic description).

## Contract notes (verified)

Source API: `POST https://admin.da.live/source/{org}/{repo}/{path}` +
`Authorization: Bearer <token>` + `multipart/form-data` field `data`
(`text/html` or `application/json`). `content.da.live` is the read/cache host
returned as `contentUrl`. See `docs.da.live/developers/api/source`.