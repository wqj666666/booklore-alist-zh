const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const i18nDir = path.join(projectRoot, 'src', 'assets', 'i18n');

const languages = [
  {code: 'en', file: path.join(i18nDir, 'en.json')},
  {code: 'zh-CN', file: path.join(i18nDir, 'zh-CN.json')},
];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${filePath}\n${e.message}`);
  }
}

function validateSegment(segment) {
  return /^[a-z][a-zA-Z0-9]*$/.test(segment);
}

function flattenStructure(value, prefix, out, invalidSegments) {
  if (typeof value === 'string') {
    out.set(prefix, 'string');
    return;
  }

  if (isPlainObject(value)) {
    if (prefix) out.set(prefix, 'object');
    for (const [key, child] of Object.entries(value)) {
      if (!validateSegment(key)) invalidSegments.add(key);
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenStructure(child, nextPrefix, out, invalidSegments);
    }
    return;
  }

  const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  throw new Error(`Invalid i18n value type at "${prefix}": ${actualType}`);
}

function compareStructures(aCode, aMap, bCode, bMap) {
  const missingInA = [];
  const missingInB = [];
  const typeMismatches = [];

  const allKeys = new Set([...aMap.keys(), ...bMap.keys()]);
  for (const key of allKeys) {
    const aType = aMap.get(key);
    const bType = bMap.get(key);
    if (!aType) missingInA.push(key);
    else if (!bType) missingInB.push(key);
    else if (aType !== bType) typeMismatches.push({key, aType, bType});
  }

  missingInA.sort();
  missingInB.sort();
  typeMismatches.sort((x, y) => x.key.localeCompare(y.key));

  const problems = [];
  if (missingInA.length) problems.push(`${aCode} missing ${missingInA.length} key(s)`);
  if (missingInB.length) problems.push(`${bCode} missing ${missingInB.length} key(s)`);
  if (typeMismatches.length) problems.push(`Type mismatch ${typeMismatches.length} key(s)`);

  return {missingInA, missingInB, typeMismatches, problems};
}

function printList(title, items) {
  if (!items.length) return;
  console.error(`\n${title} (${items.length}):`);
  for (const item of items) console.error(`- ${item}`);
}

function main() {
  for (const lang of languages) {
    if (!fs.existsSync(lang.file)) throw new Error(`Missing i18n file: ${lang.file}`);
  }

  const parsed = languages.map(l => ({...l, json: readJson(l.file)}));

  const flattened = parsed.map(l => {
    const map = new Map();
    const invalidSegments = new Set();
    flattenStructure(l.json, '', map, invalidSegments);
    map.delete('');
    return {...l, map, invalidSegments};
  });

  const invalid = new Map();
  for (const l of flattened) {
    if (l.invalidSegments.size) invalid.set(l.code, [...l.invalidSegments].sort());
  }

  const [a, b] = flattened;
  const {missingInA, missingInB, typeMismatches, problems} = compareStructures(a.code, a.map, b.code, b.map);

  if (invalid.size || problems.length) {
    for (const [code, segments] of invalid.entries()) {
      printList(`${code} contains invalid key segment(s)`, segments);
    }

    printList(`${a.code} missing (present in ${b.code})`, missingInA);
    printList(`${b.code} missing (present in ${a.code})`, missingInB);

    if (typeMismatches.length) {
      console.error(`\nType mismatches (${typeMismatches.length}):`);
      for (const m of typeMismatches) console.error(`- ${m.key}: ${a.code}=${m.aType}, ${b.code}=${m.bType}`);
    }

    const summary = problems.length ? problems.join(', ') : 'Invalid i18n keys';
    console.error(`\nFAIL: ${summary}`);
    process.exit(1);
  }

  console.log(`OK: ${a.code} and ${b.code} i18n structures match (${a.map.size} paths)`);
}

main();

