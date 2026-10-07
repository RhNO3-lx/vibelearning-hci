import json,csv,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'papers/catalog.json').read_text())
# Reading depth and interpretation are distinct from download success.
NOTES={
 'T01':('2008 IHMC技术报告','全文重点核查开头、心理基础与图1，PDF页1–3；图1视觉核查','概念学习的层级结构、先知识连接和cross-links；focus question约束组织。','不是思维拓扑测量；概念图是允许交叉连接的图，不是纯树。理论论述不等于分支聊天效应。'),
 'T02':('1988理论论文/技术报告','全文重点核查先进知识获取、reductive bias和hypertext建议','复杂且结构不良领域需要多种表征、案例关系与灵活知识组装。','主要针对高级知识获取；反对刚性分隔知识，不能替纯树背书，也不直接研究LLM。'),
 'T03':('Educational Research Review 2015','全文重点核查方法、探究阶段、图3与讨论','32篇框架文献综合；提问/假设、探索/实验、解释、反思形成可回返的流程。','描述性综合框架；支持非线性路径，但其结构含回路，非树状认知证明。'),
 'T04':('American Educational Research Journal 1994','出版商原始摘要＋ERIC；全文未下载','研究方法与代数辅导中的提问；问题质量与成绩相关，频次不相关；修复知识缺口。','相关性；不证明树状对话或越多提问越好。'),
 'T05':('Review of Educational Research 2006','全文重点核查摘要、纳入与结果限制','55项研究、5818人；构建/修改/查看概念知识图与保持和迁移。','节点关系图非严格树；多种教学活动；与T06包含重叠研究，不能算两份完全独立元分析。'),
 'T06':('Educational Psychology Review 2018（2017在线）','全文重点核查方法、总体/调节分析与限制','142个独立效应量、11814人；总体g=.58，异质性I²=87.50%；构建/查看图对应不同对照的收益有差异。','142不是142项研究；是概念图教学包，非AI自动对话树；构建vs查看调节效应不等于所有情况下直接优越。'),
 'T07':('Computers in Human Behavior 2007','出版商原始摘要与预览；全文未下载','非线性链接选择可能增加决策/视觉负担，低先知识和低工作记忆者风险更高；层级结构及导航支持有条件帮助。','传统超文本非LLM对话；不推出所有分支都会伤害学习。'),
 'T08':('Learning and Instruction 2009','出版商/作者机构/ERIC原始摘要；作者提交版链接被拦，未下载','24成人；先知识×层级/网络概念图；低先知识者层级图概念知识较好、迷航较少；眼动与导航分析。','直接比较层级和网络，未比较树状/线性聊天；小样本，具体学科材料。'),
 'T09':('Science 2011','全文重点核查两实验与延迟结果','检索练习比边看材料边做精加工概念图产生更好的一周后学习，包括推理问题。','比较的是学习操作，不是树/图结构；不说明概念图无效。应为分支交互加入解释、检索与整合活动。'),
 'T10':('1993技术报告；相关1995 JECR期刊论文','下载并重点核查CSR-TR-573方法与结果；期刊版仅原始摘要','多主题交叉浏览与minimal hypertext/drill比较；分析样本34人，迁移与事实掌握存在权衡。','不能把1993报告冒充1995排版全文；多组件干预、排除缺失及额外两人、学习时间差异；不是自由追问vs线性。'),
 'M01':('ICLR 2025','发表版全文重点核查§3–5及附录检索消融','MemTree：动态语义插入，节点有文本、embedding和孩子，高层汇总；多session对话与文档QA；默认collapsed retrieval全节点检索。','构建树并非只沿当前分支取上下文；会从不同子树取信息，非用户fork树；认知schema类比非教育实证。'),
 'M02':('2026 arXiv预印本','全文重点核查§2–4、结果及限制','SegTreeMem：叶为时间有序utterance，内节点为连续时间区间；右边界在线插入，相关性传播保留层级和时间邻域。','时间分段树非探索分叉；PDF标题为Memory Construction and Retrieval，摘要页标题为Long-Horizon Agents，保持两个版本记录。'),
 'M03':('2026 arXiv预印本；官方repo称VLDB2027投稿材料','全文重点核查系统表示、更新/检索与官方README','MemForest：事实存储＋session/entity/scene作用域时间树；连续区间摘要、局部dirty-path刷新、粗到细取证；LoCoMo/LongMemEval-S。','本文内部MemTree不同于M01的ICLR MemTree；时间/事实scope不等于学习者fork语义。仅确认repo存在，未运行复现。'),
 'M04':('2026 arXiv预印本','全文重点核查§2.3、实验设定及§7','WMT：任务/子任务/动作树；活跃路径、动态保留分、fold/suppress/reopen；GAIA系列。','基准每题新树，无跨题global memory；conversation/global mode设计有描述但未在此评估。保留效用分不是事实正确分。'),
 'M05':('ACL 2025','发表版全文重点核查方法与限制','HiAgent：以subgoal形成工作记忆块，当前块保留细节，旧块摘要且可请求历史轨迹。','层级工作记忆，不应夸称任意深度严格树；within-trial，不是长期跨session学习者记忆。官方代码存在，未运行。'),
 'M06':('ICLR 2024','发表版全文重点核查摘要、树构建与检索','RAPTOR：离线对文档chunk嵌入、聚类、递归摘要形成树；多粒度检索。','文档RAG非动态Agent session树；不能因名称tree而推断分支作用域隔离。官方代码存在，未运行。'),
 'M07':('EACL 2026','发表版全文重点核查架构、检索与LoCoMo实验','H-MEM：domain/category/trace/episode四层，位置索引指向下层，逐层检索对话记忆。','语义抽象层级非用户fork；LoCoMo问答非教育学习效果。'),
 'M08':('2026 arXiv预印本','全文重点核查方法、Revise与MemoryArena实验','MAGE：两层执行状态树，当前root-to-current路径加支线hints，Grow/Compress/Maintain/Revise；错误回到边界后开新分支。','本轮最接近路径隔离/恢复机制，但任务执行分支不等于学习者澄清分支；没有学习者研究；内存指针回退不能视为现实副作用撤销。'),
 'D01':('Computational Linguistics 1986','全文重点核查结构区分和§5 interruptions','话语片段/目的关系与注意状态分开；focus spaces stack支持离开当前话题并回归。','经典话语理论，非现代LLM记忆算法；无关插话可在注意栈嵌套但非主任务目的子节点。'),
 'D02':('2025 arXiv预印本','复用上轮全文核查，重点回看作用域设计','ContextBranch：checkpoint/branch/switch/inject，保护主线上下文；合成编程场景评测。','不是学习者研究，不含长期学习者记忆模型。'),
 'D03':('2026 arXiv v2','复用上轮全文核查，重点回看context inheritance','CanvasConvo：对话fork＋线性/树状同步视图，24人5日田野；继承语义理解有成本。','UI/导航与使用体验，不是知识记忆树检索基准或教育RCT。'),
 'D04':('Northwestern博士论文1996','276页中重点读§5.3、§5.4.7及架构范围声明；PDF211页视觉核查','CIRCSIM/TIPS设计：教学agenda/history与discourse tree分离；教学schema放弃后，已经说出的turn仍留在tree。','架构与可行性设计论文，作者明确省略完整运行系统所需部分细节；不是树状LLM教育部署效果证据。')
}
(ROOT/'papers/notes').mkdir(exist_ok=True)
for x in data:
 status,depth,finding,limit=NOTES[x['id']]
 x.update(status=status,read_depth=depth,finding=finding,limitation=limit)
 meta=x.get('metadata',{})
 if meta.get('citation_author'):x['authors']=meta['citation_author']
 if meta.get('citation_date') and not x.get('year'):x['year']=meta['citation_date'][0][:4]
 p=ROOT/'papers/pdf'/f"{x['id']}.pdf"
 if p.exists():x.update(pdf_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),pdf_bytes=p.stat().st_size)
 s=f"# {x['id']} · {x['title']}\n\n出版状态：{status}\n\n阅读深度：{depth}\n\n[原始来源]({x['url']})\n\n核查：{finding}\n\n边界：{limit}\n\n下载状态：{x['pdf_status']}\n"
 if p.exists():s+=f"\n[PDF](../pdf/{x['id']}.pdf) · [提取文本](../text/{x['id']}.txt)\n"
 (ROOT/'papers/notes'/f"{x['id']}.md").write_text(s)
(ROOT/'papers/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
fields=['id','year','topic','title','status','url','pdf_url','pdf_status','pages','provenance','read_depth','finding','limitation']
with (ROOT/'papers/catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(data)
bib=[]
for x in data:
 fields2={'title':x['title'],'url':x['url'],'note':x['id']+'; '+x['status']+'; accessed 2026-10-07'}
 if x.get('year'):fields2['year']=x['year']
 if x.get('authors'):fields2['author']=' and '.join(x['authors'])
 bib.append('@misc{'+x['id']+',\n'+',\n'.join('  '+k+' = {'+str(v).replace('{','').replace('}','')+'}' for k,v in fields2.items())+'\n}')
(ROOT/'papers/references.bib').write_text('\n\n'.join(bib))
stats={'entries':len(data),'pdf':sum((ROOT/'papers/pdf'/f"{x['id']}.pdf").exists() for x in data),'unavailable':[x['id'] for x in data if not (ROOT/'papers/pdf'/f"{x['id']}.pdf").exists()]}
(ROOT/'sources/library-status.json').write_text(json.dumps(stats,indent=2));print(stats)
