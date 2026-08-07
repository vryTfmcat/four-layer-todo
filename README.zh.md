# Four Layer Todo

[English](README.md)

Four Layer Todo is a local-first task workspace for Obsidian. It keeps active
work on a whiteboard while moving less immediate items through a workbench,
task pools, and long-term objects. The plugin does not send task content to a
network service.

## 中文说明

中文名为“四层待办”。这是四层待办工具的首个本地插件版本。插件会在
Obsidian 主工作区打开完整页面，不使用狭窄侧栏。

## 演示视频

[播放带中文字幕的四层待办演示](发布素材/演示视频/Four-Layer-Todo-Demo-Subtitled.mp4)

## 功能

- 白板与背面缓存工作台。
- 收集箱、待办列表、缓存列表。
- 任务卡片三点菜单，以及“先跳转、再选择具体位置”的移动流程。
- 可自由添加任务池，并在任务池中手动添加任务。
- Task List Kanban 风格任务存储器。
- 长期对象与关联任务查看。
- AI 按钮仅保留接口位置，不发送任何数据。
- 当前状态保存在插件自己的 `data.json` 中，每个 Vault 单独持久化。
- 可选 Markdown 同步：将每张待办卡保存为 Vault 内可读、可编辑的 `.md` 文件。

## 构建

```bash
npm install
npm run build
```

## 安装到当前库

```bash
npm run install:local
```

安装后在 Obsidian 的社区插件设置中启用“四层待办”，点击左侧功能区图标，或运行命令“打开四层待办”。

## Markdown 待办同步

在 Obsidian 的“四层待办”插件设置中启用“将待办同步为 Markdown”，并填写待办笔记文件夹名称。默认文件夹名为 `待办`，开关默认关闭。

- 启用或点击“同步现有待办”后，当前每张待办卡都会成为一个 `.md` 文件。
- Markdown 文件名对应待办名称，正文对应待办详情；插件不会在正文中重复写入一级标题。在 Obsidian 中编辑或重命名文件后会回写插件界面。
- `任务存储器/`下的一级子文件夹就是任务池；在 Obsidian 中新建、重命名或移除空任务池，以及把任务文件移到另一个池，都会反向同步到插件界面。
- frontmatter 保留卡片 ID、所在区域、优先级、白板位置等同步信息；需要保留以维持双向同步。
- 删除已同步的 `.md` 文件会删除对应待办卡；重命名文件不会影响关联。
- 任务菜单的“删除”会移除卡片，并将对应 Markdown 文件移入 Obsidian 垃圾篓。

同步文件夹的结构如下：

```text
待办/
├── 白板/
├── 缓存工作台/
│   ├── 收集箱/
│   ├── 待办列表/
│   └── 缓存列表/
├── 任务存储器/
│   └── 对应任务池/
├── 归档/
│   └── YYYY-MM-DD/
└── 长期对象/
```
