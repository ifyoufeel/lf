#!/usr/bin/env node
// Claude Code PostToolUse hook: after an edit under site/ or brand/, run the brand check
// and hand any errors back to Claude (exit 2 feeds stderr to the model). Silent when clean.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const file = input?.tool_input?.file_path || input?.tool_response?.filePath;
if (!file) process.exit(0);
const rel = relative(ROOT, resolve(file)).split('\\').join('/');
if (rel.startsWith('..') || !/^(site|brand)\//.test(rel)) process.exit(0);

const checker = resolve(ROOT, 'tools/brandcheck.mjs');
if (!existsSync(checker)) process.exit(0);
const { check } = await import(pathToFileURL(checker).href);
const r = await check({ root: ROOT });
if (!r.errors.length) process.exit(0);
const lines = r.errors.slice(0, 25).map((e) => `- ${e.rule} ${e.id}: ${e.message}${e.file ? ` (${e.file}${e.line ? ':' + e.line : ''})` : ''}`);
if (r.errors.length > 25) lines.push(`- …and ${r.errors.length - 25} more (run node tools/brandcheck.mjs)`);
process.stderr.write(`Brand check failed after editing ${rel}. Fix these before moving on (rules: .claude/skills/lastfomo-brand, data: brand/ledger.json):\n${lines.join('\n')}\n`);
process.exit(2);
