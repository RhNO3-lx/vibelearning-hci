import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  ArrowUpRight,
  BookOpen,
  FileText,
  Upload,
  Trash2,
  FolderOpen,
  Settings2,
  Bot,
  Sparkles,
  Download,
  ChevronRight,
  Check,
  Plug,
  Info,
  Clock3,
  GitBranch,
} from "lucide-react";
import {
  activeSession,
  uid,
  type Action,
  type AppState,
  type Page,
  type Attachment,
} from "../model";

export function ConfigPages({
  page,
  state,
  dispatch,
  onNavigate,
  onNewSession,
  onDeleteSession,
  onReset,
  notify,
}: {
  page: Page;
  state: AppState;
  dispatch: (a: Action) => void;
  onNavigate: (p: Page) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onReset: () => void;
  notify: (text: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [command, setCommand] = useState(""),
    [secret, setSecret] = useState("");
  const [targetKB, setTargetKB] = useState<string | null>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (editing)
      editorRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
  }, [editing]);
  const session = activeSession(state);
  const titles: Record<Page, [string, string]> = {
    learn: ["学习工作台", ""],
    sessions: ["每一次探索，都有迹可循。", "会话"],
    knowledge: ["让学习建立在可靠资料上。", "知识库"],
    agents: ["为你的项目，找到合适的伙伴。", "子 Agent"],
    skills: ["让学习方式，更贴近你。", "技能"],
    settings: ["按自己的节奏，组织学习。", "设置"],
  };
  const importFiles = (files: FileList | null) => {
    if (!files?.length || !targetKB) return;
    const attachments: Attachment[] = Array.from(files).map((f) => ({
      id: uid("file"),
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    dispatch({
      type: "setKBs",
      items: state.knowledgeBases.map((k) =>
        k.id === targetKB ? { ...k, files: [...k.files, ...attachments] } : k,
      ),
    });
    notify(`已登记 ${attachments.length} 份资料。解析将在后端接入后进行。`);
    if (fileInput.current) fileInput.current.value = "";
  };
  function openEditor(id: string | null = null) {
    const item =
      page === "agents"
        ? state.agents.find((a) => a.id === id)
        : page === "skills"
          ? state.skills.find((a) => a.id === id)
          : state.knowledgeBases.find((a) => a.id === id);
    setEditing(id ?? "new");
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setCommand(
      item && "command" in item
        ? item.command
        : item && "instructions" in item
          ? item.instructions
          : "",
    );
  }
  function saveEditor() {
    if (!name.trim()) return;
    const id = editing === "new" ? uid(page) : editing!;
    if (page === "agents") {
      const item = {
        id,
        name: name.trim(),
        description,
        command,
        enabled: state.agents.find((a) => a.id === id)?.enabled ?? true,
      };
      dispatch({
        type: "setAgents",
        items:
          editing === "new"
            ? [...state.agents, item]
            : state.agents.map((a) => (a.id === id ? item : a)),
      });
    } else if (page === "skills") {
      const item = {
        id,
        name: name.trim(),
        description,
        instructions: command,
        enabled: state.skills.find((a) => a.id === id)?.enabled ?? true,
      };
      dispatch({
        type: "setSkills",
        items:
          editing === "new"
            ? [...state.skills, item]
            : state.skills.map((a) => (a.id === id ? item : a)),
      });
    } else {
      const item = {
        id,
        name: name.trim(),
        description,
        files: state.knowledgeBases.find((a) => a.id === id)?.files ?? [],
      };
      dispatch({
        type: "setKBs",
        items:
          editing === "new"
            ? [...state.knowledgeBases, item]
            : state.knowledgeBases.map((a) => (a.id === id ? item : a)),
      });
    }
    setEditing(null);
    notify("配置已保存在此浏览器");
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "vibe-learning-workspace.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="config-page">
      <div className="config-page-inner">
        <div className="page-kicker">
          YOUR LEARNING SPACE <span>/ {titles[page][1]}</span>
        </div>
        <div className="page-title-row">
          <div>
            <h1>{titles[page][0]}</h1>
            <p>
              {page === "sessions"
                ? "回到思考发生的地方，或开启一段新的探索。"
                : page === "settings"
                  ? "学习偏好、模型配置与默认工作区保存在本地。"
                  : "配置可用于当前会话；真实检索与调用等待后端接入。"}
            </p>
          </div>
          {page !== "settings" && (
            <button
              className="btn primary"
              onClick={page === "sessions" ? onNewSession : () => openEditor()}
            >
              <Plus size={16} />
              {page === "sessions"
                ? "开始新学习"
                : page === "knowledge"
                  ? "新建知识库"
                  : page === "agents"
                    ? "添加伙伴"
                    : "添加技能"}
            </button>
          )}
        </div>
        {page !== "settings" && (
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label={`搜索${titles[page][1]}`}
              placeholder={`搜索${titles[page][1]}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        )}
        {page === "sessions" && (
          <div className="session-grid">
            {state.sessions
              .filter((s) => `${s.title} ${s.goal}`.includes(search))
              .map((s) => (
                <article className="session-card" key={s.id}>
                  <div className="session-card-top">
                    <span>
                      <GitBranch size={19} />
                    </span>
                    <button
                      className="icon-button danger"
                      title="删除会话"
                      aria-label={`删除会话${s.title}`}
                      disabled={state.sessions.length === 1}
                      onClick={() => onDeleteSession(s.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.goal}</p>
                  <div className="session-card-meta">
                    <span>
                      <Clock3 size={13} />
                      {new Date(s.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                    <span>
                      {state.turns.filter((t) => t.sessionId === s.id).length}{" "}
                      个思考节点
                    </span>
                  </div>
                  <button
                    className="session-card-open"
                    onClick={() => {
                      dispatch({ type: "selectSession", id: s.id });
                      onNavigate("learn");
                    }}
                  >
                    继续探索 <ArrowUpRight size={17} />
                  </button>
                </article>
              ))}
          </div>
        )}
        {page === "knowledge" && (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => importFiles(e.target.files)}
            />
            <div className="resource-grid">
              {state.knowledgeBases
                .filter((k) => `${k.name} ${k.description}`.includes(search))
                .map((k) => (
                  <article className="resource-card" key={k.id}>
                    <div className="resource-top">
                      <span className="resource-icon">
                        <BookOpen size={22} />
                      </span>
                      <span className="micro-badge">本地登记</span>
                      <button
                        className="icon-button danger"
                        aria-label={`删除知识库${k.name}`}
                        title="删除知识库"
                        onClick={() => {
                          dispatch({
                            type: "setKBs",
                            items: state.knowledgeBases.filter(
                              (v) => v.id !== k.id,
                            ),
                          });
                          notify("已删除知识库登记及会话关联");
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <h3>{k.name}</h3>
                    <p>{k.description || "为学习收集笔记、教材和参考资料"}</p>
                    <div className="resource-files">
                      {k.files.map((f) => (
                        <div key={f.id}>
                          <FileText size={14} />
                          <span>{f.name}</span>
                          <small>{formatSize(f.size)}</small>
                          <button
                            className="icon-button"
                            aria-label={`移除资料${f.name}`}
                            onClick={() =>
                              dispatch({
                                type: "setKBs",
                                items: state.knowledgeBases.map((v) =>
                                  v.id === k.id
                                    ? {
                                        ...v,
                                        files: v.files.filter(
                                          (item) => item.id !== f.id,
                                        ),
                                      }
                                    : v,
                                ),
                              })
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {!k.files.length && (
                        <div className="empty-file">
                          还没有资料，上传你的第一份笔记。
                        </div>
                      )}
                    </div>
                    <div className="resource-footer">
                      <button
                        className="text-button"
                        onClick={() => {
                          setTargetKB(k.id);
                          fileInput.current?.click();
                        }}
                      >
                        <Upload size={14} /> 添加资料
                      </button>
                      <button
                        className="text-button"
                        onClick={() => openEditor(k.id)}
                      >
                        编辑
                      </button>
                      <button
                        className={`btn small ${session.kbIds.includes(k.id) ? "soft" : ""}`}
                        onClick={() =>
                          dispatch({
                            type: "sessionConfig",
                            id: session.id,
                            patch: {
                              kbIds: session.kbIds.includes(k.id)
                                ? session.kbIds.filter((id) => id !== k.id)
                                : [...session.kbIds, k.id],
                            },
                          })
                        }
                      >
                        {session.kbIds.includes(k.id) ? (
                          <Check size={13} />
                        ) : (
                          <Plus size={13} />
                        )}
                        {session.kbIds.includes(k.id)
                          ? "当前会话已选"
                          : "用于当前会话"}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            <div className="info-strip">
              <Info size={16} />
              此原型仅保存文件名称等登记信息。文件正文不会被持久化或上传，知识库解析与索引尚未连接。
            </div>
          </>
        )}
        {(page === "agents" || page === "skills") && (
          <>
            <div className="resource-grid">
              {(page === "agents" ? state.agents : state.skills)
                .filter((a) => `${a.name} ${a.description}`.includes(search))
                .map((a) => (
                  <article className="resource-card" key={a.id}>
                    <div className="resource-top">
                      <span className="resource-icon">
                        {page === "agents" ? (
                          <Bot size={22} />
                        ) : (
                          <Sparkles size={22} />
                        )}
                      </span>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={a.enabled}
                          aria-label={`启用${a.name}`}
                          onChange={() =>
                            page === "agents"
                              ? dispatch({
                                  type: "setAgents",
                                  items: state.agents.map((v) =>
                                    v.id === a.id
                                      ? { ...v, enabled: !v.enabled }
                                      : v,
                                  ),
                                })
                              : dispatch({
                                  type: "setSkills",
                                  items: state.skills.map((v) =>
                                    v.id === a.id
                                      ? { ...v, enabled: !v.enabled }
                                      : v,
                                  ),
                                })
                          }
                        />
                        <span />
                      </label>
                    </div>
                    <h3>{a.name}</h3>
                    <p>{a.description}</p>
                    {"command" in a ? (
                      <div className="command-preview">
                        <span>启动命令</span>
                        <code>{a.command || "尚未配置"}</code>
                      </div>
                    ) : (
                      <div className="command-preview">
                        <span>技能指引</span>
                        <p>{a.instructions || "尚未配置"}</p>
                      </div>
                    )}
                    <div className="resource-footer">
                      <span className="muted">
                        {a.enabled ? "可在会话中选择" : "已停用"} · 待接入
                      </span>
                      <button
                        className="text-button"
                        onClick={() => openEditor(a.id)}
                      >
                        编辑 <ChevronRight size={13} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`删除${a.name}`}
                        title="删除配置"
                        onClick={() =>
                          page === "agents"
                            ? dispatch({
                                type: "setAgents",
                                items: state.agents.filter(
                                  (v) => v.id !== a.id,
                                ),
                              })
                            : dispatch({
                                type: "setSkills",
                                items: state.skills.filter(
                                  (v) => v.id !== a.id,
                                ),
                              })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            <div className="info-strip">
              <Plug size={16} />
              这里只配置可选能力，不会启动外部进程。真正的调用、沙盒与权限由后端实现。
            </div>
          </>
        )}
        {page === "settings" && (
          <div className="settings-stack">
            <section className="settings-card">
              <div className="settings-heading">
                <Settings2 size={19} />
                <div>
                  <h3>学习体验</h3>
                  <p>让注意力留在学习上</p>
                </div>
              </div>
              <label className="settings-row">
                <span>
                  <strong>视角追踪</strong>
                  <small>选择节点时，让另一张图聚焦关联区域</small>
                </span>
                <input
                  type="checkbox"
                  checked={state.settings.trackView}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      patch: { trackView: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="settings-row">
                <span>
                  <strong>减少动画</strong>
                  <small>使用更安静的交互过渡</small>
                </span>
                <input
                  type="checkbox"
                  checked={state.settings.reduceMotion}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      patch: { reduceMotion: e.target.checked },
                    })
                  }
                />
              </label>
            </section>
            <section className="settings-card">
              <div className="settings-heading">
                <Plug size={19} />
                <div>
                  <h3>模型配置</h3>
                  <p>配置模型与 API 接口</p>
                </div>
                <span className="micro-badge">未连接</span>
              </div>
              <div className="form-grid">
                <label>
                  模型 API 地址
                  <input
                    value={state.settings.endpoint}
                    onChange={(e) =>
                      dispatch({
                        type: "settings",
                        patch: { endpoint: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  模型名称
                  <input
                    value={state.settings.model}
                    onChange={(e) =>
                      dispatch({
                        type: "settings",
                        patch: { model: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  上下文容量（估算参考）
                  <select
                    value={state.settings.contextLimit}
                    onChange={(e) =>
                      dispatch({
                        type: "settings",
                        patch: { contextLimit: Number(e.target.value) },
                      })
                    }
                  >
                    <option value={16000}>16k tokens</option>
                    <option value={32000}>32k tokens</option>
                    <option value={64000}>64k tokens</option>
                    <option value={128000}>128k tokens</option>
                  </select>
                </label>
                <label>
                  API Key（仅当前页面，未发送）
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="不保存在本地存储"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="settings-card">
              <div className="settings-heading">
                <FolderOpen size={19} />
                <div>
                  <h3>默认工作区</h3>
                  <p>新会话默认使用此路径</p>
                </div>
              </div>
              <label className="full-label">
                默认工作区路径
                <input
                  value={state.settings.defaultWorkspace}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      patch: { defaultWorkspace: e.target.value },
                    })
                  }
                />
                <small>已有会话不受影响。右键侧栏会话可单独设置工作区。</small>
              </label>
            </section>
            <section className="settings-card">
              <div className="settings-heading">
                <Download size={19} />
                <div>
                  <h3>本地数据</h3>
                  <p>会话、图和配置保存在当前浏览器</p>
                </div>
              </div>
              <div className="button-row">
                <button className="btn" onClick={exportData}>
                  <Download size={15} />
                  导出工作台数据
                </button>
                <button className="btn danger" onClick={onReset}>
                  重置演示数据
                </button>
              </div>
            </section>
          </div>
        )}
        {page !== "settings" &&
          page !== "sessions" &&
          (page === "knowledge"
            ? state.knowledgeBases
            : page === "agents"
              ? state.agents
              : state.skills
          ).filter((a) => `${a.name} ${a.description}`.includes(search))
            .length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>这里还没有匹配的内容</h3>
              <p>换个关键词，或添加一项新的配置。</p>
            </div>
          )}
        {editing && (
          <section
            ref={editorRef}
            className="inline-editor"
            aria-label="资源配置编辑"
          >
            <h3>{editing === "new" ? "添加配置" : "编辑配置"}</h3>
            <div className="form-grid">
              <label>
                名称
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="给它一个清晰的名字"
                />
              </label>
              <label>
                说明
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
            {page !== "knowledge" && (
              <label className="full-label">
                {page === "agents" ? "启动命令" : "技能指引"}
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={
                    page === "agents"
                      ? "例如 codex（此处不会执行）"
                      : "描述它应该如何辅助学习"
                  }
                />
              </label>
            )}
            <div className="button-row">
              <button
                className="btn primary"
                disabled={!name.trim()}
                onClick={saveEditor}
              >
                保存配置
              </button>
              <button className="btn" onClick={() => setEditing(null)}>
                取消
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
export function formatSize(size: number) {
  return size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
