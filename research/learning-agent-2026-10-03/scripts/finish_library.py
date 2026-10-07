from pathlib import Path
import json, urllib.request, concurrent.futures, hashlib, csv, re
root=Path(__file__).resolve().parents[1]
papers=json.loads((root/'papers/catalog.json').read_text());projects=json.loads((root/'projects/catalog.json').read_text())
extra=[('P08','https://arxiv.org/pdf/2606.20138'),('P31','https://arxiv.org/pdf/2308.06921'),('P39','https://arxiv.org/pdf/2308.02773'),('P23','https://hamsabastani.github.io/education_llm.pdf'),('P47','https://education.asu.edu/sites/default/files/lcl/chiwylie2014icap_2.pdf'),('P48','https://www.ida.org/-/media/feature/publications/e/ef/effectiveness-of-intelligent-tutoring-systems-a-meta-analytic-review/d-8391.ashx')]
def fetch(pair):
    pid,url=pair;p=next(x for x in papers if x['id']==pid)
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=25) as r: data=r.read()
        if not data.startswith(b'%PDF'): raise ValueError('Not a PDF')
        (root/'papers/pdf'/f'{pid}.pdf').write_bytes(data)
        p['pdf_status']='downloaded';p['pdf_url']=url;p['pdf_sha256']=hashlib.sha256(data).hexdigest();p['pdf_bytes']=len(data);p.pop('download_error',None)
        return {'id':pid,'retry':'ok','url':url}
    except Exception as e: return {'id':pid,'retry':'failed','url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: logs=list(pool.map(fetch,extra))
(root/'sources/retry-log.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2))
for p in papers:
    if p.get('verified_title'):
        if p['id'] in ['P11','P34']:p['earlier_title']=p['title'];p['title']=p['verified_title'].strip()
    if (root/'papers/text'/f"{p['id']}.txt").exists():p['read_depth']='全文提取；重点核查方法、评测与局限，未逐页精读'
    else:p['read_depth']='原始摘要或官方介绍；未全文精读'
    if p['id']=='P01': p['limitation']='全文明确：主动Partner机制尚未在本论文中验证干预效果，保持、打扰及学习收益需纵向真人研究。'
    if p['id']=='P04':p['limitation']='全文明确不声称学习增益；BKT为共享先验；弱学习者诊断更不可靠；策略自更新尚未实现。'
    if p['id']=='P02':p['limitation']='全文指出训练以合成数学对话为主，目前无外部工具验证，真人不可预测行为与开放学科尚待评估。'
    if p['id']=='P27':p['limitation']='作者稿招募1047人、分析770人；两组均有相同LLM辅导，比较排序；无设备现场考试约0.15 SD增益，需审查排除与脱落。'
    if p['id']=='P36':p['limitation']='100人交叉研究平衡顺序、包含人工审查；全文明确长期保持未检验，不能称完全自动教学证据。'
    notes=f"# {p['id']} — {p['title']}\n\n- 年份：{p['year']}\n- 主题：{p['topic']}\n- 状态：{p['status']}\n- 原始来源：{p['url']}\n- 核查日期：2026-10-03\n- 作者（网页提取）：{'; '.join(p['authors']) or '未提取；请查原始来源'}\n- PDF：{p['pdf_status']}\n- 阅读深度：{p['read_depth']}\n\n## 关系\n\n{p['finding']}\n\n## 限制\n\n{p['limitation']}\n"
    if p['pdf_status']=='downloaded':notes+=f"\n[本地全文](../pdf/{p['id']}.pdf)\n"
    (root/'papers/notes'/f"{p['id']}.md").write_text(notes)
(root/'papers/catalog.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
with (root/'papers/catalog.csv').open('w') as f:
    fields=['id','year','topic','title','url','status','finding','limitation','pdf_status','read_depth'];w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(papers)
bib=[]
for p in papers:
    authors=' and '.join(p['authors']);bib.append('@misc{'+p['id']+',\n  title = {'+p['title']+'},\n'+('  author = {'+authors+'},\n' if authors else '')+'  year = {'+p['year'][:4]+'},\n  url = {'+p['url']+'},\n  note = {'+p['status']+'; accessed 2026-10-03}\n}')
(root/'papers/references.bib').write_text('\n\n'.join(bib)+'\n')
projects.append(dict(name='Megi',url='https://github.com/ruanyf/weekly/issues/8347',website='https://megi.dev/',feature='提问目录树、导航和拖拽重组；来自开发者产品介绍',use='不能从树状展示推断模型上下文隔离；未查到此来源给出的源码仓库',accessed='2026-10-03',snapshot_status='developer_issue_source'))
try:
    req=urllib.request.Request('https://api.github.com/repos/ruanyf/weekly/issues/8347',headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=20) as r: blob=r.read()
    (root/'sources/Megi-issue-8347.json').write_bytes(blob)
    issue=json.loads(blob);(root/'projects/Megi.md').write_text('# Megi\n\n原始链接：https://github.com/ruanyf/weekly/issues/8347\n\n'+issue['body'])
except Exception as e: projects[-1]['snapshot_error']=str(e)
(root/'projects/catalog.json').write_text(json.dumps(projects,ensure_ascii=False,indent=2))
lines=['# 项目对照与版本快照\n','这些是官方介绍核查与静态文档快照，不是安装运行后的效果评测。13个GitHub仓库保存固定commit README/元数据，另有Megi开发者介绍。\n','| 项目 | 可借鉴 | 差异/边界 | 固定版本 |','|---|---|---|---|']
for p in projects:
    commit=p.get('commit');version=f"[{commit[:8]}](https://github.com/{p['repo']}/tree/{commit})" if commit else '产品介绍，无源码快照'
    lines.append(f"| [{p['name']}]({p['url']}) | {p['feature']} | {p['use']} | {version} |")
(root/'项目对照.md').write_text('\n'.join(lines)+'\n')
summary=dict(paper_count=len(papers),project_count=len(projects),repository_snapshots=sum(p.get('snapshot_status')=='downloaded' for p in projects),pdf_count=sum(p['pdf_status']=='downloaded' for p in papers),fulltext_method_checks=sum('全文提取' in p['read_depth'] for p in papers),pdf_missing=[dict(id=p['id'],url=p['url'],status=p['pdf_status']) for p in papers if p['pdf_status']!='downloaded'])
(root/'sources/library-status.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
