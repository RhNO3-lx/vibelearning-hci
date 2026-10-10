import type { AppState, Session, Turn, Activity } from "./model";
import { uid } from "./model";

export function createSession(
  goal: string,
  workspace: string,
  kbIds: string[] = [],
): { session: Session; root: Turn } {
  const id = uid("session"),
    rootId = uid("turn"),
    branchId = uid("branch");
  const root: Turn = {
    id: rootId,
    sessionId: id,
    parentId: null,
    branchId,
    title: "明确学习目标",
    user: goal,
    assistant: `我们以「${goal}」为这次学习的目标。\n\n可以先描述你目前的理解，或选择一个模块开始。需要深入某个细节时，随时从回答旁的分支按钮继续探索。\n\n> 当前使用前端演示回答。正式的目标调研、能力诊断和路线推荐将在后端接入后完成。`,
    activity: "concept",
    conceptIds: [],
    attachments: [],
    createdAt: Date.now(),
    summary: `学习目标：${goal}`,
    summaryVersion: 1,
  };
  const session: Session = {
    id,
    title: goal.slice(0, 22),
    goal,
    workspace,
    rootId,
    activeId: rootId,
    mainLeafId: rootId,
    pathIds: [],
    exclusions: [],
    kbIds,
    agentId: "",
    skillIds: [],
    contexts: { [branchId]: { seen: {}, updates: [] } },
    updatedAt: Date.now(),
  };
  return { session, root };
}
export function createSeed(): AppState {
  const now = Date.now();
  const base = {
    sessionId: "linear",
    branchId: "main",
    attachments: [],
    createdAt: now,
    summaryVersion: 1,
  };
  const turns: Turn[] = [
    {
      ...base,
      id: "t0",
      parentId: null,
      title: "从直觉走向证明",
      user: "我想理解线性代数的证明，而不只是记住公式。",
      assistant:
        "很好，我们从**线性变换的几何直觉**出发，再逐步走向特征值与对角化。\n\n这次的目标是：能解释为什么矩阵可以对角化，并判断什么时候不能。右侧的学习地图会帮助你确认位置，沿途也可以随时展开支线。",
      activity: "concept",
      conceptIds: ["vectors"],
      summary:
        "目标：理解对角化的条件与证明；已讨论线性变换、特征向量与特征值。",
    },
    {
      ...base,
      id: "t1",
      parentId: "t0",
      title: "理解线性变换",
      user: "矩阵和线性变换是什么关系？",
      assistant:
        "把矩阵想象成一个作用于空间的规则：它把向量送到另一个位置，同时保留加法和数乘。\n\n$$T(au+bv)=aT(u)+bT(v)$$\n\n一旦选定一组基，矩阵的每一列就是对应基向量的像。**矩阵是线性变换在一组基下的表示**，换一组基，表示它的矩阵也会改变。",
      activity: "concept",
      conceptIds: ["vectors", "transform"],
      summary: "解释了线性性，以及矩阵列向量与基向量的像的关系。",
    },
    {
      ...base,
      id: "t2",
      parentId: "t1",
      title: "发现不变的方向",
      user: "那特征向量的直觉是什么？",
      assistant:
        "大多数向量经过变换后，会同时改变方向和长度。但有一些特殊的方向，在变换下保持不变。\n\n如果一个非零向量 $v$ 满足：\n\n$$Av=\\lambda v$$\n\n那么 $v$ 就是一个特征向量，$\\lambda$ 是对应的特征值。你可以把它理解为：**变换在这个方向上，只做缩放**。负特征值还会反转方向。\n\n接下来，我们可以问：如果能找到足够多这样的方向，会发生什么？",
      activity: "concept",
      conceptIds: ["eigen"],
      summary:
        "讲解 Av=λv：特征向量对应保持不变的方向，尚未验证学习者的独立理解。",
    },
    {
      ...base,
      id: "t3",
      parentId: "t2",
      title: "为什么要线性无关？",
      user: "为什么对角化要求有 n 个线性无关的特征向量？",
      assistant:
        "因为我们希望这些特征向量能够成为一组**新的坐标基**。\n\n设它们是 $v_1,\\ldots,v_n$，将它们按列排成矩阵 $P$。线性无关保证 $P$ 可逆，于是：\n\n$$AP=PD\\quad\\Longrightarrow\\quad P^{-1}AP=D$$\n\n在这组基中，每个方向只被它自己的特征值缩放，所以表示矩阵 $D$ 是对角矩阵。\n\n**关键不是“找到 n 个向量”，而是“找到 n 个独立的方向”。** 如果方向重复，就无法表示整个空间。\n\n试着用下面的小练习检查这个区别。",
      activity: "concept",
      conceptIds: ["eigen", "diagonal"],
      summary:
        "讲解独立特征向量组成可逆 P，从 AP=PD 得到对角化；等待诊断证据。",
      quiz: {
        prompt: "一个 2×2 矩阵只有一个线性无关的特征向量，它能对角化吗？",
        options: [
          "能，只要找到两个特征值",
          "不能，特征向量无法组成一组基",
          "能，把同一个特征向量写两次",
        ],
        answer: 1,
        explanation:
          "需要两个线性无关的特征向量来构成二维空间的一组基。特征值数量本身不是充分条件。",
      },
    },
    {
      ...base,
      id: "t4",
      parentId: "t2",
      branchId: "geometry",
      title: "负特征值意味着什么？",
      user: "负特征值是否意味着向量离开了原来的直线？",
      assistant:
        "不会。负号改变朝向，但不会改变向量所在的直线。比如 $Av=-2v$，表示长度变为两倍、朝向反转。\n\n“方向不变”在这里更准确地说是：**一维子空间不变**。",
      activity: "concept",
      conceptIds: ["eigen"],
      summary:
        "支线澄清：负特征值反转朝向，但保持同一条过原点的直线；用户提出的是待检验问题。",
    },
  ];
  const linear: Session = {
    id: "linear",
    title: "理解矩阵对角化",
    goal: "理解矩阵对角化的条件与证明",
    workspace: "~/learning/linear-algebra",
    rootId: "t0",
    activeId: "t3",
    mainLeafId: "t3",
    pathIds: ["vectors", "transform", "eigen", "diagonal"],
    exclusions: [],
    kbIds: ["kb-linear"],
    agentId: "",
    skillIds: [],
    contexts: {
      main: {
        seen: { t4: 1 },
        updates: [
          {
            id: "main:t4:1",
            nodeId: "t4",
            version: 1,
            text: turns[4].summary,
            time: now,
          },
        ],
      },
    },
    updatedAt: now,
  };
  const codeRoot: Turn = {
    ...base,
    id: "c0",
    sessionId: "coding",
    branchId: "coding-main",
    parentId: null,
    title: "设计一个可测试的 API",
    user: "我想通过一个小项目学习接口设计与测试。",
    assistant:
      "我们从一个待办事项 API 开始。先写清输入、输出和错误情况，再设计测试。\n\n你可以在右侧查看学习路线，也可以选择项目实践，让辅助 Agent 的配置参与演示。",
    activity: "project",
    conceptIds: ["testing"],
    summary: "目标：通过待办事项 API 理解接口契约与测试。",
    projectChecks: [false, false, false],
  };
  return {
    version: 1,
    activeSessionId: "linear",
    sessions: [
      linear,
      {
        ...linear,
        id: "coding",
        title: "从 API 到工程实践",
        goal: "设计可测试的 API",
        workspace: "~/learning/api-lab",
        rootId: "c0",
        activeId: "c0",
        mainLeafId: "c0",
        pathIds: ["testing"],
        kbIds: [],
        contexts: {},
        updatedAt: now - 86400000,
      },
    ],
    turns: [...turns, codeRoot],
    evidence: [],
    concepts: [
      {
        id: "vectors",
        name: "向量与空间",
        category: "基础",
        summary: "用向量、线性组合与基描述空间。",
        difficulty: "入门",
        challenge: "区分向量集合与张成空间。",
        topics: ["线性组合", "张成与线性无关", "基与维数"],
        source: "MIT 18.06SC · Unit I",
        sourceUrl:
          "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
        baseScore: 82,
      },
      {
        id: "transform",
        name: "线性变换",
        category: "桥梁",
        summary: "理解矩阵如何表示变换，以及换基对表示的影响。",
        difficulty: "中等",
        challenge: "把矩阵计算和几何作用联系起来。",
        topics: ["线性性", "矩阵表示", "换基"],
        source: "MIT 18.06SC · Unit I",
        sourceUrl:
          "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
        baseScore: 65,
      },
      {
        id: "eigen",
        name: "特征值与特征向量",
        category: "正在探索",
        summary: "发现线性变换保持不变的一维子空间。",
        difficulty: "中等",
        challenge: "区分特征值的重复与特征向量的独立性。",
        topics: ["Av = λv", "特征空间", "代数与几何重数"],
        source: "MIT 18.06SC · Unit II",
        sourceUrl:
          "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
        baseScore: null,
      },
      {
        id: "diagonal",
        name: "矩阵对角化",
        category: "目标",
        summary: "用特征向量组成新基，解释对角化的条件。",
        difficulty: "进阶",
        challenge: "证明充分必要条件，并构造不可对角化的反例。",
        topics: ["AP = PD", "可逆换基矩阵", "不可对角化的例子"],
        source: "MIT 18.06SC · Unit II",
        sourceUrl:
          "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
        baseScore: null,
      },
      {
        id: "testing",
        name: "接口与测试",
        category: "工程实践",
        summary: "以接口契约、边界用例和自动测试组织项目。",
        difficulty: "中等",
        challenge: "覆盖失败路径，而不只验证正常输入。",
        topics: ["接口契约", "边界用例", "单元与集成测试"],
        source: "CS2023 · 软件开发基础",
        sourceUrl: "https://csed.acm.org/final-report/",
        baseScore: null,
      },
    ],
    relations: [
      {
        id: "r1",
        source: "vectors",
        target: "transform",
        type: "recommended",
      },
      { id: "r2", source: "transform", target: "eigen", type: "recommended" },
      { id: "r3", source: "eigen", target: "diagonal", type: "recommended" },
    ],
    knowledgeBases: [
      {
        id: "kb-linear",
        name: "线性代数学习资料",
        description: "课程笔记与证明练习",
        files: [
          {
            id: "demo-pdf",
            name: "线性代数笔记.pdf",
            size: 248000,
            type: "application/pdf",
          },
        ],
      },
    ],
    agents: [
      {
        id: "agent-codex",
        name: "代码伙伴",
        description: "协助项目拆解、代码检查与测试",
        command: "codex",
        enabled: true,
      },
      {
        id: "agent-proof",
        name: "证明审阅",
        description: "逐步检查假设与推理依据",
        command: "",
        enabled: false,
      },
    ],
    skills: [
      {
        id: "skill-visual",
        name: "概念可视化",
        description: "将抽象概念转成图解与动画",
        instructions: "优先使用几何直觉解释，再给出形式化定义。",
        enabled: false,
      },
    ],
    settings: {
      model: "待连接模型",
      endpoint: "",
      contextLimit: 32000,
      defaultWorkspace: "~/learning",
      reduceMotion: false,
    },
  };
}

export function demoTurn(
  parent: Turn,
  prompt: string,
  activity: Activity,
  conceptIds: string[],
  fork = false,
): Turn {
  const topic = prompt.slice(0, 22);
  const concept = conceptIds[0];
  const hasPreset = [
    "testing",
    "vectors",
    "transform",
    "eigen",
    "diagonal",
  ].includes(concept);
  const assistant =
    activity === "quiz"
      ? hasPreset
        ? "我们用一个短诊断来核对理解。先独立选择，再查看解释。下面是预设的前端演示题；结果仅更新演示证据。"
        : "该模块尚无预设演示题。已建立诊断分支；正式题目生成与评分将在后端接入后完成，此次不增加掌握证据。"
      : activity === "flashcard"
        ? "把关键概念放进一张闪卡。先尝试回忆，再翻面核对。自评会保留在卡片上，不直接计入掌握分数。"
        : activity === "project"
          ? "先把想法转成可以检查的产物。下面是一份项目起步清单；勾选表示你的进度自评。正式的文件编辑、子 Agent 调用和测试执行等待后端接入。"
          : `你正在追问「${topic}」。\n\n我们可以从三个角度继续：\n\n1. **定义**：这个说法需要哪些前提？\n2. **例子**：先找一个成立的简单情形。\n3. **反例**：改变一个条件，结论还成立吗？\n\n试着先写下你的解释，再对照原始材料核查。\n\n> 这是前端演示回复，未向模型发送请求。`;
  const quiz =
    concept === "testing"
      ? {
          prompt: "接口测试除了正常输入，还应该覆盖什么？",
          options: ["只检查页面颜色", "非法输入与边界情况", "只增加测试数量"],
          answer: 1,
          explanation:
            "检查边界和失败路径可以帮助验证接口契约。程序测试通过仍不直接证明作者理解。",
        }
      : concept === "vectors" || concept === "transform"
        ? {
            prompt: "线性变换必须满足哪项条件？",
            options: [
              "保留所有向量的长度",
              "保留加法和数乘",
              "所有矩阵元素为正",
            ],
            answer: 1,
            explanation: "线性性要求 T(au+bv)=aT(u)+bT(v)，不要求保留长度。",
          }
        : {
            prompt: "要让一个 n×n 矩阵对角化，需要哪项条件？",
            options: [
              "所有元素都不为零",
              "有 n 个线性无关的特征向量",
              "只有一个特征值",
            ],
            answer: 1,
            explanation: "这些特征向量组成一组基，因此换基矩阵 P 可逆。",
          };
  return {
    id: uid("turn"),
    sessionId: parent.sessionId,
    parentId: parent.id,
    branchId: fork ? uid("branch") : parent.branchId,
    title: topic || "继续探索",
    user: prompt,
    assistant,
    activity,
    conceptIds,
    attachments: [],
    createdAt: Date.now(),
    summary: `${topic}；${activity === "concept" ? "用户继续提出问题，尚无新的能力证据" : "演示学习活动"}`,
    summaryVersion: 1,
    ...(activity === "quiz" && hasPreset ? { quiz } : {}),
    ...(activity === "flashcard"
      ? {
          flashcard: {
            front:
              concept === "testing"
                ? "为什么接口测试需要边界用例？"
                : concept === "vectors" || concept === "transform"
                  ? "线性变换需要保留什么？"
                  : hasPreset
                    ? "对角化为什么需要线性无关的特征向量？"
                    : "如何为一个新概念建立可靠的理解？",
            back:
              concept === "testing"
                ? "正常输入不足以检查失败路径。边界与非法输入可帮助验证接口契约。"
                : concept === "vectors" || concept === "transform"
                  ? "线性变换保留加法和数乘：T(au+bv)=aT(u)+bT(v)，不必保留长度。"
                  : hasPreset
                    ? "特征向量需要组成空间的一组基，使换基矩阵 P 可逆。于是 AP=PD 可转化为 P⁻¹AP=D。"
                    : "先核查定义与成立条件，再用例子、反例和独立解释检查理解。这是一张通用学习方法演示卡。",
            flipped: false,
          },
        }
      : {}),
    ...(activity === "project" ? { projectChecks: [false, false, false] } : {}),
  };
}
