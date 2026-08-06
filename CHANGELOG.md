# Changelog

## 0.1.5

- Use the plugin stylesheet instead of injecting styles at runtime.
- Preserve user-arranged workspace leaves when the plugin unloads.
- Publish the required Obsidian release assets individually.

## 0.1.4 - 2026-08-06

- Restore Markdown-to-plugin synchronization during startup before writing
  workspace state back to the vault.
- Synchronize task-pool folders, including empty pools, and derive a task's
  location from its Markdown path when it is moved between pools.
- Serialize vault events so simultaneous folder and note changes cannot
  overwrite one another in `data.json`.
- Use `待办/白板/任务白板.canvas` as the persisted whiteboard and synchronize
  card positions, text notes, and connections with Obsidian's official Canvas.
- Stop creating whiteboard-only Markdown copies, preventing sync conflicts and
  repeated numeric filename suffixes.
- Move managed Markdown files together with their cards when using the card
  menu, including moves into and out of the whiteboard.
- Represent whiteboard cards backed by Markdown as native Canvas file nodes and
  preserve their note paths so the open-note action keeps working after reload.
- Resolve managed notes by their stable task ID when an older card does not yet
  contain a linked note path.
- When adding a note, move files already inside the configured task folder to
  the selected task layer; link notes outside that folder without moving them.
- Exclude archived notes from active task synchronization while keeping them in
  dated folders under `待办/归档/`.

## 0.1.3 - 2026-07-26

- Explicitly route mouse-wheel events over the workbench's Inbox, To-do List, and Cache List to their own scroll containers in Obsidian.

## 0.1.2 - 2026-07-26

- Add the repository license and a bilingual marketplace README.
- Use Preact-compatible production output to remove bundled dynamic script paths.
- Store workspace state exclusively through Obsidian's plugin data APIs.
- Fix workbench columns so mouse-wheel scrolling works while the pointer is over the inbox, to-do list, or cache list.

## 0.1.1 - 2026-07-26

- Rename the manifest display name to `Four Layer Todo` for Obsidian's
  community-plugin directory naming requirements.

## 0.1.0 - 2026-07-26

### 中文

- 首次公开版本：白板、缓存工作台、任务存储器和长期对象。
- 支持任务移动、完成、归档、删除、任务池和关联任务。
- 支持可选 Markdown 双向同步、链接笔记分流和 Obsidian Canvas 互通。
- 修复连线即时保存、同名笔记移动、待办文件夹笔记分流和归档失败反馈。
- 样例迁移不再删除用户 `待办/` 文件；缺失的引导连线会安全补回。

### English

- First public release with a whiteboard, workbench, task storage, and
  long-term objects.
- Supports task movement, completion, archiving, deletion, task pools, and
  related tasks.
- Includes optional bidirectional Markdown synchronization, note-link routing,
  and Obsidian Canvas interoperability.
- Fixes immediate connection persistence, duplicate-name moves, task-folder
  note routing, and archive failure feedback.
- Sample migrations no longer delete user files in `待办/`; missing guided
  connections are restored safely.
