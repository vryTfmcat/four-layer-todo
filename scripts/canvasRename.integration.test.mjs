import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';

// No Obsidian instance, real Vault, dependencies, build, or plugin installation.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.CANVAS_RENAME_EVIDENCE_DIR;
function saveEvidence(name, value) {
  if (out) writeFileSync(resolve(out, name), JSON.stringify(value, null, 2));
}
const source = readFileSync(resolve(repo, 'src/main.tsx'), 'utf8');
const fs = await import(pathToFileURL(resolve(repo, 'src/fileSource.ts')).href);
const guards = await import(pathToFileURL(resolve(repo, 'src/syncGuards.ts')).href);
const geometry = await import(pathToFileURL(resolve(repo, 'src/ui/canvasGeometry.ts')).href);
const extracted = [];
function method(name) {
  const pattern = new RegExp('^  (?:private )?(?:async )?' + name + '(?:<[^\\n]+>)?\\(', 'm');
  const start = source.search(pattern);
  assert.ok(start >= 0, `production method ${name} exists`);
  const closing = /^  }\r?$/m.exec(source.slice(start));
  const end = closing ? start + closing.index + closing[0].length : -1;
  assert.ok(end > start, `production method ${name} ends`);
  const text = source.slice(start, end);
  extracted.push({ name, line: source.slice(0, start).split('\n').length,
    sha256: createHash('sha256').update(text).digest('hex') });
  return text;
}
const methods = ['scanActiveTaskGroups', 'refreshFileIndex', 'readCanvasLayoutFromFile',
  'updateFileTask', 'syncNativeCanvasAfterTaskCommit', 'syncNativeCanvas'];
const code = stripTypeScriptTypes(`class Subject {\n${methods.map(method).join('\n')}\n}`, { mode: 'strip' });
class TFile {
  constructor(path) { this.setPath(path); this.stat = { ctime: 1 }; }
  setPath(path) {
    this.path = path; this.name = path.split('/').at(-1);
    this.basename = this.name.replace(/\.[^.]+$/, '');
    this.parent = { path: path.slice(0, path.lastIndexOf('/')) };
  }
}
class TFolder {}
const dependencies = {
  TFile, TFolder, ...geometry,
  normalizeTaskFolder: s => s.trim().replace(/^\/+|\/+$/g, ''),
  isLegacySampleId: () => false,
  POOL_METADATA_FILE_NAME: '_任务池.md', NATIVE_CANVAS_FILE_NAME: '任务白板.canvas',
  NATIVE_CANVAS_TASK_MARKER: '<!-- four-layer-todo-task -->',
  getString: fs.frontmatterString, getNumber: fs.frontmatterNumber,
  getTaskLocationFromPath: fs.getFileTaskPlacement,
  parseTaskNote: fs.parseFileTask, serializeTaskNote: fs.serializeFileTask,
  selectNumericShadowCanonicalPath: fs.selectNumericShadowCanonicalPath,
  findDuplicateTaskIds: fs.findDuplicateTaskIds, compareFileSourceOrder: fs.compareFileSourceOrder,
  resolveCanvasTaskLayout: fs.resolveCanvasTaskLayout,
  chooseStableMarkdownPath: guards.chooseStableMarkdownPath,
  nativeCanvasColor: tone => ({ sage: '4', lavender: '6', blue: '5' }[tone] ?? '3'),
  Notice: class { constructor(message) { throw Error(`unexpected Notice: ${message}`); } },
};
const Subject = Function(...Object.keys(dependencies), `${code}; return Subject;`)(...Object.values(dependencies));
const root = '隔离待办', canvasPath = `${root}/白板/任务白板.canvas`;
const oldPath = `${root}/白板/合成A.md`, newPath = `${root}/白板/合成A改名.md`;
class MemoryVault {
  files = new Map(); operations = [];
  constructor(hostUpdatesLinks) { this.hostUpdatesLinks = hostUpdatesLinks; }
  add(path, content) { const file = new TFile(path); this.files.set(path, { file, content }); }
  getMarkdownFiles() { return [...this.files.values()].map(x => x.file).filter(f => f.path.endsWith('.md')); }
  getAllLoadedFiles() { return [...this.files.values()].map(x => x.file); }
  getAbstractFileByPath(path) { return this.files.get(path)?.file ?? null; }
  async read(file) { return this.files.get(file.path).content; }
  async modify(file, content) { this.files.get(file.path).content = content; this.operations.push(['modify', file.path]); }
  async create(path, content) { assert.ok(!this.files.has(path)); this.add(path, content); this.operations.push(['create', path]); }
  async rename(file, path) {
    assert.ok(!this.files.has(path));
    const previous = file.path, entry = this.files.get(previous);
    this.files.delete(previous); file.setPath(path); this.files.set(path, entry);
    this.operations.push(['rename', previous, path]);
    // Control case explicitly simulates a host rewriting Canvas links before refresh.
    if (this.hostUpdatesLinks) {
      const entry = this.files.get(canvasPath), raw = JSON.parse(entry.content);
      raw.nodes.forEach(n => { if (n.file === previous) n.file = path; });
      entry.content = JSON.stringify(raw);
    }
    if (this.afterRename) await this.afterRename();
  }
}
function fixture(hostUpdatesLinks = false) {
  const vault = new MemoryVault(hostUpdatesLinks);
  for (const [id, name] of [['qa-a', '合成A'], ['qa-b', '合成B']]) {
    vault.add(`${root}/白板/${name}.md`, fs.serializeFileTask({ id, title: name,
      detail: '仅合成资料', source: '文本', priority: 'P3' }, { sortKey: id === 'qa-a' ? 1 : 2 }));
  }
  vault.add(canvasPath, JSON.stringify({ nodes: [
    { id: 'qa-a', type: 'file', file: oldPath, x: 777, y: 333, color: '5' },
    { id: 'qa-b', type: 'file', file: `${root}/白板/合成B.md`, x: 1200, y: 333, color: '4' },
    { id: 'qa-note', type: 'text', text: '合成便签', x: 900, y: 20 },
  ], edges: [{ id: 'qa-edge', fromNode: 'qa-a', toNode: 'qa-b' }] }));
  const subject = new Subject();
  Object.assign(subject, { app: { vault }, settings: { taskNotesFolder: root, transparentUi: false },
    taskPaths: new Map(), taskMetadata: new Map(), conflictDisplayTasks: new Map(),
    longTermObjectPaths: new Map(), duplicateTaskPaths: new Map(),
    ensureFileSourceStructure: async () => {}, ensureTaskFolderStructure: async () => {},
    taskFolderIsUsable: () => true, scanLongTermObjects: async () => [],
    isArchivedMarkdownPath: p => p.startsWith(`${root}/归档/`),
    enqueueMarkdownMutation: fn => fn(), assertTaskIsWritable: () => {},
    emitWorkspace: () => {}, t: s => s,
  });
  return { subject, vault };
}
async function exercise(title, hostUpdatesLinks, evidenceName) {
  const { subject, vault } = fixture(hostUpdatesLinks);
  await subject.refreshFileIndex(false, false);
  const before = structuredClone(subject.workspaceState);
  const canvasBefore = JSON.parse(vault.files.get(canvasPath).content);
  await subject.updateFileTask({ ...before.canvasCards.find(t => t.id === 'qa-a'), title });
  const after = structuredClone(subject.workspaceState);
  const canvasAfter = JSON.parse(vault.files.get(canvasPath).content);
  const evidence = { hostUpdatesLinks, before, after, canvasBefore, canvasAfter,
    operations: vault.operations, taskPaths: Object.fromEntries(subject.taskPaths),
    markdownFiles: vault.getMarkdownFiles().map(f => ({ path: f.path, content: vault.files.get(f.path).content })) };
  saveEvidence(evidenceName, evidence);
  assert.equal(after.canvasCards.length, 2);
  assert.equal(after.canvasTextNotes[0].content, '合成便签');
  assert.deepEqual(after.canvasTextNotes, before.canvasTextNotes);
  assert.deepEqual(after.canvasCards.find(t => t.id === 'qa-b'), before.canvasCards.find(t => t.id === 'qa-b'));
  assert.deepEqual(after.canvasConnections, before.canvasConnections);
  const card = after.canvasCards.find(t => t.id === 'qa-a');
  for (const node of canvasAfter.nodes.filter(n => n.type === 'file')) assert.ok(vault.files.has(node.file));
  return { card, after, canvasAfter };
}
saveEvidence('production-methods.json', { repo, node: process.version,
  mainSha256: createHash('sha256').update(source).digest('hex'), extracted });
test('control: editing without rename preserves layout and edge', async () => {
  const { card, after } = await exercise('合成A', false, 'control-no-rename.json');
  assert.deepEqual([card.x, card.y, card.tone], [777, 333, 'blue']);
  assert.equal(after.canvasConnections.length, 1);
});
test('control: host link update before refresh preserves renamed layout and edge', async () => {
  const { card, after, canvasAfter } = await exercise('合成A改名', true, 'control-host-update.json');
  assert.deepEqual([card.x, card.y, card.tone], [777, 333, 'blue']);
  assert.equal(after.canvasConnections.length, 1);
  assert.equal(canvasAfter.nodes.find(n => n.id === 'qa-a').file, newPath);
});
test('regression: rename without a host link rewrite must preserve layout and edge', async () => {
  const { card, after, canvasAfter } = await exercise('合成A改名', false, 'repro-rename.json');
  assert.equal(canvasAfter.nodes.find(n => n.id === 'qa-a').file, newPath);
  assert.deepEqual({ x: card.x, y: card.y, tone: card.tone, edges: after.canvasConnections.length },
    { x: 777, y: 333, tone: 'blue', edges: 1 });
});

test('Canvas node IDs may differ from task IDs during a rename', async () => {
  const { subject, vault } = fixture();
  const canvas = JSON.parse(vault.files.get(canvasPath).content);
  canvas.nodes[0].id = 'native-node-a';
  canvas.nodes[1].id = 'native-node-b';
  canvas.edges[0] = { id: 'native-edge', fromNode: 'native-node-a', toNode: 'native-node-b' };
  vault.files.get(canvasPath).content = JSON.stringify(canvas);
  await subject.refreshFileIndex(false, false);
  await subject.updateFileTask({ ...subject.workspaceState.canvasCards[0], title: '合成A改名' });
  const card = subject.workspaceState.canvasCards.find(t => t.id === 'qa-a');
  assert.deepEqual([card.x, card.y, card.tone], [777, 333, 'blue']);
  assert.deepEqual(subject.workspaceState.canvasConnections, [{ id: 'native-edge', fromId: 'qa-a', toId: 'qa-b' }]);
});

for (const action of ['archived', 'deleted']) {
  test(`rename preserves active layout without resurrecting a concurrently ${action} task`, async () => {
    const { subject, vault } = fixture();
    await subject.refreshFileIndex(false, false);
    const task = subject.workspaceState.canvasCards.find(t => t.id === 'qa-a');
    const bPath = `${root}/白板/合成B.md`;
    const archivePath = `${root}/归档/2026-10-18/合成B.md`;
    const bContent = vault.files.get(bPath).content;
    vault.afterRename = () => {
      vault.files.delete(bPath);
      if (action === 'archived') vault.add(archivePath, bContent);
    };
    await subject.updateFileTask({ ...task, title: '合成A改名' });
    const state = subject.workspaceState;
    assert.deepEqual(state.canvasCards.map(t => t.id), ['qa-a']);
    assert.deepEqual([state.canvasCards[0].x, state.canvasCards[0].y, state.canvasCards[0].tone], [777, 333, 'blue']);
    assert.deepEqual(state.canvasConnections, []);
    assert.equal(state.canvasTextNotes[0].content, '合成便签');
    assert.equal(vault.files.has(bPath), false);
    if (action === 'archived') assert.equal(vault.files.get(archivePath).content, bContent);
    const saved = JSON.parse(vault.files.get(canvasPath).content);
    assert.deepEqual(saved.nodes.filter(n => n.type === 'file').map(n => n.file), [newPath]);
    assert.equal(vault.operations.some(op => op[0] === 'create'), false);
    saveEvidence(`${action}-during-rename.json`, { state, canvas: saved, operations: vault.operations });
  });
}

test('rename aliases cannot restore a task absent from the active whiteboard index', async () => {
  for (const action of ['archived', 'deleted', 'storage']) {
    const { subject, vault } = fixture();
    const entry = vault.files.get(oldPath);
    vault.files.delete(oldPath);
    const path = action === 'archived' ? `${root}/归档/2026-10-18/合成A.md`
      : action === 'storage' ? `${root}/任务存储器/合成池/合成A.md` : newPath;
    if (action !== 'deleted') vault.add(path, entry.content);
    await subject.refreshFileIndex(false, false, { id: 'qa-a', oldPath, newPath: path });
    assert.deepEqual(subject.workspaceState.canvasCards.map(t => t.id), ['qa-b']);
    assert.deepEqual(subject.workspaceState.canvasConnections, []);
    assert.equal(vault.operations.length, 0);
  }
});
