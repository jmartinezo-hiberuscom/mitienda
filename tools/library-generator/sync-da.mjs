/*
 * DA.live Source API uploader — syncs the generated block library content
 * (HTML example docs + sheets) into DA's content storage.
 *
 * Why this exists:
 *  DA's block library can only read content served by content.da.live. This
 *  repo's code-branch content is served by *.aem.live which does NOT send CORS
 *  headers for the da.live origin, so DA shows "Failed to load resource: 404"
 *  / CORS errors. Uploading the library through the DA Source API puts the
 *  resources on content.da.live where DA reads them natively.
 *
 * Contract (verified from docs.da.live/developers/api/source and da-nx source):
 *   POST https://admin.da.live/source/{org}/{repo}/{path}
 *     Authorization: Bearer <IMS user token>
 *     body: multipart/form-data, field "data" = Blob(raw content)
 *   GET  same URL -> raw content (404 = missing, 401 = no access)
 *   DELETE same URL -> 204
 *
 * Usage:
 *   DA_IMS_TOKEN=<token> node tools/library-generator/sync-da.mjs
 *   DA_IMS_TOKEN=<token> node tools/library-generator/sync-da.mjs --blocks enrichment,hero
 *   DA_IMS_TOKEN=<token> node tools/library-generator/sync-da.mjs --check
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const LIBRARY_DIR = join(ROOT, 'library');

const ORG = process.env.LIBRARY_ORG || 'hiberus-magento';
const SITE = process.env.LIBRARY_SITE || 'sports-emotion-storefront';
const API = 'https://admin.da.live/source';

const token = process.env.DA_IMS_TOKEN;
if (!token) {
  console.error('Missing DA_IMS_TOKEN. Set it in the environment before running.');
  process.exit(1);
}

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

// Support `--blocks a,b` or `--blocks=a,b`.
let blockFilter = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--blocks') {
    blockFilter = args[i + 1];
    break;
  }
  if (args[i].startsWith('--blocks=')) {
    blockFilter = args[i].split('=')[1];
    break;
  }
}

function enabledBlocks(blocks) {
  if (!blockFilter) return blocks;
  const wanted = blockFilter.split(',').map((s) => s.trim()).filter(Boolean);
  return blocks.filter((b) => wanted.includes(b));
}

// Content-type by extension, mirroring DA's SUPPORTED_FILES / findContentType.
function contentTypeFor(p) {
  if (p.endsWith('.html')) return 'text/html';
  if (p.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

// Build a multipart/form-data body with a single "data" field.
function toFormData(content, mime) {
  const boundary = `----node${Date.now().toString(16)}`;
  const escaped = content.replace(/\r\n/g, '\n');
  const body = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="data"; filename="blob"\r\n`,
    `Content-Type: ${mime}\r\n`,
    '\r\n',
    escaped,
    '\r\n',
    `--${boundary}--\r\n`,
  ].join('');
  return { body, boundary };
}

function daFetch(url, { method = 'GET', form } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (form) {
    headers['Content-Type'] = `multipart/form-data; boundary=${form.boundary}`;
  }
  return fetch(url, method === 'GET' ? { headers } : { method, headers, body: form?.body });
}

async function get(path) {
  const url = `${API}/${ORG}/${SITE}${path}`;
  const resp = await daFetch(url);
  return resp;
}

async function upload(pathRaw, content) {
  const url = `${API}/${ORG}/${SITE}${pathRaw}`;
  const form = toFormData(content, contentTypeFor(pathRaw));
  const resp = await daFetch(url, { method: 'POST', form });
  if (!resp.ok) {
    console.error(`  ✗ ${pathRaw} -> ${resp.status} ${await resp.text()}`);
    return false;
  }
  const json = await resp.json().catch(() => ({}));
  console.log(`  ✓ ${pathRaw} -> ${json?.source?.contentUrl || resp.status}`);
  return true;
}

// ---- Discover blocks from the generated HTML files --------------------------
function blockIds() {
  const dir = join(LIBRARY_DIR, 'blocks');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .sort();
}

function readSheetJson(name) {
  const content = readFileSync(join(LIBRARY_DIR, `${name}.json`), 'utf8');
  const sheet = JSON.parse(content);
  return sheet;
}

// The sheet path is an absolute content.da.live URL ending in .../blocks/<id>;
// return the <id> segment for matching against the filtered block list.
function blockIdOf(row) {
  const last = (row.path || '').split('/').filter(Boolean).pop();
  return last || '';
}

// The sheets are passed through as generated. generate.mjs already emits block
// paths as absolute content.da.live URLs, and each upload to /library/blocks/<id>.html
// resolves to that same URL as its contentUrl (extension stripped).

// ---- Main ----------------------------------------------------------------
async function main() {
  const ids = blockIds();
  console.log(`DA Source API sync for ${ORG}/${SITE}`);
  console.log(`  found ${ids.length} block example docs`);

  if (checkOnly) {
    console.log('\n--check: verifying token access on a test GET...');
    const resp = await get('/library/blocks.json');
    console.log(`  GET /library/blocks.json -> ${resp.status} ${resp.status === 404 ? '(file missing, token OK)' : '(maybe not found, token may be scoped for /library)'}`);
    process.exit(0);
  }

  const blocks = enabledBlocks(ids);
  console.log(`  uploading ${blocks.length} blocks`);
  for (const id of blocks) {
    const html = readFileSync(join(LIBRARY_DIR, 'blocks', `${id}.html`), 'utf8');
    await upload(`/library/blocks/${id}.html`, html);
  }

  // When filtering a subset of blocks, also slice the sheet so DA only references
  // the actually-uploaded example docs.
  const blockSheetRaw = readSheetJson('blocks');
  const blockSheet = blockFilter
    ? {
        ...blockSheetRaw,
        ...(blockSheetRaw.blocks
          ? { blocks: { ...blockSheetRaw.blocks, data: blockSheetRaw.blocks.data.filter((r) => blocks.includes(blockIdOf(r))) } }
          : { data: blockSheetRaw.data.filter((r) => blocks.includes(blockIdOf(r))) }),
      }
    : blockSheetRaw;
  console.log('\nUploading blocks sheet:');
  await upload('/library/blocks.json', JSON.stringify(blockSheet));

  // Templates sheet (if present)
  try {
    const tmplSheet = readSheetJson('templates');
    console.log('\nUploading templates sheet:');
    await upload('/library/templates.json', JSON.stringify(tmplSheet));
  } catch {
    console.log('\nSkipping templates.json (not present)');
  }

  console.log('\nDone. Open the DA library (Blocks/Templates) to verify.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});