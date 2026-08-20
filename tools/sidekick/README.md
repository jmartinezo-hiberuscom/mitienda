# Sidekick Library

This folder configures the AEM Sidekick Library so authors can copy content recipes
into their documents. It currently exposes a set of **Buttons** recipes
(Default, Primary, Secondary, Tertiary).

Buttons are *default content*, not a block: a link inside a paragraph is turned into
a `.button` by `decorateButtons()` in `scripts/scripts.js` based on the formatting
applied to the link:

| Recipe     | Authoring      | Rendered class  |
| ---------- | -------------- | --------------- |
| Default    | plain link     | normal link     |
| Primary    | `**bold**`     | `.button.primary`  |
| Secondary  | `*italic*`     | `.button.secondary`|
| Tertiary   | `***bold+italic***` | `.button.tertiary` |

## Files

- `library.html` - the library loader page (loads the Sidekick Library from `aem.live`).
- `library.json` - the blocks-plugin content index (`helix-blocks` sheet) mapping the
  Buttons recipes to their content document.

## Remaining setup (requires site hostname + admin token)

The Sidekick Library must be registered as a plugin in the Sidekick config, which is
hosted on the content service. This is done outside the code repo. Replace
`{org}`, `{site}`, and the auth token:

```bash
curl -X POST https://admin.hlx.page/config/{org}/sites/{site}/sidekick.json \
  -H 'content-type: application/json' \
  -H 'x-auth-token: {your-auth-token}' \
  --data '{
    "project": "mitienda",
    "plugins": [{
      "id": "library",
      "title": "Library",
      "environments": ["edit"],
      "url": "/tools/sidekick/library.html",
      "includePaths": ["**.docx**", "**.docx", "**.html", "**.da.live", "/**.docx**"]
    }]
  }'
```

> Do not overwrite the whole Sidekick config blindly: `GET` the existing
> `sidekick.json` first and add the `library` plugin to it if it already exists.

## Authoring the Buttons content document

The recipe content referenced by `library.json`
(`/tools/sidekick/blocks/buttons`) must be authored in the content mountpoint
(Word or Google Docs) as a document containing four sections, one per recipe.
Each section must contain only the button link and a `library metadata` table
that sets its `name` (Default / Primary / Secondary / Tertiary), for example:

```
name
Default

[Default button](https://www.example.com/)
```

`drafts/buttons.plain.html` in the repo root mirrors this structure so it can be
previewed locally with `aem up --html-folder drafts`.

Publish the `buttons` document and add a `name` / `path` row to the `library.xlsx`
workbook's `helix-blocks` sheet if you prefer to source the index from Excel
(instead of `library.json`).