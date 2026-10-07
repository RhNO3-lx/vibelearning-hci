from pathlib import Path
import json, csv, re, urllib.request, concurrent.futures, hashlib, html
ROOT=Path(__file__).resolve().parents[1]
DATE='2026-10-03'
# Curated from primary sources; this is a scoped review, not an exhaustive systematic review.
ROWS='''P01|2026|主动/记忆|DeepTutor: Towards Agentic Personalized Tutoring|https://arxiv.org/abs/2604.26962|预印本|多层学习者记忆、闭环出题及主动TutorBot，与你的整体构想高度重叠。|个性化基准提升不等于真人延迟学习提升。
P02|2026|主动/规划|Planning-Guided Tutoring with Assessment-Driven Memory for Pedagogical LLM Tutors|https://aclanthology.org/2026.acl-long.325/|ACL 2026|ScaffoldLM将教学步骤、目标达成评估与记忆耦合，适合作为教学控制器基线。|多轮数学基准不能直接外推到开放式工程实验。
P03|2026|主动|Let LLM Tutors Ask First: Proactive LLM-Based Tutoring at Scale in a 1,500-Student Online Classroom|https://aclanthology.org/2026.acl-industry.107/|ACL Industry 2026|SCALA提前生成可能的学生问题；Python课程大规模部署。|问题选择与偏好证据并非长期学习因果证据；主动推荐不等于主动诊断。
P04|2026|记忆/自适应|CoLearn: An Agentic Tutor that Learns its Learner in a Human--AI Co-Learning Loop|https://arxiv.org/abs/2609.21154|arXiv；页面声明EMNLP 2026已接收|软证据BKT、误解记忆、自适应出题及可见证据；9月最新近邻。|盲测偏好与persona模拟不能替代真人保持和迁移测验。
P05|2026|记忆/评测|LongTutor: Benchmarking Large Language Models for Long-term Personalized Tutoring|https://aclanthology.org/2026.acl-long.1371/|ACL 2026|区分历史证据获取、知识状态诊断、教学动作；长历史记住不代表会教。|离线日志任务与真实纵向干预不同。
P06|2026|多模态/评测|MMTutorBench: The First Multimodal Benchmark for AI Math Tutoring|https://aclanthology.org/2026.acl-long.1068/|ACL 2026|评测多模态数学辅导，OCR处理会损失教学质量。|主要是输入理解与回复评测，不能直接验证生成实验的学习效果。
P07|2026|评测/训练|OmniEdu: Open Foundation Models for Learning and Teaching|https://arxiv.org/abs/2609.23088|预印本|9月教育模型工作，覆盖学习和教学基准，包含LongTutor。|基准平均提升与跨学科真人学习效果需区分。
P08|2026|主动/自适应|Learning to Prompt: Improving Student Engagement with Adaptive LLM-based High-School Tutoring|https://arxiv.org/abs/2606.20138|预印本|以教学特征自适应路由提示；真实学生A/B与模拟训练。|转化率、轮数属于过程指标，不能当作保持提升。
P09|2026|教学/评测|Rethinking Scaffolding in LLM Tutors: The Interactional Mismatch Between Benchmarks and Real-World Deployments|https://arxiv.org/abs/2606.15766|ICML 2026 workshop；arXiv|九个数据集检验学生是否接纳脚手架；真实互动常绕过教学安排。|观察结果不证明强制脚手架有效；需要匹配学习目标。
P10|2026|教学/真实使用|LLM Pedagogical Behavior in AI Tutoring Interactions|https://arxiv.org/abs/2608.22993|预印本|大学AI课真实对话研究，解释和直接解题占绝大多数。|辅助程度与考试关系不能作因果解释。
P11|2026|评测|Measuring Whether LLM Tutors Teach or Solve: A Diagnostic for Educational Impact|https://arxiv.org/abs/2606.16206|预印本|区分求解能力与教学能力；检查公开基准能否识别支持学习的行为。|元评测并非随机学习实验。
P12|2025|记忆/自适应|Teaching According to Students' Aptitude: Personalized Mathematics Tutoring via Persona-, Memory-, and Forgetting-Aware LLMs|https://arxiv.org/abs/2511.15163|预印本；代码标注AAAI 2026 workshop|TASA组合persona、事件记忆、遗忘曲线和知识追踪，直接挑战单纯记忆创新。|需核查真人/模拟构成与适用学科；勿把workshop称作主会。
P13|2025|记忆/诊断|Problems With Large Language Models for Learner Modelling: Why LLMs Alone Fall Short for Responsible Tutoring in K--12 Education|https://arxiv.org/abs/2512.23036|预印本|LLM与DKT对照提示早期诊断和校准问题，支持混合学习者模型。|特定数据集结论，不能据此断言所有LLM均劣于KT。
P14|2025|教学/训练|Training LLM-based Tutors to Improve Student Learning Outcomes in Dialogues|https://arxiv.org/abs/2503.06424|预印本版本|依据学生模型预测及教学rubric选择回复，讨论学习导向优化。|模拟学生的学习增益可能偏离真人学习。
P15|2025|自适应|Can Large Language Models Match Tutoring System Adaptivity? A Benchmarking Study|https://arxiv.org/abs/2504.05570|预印本版本|75个真实ITS情境，移除不同上下文要素检验适应性。|措辞变化或分类器分数不是实际教学收益。
P16|2025|评测|MathTutorBench: A Benchmark for Measuring Open-ended Pedagogical Capabilities of LLM Tutors|https://aclanthology.org/2025.emnlp-main.11/|EMNLP 2025|覆盖专业知识、学生理解和教学回复，适合误解诊断离线测试。|教学专业化与求解准确度可能存在权衡；仍需真人评测。
P17|2025|评测|Unifying AI Tutor Evaluation: An Evaluation Taxonomy for Pedagogical Ability Assessment of LLM-Powered AI Tutors|https://aclanthology.org/2025.naacl-long.57/|NAACL 2025|MRBench含八维误解修复标注，可评估诊断、提示和泄题。|局部回复质量不足以评价整个学习历程。
P18|2025|评测|TutorBench: A Benchmark To Assess Tutoring Capabilities Of Large Language Models|https://arxiv.org/abs/2510.02663|预印本；Scale作者项目|细粒度rubric与LLM judge评测辅导能力。|与DeepTutor的同名TutorBench不同；不能混合数据与分数。
P19|2025|评测/综述|Pedagogy-driven Evaluation of Generative AI-powered Intelligent Tutoring Systems|https://arxiv.org/abs/2510.22581|预印本版本|梳理教育理论驱动评测及统一评测的困难。|方法论立场不等于系统成效证据。
P20|2024|教学/模型|LearnLM: Improving Gemini for Learning|https://arxiv.org/abs/2412.16429|技术报告|把教学行为转为教学指令跟随，提供认知负荷、主动学习等rubric。|专家偏好不是无AI考试增益。
P21|2025|评测|Evaluating Gemini in an arena for learning|https://arxiv.org/abs/2505.24477|技术报告|教育专家盲测多轮对话，展示教学比较评测设计。|模型版本与专家角色扮演影响外部效度。
P22|2024|教学/评测|Towards Responsible Development of Generative AI for Education: An Evaluation-Driven Approach|https://arxiv.org/abs/2407.12687|技术报告|学习科学原则转为多种教育评测，适合设计原则溯源。|报告聚焦的情境不能涵盖所有学习者。
P23|2025|因果证据|Generative AI without guardrails can harm learning: Evidence from high school mathematics|https://doi.org/10.1073/pnas.2422633122|PNAS 2025|练习时表现与撤除AI后独立表现可能方向相反；论文明确讨论被动辅导局限。|短期数学情境；不能外推所有AI工具必然损害学习。
P24|2025|因果证据|AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting|https://doi.org/10.1038/s41598-025-97652-6|Scientific Reports 2025|精心设计的物理辅导在研究情境优于课堂对照，支持结构化教学。|短时单课程且教学条件多项变化，无法拆解单个机制效应。
P25|2024/2025|人机教学/因果证据|Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise|https://arxiv.org/abs/2410.03017|预印本v2，2025修订|AI帮助真人导师选择教学动作，RCT发现主题掌握改善。|有人类导师在环，不能归因给自主agent或与其他版本样本数混用。
P26|2025|因果证据|AI tutoring can safely and effectively support students: An exploratory RCT in UK classrooms|https://arxiv.org/abs/2512.23633|预印本|LearnLM与Eedi结合，165名学生探索性随机实验。|真人监督与有限样本，不证明完全自主或一般性等效。
P27|2026|因果证据/自适应|Effective Personalized AI Tutors via LLM-Guided Reinforcement Learning|https://hamsabastani.github.io/llmRL_doe.pdf|作者工作论文；AOM摘要另刊|对比都有LLM辅导时附加RL排序，值得精读增量个性化实验。|作者稿版本与摘要需对应；不要把会议摘要当完整同行评审因果报告。
P28|2026|因果证据/语音|When AI Tutors Speak: Evidence from a Randomized Field Experiment|https://arxiv.org/abs/2609.23958|预印本|9月结构化课程辅导现场实验，增加语音相关研究线索。|题名不足以分离语音效应；需检查随机条件和统计功效。
P29|2025|真实学习|Generative AI alone may not be enough: Evaluating AI Support for Learning Mathematical Proof|https://arxiv.org/abs/2509.16778|预印本版本|证明写作反馈与聊天结合，提醒复杂综合任务不能只靠生成回答。|特定课程与实施方式不能解释所有失败机制。
P30|2024|实操/编程|CodeAid: Evaluating a Classroom Deployment of an LLM-based Programming Assistant that Balances Student and Educator Needs|https://arxiv.org/abs/2401.11314|CHI 2024；开放预印本|700人课程学期部署，伪代码、行级建议、学习者透明控制。|主要部署与访谈证据，不等同于随机学习成效试验。
P31|2023|实操/编程|CodeHelp: Using Large Language Models with Guardrails for Scalable Support in Programming Classes|https://arxiv.org/abs/2308.06921|开放预印本版本|编程课提示护栏与教师控制，52名学生12周部署。|受欢迎、方便使用不代表迁移增益。
P32|2023|树图交互|Sensecape: Enabling Multilevel Exploration and Sensemaking with Large Language Models|https://arxiv.org/abs/2305.11483|开放预印本版本|多层抽象与探索/整合切换，是非线性知识探索的重要先例。|信息组织任务不是学习保持测验。
P33|2023|树图交互|Graphologue: Exploring Large Language Model Responses with Interactive Diagrams|https://arxiv.org/abs/2305.11473|开放预印本版本|把LLM回答变为可交互关系图与上下文提问，树图UI本身并不新。|图由模型抽取可能失真；并未解决掌握度与分支记忆更新。
P34|2025|多模态/视频|TheoremExplainAgent: Towards Multimodal Explanations for LLM Theorem Understanding|https://arxiv.org/abs/2502.19400|ACL 2025；开放预印本|Manim长定理视频与240定理基准，展示布局和深层推理问题。|视频生成评分不是学生学习因果证据。
P35|2025|多模态/视频|Code2Video: A Code-centric Paradigm for Educational Video Generation|https://arxiv.org/abs/2510.01174|预印本；项目标注NeurIPS DL4C workshop|规划、代码生成、视觉批评，MMMC和TeachQuiz评测。|TeachQuiz的VLM学习代理不能替代真人概念迁移。
P36|2026|多模态/学习|LLM2Manim: Pedagogy-Aware AI Generation of STEM Animations|https://arxiv.org/abs/2604.05266|预印本|有专家审查的动画生成；100名本科生A-B教学研究。|需核查顺序、主题、时间和延迟测试；不是完全自动生成成效。
P37|2026|多智能体/课堂|From MOOC to MAIC: Reimagine Online Teaching and Learning Through LLM-Driven Agents|https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-025-6000-0|JCST；项目引用2026|OpenMAIC指向的学术近邻，把在线课转为多agent互动课堂。|论文系统与9月代码版本不能默认完全一致。
P38|2026|综述|LLM-Based Intelligent Tutoring Systems: A Survey|https://www.ijcai.org/proceedings/2026/875|IJCAI 2026|近期ITS综述入口，用于沿引用补齐系统与评测。|综述结论需回到原始实验核实。
P39|2023|教学/开源|EduChat: A Large-Scale Language Model-based Chatbot System for Intelligent Education|https://arxiv.org/abs/2308.02773|开放预印本|教育对话、启发式教学和情感支持，中文教育模型先例。|早期模型报告与现行仓库功能不同。
P40|2025|通用记忆|Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory|https://arxiv.org/abs/2504.19413|预印本|对话记忆提取与检索，适合基础设施对照。|通用记忆QA不测学生掌握度或教学效果。
P41|2025|通用记忆|Zep: A Temporal Knowledge Graph Architecture for Agent Memory|https://arxiv.org/abs/2501.13956|预印本|时序知识图与来源更新可借鉴学习证据版本管理。|不能把最新事实覆盖直接用于掌握度：一次答对未必消除误解。
P42|2024|通用记忆/评测|LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory|https://arxiv.org/abs/2410.10813|预印本版本|多会话、时间推理、更新与拒答，适合长期记忆工程校验。|记忆正确率不是学习者诊断准确率。
P43|2026|通用记忆/评测|EvalMem: An Operation-Level Diagnostic Framework for Long-Term Memory Systems|https://arxiv.org/abs/2609.22231|预印本|把记忆失败拆成编码、检索和生成，适合归因分析。|需移植到教育事件，不能直接沿用通用QA结论。
P44|2015|知识追踪|Deep Knowledge Tracing|https://arxiv.org/abs/1506.05908|NeurIPS 2015；预印本|依据历史题目表现预测掌握演化的经典神经KT基线。|预测AUC与教学收益不同；新项目小样本未必适合深模型。
P45|2020|知识追踪|Context-Aware Attentive Knowledge Tracing|https://arxiv.org/abs/2007.12324|KDD 2020；预印本|AKT把注意力、题目差异和衰减结合，适合较大交互数据。|黑箱解释与分布外泛化仍需审慎。
P46|2016|间隔复习|A Trainable Spaced Repetition Model for Language Learning|https://aclanthology.org/P16-1174/|ACL 2016|半衰期回归使复习计划基于记忆预测，提醒调度不能只按固定日期。|词汇回忆不等于编程技能或复杂概念迁移。
P47|2014|学习科学|The ICAP Framework: Linking Cognitive Engagement to Active Learning Outcomes|https://doi.org/10.1080/00461520.2014.965823|Educational Psychologist|区分被动、操作、建构与互动；实验应让学生预测、解释与反思。|增加点击或观看动画不自动成为深度认知参与。
P48|2016|ITS/元分析|Effectiveness of Intelligent Tutoring Systems: A Meta-Analytic Review|https://eric.ed.gov/?id=EJ1090502|Review of Educational Research|50项受控评估梳理传统ITS效果；提醒该领域有长期积累。|对照条件和测验对齐程度显著影响效果。
P49|2008|学习科学|Learning Styles: Concepts and Evidence|https://pubmed.ncbi.nlm.nih.gov/26162104/|Psychological Science in the Public Interest|偏好确实存在，但按学习风格配对教学缺乏充分证据。|可以记用户偏好，不能推断视觉型身份并保证效果。'''
papers=[]
for line in ROWS.splitlines():
    pid,year,topic,title,url,status,finding,limit=line.split('|')
    papers.append(dict(id=pid,year=year,topic=topic,title=title,url=url,status=status,finding=finding,limitation=limit,accessed=DATE,read_depth='原始摘要/官方介绍核查；部分核心全文重点核查',authors=[],pdf_status='not_attempted'))
PROJS='''DeepTutor|HKUDS/DeepTutor|整体最接近：多层记忆、主动TutorBot、知识库、出题与引导学习。|优先复用基础设施；必须单独验证长期学习效果。
OpenMAIC|THU-MAIC/OpenMAIC|多agent课堂、课件、语音、测验、交互模拟和PBL。|研究实验状态诊断和脚手架撤除的增量贡献，勿只比生成内容数量。
ClassMate|Dualqwq/ClassMate|C/C++与DSA的VS Code辅导、编译反馈、Debug Journey及课件搜索图。|已有README把部分运行记录整合标为正在开发，不能全部当已验证能力。
ScaffoldLM|BNU-ERC-ITEA/ScaffoldLM|规划加评估驱动记忆的教学控制器。|重点对照分阶段目标判定和提示策略。
TASA|YANGWU001/TASA|persona、事件记忆、遗忘和知识追踪。|重点对照记忆更新和复习调度。
TheoremExplainAgent|TIGER-AI-Lab/TheoremExplainAgent|长Manim定理讲解和评测数据。|生成和布局检查可复用；补真人迁移评估。
Code2Video|showlab/Code2Video|可执行代码视频生成和批评流水线。|借鉴工具验证；模型代理学习评分不能替代人。
EduChat|ECNU-ICALK/EduChat|中文教育对话与引导式教学。|语言和课程情境对照。
Graphiti|getzep/graphiti|时序图记忆基础设施。|来源、有效期和矛盾记录；不是学习者模型。
Mem0|mem0ai/mem0|通用记忆抽取与检索。|与结构化教育记忆比较。
FSRS|open-spaced-repetition/fsrs4anki|间隔复习调度与拟合工具。|技能需定义可重复观测事件，不能直接把完整任务当单张卡。
grill-me|mattpocock/skills|逐问澄清设计的框架；当前入口转到grilling。|研究性参考而非已安装或本次执行的skill；诊断题不能预先给答案。
GenAICanHarmLearning|obastani/GenAICanHarmLearning|PNAS学习风险RCT的公开代码和匿名资料入口。|可借鉴无AI测验设计，复用数据要核对许可。'''
projects=[]
for line in PROJS.splitlines():
    name,repo,feature,use=line.split('|')
    projects.append(dict(name=name,repo=repo,url='https://github.com/'+repo,feature=feature,use=use,accessed=DATE))
(ROOT/'papers/catalog.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
(ROOT/'projects/catalog.json').write_text(json.dumps(projects,ensure_ascii=False,indent=2))
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'LearningAgentResearch/1.0','Accept':'*/*'})
    with urllib.request.urlopen(req,timeout=25) as r: return r.read(),r.geturl(),r.headers.get('Content-Type','')
def paper_job(p):
    log=[]
    try:
        data,resolved,ctype=get(p['url'])
        (ROOT/'sources'/f"{p['id']}.html").write_bytes(data)
        page=data.decode('utf-8',errors='replace')
        metas=re.findall(r'<meta\s+[^>]*>',page,re.I)
        extracted={}
        for m in metas:
            attrs=dict(re.findall(r'([\w-]+)=[\"\']([^\"\']*)[\"\']',m))
            key=attrs.get('name') or attrs.get('property')
            if key: extracted.setdefault(key,[]).append(html.unescape(attrs.get('content','')))
        p['authors']=extracted.get('citation_author',[])
        p['verified_title']=next(iter(extracted.get('citation_title',[])),None)
        p['source_metadata']=extracted
        p['resolved_url']=resolved
        pdf=next(iter(extracted.get('citation_pdf_url',[])),None)
        if 'arxiv.org/abs/' in p['url']: pdf=p['url'].replace('/abs/','/pdf/')
        elif 'aclanthology.org' in p['url']: pdf=p['url'].rstrip('/')+'.pdf'
        elif p['url'].endswith('.pdf'): pdf=p['url']
        p['pdf_url']=pdf
        if pdf:
            raw,pu,pc=get(pdf)
            if not raw.startswith(b'%PDF'): raise ValueError('PDF endpoint did not return PDF bytes')
            path=ROOT/'papers/pdf'/f"{p['id']}.pdf"; path.write_bytes(raw)
            p['pdf_status']='downloaded'; p['pdf_sha256']=hashlib.sha256(raw).hexdigest(); p['pdf_bytes']=len(raw)
        else: p['pdf_status']='no_open_pdf_link_extracted'
        log.append({'id':p['id'],'status':'ok','pdf_status':p['pdf_status']})
    except Exception as e:
        p['download_error']=str(e); p['pdf_status']='failed'; log.append({'id':p['id'],'status':'failed','error':str(e)})
    return log[0]
def project_job(p):
    folder=ROOT/'projects/snapshots'/p['name']; folder.mkdir(exist_ok=True)
    try:
        raw,_,_=get('https://api.github.com/repos/'+p['repo']); meta=json.loads(raw)
        (folder/'repository.json').write_bytes(raw)
        branch=meta['default_branch']
        cr,_,_=get('https://api.github.com/repos/'+p['repo']+'/commits/'+branch); commit=json.loads(cr)['sha']
        p['commit']=commit; p['default_branch']=branch; p['license']=meta.get('license'); p['updated_at']=meta.get('updated_at')
        paths=['README.md','LICENSE']
        if p['name']=='grill-me': paths+=['skills/productivity/grill-me/SKILL.md','skills/productivity/grilling/SKILL.md']
        for path in paths:
            try:
                blob,_,_=get('https://raw.githubusercontent.com/'+p['repo']+'/'+commit+'/'+path)
                (folder/path.replace('/','__')).write_bytes(blob)
            except Exception as e: p.setdefault('file_errors',{})[path]=str(e)
        p['snapshot_status']='downloaded'; return {'project':p['name'],'status':'ok','commit':commit}
    except Exception as e:
        p['snapshot_status']='failed';p['error']=str(e);return {'project':p['name'],'status':'failed','error':str(e)}
if __name__=='__main__':
    logs=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futs=[pool.submit(paper_job,p) for p in papers]+[pool.submit(project_job,p) for p in projects]
        for f in concurrent.futures.as_completed(futs):
            item=f.result(); logs.append(item); print(json.dumps(item,ensure_ascii=False),flush=True)
    (ROOT/'sources/download-log.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2))
    (ROOT/'papers/catalog.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
    (ROOT/'projects/catalog.json').write_text(json.dumps(projects,ensure_ascii=False,indent=2))
    for p in papers:
        note=f"# {p['id']} — {p['title']}\n\n- 年份：{p['year']}\n- 主题：{p['topic']}\n- 状态：{p['status']}\n- 原始来源：{p['url']}\n- 核查日期：{DATE}\n- 作者（官方网页提取）：{'; '.join(p['authors']) or '未提取；请查看原始来源'}\n- PDF状态：{p['pdf_status']}\n\n## 与项目的关系\n\n{p['finding']}\n\n## 解读边界\n\n{p['limitation']}\n\n本条以原始摘要/官方介绍为主；下载全文不表示已逐页精读。核心工作补充分析见调研报告和研究方案。\n"
        (ROOT/'papers/notes'/f"{p['id']}.md").write_text(note)
    with (ROOT/'papers/catalog.csv').open('w') as f:
        fields=['id','year','topic','title','url','status','finding','limitation','pdf_status'];w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(papers)
    bib=[]
    for p in papers:
        authors=' and '.join(p['authors']);year=p['year'][:4]
        bib.append('@misc{'+p['id']+',\n  title = {'+p['title']+'},\n  author = {'+authors+'},\n  year = {'+year+'},\n  url = {'+p['url']+'},\n  note = {'+p['status']+'; accessed '+DATE+'}\n}')
    (ROOT/'papers/references.bib').write_text('\n\n'.join(bib)+'\n')
    print('TOTAL',len(papers),'papers',len(projects),'projects',sum(p['pdf_status']=='downloaded' for p in papers),'PDFs',flush=True)
