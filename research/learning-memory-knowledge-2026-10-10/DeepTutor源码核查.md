# DeepTutor 源码核查与适配边界

核查日期：2026-10-10。官方仓库固定于 `6cf793bd868ba5ecbe64722936d4be8fab5a01df`，提交时间为 2026-10-08，提交说明 `release: v1.6.14`。

本轮 clone 并静态阅读相关调用链，执行两个原始源码纯函数的边界探针。没有部署全应用、运行原项目测试套件或调用 LLM；测试文件只作为既有契约的旁证。未读取本项目 `.deeptutor` 下的个人数据。三个临时源码 checkout 的路径、commit、文件哈希和符号行号见 [源码版本与索引.json](./源码版本与索引.json)。

## 1. 原始记录与记忆整合

| 已核实机制 | 固定源码 | 对本项目的含义 |
|---|---|---|
| `TraceEvent` 有独立 ID、时间、surface、kind、payload，可关联 session/turn；追加 JSONL | [trace.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/trace.py#L37) | 可借鉴事件契约，但需补 node、branch、证据状态与事务可靠性；原 append 失败会记录警告并吞掉异常，不能直接作为掌握状态唯一事务日志 |
| chat snapshot 每个 session 一个 entity，把消息按时间拼接，未保留父子拓扑 | [adapters.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/snapshot/adapters.py#L459) | 所有分支内容可以进入同一 snapshot，但无法充分表达哪条消息回应哪条问题；要保留 parent、branch 和原始时间 |
| snapshot fingerprint diff 能识别 added/modified/removed | [diff.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/snapshot/diff.py#L15) | 说明项目并非完全不检测修改；此能力不能等同于下游语义撤回已完成 |
| L2 update 以 `surface:entity_id` 是否已见决定新输入；L3 update 以 L2 entry ID 是否已见决定新输入 | [update.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/modes/update.py#L140)、[meta.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/meta.py#L1) | 同一 session 增加消息，或者同一 entry 内容被修改，不能仅靠这条新增 ID 路径可靠传播；应改为 ID＋revision/hash，并显式处理撤回 |

核查重点是后一处：snapshot 的变化记录和 consolidator 的新增输入选择是两套机制。`_run_update_l2` 没有以 fingerprint 比较替代已见 ID；`_run_update_l3` 也没有以 entry 内容版本做差分。这里是本项目必须适配的具体位置，而不是对整个软件宣称“记忆无法更新”。

## 2. 来源追踪的粒度

L2 的抽取事实要求引用 chunk 内允许的 entity refs，源码校验引用池并可拒绝无效来源。中文提示要求避免绝对化的“完全掌握”等措辞。这是可以借鉴的防线，但提示措辞和引用存在性不保证教学推断正确。[references.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/references.py)、[update_l2.yaml](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/prompts/zh/update_l2.yaml)

当前 L3 facts 引用裸 surface 名，例如 `chat`、`quiz`，并非逐条 L2 entry 或原始作答 ID。其链条是 L3→L2 文件→L1 原始内容；适合浏览来源类别，却不足以直接撤销某次作答对某项判断的贡献。我们的能力判断应额外保存精确 `evidence_ids`。[update.py L3 refs](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/modes/update.py#L466)

Audit 根据当前证据让 LLM 对已有记忆作行级修改；Dedup 消除重复文本，Merge 整理引用。这些操作并不等于证据 ID 去重或确定性的状态重算。[audit.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/modes/audit.py)、[merge.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/memory/consolidator/modes/merge.py)

## 3. 更新触发与模型读取

`WriteMemoryTool` 的源码契约限定聊天写入显式偏好，其他记忆文档通过用户的 Memory 工作台更新；`ReadMemoryTool` 返回四个 L3 文档。不能把当前实现描述成“每轮自动重建全部画像”。[builtin tools](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/tools/builtin/__init__.py#L965)

turn executor 在 `memory_references` 开启时读取 L3 拼接文本，同时也装配学习日志；模型仍有读取记忆的工具入口。注入存在条件，而不是无条件每轮加载所有层级。[executor.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/session/turns/executor.py#L550)

本项目应新增后台事件驱动的摘要更新与画像投影，并在生成回答前检查同步状态。可借鉴整合任务的运行记录、checkpoint 和引用校验，不沿用其手动整合语义。

## 4. 分支与上下文压缩

普通消息存储有 `parent_message_id`，并有 selected branch 状态。`get_message_path` 及带 leaf 的 `get_messages_for_context` 遍历祖先，排除兄弟分支。Partner 的 branch 则复制完整历史到新 session 并归档来源。这是两个不同的分支实现。[sqlite_store.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/session/sqlite_store.py#L2630)、[partner sessions.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/partners/sessions.py#L141)

`ContextBuilder` 有 token budget、历史摘要和近期逐字消息；session 保存 `compressed_summary` 与 `summary_up_to_msg_id`。切换到不包含该摘要边界的路径时，它会弃用旧摘要，避免带入另一分支历史。压缩有原始前缀重建与旧摘要折入新材料的策略。[context_builder.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/services/session/context_builder.py#L510)

我们的适配方向：以 branch ID 持久化上下文和同步游标，将跨分支摘要作为显式更新事件追加；保留全局全文查询。已有普通分支的祖先链可以作为局部历史基础，但不能原样实现跨分支自动整合。

## 5. 删除边界

session 删除 API 会处理从属会话、活动 turn、学习路径关联、附件和阅读集合；所核查的 cleanup 调用链未执行 L2/L3 的精确能力贡献撤回。snapshot 有 removed 记录也不代表这种撤回已发生。[sessions API](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/api/routers/sessions.py#L580)

另一方面，Mastery Path 的错误题目修复已有 void/correct、重算掌握状态及复习状态的流程，值得单独参考。不能把通用聊天删除和学习评估修复混为一件事。[service.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/service.py#L1425)

## 6. 掌握评估的可复用部分与局限

- `mastery_note_explained` 只记教学活动，不授予掌握；CONCEPT/DESIGN 的解释评估与 MEMORY/PROCEDURE 的题目评价分开。[mastery tools](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/capabilities/mastery/tools.py#L826)
- `LearningEvidence` 保存来源、提示次数、质量、session/turn 等；非 Mastery 来源的关联评估按 evidence ID 检查重复。[assessment.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/assessment.py#L300)
- `calculate_mastery` 只使用未作废且标为独立的尝试。具体数值策略是最近最多五次的加权正确率，一次最多 0.5、两次最多 0.8；没有数据返回 0。这是启发式分数，不是经过校准的掌握概率。[mastery.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/mastery.py)、[service.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/service.py#L463)
- `mastery_assess` 接受 tutor 判断的 passed 和 feedback，不能仅凭存在这个接口认定解释评估准确。[MasteryAssessTool](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/capabilities/mastery/tools.py#L1421)
- 原始 `grade_answer` 对短答用字符串相似度、开放题用关键词命中比例。只读探针确认：不同的九位数字可被判相同，包含否定的关键词句也可被判通过。这个函数不适合原样评价数理证明；探针不证明全部产品评价路径都有该问题。[grading.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/grading.py)、[探针结果](./源码探针结果.json)

## 7. 知识关系也不能直接复用为路径算法

`objective_relations.py` 校验来源引用、先修 ID、自环及环，但源码说明这些关系在该模块中是结构元数据，尚不控制学习或检索。它能参考为一致性校验器，不能据此声称 DeepTutor 已实现本项目的图式路径规划。[objective_relations.py](https://github.com/HKUDS/DeepTutor/blob/6cf793bd868ba5ecbe64722936d4be8fab5a01df/deeptutor/learning/objective_relations.py#L1)

## 8. 适配建议

优先借鉴：事件 ID 与来源、原文回查、教学/评估分离、题目作废与状态重算、上下文预算与压缩策略。

需要自行实现：跨分支版本同步、branch 上下文持久化、消息级能力证据、精确依赖撤回、自动画像更新触发、全局概念身份、证据不足状态。

不原样采用：新增 ID 作为唯一更新条件、L3 surface refs 作为能力依据、启发式分数当校准概率、文本相似度评价证明、将结构先修元数据当作已验证学习规划器。
