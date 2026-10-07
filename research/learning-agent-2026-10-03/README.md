# 学习 Agent 研究资料库

截止2026-10-03，按用户提出的主动教学、分支探索、多模态实操和自适应记忆四条线整理。

**规模：49篇论文/技术报告/基础文献，14个项目（13个固定版本仓库文档快照 + Megi产品介绍），46份PDF。12篇核心工作重点核查全文方法与局限，其余主要核查原始摘要或官方介绍。**本库是有范围的调研，非穷尽的系统综述。

## 先看这四份

1. [调研报告](调研报告.md)：已有进展、四条构想的重叠、未决问题和方向排序。
2. [研究方案](研究方案.md)：研究问题、对照/消融、指标、样本与失败标准。
3. [项目对照](项目对照.md)：与你最接近的系统及固定commit。
4. [核心论文核查](核心论文核查.md)：哪些只是模拟/偏好，哪些有真人学习证据。

主要判断：你的项目适合围绕“**自由分支探索中，基于学习证据决定何时诊断和回归主线，改善无AI保持与迁移**”形成研究。先验证一个机制，其余功能保持一致。主动、多模态与长期记忆都已有近邻，功能组合不足以单独证明新颖性。

## 文献和原资料

- `papers/catalog.csv`：49篇可筛选目录。
- `papers/catalog.json`：作者/官方元数据、来源、阅读深度、下载状态、PDF哈希。
- `papers/references.bib`：保守书目；部分作者字段未提取，投稿前需补齐。
- `papers/notes/Pxx.md`：逐篇关系与限制、原始链接、本地PDF链接。
- `papers/pdf/Pxx.pdf`：46份公开全文。
- `papers/text/`：12篇重点核查全文的文本，供检索，不是另行发布的论文版本。
- `projects/catalog.json`：14个项目的来源、用途与快照状态。
- `projects/snapshots/`：13个仓库的固定commit README、元数据与可获取许可证。
- `projects/Megi.md`：开发者issue介绍。
- `sources/`：论文原网页、下载/重试记录、统计和Megi原issue JSON。
- [检索方法与边界](检索方法与边界.md)：查询族、纳入原则、阅读深度及未覆盖领域。

## 最优先阅读

| 目的 | 条目 |
|---|---|
| 理解学习成效为何必须测无AI表现 | P23 P24 P27 |
| 界定整体方案最近邻 | P01 DeepTutor、P02 ScaffoldLM、P04 CoLearn |
| 分支/图交互历史 | P32 Sensecape、P33 Graphologue |
| 长期学习者诊断与现实脚手架 | P05 LongTutor、P09 Rethinking Scaffolding |
| 工程学习 | P30 CodeAid、P31 CodeHelp、ClassMate |
| 自适应记忆 | P12 TASA、P13 LLM learner modelling |
| 多模态生成与真人证据 | P34 TheoremExplainAgent、P35 Code2Video、P36 LLM2Manim |
| 全景继续扩展 | P38 IJCAI 2026综述 |

## 尚未下载全文

- P08：服务器拒绝获取，保留arXiv入口与失败记录。
- P48：开放作者机构副本获取失败，保留ERIC记录。
- P49：仅提取到PubMed原始介绍，没有自动获取全文。

有些初次失败的下载已通过公开作者副本/重试补齐。原始失败记录和最终统计均保留；以 `sources/library-status.json` 和目录为最终状态。

## 如何更新

`python3 scripts/collect.py`可重新收集初始49篇和13个仓库；随后运行`python3 scripts/finish_library.py`恢复重试、Megi和汇总。运行前备份现有目录：脚本会更新本次快照和文件，但预设accessed日期仍为本次研究日期；新一轮研究必须先修改日期并使用新文件夹。`verify_sources.py`需要pypdf，用于提取12篇核心全文。

本次没有安装或运行这些项目，也没有完整克隆源码。外部资料保持其原许可；README宣称与实际学习效果分别记录。
