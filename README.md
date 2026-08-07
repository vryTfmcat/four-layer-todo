# Four Layer Todo for Obsidian

[中文说明](README.zh.md)

Four-Layer Todo is a local-first task workspace for Obsidian. It keeps the
current task in a whiteboard while moving less immediate work through a
workbench, task pools, and long-term objects.

## Demo Video

[Watch the subtitled Four Layer Todo demo](发布素材/演示视频/Four-Layer-Todo-Demo-Subtitled.mp4)

## Features

- A whiteboard for the one to three tasks currently in focus.
- A reversible workbench with an inbox, to-do list, and cache list.
- Expandable Kanban-style task pools.
- Long-term objects with related tasks.
- Task connections, text notes, card movement, archiving, deletion, and
  completion.
- Optional Markdown synchronization with bidirectional edits in the vault.
- Links to notes outside the task folder without moving the original file.
- Import and export through Obsidian's official Canvas format.

The plugin is local-first. It does not send task content to a network service.
The AI buttons are interface placeholders only.

## Interface Languages

Four Layer Todo includes complete English and Chinese interfaces. By default,
the plugin follows Obsidian's language. You can also choose **Automatic**,
**English**, or **Chinese** under **Settings → Community plugins → Four Layer
Todo**.

Changing the interface language never renames existing notes, task folders, or
frontmatter values. This keeps existing Chinese vaults compatible while making
the full interface usable for English-speaking users. New sample content is
created in the active interface language.

## Install From Source

```bash
npm install
npm run build
```

To install the development build into the current vault:

```bash
npm run install:local
```

Then enable **Four-Layer Todo** in Obsidian's Community Plugins settings and
run **Open Four-Layer Todo** from the command palette.

## Markdown Synchronization

Enable Markdown synchronization in the plugin settings and set the task-notes
folder. The default folder is `待办` ("Todo") for compatibility with existing
vaults, and synchronization is disabled by default. You can choose any root
folder name before enabling synchronization.

- Each regular task and long-term object is stored as an Obsidian-readable
  Markdown file.
- File names provide the visible task title; no duplicate H1 is written into
  the note body.
- Frontmatter keeps the card ID, location, priority, whiteboard position, and
  other metadata required for bidirectional synchronization.
- Moving or renaming a managed note updates its task card.
- Each direct child folder under `任务存储器/` is a task pool. Creating,
  renaming, or removing an empty pool folder, and moving a task note between
  pool folders, updates the plugin UI.
- Deleting a managed note removes its task card.
- Linking a note inside the task folder moves it to the selected task area.
  Linking a note outside the task folder creates a backlink-style task card and
  leaves the original file in place.

The synchronized folder layout is:

```text
待办/
├── 白板/
├── 缓存工作台/
│   ├── 收集箱/
│   ├── 待办列表/
│   └── 缓存列表/
├── 任务存储器/
│   └── <task-pool>/
├── 归档/
│   └── YYYY-MM-DD/
└── 长期对象/
```

Archiving requires Markdown synchronization so that the note can be moved into
the dated archive folder. Deleting sends the managed Markdown note to
Obsidian's trash.

## Development Checks

```bash
npm run build
node --check main.js
```

## License

[MIT](LICENSE)
