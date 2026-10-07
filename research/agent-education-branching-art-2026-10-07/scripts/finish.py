import json,csv,hashlib
from pathlib import Path
from pypdf import PdfReader
from collect import ROOT,process

data=json.loads((ROOT/'papers/catalog.json').read_text())
# Recover entries completed after the separately downloaded I05 text version.
for ident,title,url,pdf in [
 ('I06','When Users Change Their Mind: Evaluating Interruptible Agents in Long-Horizon Web Navigation','https://arxiv.org/abs/2604.00892','https://arxiv.org/pdf/2604.00892'),
 ('B09','Branchat: A Tree-Structured Interface for Efficient Revisitation in Long-Horizon LLM Conversations','https://doi.org/10.1145/3772363.3798792','https://dl.acm.org/doi/pdf/10.1145/3772363.3798792')]:
 if any(x['id']==ident for x in data):continue
 x=dict(id=ident,title=title,url=url,pdf_url=pdf,topic='interruption' if ident.startswith('I') else 'branching',accessed='2026-10-07',provenance='new download',read_depth='pending')
 p=ROOT/'papers/pdf'/f'{ident}.pdf'
 if p.exists():x.update(pdf_status='downloaded',pages=len(PdfReader(p).pages),pdf_bytes=p.stat().st_size,pdf_sha256=hashlib.sha256(p.read_bytes()).hexdigest())
 else:x.update(pdf_status='failed',attempts=[{'stage':'pdf','error':'HTTP 403 on publisher; Crossref metadata retained'}])
 data.append(x)
for row in [
 ('I07','interruption','Turn-Taking Strategies for Human-Robot Peer-Learning Dialogue','https://aclanthology.org/W18-5013/','https://aclanthology.org/W18-5013.pdf'),
 ('E09','instrument','A Manual for the Use of the Motivated Strategies for Learning Questionnaire (MSLQ)','https://eric.ed.gov/?id=ED338122','https://files.eric.ed.gov/fulltext/ED338122.pdf'),
 ('E10','instrument','NASA-TLX Paper-and-Pencil version user manual','https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/','https://www.nasa.gov/wp-content/uploads/2026/03/nasa-tlx-v1-0-searchable-text-and-forms.pdf')]:
 data.append(process(row))

notes={
 'B01':('全文重点核查 §6–6.3','2025 arXiv；30个合成编程场景；GPT-4生成并由另一会话GPT-4评分。整体8.46→8.67，关注点与上下文利用改善；上下文31→13条。','技术机制近邻；不是30名用户，不是教育RCT；刻意注入污染、同模型家族裁判、单模型。不要复用论文效应量当教育功效分析依据。'),
 'B02':('全文重点核查 §5–7及附录','使用2026-09-15 v2最新标题；24人、5日自选知识工作；聊天与树状画布同步。日志、访谈、SUS、NASA-TLX；分支有利回看和比较，采纳不均且继承语义有困惑。','没有教育随机对照与保持测验；不能说树状UI普遍降低负荷；v1检索摘要为5–7日，报告采用v2的5日。'),
 'B03':('全文重点核查摘要、方法、结果','EACL 2003；真人物理辅导对话的主动权标注。讲授式学生主动权21%，苏格拉底式10%；未发现主动权与学习直接关系，交互性与学习正相关。','历史教育直接证据，但不研究LLM树状存储；主动权、话语产出、问题深度需区分，相关不等于因果。'),
 'B04':('全文重点核查用户研究与结果','Sensecape，UIST 2023；12人对照用户研究，比较非线性知识探索工具；更广概念探索、更多层级组织和回看。','信息探索行为不是无AI学习增益；界面学习成本及多功能混杂。'),
 'B05':('全文重点核查 §9','Graphologue，UIST 2023；形成性研究10人，系统用户评价7名熟练ChatGPT用户；将回答转为交互节点关系图。','技术图谱准确度与定性可用性，不是学科知识随机学习实验；图结构不等于分支长期记忆。'),
 'B06':('沿用上次全文重点核查','DeepTutor，2026预印本：知识 grounding、学习者记忆、题目生成、主动渠道；评测以学生模拟与基准为主。','记忆/教学控制近邻；没有验证本问题的分支追问机制。'),
 'B07':('沿用上次全文重点核查','ScaffoldLM，ACL 2026：计划引导和评估驱动记忆；主要合成数学辅导数据。','不等于树状session或真人自由打岔实验。'),
 'B08':('沿用上次全文重点核查','CoLearn，2026预印本：追踪学习者技能、误解证据和自适应练习。','全文不声称学习增益；不能把用户偏好或诊断质量当教学因果效果。'),
 'B09':('仅核查Crossref原始元数据及B02相关工作表','Branchat，CHI EA 2026，DOI 10.1145/3772363.3798792；标题明确树状长期对话回访。','出版商403，未核查全文、样本或结果；仅作为待读近邻，不据此作效果结论。'),
 'I01':('机构公开PDF的搜索索引方法/结果片段；未下载全文','IVA 2019；42人、被试内、三种停止重叠时序；测主导性、友好、亲近。作者报告较长响应更主导、较少亲近，友好总体检验仅边缘显著。','原PDF403且web打开超时；不能称全部指标显著，不能推到文本教育或保持。原始主效应与对比统计投稿前复核。'),
 'I02':('全文重点核查机制与结论','AAMAS ECA workshop 2010；停止长话语后根据用户语义继续、重规划或abort。','社会情感对话机制论文；非教育学习因果效果。'),
 'I03':('全文重点核查摘要与方法','ACL Student Research Workshop 2011；真人辅导语料的韵律轮次边界研究。','教育轮次设计近邻；非允许/不允许打断的学习实验。'),
 'I04':('全文重点核查摘要、方法与结论','Interspeech 2017；反应式增量语音合成及处理用户打断。','工程/语音机制证据；非教育介入RCT。'),
 'I05':('全文重点核查 §V–VII；另保留出版版图像PDF','RSS 2025；21人，两种任务；121次插话，排除5次脚本事件与5次网络故障后，104/111成功。错误次数与被听见/重视感、满意度负相关。','探索性相关分析；21人有42次任务评价，非42名独立参与者；忽略/总让出两基线为离线推算，不是随机组间体验实验。无教育学习测验。'),
 'I06':('全文重点核查摘要、任务与限制','InterruptBench，2026预印本；WebArena-Lite任务，中途添加、修改、撤回要求；评估任务成功和恢复效率。','最贴近有工具Agent被打断后的状态处理；模拟基准，不是用户体验或学习证据。'),
 'I07':('原始摘要和全文方法扫描','SIGDIAL 2018；真人同伴辅导语料→可教机器人轮次策略；grounding和呈现控制。','学习场景直接近邻；非文本实时abort对照。'),
 'A01':('全文重点核查 §3–4','SakugaFlow，2025预印本；草图、线稿、颜色、完成四阶段，LLM指导、局部修改、分支版本。','没有受控学习用户研究；技能获取实验列未来工作。中间扩散图不保证等于人类真实落笔过程；作品分支≠session记忆树。'),
 'A02':('全文重点核查纳入标准、研究表、方法与限制','Education Sciences 2026卷，2025年12月上线；19项2019–2025范围内实证，检索实际截至2025年8月。高教、东亚、混合方法占多数。','艺术GenAI≠自主Agent；早期、异质、短期；其纳入数不代表整个艺术AI领域只有19篇。'),
 'A03':('出版商原始摘要＋A02研究表；未下载全文','Chen/Mokmin/Su 2025；64名一年级本科生；ChatGPT教学代理 vs 传统多媒体，准实验；成就、动机、自我效能。','最直接的艺术设计课程教学代理近邻；设计史语境，不能外推手绘技能；详细随机方式、量表、延迟效果尚未核实。'),
 'A04':('Microsoft原始PDF索引摘要/方法；未下载全文','C&C 2019；20人、两组；图像处理分步骤绘画，力度/倾斜实时反馈；专家盲评、问卷访谈、日志。','传统计算绘画辅导，非LLM Agent；单次辅助作品变好不保证无辅助技能迁移。'),
 'A05':('全文重点核查 §V-C及结论','LLaQo，2024预印本v2；音频语言模型，教师评分预测；20名音乐学生/教师评价反馈、建议与鉴赏回答。','答案质量证据，未测学生练习后实际进步；鉴赏差异未显著，部分任务未超过专用非LLM模型。'),
 'A06':('全文重点核查设计、量表、评分与限制','Bian等，2025；78名五年级学生，AI示例图 vs 经典作品图，准实验；投入、自我效能、负荷、作品评价。','教师选择材料，非学生对话Agent；课程、教师保持一致可供实验控制参考；短时、单校。'),
 'A07':('全文重点核查 §3–5','Song/Xu，2026；120名动画本科生，4周；结构化双钻石+GAI / GAI / 传统，Deepseek+Dreamina。两位教师匿名随机顺序评作品，CSE和PSI前后测。','文中称准实验且报告重分随机；设计成就无前测；成品含AI生成，PSI为感知问题解决；没有无AI迁移，不能视为独立设计能力因果证据。'),
 'A08':('全文重点核查 §3方法、量表与讨论','2026 AI & SOCIETY；韩国艺术高中84名学生、9次周课；前后问卷、课堂观察、反思、28人焦点访谈。','无对照；AI技能自我效能不是客观艺术技能测验。作者身份、自主权和伦理协商值得单独测量。'),
 'E01':('全文重点核查综述纳入和评价维度','Guan等，2024上线/2025卷；27篇2012–2023研究；SRL过程与学习结果，多种定量/定性方法。','时间段多为前LLM/早期聊天机器人；SRL量表需配行为日志，不当作效果万能解释。'),
 'E02':('出版商原始摘要及建议；未获取PDF','Deng等，C&E 2025；69项2022–2024实验文章；强调客观能力、复杂任务、长期跟踪和功效分析。','总体ChatGPT证据，非树状或艺术Agent；高阶能力自报与客观表现应区别。'),
 'E03':('全文重点核查评价分类与摘要','Maurya等，NAACL 2025；MRBench 192对话、1596回答，8维：错误识别/定位、答案泄露、指导、可行动性、连贯、语气、人类相似性。','教学回答评估，不是真人学习增益；艺术域需适配而非照搬数学rubric。'),
 'E04':('沿用上次全文重点核查','LearnLM，2024技术报告；学习科学引导模型行为与教师偏好评价。','工程/教学行为和偏好不等于保持/迁移；不要把通用正确性当完整教育目标。'),
 'E05':('本轮核查原始PNAS结果；沿用全文','Bastani等，PNAS 2025；高中数学RCT。无护栏GPT练习提升但撤去AI后成绩下降，护栏Tutor未显著优于控制的无AI考试。','强证据说明辅助表现≠学习；不证明所有AI都伤害学习，也不证明树状机制有效。'),
 'E06':('沿用上次全文重点核查','Kestin等，Scientific Reports 2025；真实课程AI辅导与课堂主动学习RCT。','整体教学包比较，不能归因单独记忆/分支功能；可借鉴前后测、时间效率与学习体验联测。'),
 'E07':('沿用上次全文重点核查','Tutor CoPilot，2024预印本/研究；给人类导师提供实时专家建议的课堂实验。','human-in-the-loop不同于自主Agent，干预实施对象是导师。'),
 'E08':('沿用上次原始来源核查；本轮仅理论引用','Chi/Wylie，2014 ICAP：被动、主动、建构、互动认知参与框架。','点击、分支数量不自动代表深度参与；需要内容层面的解释/推理编码。'),
 'E09':('原始手册用途核查；未逐页精读','Pintrich等，1991 MSLQ手册，大学课程动机与学习策略。','成人课程量表不自动适用儿童/艺术短任务；选对应完整子量表，翻译和情境改写后重新检验。'),
 'E10':('NASA官方说明和用户手册用途核查','NASA-TLX主观工作负荷6维：心理、身体、时间、自评表现、努力、挫败。','非教育专门认知负荷三分量表；原weighted与Raw TLX区别，不能把任意Likert均值称官方标准分。'),
}
(ROOT/'papers/notes').mkdir(exist_ok=True)
for x in data:
 depth,finding,limit=notes[x['id']]
 x.update(read_depth=depth,finding=finding,limitation=limit)
 if x.get('metadata',{}).get('citation_author'):x['authors']=x['metadata']['citation_author']
 if x.get('metadata',{}).get('citation_date'):x['year']=x['metadata']['citation_date'][0][:4]
 p=ROOT/'papers/pdf'/f"{x['id']}.pdf"
 if p.exists():
  x['pdf_sha256']=hashlib.sha256(p.read_bytes()).hexdigest();x['pdf_bytes']=p.stat().st_size
 text=f"# {x['id']} · {x['title']}\n\n阅读深度：{depth}\n\n来源：[原始入口]({x['url']})\n\n核查：{finding}\n\n限制：{limit}\n\n下载状态：{x['pdf_status']}；来源记录：{x['provenance']}\n"
 if p.exists():text+=f"\n[本地PDF](../pdf/{x['id']}.pdf) · [提取文本](../text/{x['id']}.txt)\n"
 (ROOT/'papers/notes'/f"{x['id']}.md").write_text(text)
(ROOT/'papers/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
fields=['id','year','topic','title','url','pdf_url','pdf_status','pages','provenance','read_depth','finding','limitation']
with (ROOT/'papers/catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(data)
bib=[]
for x in data:
 fields2={'title':x['title'],'url':x['url'],'note':f"{x['id']}; {x['read_depth']}; accessed 2026-10-07"}
 if x.get('year'):fields2['year']=x['year']
 if x.get('authors'):fields2['author']=' and '.join(x['authors'])
 bib.append('@misc{'+x['id']+',\n'+',\n'.join('  '+k+' = {'+str(v).replace('{','').replace('}','')+'}' for k,v in fields2.items())+'\n}')
(ROOT/'papers/references.bib').write_text('\n\n'.join(bib))
stats=dict(entries=len(data),pdf=sum((ROOT/'papers/pdf'/f"{x['id']}.pdf").exists() for x in data),new_pdf=sum(x['pdf_status']=='downloaded' for x in data),reused_pdf=sum(x['pdf_status']=='reused' for x in data),unavailable=[x['id'] for x in data if not (ROOT/'papers/pdf'/f"{x['id']}.pdf").exists()])
(ROOT/'sources/library-status.json').write_text(json.dumps(stats,indent=2));print(stats)
