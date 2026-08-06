import { createRoot, type Root } from "react-dom/client";
import {
  TodoWorkspace,
  type LinkedNoteSuggestion,
  type LongTermObject,
  type NativeCanvasFile,
  type NoteTaskTarget,
  type TaskItem,
  type WorkspaceState,
  type WorkspaceStorage,
} from "./ui/TodoWorkspace";
import rawStyles from "./ui/globals.css";
import todoIconDataUrl from "../assets/todo-icon.png";
import {
  ItemView,
  Notice,
  normalizePath,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";

const VIEW_TYPE = "four-layer-todo-workspace";
const NATIVE_CANVAS_FILE_NAME = "任务白板.canvas";
const NATIVE_CANVAS_TASK_MARKER = "<!-- four-layer-todo-task -->";
const TASK_POOL_TONES = ["green", "amber", "blue", "violet"];
const DEFAULT_SETTINGS: FourLayerTodoSettings = {
  markdownSyncEnabled: false,
  taskNotesFolder: "待办",
};
const GUIDED_SAMPLE_VERSION = 8;
const GUIDED_CANVAS_CONNECTIONS = [
  {
    id: "guide-connection-focus-next",
    fromId: "guide-canvas-focus",
    toId: "guide-canvas-next-step",
  },
  {
    id: "guide-connection-focus-pause",
    fromId: "guide-canvas-focus",
    toId: "guide-canvas-pause",
  },
];
const LEGACY_SAMPLE_IDS = new Set([
  "canvas-main",
  "canvas-structure",
  "canvas-cache",
  "canvas-storage",
  "inbox-1",
  "inbox-2",
  "inbox-3",
  "todo-1",
  "todo-2",
  "todo-3",
  "cache-1",
  "cache-2",
  "store-1",
  "store-2",
  "store-3",
  "store-4",
  "store-5",
  "store-6",
  "store-7",
  "store-8",
  "store-9",
  "object-photo",
  "object-health",
  "object-learning",
  "object-food",
  "object-rhythm",
  "object-tools",
]);

type FourLayerTodoSettings = {
  markdownSyncEnabled: boolean;
  taskNotesFolder: string;
  resetGuidedSample?: boolean;
  guidedSampleVersion?: number;
};

type PluginData = {
  settings?: Partial<FourLayerTodoSettings>;
  workspace?: WorkspaceState;
};

type TaskLocation = "canvas" | "inbox" | "todo" | "cache" | "storage";

type MarkdownTask = {
  id: string;
  location: TaskLocation;
  columnId?: string;
  title: string;
  detail: string;
  source: TaskItem["source"];
  meta?: string;
  priority?: TaskItem["priority"];
  object?: string;
  x?: number;
  y?: number;
  tone?: string;
  done?: boolean;
  linkedNotePath?: string;
};

type TaskRecord = {
  task: TaskItem;
  location: TaskLocation;
  columnId?: string;
};

type IndexedMarkdownTask = {
  file: TFile;
  content: string;
};

type IndexedMarkdownLongTermObject = {
  file: TFile;
  content: string;
};

type NativeCanvasNode = {
  id: string;
  type: "file" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  file?: string;
  text?: string;
};

type NativeCanvasEdge = {
  id: string;
  fromNode: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toNode: string;
  toSide: "top" | "right" | "bottom" | "left";
  toEnd: "arrow";
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeTaskFolder(folder: string): string {
  return normalizePath(folder.trim().replace(/^\/+|\/+$/g, ""));
}

function isLegacySampleId(id: string): boolean {
  return LEGACY_SAMPLE_IDS.has(id);
}

function createGuidedSampleWorkspace(): WorkspaceState {
  const createTask = (
    id: string,
    title: string,
    detail: string,
    source: TaskItem["source"],
    priority: TaskItem["priority"],
    object: string,
    meta?: string,
  ): TaskItem => ({
    id,
    title,
    detail,
    source,
    priority,
    object,
    meta,
  });
  const habit = "建立可持续的任务习惯";
  const notes = "保持 Obsidian 笔记可用";
  const space = "为兴趣保留空间";
  const canvasCards: WorkspaceState["canvasCards"] = [
    {
      ...createTask(
        "guide-canvas-focus",
        "确定这一轮只推进的事项",
        "从“新手路线”挑选一张最重要的卡片拖到这里。白板只保留当前准备处理的 1 至 3 项，其他任务先留在工作台或任务池中。",
        "文本",
        "P5",
        habit,
        "白板起点",
      ),
      x: 335,
      y: 116,
      tone: "sage",
      done: false,
    },
    {
      ...createTask(
        "guide-canvas-next-step",
        "把目标拆成下一个可见动作",
        "把模糊目标改写成能够马上开始的动作，例如“写下三个问题”而不是“研究这个主题”。可以用连线表达它和主任务的关系。",
        "文本",
        "P4",
        habit,
        "拆解任务",
      ),
      x: 86,
      y: 320,
      tone: "cream",
      done: false,
    },
    {
      ...createTask(
        "guide-canvas-pause",
        "中断前保存工作现场",
        "离开前补一句已经做到哪里、下一步是什么。之后可把卡片移到缓存列表，回来时不必重新回忆上下文。",
        "文本",
        "P4",
        habit,
        "恢复现场",
      ),
      x: 694,
      y: 332,
      tone: "lavender",
      done: false,
    },
  ];
  const storeColumns: WorkspaceState["storeColumns"] = [
    {
      id: "guide-route",
      title: "新手路线",
      hint: "按顺序体验核心流程",
      tone: "green",
      tasks: [
        createTask(
          "guide-store-create",
          "练习：创建一张文本待办",
          "点击绿色加号，填写简短标题和具体内容。标题说明要做什么，内容记录完成标准或下一步。",
          "文本",
          "P5",
          habit,
        ),
        createTask(
          "guide-store-archive",
          "练习：将完成的任务归档",
          "通过卡片右上角菜单选择归档。插件会在待办/归档下按当天日期建立文件夹，并保留对应 Markdown 文件。",
          "笔记",
          "P4",
          habit,
        ),
        createTask(
          "guide-store-link",
          "练习：链接一篇已有 Markdown 笔记",
          "点击 ⛓，空搜索会优先显示待办文件夹中的笔记；输入文字后会搜索整个库。普通笔记将作为双链任务加入，不会被移动。",
          "笔记",
          "P4",
          notes,
        ),
      ],
    },
    {
      id: "guide-waiting",
      title: "等待条件",
      hint: "条件未满足时不占用注意力",
      tone: "amber",
      tasks: [
        createTask(
          "guide-waiting-material",
          "等待：外部资料到齐后再继续",
          "把无法行动的任务放在这里，并在内容中写明缺少什么条件。条件出现后再移动到待办列表或白板。",
          "文本",
          "P3",
          notes,
        ),
        createTask(
          "guide-waiting-time",
          "等待：安排下一次专注时段",
          "当任务需要完整时间块时，不必塞进白板。先保存在等待条件，等到有合适时段后再启动。",
          "文本",
          "P3",
          habit,
        ),
      ],
    },
    {
      id: "guide-possible",
      title: "可能处理",
      hint: "保存可能性，暂不承诺",
      tone: "blue",
      tasks: [
        createTask(
          "guide-possible-interest",
          "可能：给感兴趣的主题开一张候选卡",
          "先记录想继续了解的主题，不必给日期。等它多次出现或与长期对象相关时，再决定是否进入待办。",
          "文本",
          "P2",
          space,
        ),
        createTask(
          "guide-possible-method",
          "可能：整理未来想尝试的方法",
          "将方法、工具或灵感保存在后台，避免它们打断当前工作。定期回顾时再挑一项做小范围试验。",
          "笔记",
          "P2",
          space,
        ),
      ],
    },
    {
      id: "guide-review",
      title: "长期回顾",
      hint: "定期检查系统是否仍有帮助",
      tone: "violet",
      tasks: [
        createTask(
          "guide-review-whiteboard",
          "每周回顾：哪些任务值得进入白板？",
          "回顾任务池和缓存列表，只把现在确实能推进的任务送到待办或白板。其余任务继续留在合适的位置。",
          "笔记",
          "P3",
          habit,
        ),
        createTask(
          "guide-review-space",
          "每周回顾：哪些想法应继续保留？",
          "查看可能处理与长期对象，删除已经不再有价值的条目，或把反复出现的想法升级为长期对象。",
          "文本",
          "P3",
          space,
        ),
      ],
    },
  ];

  return {
    canvasCards,
    canvasConnections: clone(GUIDED_CANVAS_CONNECTIONS),
    canvasTextNotes: [
      {
        id: "guide-canvas-note",
        content: "白板提示：拖动卡片调整位置；使用 ↗ 连接任务；右下角 + 创建待办，⛓ 链接已有笔记。",
        x: 430,
        y: 590,
      },
    ],
    longTermObjects: [
      {
        id: "guide-object-habit",
        kind: "目标",
        title: habit,
        description: "让每天的任务选择变得更少、更清楚：白板只承载当前行动，其他事项有稳定的存放位置和回顾节奏。",
        activity: "从“新手第一轮”开始体验完整流转",
        tone: "mint",
        relatedTaskIds: [
          "guide-canvas-focus",
          "guide-canvas-next-step",
          "guide-canvas-pause",
          "guide-todo-flow",
          "guide-todo-opening",
          "guide-store-create",
          "guide-store-archive",
          "guide-waiting-time",
          "guide-review-whiteboard",
        ],
      },
      {
        id: "guide-object-notes",
        kind: "长期想法",
        title: notes,
        description: "任务不替代笔记。需要长期阅读、写作和积累的内容继续留在 Vault 中，通过双链连接到需要行动的地方。",
        activity: "练习把已有 Markdown 笔记链接为任务",
        tone: "lilac",
        relatedTaskIds: [
          "guide-inbox-clarify",
          "guide-cache-resume",
          "guide-store-link",
          "guide-waiting-material",
        ],
      },
      {
        id: "guide-object-space",
        kind: "兴趣",
        title: space,
        description: "不把每一个好奇心都变成紧急任务。用可能处理和长期对象保留线索，等到时机成熟再投入注意力。",
        activity: "在每周回顾中检查可能处理",
        tone: "sky",
        relatedTaskIds: [
          "guide-inbox-capture",
          "guide-possible-interest",
          "guide-possible-method",
          "guide-review-space",
        ],
      },
    ],
    inbox: [
      createTask(
        "guide-inbox-clarify",
        "判断它是任务、资料还是长期方向",
        "能在一次行动中推进的是任务；只需阅读或保存的是资料；会持续影响多个选择的内容适合建成长期对象。",
        "笔记",
        "P3",
        notes,
        "分类练习",
      ),
      createTask(
        "guide-inbox-capture",
        "把突然想到的事先放进收集箱",
        "收集箱只负责接住输入，不要求立刻确定优先级或截止时间。稍后再决定它要进入待办、任务池、长期对象，还是仅保留为笔记。",
        "文本",
        "P3",
        space,
        "收集练习",
      ),
    ],
    todo: [
      createTask(
        "guide-todo-flow",
        "新手第一轮：完成一次任务流转",
        "将一张任务池卡片放上白板，做完后移动到归档；如果中断，则移动到缓存列表并写下下一步。这个练习会覆盖插件最常用的路径。",
        "笔记",
        "P5",
        habit,
        "建议从这里开始",
      ),
      createTask(
        "guide-todo-opening",
        "建立每日打开时的起始动作",
        "每次打开先看白板，再从待办列表选一件可以在当前时间开始的任务。不要在完整任务库里反复挑选。",
        "文本",
        "P4",
        habit,
        "使用习惯",
      ),
    ],
    cache: [
      createTask(
        "guide-cache-resume",
        "恢复一个被中断的任务",
        "缓存列表中的卡片必须写明已完成部分和下一步。恢复时先读这两句，再决定把它放回白板还是继续保留。",
        "笔记",
        "P3",
        notes,
        "恢复练习",
      ),
    ],
    storeColumns,
    transparentUi: false,
  };
}

function removeLegacySampleData(state: WorkspaceState): WorkspaceState {
  const canvasCards = state.canvasCards.filter(
    (task) => !isLegacySampleId(task.id),
  );
  const canvasCardIds = new Set(canvasCards.map((task) => task.id));
  const canvasConnections = (state.canvasConnections ?? []).filter(
    (connection) =>
      canvasCardIds.has(connection.fromId) && canvasCardIds.has(connection.toId),
  );
  const canvasTextNotes = (state.canvasTextNotes ?? []).filter(
    (note) => !isLegacySampleId(note.id),
  );
  const inbox = state.inbox.filter((task) => !isLegacySampleId(task.id));
  const todo = state.todo.filter((task) => !isLegacySampleId(task.id));
  const cache = state.cache.filter((task) => !isLegacySampleId(task.id));
  const storeColumns = state.storeColumns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => !isLegacySampleId(task.id)),
  }));
  const longTermObjects = (state.longTermObjects ?? []).filter(
    (object) => !isLegacySampleId(object.id),
  );

  const changed =
    canvasCards.length !== state.canvasCards.length ||
    canvasConnections.length !== (state.canvasConnections ?? []).length ||
    canvasTextNotes.length !== (state.canvasTextNotes ?? []).length ||
    inbox.length !== state.inbox.length ||
    todo.length !== state.todo.length ||
    cache.length !== state.cache.length ||
    storeColumns.some(
      (column, index) =>
        column.tasks.length !== state.storeColumns[index]?.tasks.length,
    ) ||
    longTermObjects.length !== (state.longTermObjects ?? []).length;

  return changed
    ? {
        ...state,
        canvasCards,
        canvasConnections,
        canvasTextNotes,
        inbox,
        todo,
        cache,
        storeColumns,
        longTermObjects,
      }
    : state;
}

function restoreMissingGuidedConnections(state: WorkspaceState): WorkspaceState {
  if ((state.canvasConnections ?? []).length > 0) return state;

  const canvasCardIds = new Set(state.canvasCards.map((card) => card.id));
  const hasGuidedCanvasCards = GUIDED_CANVAS_CONNECTIONS.every(
    (connection) =>
      canvasCardIds.has(connection.fromId) &&
      canvasCardIds.has(connection.toId),
  );

  return hasGuidedCanvasCards
    ? { ...state, canvasConnections: clone(GUIDED_CANVAS_CONNECTIONS) }
    : state;
}

function markdownValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function getTaskRecords(state: WorkspaceState): TaskRecord[] {
  return [
    ...state.inbox
      .filter((task) => !task.linkedNotePath)
      .map((task) => ({ task, location: "inbox" as const })),
    ...state.todo
      .filter((task) => !task.linkedNotePath)
      .map((task) => ({ task, location: "todo" as const })),
    ...state.cache
      .filter((task) => !task.linkedNotePath)
      .map((task) => ({ task, location: "cache" as const })),
    ...state.storeColumns.flatMap((column) =>
      column.tasks
        .filter((task) => !task.linkedNotePath)
        .map((task) => ({
          task,
          location: "storage" as const,
          columnId: column.id,
        })),
    ),
  ];
}

function serializeTaskNote(record: TaskRecord): string {
  const { task } = record;
  const detail = task.detail.trim();
  const isCanvasTask = record.location === "canvas";

  return [
    "---",
    `fourLayerTodo: true`,
    `id: ${markdownValue(task.id)}`,
    `title: ${markdownValue(task.title)}`,
    `location: ${markdownValue(record.location)}`,
    `columnId: ${markdownValue(record.columnId)}`,
    `source: ${markdownValue(task.source)}`,
    `meta: ${markdownValue(task.meta)}`,
    `priority: ${markdownValue(task.priority)}`,
    `object: ${markdownValue(task.object)}`,
    `x: ${markdownValue(isCanvasTask && "x" in task ? task.x : null)}`,
    `y: ${markdownValue(isCanvasTask && "y" in task ? task.y : null)}`,
    `tone: ${markdownValue(isCanvasTask && "tone" in task ? task.tone : null)}`,
    `done: ${markdownValue(isCanvasTask && "done" in task ? task.done : null)}`,
    "---",
    "",
    detail,
    "",
  ].join("\n");
}

function serializeLongTermObjectNote(object: LongTermObject): string {
  return [
    "---",
    "fourLayerTodoObject: true",
    `id: ${markdownValue(object.id)}`,
    `kind: ${markdownValue(object.kind)}`,
    `activity: ${markdownValue(object.activity)}`,
    `tone: ${markdownValue(object.tone)}`,
    `relatedTaskIds: ${markdownValue(object.relatedTaskIds)}`,
    "---",
    "",
    object.description.trim(),
    "",
  ].join("\n");
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const values: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!entry) continue;
    const [, key, rawValue] = entry;
    try {
      values[key] = JSON.parse(rawValue);
    } catch {
      values[key] = rawValue.trim();
    }
  }
  return values;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getLocation(value: unknown): TaskLocation | undefined {
  return ["canvas", "inbox", "todo", "cache", "storage"].includes(String(value))
    ? (value as TaskLocation)
    : undefined;
}

function getPriority(value: unknown): TaskItem["priority"] | undefined {
  return ["P2", "P3", "P4", "P5"].includes(String(value))
    ? (value as TaskItem["priority"])
    : undefined;
}

function getLongTermObjectKind(
  value: unknown,
): LongTermObject["kind"] | undefined {
  return ["兴趣", "目标", "长期想法"].includes(String(value))
    ? (value as LongTermObject["kind"])
    : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseTaskNote(content: string, fileTitle: string): MarkdownTask | null {
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter || frontmatter.fourLayerTodo !== true) return null;

  const id = getString(frontmatter.id);
  const location = getLocation(frontmatter.location);
  if (!id || !location) return null;

  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  const legacyHeading = body.match(/^#\s+(.+?)(?:\r?\n|$)/);
  const detail =
    legacyHeading?.[1].trim() === fileTitle
      ? body.slice(legacyHeading[0].length).trim()
      : body;
  const source = frontmatter.source === "笔记" ? "笔记" : "文本";

  return {
    id,
    location,
    columnId: getString(frontmatter.columnId),
    title: getString(frontmatter.title) ?? (fileTitle || "未命名待办"),
    detail,
    source,
    meta: getString(frontmatter.meta),
    priority: getPriority(frontmatter.priority),
    object: getString(frontmatter.object),
    x: getNumber(frontmatter.x),
    y: getNumber(frontmatter.y),
    tone: getString(frontmatter.tone),
    done: typeof frontmatter.done === "boolean" ? frontmatter.done : undefined,
  };
}

function parseLongTermObjectNote(
  content: string,
  fileTitle: string,
): LongTermObject | null {
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter || frontmatter.fourLayerTodoObject !== true) return null;

  const id = getString(frontmatter.id);
  if (!id) return null;

  const kind = getLongTermObjectKind(frontmatter.kind) ?? "长期想法";
  const defaultTone =
    kind === "兴趣" ? "mint" : kind === "目标" ? "peach" : "lilac";
  const description = content
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .trim();

  return {
    id,
    kind,
    title: fileTitle || "未命名长期对象",
    description: description || "暂无说明。",
    activity: getString(frontmatter.activity) ?? "等待关联任务",
    tone: getString(frontmatter.tone) ?? defaultTone,
    relatedTaskIds: getStringArray(frontmatter.relatedTaskIds),
  };
}

function taskFileStem(title: string): string {
  const stem = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return stem || "未命名待办";
}

function archiveDateFolder(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createManagedTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nativeCanvasColor(tone: string): string {
  if (tone === "sage") return "4";
  if (tone === "lavender") return "6";
  if (tone === "blue") return "5";
  return "3";
}

function getTaskFolder(
  rootFolder: string,
  record: TaskRecord,
  state: WorkspaceState,
): string {
  if (record.location === "canvas") return `${rootFolder}/白板`;
  if (record.location === "inbox") return `${rootFolder}/缓存工作台/收集箱`;
  if (record.location === "todo") return `${rootFolder}/缓存工作台/待办列表`;
  if (record.location === "cache") return `${rootFolder}/缓存工作台/缓存列表`;

  const column = state.storeColumns.find((item) => item.id === record.columnId);
  return `${rootFolder}/任务存储器/${taskFileStem(column?.title ?? "未分类任务池")}`;
}

function getTaskPoolTitleFromPath(
  rootFolder: string,
  path: string,
): string | undefined {
  const prefix = `${rootFolder}/任务存储器/`;
  if (!path.startsWith(prefix)) return undefined;

  const relativePath = path.slice(prefix.length);
  const [poolTitle, child] = relativePath.split("/");
  return poolTitle && child ? poolTitle : undefined;
}

function getTaskLocationFromPath(
  rootFolder: string,
  path: string,
): Pick<MarkdownTask, "location" | "columnId"> & { poolTitle?: string } | null {
  if (path.startsWith(`${rootFolder}/白板/`)) return { location: "canvas" };
  if (path.startsWith(`${rootFolder}/缓存工作台/收集箱/`)) {
    return { location: "inbox" };
  }
  if (path.startsWith(`${rootFolder}/缓存工作台/待办列表/`)) {
    return { location: "todo" };
  }
  if (path.startsWith(`${rootFolder}/缓存工作台/缓存列表/`)) {
    return { location: "cache" };
  }

  const poolTitle = getTaskPoolTitleFromPath(rootFolder, path);
  return poolTitle ? { location: "storage", poolTitle } : null;
}

class FourLayerTodoView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: FourLayerTodoPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "四层待办";
  }

  getIcon(): string {
    return "layers";
  }

  async onOpen(): Promise<void> {
    try {
      this.contentEl.empty();
      this.contentEl.addClass("four-layer-todo-plugin");
      const host = this.contentEl.createDiv({ cls: "four-layer-todo-root" });
      const shadow = host.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = rawStyles.replace(":root", ":host");
      shadow.appendChild(style);

      const reset = document.createElement("style");
      reset.textContent = `:host{display:block;height:100%;min-height:0;color:#1d2622;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.four-layer-todo-mount{height:100%;min-height:0}`;
      shadow.prepend(reset);

      const mount = document.createElement("div");
      mount.className = "four-layer-todo-mount";
      shadow.appendChild(mount);
      this.root = createRoot(mount);
      this.root.render(
        <TodoWorkspace
          storage={this.plugin.getWorkspaceStorage()}
          brandIconSrc={this.plugin.getIconResourcePath()}
        />,
      );

      console.log("四层待办: view opened");
    } catch (error) {
      console.error("四层待办: onOpen error", error);
      new Notice(`四层待办加载失败: ${(error as Error).message}`);
    }
  }

  async onClose(): Promise<void> {
    try {
      this.root?.unmount();
    } catch (error) {
      console.error("四层待办: onClose error", error);
    }
    this.root = null;
  }
}

class FourLayerTodoSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: FourLayerTodoPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Markdown 内容同步" });

    new Setting(containerEl)
      .setName("将内容同步为 Markdown")
      .setDesc("为每张待办卡和长期对象创建可在 Obsidian 中双向编辑的 .md 文件。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.markdownSyncEnabled)
          .onChange(async (value) => {
            this.plugin.settings.markdownSyncEnabled = value;
            await this.plugin.saveSettings(value);
          }),
      );

    new Setting(containerEl)
      .setName("待办与对象文件夹")
      .setDesc("相对于当前 Vault 根目录。长期对象保存在其中的“长期对象”目录。")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.taskNotesFolder)
          .setValue(this.plugin.settings.taskNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.taskNotesFolder = value;
            await this.plugin.saveSettings(false);
          }),
      );

    new Setting(containerEl)
      .setName("立即同步")
      .setDesc("将当前待办和长期对象写入配置的文件夹。")
      .addButton((button) =>
        button.setButtonText("同步现有待办").onClick(async () => {
          if (!this.plugin.settings.markdownSyncEnabled) {
          new Notice("请先启用“将内容同步为 Markdown”");
            return;
          }
          await this.plugin.syncMarkdownBidirectionally();
          new Notice("四层待办已与 Markdown 文件双向同步");
        }),
      );
  }
}

export default class FourLayerTodoPlugin extends Plugin {
  settings: FourLayerTodoSettings = { ...DEFAULT_SETTINGS };
  private workspaceState: WorkspaceState | null = null;
  private readonly workspaceListeners = new Set<
    (state: Partial<WorkspaceState>) => void
  >();
  private readonly taskPaths = new Map<string, string>();
  private readonly longTermObjectPaths = new Map<string, string>();
  private readonly pendingMarkdownWrites = new Map<string, string>();
  private readonly pendingNativeCanvasWrites = new Map<string, string>();
  // Obsidian emits rename events for the plugin's own folder/title sync. Those
  // events must not be re-imported as user edits, or collision suffixes become
  // task titles and trigger another sync cycle.
  private readonly pendingMarkdownRenames = new Set<string>();
  private workspaceSaveQueue: Promise<void> = Promise.resolve();
  private markdownEventQueue: Promise<void> = Promise.resolve();
  private skipNextNativeCanvasSync = false;
  // Every Markdown mutation shares this queue so a card move cannot race a
  // workspace save or a Vault event for the same note.
  private markdownMutationQueue: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    console.log("四层待办: onload");

    const data = (await this.loadData()) as PluginData | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data?.settings };
    this.workspaceState = data?.workspace ? clone(data.workspace) : null;
    if (this.workspaceState) {
      const cleanedState = removeLegacySampleData(this.workspaceState);
      if (cleanedState !== this.workspaceState) {
        this.workspaceState = cleanedState;
      }
    }

    if (this.settings.resetGuidedSample || !this.workspaceState) {
      await this.restoreGuidedSample();
      this.settings.resetGuidedSample = false;
      this.settings.guidedSampleVersion = GUIDED_SAMPLE_VERSION;
      await this.persistWorkspace();
      if (this.settings.markdownSyncEnabled) {
        try {
          await this.syncWorkspaceToMarkdown();
          await this.refreshMarkdownPaths();
        } catch (error) {
          console.error("四层待办: guided sample sync error", error);
          new Notice("示例已恢复，但 Markdown 同步失败。请在设置中重试同步。");
        }
      }
    } else {
      if (this.settings.guidedSampleVersion !== GUIDED_SAMPLE_VERSION) {
        const migratedState = restoreMissingGuidedConnections(
          this.workspaceState,
        );
        this.workspaceState = migratedState;
      }
      this.settings.resetGuidedSample = false;
      this.settings.guidedSampleVersion = GUIDED_SAMPLE_VERSION;
      await this.persistWorkspace();
    }

    if (
      !this.settings.resetGuidedSample &&
      this.workspaceState &&
      this.settings.markdownSyncEnabled
    ) {
      try {
        await this.syncMarkdownBidirectionally();
      } catch (error) {
        console.error("四层待办: markdown startup sync error", error);
      }
    }

    await this.loadDefaultNativeCanvas();

    this.registerView(VIEW_TYPE, (leaf) => new FourLayerTodoView(leaf, this));
    this.addSettingTab(new FourLayerTodoSettingTab(this));
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile) {
          if (file.extension === "canvas" && this.isTaskNativeCanvas(file.path)) {
            this.queueMarkdownEvent(() => this.importNativeCanvas(file));
            return;
          }
          this.queueMarkdownEvent(() => this.importMarkdownNote(file));
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile) {
          if (file.extension === "canvas" && this.isTaskNativeCanvas(file.path)) {
            this.queueMarkdownEvent(() => this.importNativeCanvas(file));
            return;
          }
          this.queueMarkdownEvent(() => this.importMarkdownNote(file));
        }
        if (file instanceof TFolder) {
          this.queueMarkdownEvent(() => this.importTaskPoolFolder(file));
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile) {
          this.queueMarkdownEvent(() => this.removeDeletedMarkdownNote(file));
        }
        if (file instanceof TFolder) {
          this.queueMarkdownEvent(() => this.removeDeletedTaskPoolFolder(file));
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile) {
          this.queueMarkdownEvent(() =>
            this.updateRenamedMarkdownNote(file, oldPath),
          );
        }
        if (file instanceof TFolder) {
          this.queueMarkdownEvent(() =>
            this.updateRenamedTaskPoolFolder(file, oldPath),
          );
        }
      }),
    );

    this.addRibbonIcon("layers", "打开四层待办", () => {
      this.activateView().catch((error) => {
        console.error("四层待办: ribbon error", error);
        new Notice("四层待办打开失败");
      });
    });

    this.addCommand({
      id: "open-four-layer-todo",
      name: "打开四层待办",
      callback: () => {
        this.activateView().catch((error) => {
          console.error("四层待办: command error", error);
          new Notice("四层待办打开失败");
        });
      },
    });

    try {
      this.app.workspace.onLayoutReady(() => {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0) {
          this.activateView(false).catch((error) => {
            console.error("四层待办: auto-open error", error);
          });
        }
      });
    } catch (error) {
      console.error("四层待办: onLayoutReady error", error);
    }
  }

  onunload(): void {
    console.log("四层待办: onunload");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  getIconResourcePath(): string {
    return todoIconDataUrl;
  }

  getWorkspaceStorage(): WorkspaceStorage {
    return {
      load: () => this.loadWorkspace(),
      save: (state) => this.saveWorkspace(state),
      archiveTask: (taskId) => this.archiveMarkdownTask(taskId),
      deleteTask: (taskId) => this.deleteMarkdownTask(taskId),
      searchNotes: (query) => this.searchNotes(query),
      moveTaskNote: (path, target) => this.moveTaskNote(path, target),
      moveTaskById: (taskId, target) => this.moveTaskById(taskId, target),
      openNote: (path) => this.openNote(path),
      openTaskNote: (taskId) => this.openTaskNote(taskId),
      openNativeCanvas: () => this.openNativeCanvas(),
      listNativeCanvases: () => this.listNativeCanvases(),
      loadNativeCanvas: (path) => this.loadNativeCanvas(path),
      subscribe: (listener) => {
        this.workspaceListeners.add(listener);
        return () => this.workspaceListeners.delete(listener);
      },
    };
  }

  async saveSettings(syncMarkdown: boolean): Promise<void> {
    await this.persistWorkspace();
    if (syncMarkdown && this.settings.markdownSyncEnabled) {
      await this.syncMarkdownBidirectionally();
    }
  }

  async syncMarkdownBidirectionally(): Promise<void> {
    return this.enqueueMarkdownMutation(async () => {
      await this.syncMarkdownToWorkspace();
      await this.syncWorkspaceToMarkdownInternal();
      await this.refreshMarkdownPaths();
    });
  }

  private enqueueMarkdownMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.markdownMutationQueue
      .catch(() => undefined)
      .then(operation);
    this.markdownMutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async waitForMarkdownMutations(): Promise<void> {
    await this.markdownMutationQueue.catch(() => undefined);
  }

  private async syncWorkspaceToMarkdownInternal(): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.workspaceState) return;

    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder || folder === ".obsidian") {
      new Notice("待办笔记文件夹不能留空或使用 .obsidian");
      return;
    }

    await this.ensureTaskFolderStructure(folder);
    for (const column of this.workspaceState.storeColumns) {
      await this.ensureFolder(
        `${folder}/任务存储器/${taskFileStem(column.title)}`,
      );
    }
    const existingTasks = await this.indexMarkdownTasks(folder);
    const existingObjects = await this.indexMarkdownLongTermObjects(folder);
    const records = getTaskRecords(this.workspaceState);

    for (const record of records) {
      const content = serializeTaskNote(record);
      const known = existingTasks.get(record.task.id);
      const taskFolder = getTaskFolder(folder, record, this.workspaceState);
      await this.ensureFolder(taskFolder);

      if (known) {
        const file = await this.moveMarkdownTaskFile(
          known.file,
          taskFolder,
          record.task.title,
          record.task.id,
        );
        this.taskPaths.set(record.task.id, file.path);
        if (known.content !== content) {
          await this.writeMarkdownTask(file, content);
        }
        continue;
      }

      const file = await this.createMarkdownTaskFile(
        taskFolder,
        record.task.title,
        content,
      );
      this.taskPaths.set(record.task.id, file.path);
    }

    const objectFolder = `${folder}/长期对象`;
    for (const object of this.workspaceState.longTermObjects ?? []) {
      const content = serializeLongTermObjectNote(object);
      const known = existingObjects.get(object.id);

      if (known) {
        const file = await this.moveMarkdownTaskFile(
          known.file,
          objectFolder,
          object.title,
        );
        this.longTermObjectPaths.set(object.id, file.path);
        if (known.content !== content) {
          await this.writeMarkdownTask(file, content);
        }
        continue;
      }

      const file = await this.createMarkdownTaskFile(
        objectFolder,
        object.title,
        content,
      );
      this.longTermObjectPaths.set(object.id, file.path);
    }
  }

  async syncWorkspaceToMarkdown(): Promise<void> {
    return this.enqueueMarkdownMutation(() => this.syncWorkspaceToMarkdownInternal());
  }

  private queueMarkdownEvent(operation: () => Promise<void>): void {
    this.markdownEventQueue = this.markdownEventQueue
      .catch(() => undefined)
      .then(async () => {
        await this.waitForMarkdownMutations();
        await operation();
      })
      .catch((error) => {
        console.error("四层待办: markdown reverse sync error", error);
      });
  }

  private async loadWorkspace(): Promise<Partial<WorkspaceState> | null> {
    return this.workspaceState ? clone(this.workspaceState) : null;
  }

  private saveWorkspace(state: WorkspaceState): Promise<void> {
    const nextState = clone(state);
    this.workspaceSaveQueue = this.workspaceSaveQueue
      .catch(() => undefined)
      .then(async () => {
        this.workspaceState = nextState;
        await this.persistWorkspace();
        await this.syncWorkspaceToMarkdown();
        const skipNativeCanvasSync = this.skipNextNativeCanvasSync;
        this.skipNextNativeCanvasSync = false;
        if (!skipNativeCanvasSync) {
          await this.syncNativeCanvas();
        }
      });
    return this.workspaceSaveQueue;
  }

  private async persistWorkspace(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      workspace: this.workspaceState ?? undefined,
    } satisfies PluginData);
  }

  private emitWorkspace(): void {
    if (!this.workspaceState) return;
    const state = clone(this.workspaceState);
    for (const listener of this.workspaceListeners) listener(state);
  }

  private async ensureFolder(folder: string): Promise<void> {
    const parts = folder.split("/").filter(Boolean);
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existsInVault = this.app.vault.getAbstractFileByPath(currentPath);
      const existsOnDisk = await this.app.vault.adapter.exists(currentPath);
      if (!existsInVault && !existsOnDisk) {
        try {
          await this.app.vault.createFolder(currentPath);
        } catch (error) {
          if (!(await this.app.vault.adapter.exists(currentPath))) {
            throw error;
          }
        }
      }
    }
  }

  private async ensureTaskFolderStructure(rootFolder: string): Promise<void> {
    for (const folder of [
      rootFolder,
      `${rootFolder}/白板`,
      `${rootFolder}/缓存工作台`,
      `${rootFolder}/缓存工作台/收集箱`,
      `${rootFolder}/缓存工作台/待办列表`,
      `${rootFolder}/缓存工作台/缓存列表`,
      `${rootFolder}/任务存储器`,
      `${rootFolder}/归档`,
      `${rootFolder}/长期对象`,
    ]) {
      await this.ensureFolder(folder);
    }
  }

  private async refreshMarkdownPaths(): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder) return;

    const taskNotes = await this.indexMarkdownTasks(folder);
    const objectNotes = await this.indexMarkdownLongTermObjects(folder);
    this.taskPaths.clear();
    this.longTermObjectPaths.clear();
    for (const [taskId, note] of taskNotes) {
      if (isLegacySampleId(taskId)) continue;
      this.taskPaths.set(taskId, note.file.path);
    }
    for (const [objectId, note] of objectNotes) {
      if (isLegacySampleId(objectId)) continue;
      this.longTermObjectPaths.set(objectId, note.file.path);
    }
  }

  private getTaskPoolFolders(rootFolder: string): TFolder[] {
    const storageFolder = `${rootFolder}/任务存储器`;
    return this.app.vault
      .getAllLoadedFiles()
      .filter(
        (file): file is TFolder =>
          file instanceof TFolder && file.parent?.path === storageFolder,
      );
  }

  private ensureTaskPoolColumn(
    state: WorkspaceState,
    poolTitle: string,
    preferredColumnId?: string,
  ): { state: WorkspaceState; columnId: string; changed: boolean } {
    const existing = state.storeColumns.find(
      (column) => taskFileStem(column.title) === poolTitle,
    );
    if (existing) return { state, columnId: existing.id, changed: false };

    const columnId =
      preferredColumnId &&
      !state.storeColumns.some((column) => column.id === preferredColumnId)
        ? preferredColumnId
        : createManagedTaskId().replace(/^task-/, "pool-");
    const nextColumn = {
      id: columnId,
      title: poolTitle,
      hint: "从 Markdown 任务池同步",
      tone: TASK_POOL_TONES[state.storeColumns.length % TASK_POOL_TONES.length],
      tasks: [],
    };
    return {
      state: { ...clone(state), storeColumns: [...state.storeColumns, nextColumn] },
      columnId,
      changed: true,
    };
  }

  private placeMarkdownTaskFromPath(
    state: WorkspaceState,
    task: MarkdownTask,
    path: string,
    rootFolder: string,
  ): { state: WorkspaceState; task: MarkdownTask } {
    const placement = getTaskLocationFromPath(rootFolder, path);
    if (!placement) return { state, task };
    if (placement.location !== "storage" || !placement.poolTitle) {
      return {
        state,
        task: { ...task, location: placement.location, columnId: undefined },
      };
    }

    const pool = this.ensureTaskPoolColumn(
      state,
      placement.poolTitle,
      task.columnId,
    );
    return {
      state: pool.state,
      task: { ...task, location: "storage", columnId: pool.columnId },
    };
  }

  private async syncMarkdownToWorkspace(): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.workspaceState) return;
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder) return;

    let state = this.workspaceState;
    for (const poolFolder of this.getTaskPoolFolders(folder)) {
      state = this.ensureTaskPoolColumn(state, poolFolder.name).state;
    }

    const taskNotes = await this.indexMarkdownTasks(folder);
    this.taskPaths.clear();
    for (const [taskId, note] of taskNotes) {
      if (isLegacySampleId(taskId)) continue;
      const parsed = parseTaskNote(note.content, note.file.basename);
      if (!parsed) continue;
      const placed = this.placeMarkdownTaskFromPath(
        state,
        parsed,
        note.file.path,
        folder,
      );
      state = this.upsertMarkdownTask(placed.state, placed.task);
      this.taskPaths.set(taskId, note.file.path);
    }

    const objectNotes = await this.indexMarkdownLongTermObjects(folder);
    this.longTermObjectPaths.clear();
    for (const [objectId, note] of objectNotes) {
      if (isLegacySampleId(objectId)) continue;
      const object = parseLongTermObjectNote(note.content, note.file.basename);
      if (!object) continue;
      state = this.upsertMarkdownLongTermObject(state, object);
      this.longTermObjectPaths.set(objectId, note.file.path);
    }

    this.workspaceState = state;
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async importTaskPoolFolder(folder: TFolder): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.workspaceState) return;
    const rootFolder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (folder.parent?.path !== `${rootFolder}/任务存储器`) return;

    const pool = this.ensureTaskPoolColumn(this.workspaceState, folder.name);
    if (!pool.changed) return;
    this.workspaceState = pool.state;
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async updateRenamedTaskPoolFolder(
    folder: TFolder,
    oldPath: string,
  ): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.workspaceState) return;
    const rootFolder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const storageFolder = `${rootFolder}/任务存储器`;
    const oldParent = oldPath.slice(0, oldPath.lastIndexOf("/"));
    const newParent = folder.parent?.path;
    if (oldParent !== storageFolder && newParent === storageFolder) {
      await this.importTaskPoolFolder(folder);
      return;
    }
    if (oldParent === storageFolder && newParent !== storageFolder) {
      await this.removeTaskPoolColumnByTitle(
        oldPath.slice(oldPath.lastIndexOf("/") + 1),
      );
      return;
    }
    if (oldParent !== storageFolder || newParent !== storageFolder) return;

    const oldTitle = oldPath.slice(oldPath.lastIndexOf("/") + 1);
    const column = this.workspaceState.storeColumns.find(
      (item) => taskFileStem(item.title) === oldTitle,
    );
    if (!column) {
      await this.importTaskPoolFolder(folder);
      return;
    }

    this.workspaceState = {
      ...clone(this.workspaceState),
      storeColumns: this.workspaceState.storeColumns.map((item) =>
        item.id === column.id ? { ...item, title: folder.name } : item,
      ),
    };
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async removeDeletedTaskPoolFolder(folder: TFolder): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.workspaceState) return;
    const rootFolder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const storagePrefix = `${rootFolder}/任务存储器/`;
    if (!folder.path.startsWith(storagePrefix)) return;
    const poolTitle = folder.path.slice(storagePrefix.length);
    if (!poolTitle || poolTitle.includes("/")) return;

    await this.removeTaskPoolColumnByTitle(poolTitle);
  }

  private async removeTaskPoolColumnByTitle(poolTitle: string): Promise<void> {
    if (!this.workspaceState) return;
    const column = this.workspaceState.storeColumns.find(
      (item) => taskFileStem(item.title) === poolTitle,
    );
    if (!column || column.tasks.length > 0) return;
    this.workspaceState = {
      ...clone(this.workspaceState),
      storeColumns: this.workspaceState.storeColumns.filter(
        (item) => item.id !== column.id,
      ),
    };
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async restoreGuidedSample(): Promise<void> {
    this.taskPaths.clear();
    this.longTermObjectPaths.clear();
    this.workspaceState = createGuidedSampleWorkspace();
  }

  private isManagedMarkdownNote(file: TFile): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return (
      Boolean(folder) &&
      file.extension === "md" &&
      file.path.startsWith(`${folder}/`) &&
      !this.isArchivedMarkdownPath(file.path) &&
      !this.isNativeWhiteboardPath(file.path)
    );
  }

  private isArchivedMarkdownPath(path: string): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return Boolean(folder) && path.startsWith(`${folder}/归档/`);
  }

  private isNativeWhiteboardPath(path: string): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return Boolean(folder) && path.startsWith(`${folder}/白板/`);
  }

  private isTaskFolderNotePath(path: string): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return (
      Boolean(folder) &&
      path.startsWith(`${folder}/`) &&
      !this.isArchivedMarkdownPath(path) &&
      !this.isNativeWhiteboardPath(path) &&
      !path.startsWith(`${folder}/长期对象/`)
    );
  }

  private isMovableTaskFolderNotePath(path: string): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return (
      this.isTaskFolderNotePath(path) ||
      (Boolean(folder) && path.startsWith(`${folder}/白板/`) && path.endsWith(".md"))
    );
  }

  private async searchNotes(query: string): Promise<LinkedNoteSuggestion[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => {
        if (!normalizedQuery) return this.isMovableTaskFolderNotePath(file.path);
        return `${file.basename} ${file.path}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 40);

    return files.map((file) => ({
      path: file.path,
      title: file.basename,
      isTaskFolderNote: this.isMovableTaskFolderNotePath(file.path),
    }));
  }

  private async openNote(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf("tab").openFile(file);
    }
  }

  private async openTaskNote(taskId: string): Promise<void> {
    await this.workspaceSaveQueue.catch(() => undefined);
    let path = this.taskPaths.get(taskId);

    if (!path) {
      await this.refreshMarkdownPaths();
      path = this.taskPaths.get(taskId);
    }

    if (!path && this.settings.markdownSyncEnabled) {
      await this.syncWorkspaceToMarkdown();
      path = this.taskPaths.get(taskId);
    }

    if (!path) {
      const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
      if (folder) {
        path = (await this.findMarkdownTaskFileAnywhere(folder, taskId))?.path;
      }
    }

    if (!path) {
      throw new Error(`找不到任务 ${taskId} 对应的 Markdown 笔记`);
    }

    await this.openNote(path);
  }

  private async syncNativeCanvas(): Promise<void> {
    if (!this.workspaceState) {
      throw new Error("白板尚未初始化");
    }

    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder || folder === ".obsidian") {
      throw new Error("待办笔记文件夹不可用");
    }

    await this.ensureTaskFolderStructure(folder);
    const nativeCanvasFolder = `${folder}/白板`;
    const nodes: NativeCanvasNode[] = [];
    const nodeIds = new Set<string>();

    for (const card of this.workspaceState.canvasCards) {
      nodes.push(
        card.linkedNotePath
          ? {
              id: card.id,
              type: "file",
              file: card.linkedNotePath,
              x: card.x,
              y: card.y,
              width: 250,
              height: 142,
              color: nativeCanvasColor(card.tone),
            }
          : {
              id: card.id,
              type: "text",
              text: `${NATIVE_CANVAS_TASK_MARKER}\n**${card.title}**${
                card.detail ? `\n\n${card.detail}` : ""
              }`,
              x: card.x,
              y: card.y,
              width: 250,
              height: 142,
              color: nativeCanvasColor(card.tone),
            },
      );
      nodeIds.add(card.id);
    }

    for (const note of this.workspaceState.canvasTextNotes ?? []) {
      nodes.push({
        id: note.id,
        type: "text",
        text: note.content,
        x: note.x,
        y: note.y,
        width: 220,
        height: 100,
        color: "3",
      });
      nodeIds.add(note.id);
    }

    const edges: NativeCanvasEdge[] = (this.workspaceState.canvasConnections ?? [])
      .filter(
        (connection) =>
          nodeIds.has(connection.fromId) && nodeIds.has(connection.toId),
      )
      .map((connection) => ({
        id: connection.id,
        fromNode: connection.fromId,
        fromSide: "right",
        toNode: connection.toId,
        toSide: "left",
        toEnd: "arrow",
      }));
    const content = JSON.stringify({ nodes, edges }, null, 2);
    const path = `${nativeCanvasFolder}/${NATIVE_CANVAS_FILE_NAME}`;
    const existing = this.app.vault.getAbstractFileByPath(path);

    this.pendingNativeCanvasWrites.set(path, content);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(path, content);
    }
  }

  private async openNativeCanvas(): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder || folder === ".obsidian") {
      throw new Error("待办笔记文件夹不可用");
    }

    const path = `${folder}/白板/${NATIVE_CANVAS_FILE_NAME}`;
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      await this.syncNativeCanvas();
      file = this.app.vault.getAbstractFileByPath(path);
    }
    if (!(file instanceof TFile)) {
      throw new Error("无法创建原生 Canvas");
    }
    await this.app.workspace.getLeaf("tab").openFile(file);
  }

  private isTaskNativeCanvas(path: string): boolean {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    return path === `${folder}/白板/${NATIVE_CANVAS_FILE_NAME}`;
  }

  private async loadDefaultNativeCanvas(): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const path = `${folder}/白板/${NATIVE_CANVAS_FILE_NAME}`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.loadNativeCanvas(path, false);
    }
  }

  private async importNativeCanvas(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const pendingContent = this.pendingNativeCanvasWrites.get(file.path);
    if (pendingContent !== undefined) {
      this.pendingNativeCanvasWrites.delete(file.path);
      if (pendingContent === content) return;
    }
    await this.loadNativeCanvas(file.path);
  }

  private async listNativeCanvases(): Promise<NativeCanvasFile[]> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder || folder === ".obsidian") return [];

    const whiteboardFolder = `${folder}/白板/`;
    return this.app.vault
      .getFiles()
      .filter(
        (file) =>
          file.extension === "canvas" && file.path.startsWith(whiteboardFolder),
      )
      .map((file) => ({ path: file.path, title: file.basename }))
      .sort((left, right) => left.title.localeCompare(right.title, "zh-Hans-CN"));
  }

  private async loadNativeCanvas(
    path: string,
    fromExternalEdit = true,
  ): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const whiteboardFolder = `${folder}/白板/`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (
      !folder ||
      !path.startsWith(whiteboardFolder) ||
      !(file instanceof TFile) ||
      file.extension !== "canvas" ||
      !this.workspaceState
    ) {
      throw new Error("Canvas 文件不可用");
    }

    const raw = JSON.parse(await this.app.vault.read(file)) as {
      nodes?: unknown;
      edges?: unknown;
    };
    if (!Array.isArray(raw.nodes)) {
      throw new Error("Canvas 文件格式无效");
    }

    const cards: WorkspaceState["canvasCards"] = [];
    const textNotes: NonNullable<WorkspaceState["canvasTextNotes"]> = [];
    const cardIds = new Set<string>();

    for (const rawNode of raw.nodes) {
      if (!rawNode || typeof rawNode !== "object") continue;
      const node = rawNode as Record<string, unknown>;
      const id = getString(node.id);
      const type = getString(node.type);
      if (!id || (type !== "file" && type !== "text")) continue;

      const x = getNumber(node.x) ?? 160;
      const y = getNumber(node.y) ?? 140;
      const color = getString(node.color);
      const tone =
        color === "4"
          ? "sage"
          : color === "6"
            ? "lavender"
            : color === "5"
              ? "blue"
              : "cream";

      if (type === "file") {
        const notePath = getString(node.file);
        const noteFile = notePath
          ? this.app.vault.getAbstractFileByPath(notePath)
          : null;
        if (!(noteFile instanceof TFile)) continue;

        const content = await this.app.vault.read(noteFile);
        const parsedTask = parseTaskNote(content, noteFile.basename);
        cards.push({
          id,
          title: parsedTask?.title ?? noteFile.basename,
          detail: parsedTask?.detail ?? "",
          source: "笔记",
          meta: parsedTask?.meta ?? "Canvas 笔记",
          priority: parsedTask?.priority,
          object: parsedTask?.object,
          done: parsedTask?.done,
          linkedNotePath: noteFile.path,
          x,
          y,
          tone,
        });
        cardIds.add(id);
        if (parsedTask) this.taskPaths.set(parsedTask.id, noteFile.path);
        continue;
      }

      const text = getString(node.text) ?? "";
      if (text.startsWith(NATIVE_CANVAS_TASK_MARKER)) {
        const taskText = text
          .slice(NATIVE_CANVAS_TASK_MARKER.length)
          .trimStart();
        const heading = taskText.match(/^\*\*(.+?)\*\*(?:\r?\n\r?\n)?/);
        const title = heading?.[1].trim() || "未命名待办";
        const detail = heading
          ? taskText.slice(heading[0].length).trim()
          : taskText;
        cards.push({
          id,
          title,
          detail,
          source: "文本",
          meta: "Canvas 待办",
          x,
          y,
          tone,
        });
        cardIds.add(id);
      } else {
        textNotes.push({ id, content: text, x, y });
      }
    }

    const connections = Array.isArray(raw.edges)
      ? raw.edges.flatMap((rawEdge) => {
          if (!rawEdge || typeof rawEdge !== "object") return [];
          const edge = rawEdge as Record<string, unknown>;
          const id = getString(edge.id);
          const fromId = getString(edge.fromNode);
          const toId = getString(edge.toNode);
          return id &&
            fromId &&
            toId &&
            cardIds.has(fromId) &&
            cardIds.has(toId)
            ? [{ id, fromId, toId }]
            : [];
        })
      : [];

    this.workspaceState = {
      ...this.workspaceState,
      canvasCards: cards,
      canvasTextNotes: textNotes,
      canvasConnections: connections,
    };
    if (fromExternalEdit) {
      this.skipNextNativeCanvasSync = true;
    }
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async indexMarkdownTasks(folder: string): Promise<Map<string, IndexedMarkdownTask>> {
    const notes = new Map<string, IndexedMarkdownTask>();
    const files = this.app.vault
      .getMarkdownFiles()
      .filter(
        (file) =>
          file.path.startsWith(`${folder}/`) &&
          !this.isArchivedMarkdownPath(file.path) &&
          !this.isNativeWhiteboardPath(file.path),
      );

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const task = parseTaskNote(content, file.basename);
      if (!task) continue;
      const known = notes.get(task.id);
      const trackedPath = this.taskPaths.get(task.id);
      if (!known || file.path === trackedPath) {
        notes.set(task.id, { file, content });
      }
    }
    return notes;
  }

  private async findMarkdownTaskFileInFolder(
    folder: string,
    taskId: string,
  ): Promise<TFile | null> {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.parent?.path === folder);

    for (const file of files) {
      const content = await this.app.vault.read(file);
      if (parseTaskNote(content, file.basename)?.id === taskId) {
        return file;
      }
    }
    return null;
  }

  private async findMarkdownTaskFileAnywhere(
    rootFolder: string,
    taskId: string,
  ): Promise<TFile | null> {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter(
        (file) =>
          file.path.startsWith(`${rootFolder}/`) &&
          !this.isArchivedMarkdownPath(file.path),
      );

    for (const file of files) {
      const content = await this.app.vault.read(file);
      if (parseTaskNote(content, file.basename)?.id === taskId) return file;
    }
    return null;
  }

  private async indexMarkdownLongTermObjects(
    folder: string,
  ): Promise<Map<string, IndexedMarkdownLongTermObject>> {
    const notes = new Map<string, IndexedMarkdownLongTermObject>();
    const objectFolder = `${folder}/长期对象/`;
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(objectFolder));

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const object = parseLongTermObjectNote(content, file.basename);
      if (!object) continue;
      notes.set(object.id, { file, content });
    }
    return notes;
  }

  private async createMarkdownTaskFile(
    folder: string,
    title: string,
    content: string,
  ): Promise<TFile> {
    const stem = taskFileStem(title);
    let path = `${folder}/${stem}.md`;
    let suffix = 2;

    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `${folder}/${stem} ${suffix}.md`;
      suffix += 1;
    }

    this.pendingMarkdownWrites.set(path, content);
    return this.app.vault.create(path, content);
  }

  private async moveMarkdownTaskFile(
    file: TFile,
    folder: string,
    title: string,
    taskId?: string,
  ): Promise<TFile> {
    const oldPath = file.path;
    if (taskId && file.parent?.path !== folder) {
      const duplicate = await this.findMarkdownTaskFileInFolder(folder, taskId);
      if (duplicate && duplicate.path !== oldPath) return duplicate;
    }
    const targetPath = this.getAvailableTaskPath(folder, title, oldPath);
    if (oldPath === targetPath) return file;

    this.pendingMarkdownRenames.add(oldPath);
    this.pendingMarkdownRenames.add(targetPath);
    try {
      await this.app.vault.rename(file, targetPath);
    } catch (error) {
      this.pendingMarkdownRenames.delete(oldPath);
      this.pendingMarkdownRenames.delete(targetPath);
      throw error;
    }
    const pendingContent = this.pendingMarkdownWrites.get(oldPath);
    if (pendingContent !== undefined) {
      this.pendingMarkdownWrites.delete(oldPath);
      this.pendingMarkdownWrites.set(targetPath, pendingContent);
    }
    const moved = this.app.vault.getAbstractFileByPath(targetPath);
    return moved instanceof TFile ? moved : file;
  }

  private getAvailableTaskPath(
    folder: string,
    title: string,
    currentPath?: string,
  ): string {
    const stem = taskFileStem(title);
    let path = `${folder}/${stem}.md`;
    let suffix = 2;

    while (
      this.app.vault.getAbstractFileByPath(path) &&
      path !== currentPath
    ) {
      path = `${folder}/${stem} ${suffix}.md`;
      suffix += 1;
    }

    return path;
  }

  private async writeMarkdownTask(file: TFile, content: string): Promise<void> {
    this.pendingMarkdownWrites.set(file.path, content);
    await this.app.vault.modify(file, content);
  }

  private archiveMarkdownTask(taskId: string): Promise<void> {
    return this.enqueueMarkdownMutation(() =>
      this.archiveMarkdownTaskInternal(taskId),
    );
  }

  private async archiveMarkdownTaskInternal(taskId: string): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!this.settings.markdownSyncEnabled || !folder) {
      throw new Error("归档需要启用 Markdown 同步");
    }

    let path = this.taskPaths.get(taskId);
    if (!path) {
      const notes = await this.indexMarkdownTasks(folder);
      path = notes.get(taskId)?.file.path;
    }
    if (!path) return;

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;

    const archiveFolder = `${folder}/归档/${archiveDateFolder()}`;
    await this.ensureFolder(archiveFolder);
    await this.moveMarkdownTaskFile(file, archiveFolder, file.basename);
    this.taskPaths.delete(taskId);
  }

  private deleteMarkdownTask(taskId: string): Promise<void> {
    return this.enqueueMarkdownMutation(() =>
      this.deleteMarkdownTaskInternal(taskId),
    );
  }

  private async deleteMarkdownTaskInternal(taskId: string): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    if (!folder) return;

    let path = this.taskPaths.get(taskId);
    if (!path) {
      const notes = await this.indexMarkdownTasks(folder);
      path = notes.get(taskId)?.file.path;
    }
    if (!path) return;

    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      this.pendingMarkdownWrites.delete(file.path);
      await this.app.vault.trash(file, true);
    }
    this.taskPaths.delete(taskId);
  }

  private moveTaskNote(
    path: string,
    target: NoteTaskTarget,
  ): Promise<void> {
    return this.enqueueMarkdownMutation(() =>
      this.moveTaskNoteInternal(path, target),
    );
  }

  private moveTaskById(
    taskId: string,
    target: NoteTaskTarget,
  ): Promise<boolean> {
    return this.enqueueMarkdownMutation(async () => {
      const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
      if (!folder) return false;
      const path =
        this.taskPaths.get(taskId) ??
        (await this.findMarkdownTaskFileAnywhere(folder, taskId))?.path;
      if (!path) return false;
      await this.moveTaskNoteInternal(path, target);
      return true;
    });
  }

  private async moveTaskNoteInternal(
    path: string,
    target: NoteTaskTarget,
  ): Promise<void> {
    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const file = this.app.vault.getAbstractFileByPath(path);
    const isWhiteboardMarkdown =
      Boolean(folder) &&
      file instanceof TFile &&
      file.extension === "md" &&
      path.startsWith(`${folder}/白板/`);
    if (
      !folder ||
      !(file instanceof TFile) ||
      (!this.isTaskFolderNotePath(path) && !isWhiteboardMarkdown)
    ) {
      return;
    }
    if (!this.workspaceState) return;

    const sourceContent = await this.app.vault.read(file);
    const existing = parseTaskNote(sourceContent, file.basename);
    const targetObject = (this.workspaceState.longTermObjects ?? []).find(
      (object) => object.id === target.objectId,
    );
    const body = sourceContent
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
      .trim();
    const markdownTask: MarkdownTask = {
      id: existing?.id ?? createManagedTaskId(),
      location: target.location,
      columnId: target.location === "storage" ? target.columnId : undefined,
      title: existing?.title ?? file.basename,
      detail: existing?.detail ?? body,
      source: existing?.source ?? "笔记",
      meta: existing?.meta ?? "已移动笔记",
      priority: existing?.priority,
      object: targetObject?.title ?? existing?.object,
      x: target.location === "canvas" ? existing?.x : undefined,
      y: target.location === "canvas" ? existing?.y : undefined,
      tone: target.location === "canvas" ? existing?.tone : undefined,
      done: target.location === "canvas" ? existing?.done : undefined,
      linkedNotePath: path,
    };

    this.workspaceState = this.upsertMarkdownTask(this.workspaceState, markdownTask);
    if (targetObject) {
      this.workspaceState = {
        ...this.workspaceState,
        longTermObjects: (this.workspaceState.longTermObjects ?? []).map(
          (object) =>
            object.id === targetObject.id
              ? {
                  ...object,
                  activity: `最近关联：${markdownTask.title}`,
                  relatedTaskIds: [
                    ...new Set([...object.relatedTaskIds, markdownTask.id]),
                  ],
                }
              : object,
        ),
      };
    }
    const task = [
      ...this.workspaceState.canvasCards,
      ...this.workspaceState.inbox,
      ...this.workspaceState.todo,
      ...this.workspaceState.cache,
      ...this.workspaceState.storeColumns.flatMap((column) => column.tasks),
    ].find((item) => item.id === markdownTask.id);
    const record = task
      ? {
          task,
          location: markdownTask.location,
          columnId: markdownTask.columnId,
        }
      : undefined;
    if (!record) return;

    await this.ensureTaskFolderStructure(folder);
    const content = serializeTaskNote(record);
    await this.writeMarkdownTask(file, content);
    const targetFolder = getTaskFolder(folder, record, this.workspaceState);
    await this.ensureFolder(targetFolder);
    const moved = await this.moveMarkdownTaskFile(
      file,
      targetFolder,
      markdownTask.title,
      markdownTask.id,
    );
    this.taskPaths.set(markdownTask.id, moved.path);
    if (target.location === "canvas" && this.workspaceState) {
      this.workspaceState = {
        ...this.workspaceState,
        canvasCards: this.workspaceState.canvasCards.map((card) =>
          card.id === markdownTask.id
            ? { ...card, linkedNotePath: moved.path }
            : card,
        ),
      };
    }
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async importMarkdownNote(file: TFile): Promise<void> {
    if (!this.settings.markdownSyncEnabled || !this.isManagedMarkdownNote(file)) {
      return;
    }

    const content = await this.app.vault.read(file);
    const pendingContent = this.pendingMarkdownWrites.get(file.path);
    if (pendingContent !== undefined) {
      this.pendingMarkdownWrites.delete(file.path);
      if (pendingContent === content) return;
    }

    const markdownObject = parseLongTermObjectNote(content, file.basename);
    if (markdownObject && this.workspaceState) {
      if (isLegacySampleId(markdownObject.id)) return;
      this.longTermObjectPaths.set(markdownObject.id, file.path);
      this.workspaceState = this.upsertMarkdownLongTermObject(
        this.workspaceState,
        markdownObject,
      );
      await this.persistWorkspace();
      this.emitWorkspace();
      return;
    }

    const markdownTask = parseTaskNote(content, file.basename);
    if (!markdownTask || !this.workspaceState) return;
    if (isLegacySampleId(markdownTask.id)) return;

    const folder = normalizeTaskFolder(this.settings.taskNotesFolder);
    const placed = this.placeMarkdownTaskFromPath(
      this.workspaceState,
      markdownTask,
      file.path,
      folder,
    );
    this.taskPaths.set(markdownTask.id, file.path);
    this.workspaceState = this.upsertMarkdownTask(placed.state, placed.task);
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async removeDeletedMarkdownNote(file: TFile): Promise<void> {
    const taskId = [...this.taskPaths.entries()].find(
      ([, path]) => path === file.path,
    )?.[0];
    if (taskId && this.workspaceState) {
      this.taskPaths.delete(taskId);
      this.workspaceState = this.removeTask(this.workspaceState, taskId);
      await this.persistWorkspace();
      this.emitWorkspace();
      return;
    }

    const objectId = [...this.longTermObjectPaths.entries()].find(
      ([, path]) => path === file.path,
    )?.[0];
    if (!objectId || !this.workspaceState) return;

    this.longTermObjectPaths.delete(objectId);
    this.workspaceState = this.removeLongTermObject(this.workspaceState, objectId);
    await this.persistWorkspace();
    this.emitWorkspace();
  }

  private async updateRenamedMarkdownNote(
    file: TFile,
    oldPath: string,
  ): Promise<void> {
    const isPluginRename =
      this.pendingMarkdownRenames.has(oldPath) ||
      this.pendingMarkdownRenames.has(file.path);
    this.pendingMarkdownRenames.delete(oldPath);
    this.pendingMarkdownRenames.delete(file.path);
    if (isPluginRename) {
      return;
    }

    for (const [taskId, path] of this.taskPaths) {
      if (path !== oldPath) continue;
      this.taskPaths.set(taskId, file.path);
      if (this.isArchivedMarkdownPath(file.path)) {
        this.taskPaths.delete(taskId);
        return;
      }
      await this.importMarkdownNote(file);
      return;
    }

    for (const [objectId, path] of this.longTermObjectPaths) {
      if (path !== oldPath) continue;
      this.longTermObjectPaths.set(objectId, file.path);
      if (!this.workspaceState) return;

      this.workspaceState = this.renameLongTermObject(
        this.workspaceState,
        objectId,
        file.basename,
      );
      await this.persistWorkspace();
      this.emitWorkspace();
      return;
    }

    if (!this.isArchivedMarkdownPath(file.path)) {
      await this.importMarkdownNote(file);
    }
  }

  private renameTask(
    state: WorkspaceState,
    taskId: string,
    title: string,
  ): WorkspaceState {
    const rename = <T extends TaskItem>(task: T): T =>
      task.id === taskId ? { ...task, title } : task;

    return {
      ...clone(state),
      canvasCards: state.canvasCards.map(rename),
      inbox: state.inbox.map(rename),
      todo: state.todo.map(rename),
      cache: state.cache.map(rename),
      storeColumns: state.storeColumns.map((column) => ({
        ...column,
        tasks: column.tasks.map(rename),
      })),
    };
  }

  private renameLongTermObject(
    state: WorkspaceState,
    objectId: string,
    title: string,
  ): WorkspaceState {
    const object = (state.longTermObjects ?? []).find((item) => item.id === objectId);
    if (!object || object.title === title) return clone(state);

    const renameTaskObject = <T extends TaskItem>(task: T): T =>
      task.object === object.title ? { ...task, object: title } : task;

    return {
      ...clone(state),
      longTermObjects: (state.longTermObjects ?? []).map((item) =>
        item.id === objectId ? { ...item, title } : item,
      ),
      canvasCards: state.canvasCards.map(renameTaskObject),
      inbox: state.inbox.map(renameTaskObject),
      todo: state.todo.map(renameTaskObject),
      cache: state.cache.map(renameTaskObject),
      storeColumns: state.storeColumns.map((column) => ({
        ...column,
        tasks: column.tasks.map(renameTaskObject),
      })),
    };
  }

  private removeTask(state: WorkspaceState, taskId: string): WorkspaceState {
    return {
      ...clone(state),
      canvasCards: state.canvasCards.filter((task) => task.id !== taskId),
      canvasConnections: state.canvasConnections?.filter(
        (connection) =>
          connection.fromId !== taskId && connection.toId !== taskId,
      ),
      inbox: state.inbox.filter((task) => task.id !== taskId),
      todo: state.todo.filter((task) => task.id !== taskId),
      cache: state.cache.filter((task) => task.id !== taskId),
      storeColumns: state.storeColumns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      })),
    };
  }

  private removeLongTermObject(
    state: WorkspaceState,
    objectId: string,
  ): WorkspaceState {
    return {
      ...clone(state),
      longTermObjects: (state.longTermObjects ?? []).filter(
        (object) => object.id !== objectId,
      ),
    };
  }

  private upsertMarkdownTask(
    state: WorkspaceState,
    markdownTask: MarkdownTask,
  ): WorkspaceState {
    const existing = getTaskRecords(state).find(
      (record) => record.task.id === markdownTask.id,
    )?.task;
    const withoutTask = this.removeTask(state, markdownTask.id);
    const task: TaskItem = {
      ...existing,
      id: markdownTask.id,
      title: markdownTask.title,
      detail: markdownTask.detail,
      source: markdownTask.source,
      meta: markdownTask.meta,
      priority: markdownTask.priority,
      object: markdownTask.object,
      linkedNotePath: markdownTask.linkedNotePath ?? existing?.linkedNotePath,
    };

    if (markdownTask.location === "canvas") {
      const previousCanvasCard = state.canvasCards.find(
        (card) => card.id === markdownTask.id,
      );
      const tone = ["sage", "cream", "lavender", "blue"].includes(
        markdownTask.tone ?? "",
      )
        ? markdownTask.tone
        : previousCanvasCard?.tone ?? "sage";

      return {
        ...withoutTask,
        canvasCards: [
          ...withoutTask.canvasCards,
          {
            ...task,
            x: markdownTask.x ?? previousCanvasCard?.x ?? 180,
            y: markdownTask.y ?? previousCanvasCard?.y ?? 160,
            tone: tone as WorkspaceState["canvasCards"][number]["tone"],
            done: markdownTask.done ?? previousCanvasCard?.done,
          },
        ],
      };
    }

    if (markdownTask.location === "inbox") {
      return { ...withoutTask, inbox: [...withoutTask.inbox, task] };
    }
    if (markdownTask.location === "todo") {
      return { ...withoutTask, todo: [...withoutTask.todo, task] };
    }
    if (markdownTask.location === "cache") {
      return { ...withoutTask, cache: [...withoutTask.cache, task] };
    }

    const columnId =
      markdownTask.columnId &&
      withoutTask.storeColumns.some((column) => column.id === markdownTask.columnId)
        ? markdownTask.columnId
        : withoutTask.storeColumns[0]?.id;
    if (!columnId) return { ...withoutTask, inbox: [...withoutTask.inbox, task] };

    return {
      ...withoutTask,
      storeColumns: withoutTask.storeColumns.map((column) =>
        column.id === columnId
          ? { ...column, tasks: [...column.tasks, task] }
          : column,
      ),
    };
  }

  private upsertMarkdownLongTermObject(
    state: WorkspaceState,
    markdownObject: LongTermObject,
  ): WorkspaceState {
    return {
      ...clone(state),
      longTermObjects: [
        ...(state.longTermObjects ?? []).filter(
          (object) => object.id !== markdownObject.id,
        ),
        markdownObject,
      ],
    };
  }

  private async activateView(reveal = true): Promise<void> {
    try {
      const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
      let leaf: WorkspaceLeaf;

      if (existing) {
        leaf = existing;
      } else {
        leaf = this.app.workspace.getLeaf("tab");
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
      }

      if (reveal) {
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
      }
    } catch (error) {
      console.error("四层待办: activateView error", error);
      throw error;
    }
  }
}
