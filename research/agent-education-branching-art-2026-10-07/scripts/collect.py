"""Targeted literature snapshot. Run with bundled Python (requests, bs4, pypdf)."""
import csv, hashlib, json, shutil, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request
from html.parser import HTMLParser
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT.parent / 'learning-agent-2026-10-03'
NEW = [
 ('B01','branching','Context Branching for LLM Conversations: A Version Control Approach to Exploratory Programming','https://arxiv.org/abs/2512.13914','https://arxiv.org/pdf/2512.13914'),
 ('B02','branching','Conversations in Space: Non-Linear LLM Interaction in Everyday Use','https://arxiv.org/abs/2605.15848v2','https://arxiv.org/pdf/2605.15848v2'),
 ('B03','initiative','The Role of Initiative in Tutorial Dialogue','https://aclanthology.org/E03-1072/','https://aclanthology.org/E03-1072.pdf'),
 ('I01','interruption',"Designing the Impression of Social Agents’ Real-time Interruption Handling",'https://doi.org/10.1145/3308532.3329435','https://www.dfki.de/fileadmin/user_upload/import/10535_ivaea493.pdf'),
 ('I02','interruption','Handling User Interruptions in an Embodied Conversational Agent','https://www.cs.ox.ac.uk/publications/publication3549-abstract.html',None),
 ('I03','interruption','Turn-Taking Cues in a Human Tutoring Corpus','https://aclanthology.org/P11-3017/','https://aclanthology.org/P11-3017.pdf'),
 ('I04','interruption','Real-Time Reactive Speech Synthesis: Incorporating Interruptions','https://www.isca-archive.org/interspeech_2017/wester17_interspeech.html','https://www.isca-archive.org/interspeech_2017/wester17_interspeech.pdf'),
 ('A01','art','SakugaFlow: A Stagewise Illustration Framework Emulating the Human Drawing Process and Providing Interactive Tutoring for Novice Drawing Skills','https://arxiv.org/abs/2506.08443','https://arxiv.org/pdf/2506.08443'),
 ('A02','art','Generative AI in Art Education: A Systematic Review of Research Trends, Tool Applications, and Outcomes (2019–2025)','https://doi.org/10.3390/educsci16010047','https://mdpi-res.com/d_attachment/education/education-16-00047/article_deploy/education-16-00047.pdf'),
 ('A03','art','Integrating generative artificial intelligence into design and art course: Effects on student achievement, motivation, and self-efficacy','https://doi.org/10.1080/14703297.2025.2503857','https://www.tandfonline.com/doi/pdf/10.1080/14703297.2025.2503857'),
 ('A04','art','DrawMyPhoto: Assisting Novices in Drawing from Photographs','https://doi.org/10.1145/3325480.3325507','https://www.microsoft.com/en-us/research/uploads/prod/2019/10/DrawMyPhoto-CC-2019.pdf'),
 ('A05','music','LLaQo: Towards a Query-Based Coach in Expressive Music Performance Assessment','https://arxiv.org/abs/2409.08795','https://arxiv.org/pdf/2409.08795'),
 ('A06','art','Effects of AI-generated images in visual art education on students’ classroom engagement, self-efficacy and cognitive load','https://www.nature.com/articles/s41599-025-05860-2','https://www.nature.com/articles/s41599-025-05860-2.pdf'),
 ('A07','art','Effects of integrating a structured design thinking strategy into generative AI-supported design learning on students’ design achievement, creative self-efficacy, and problem-solving skills','https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1847432/full','https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1847432/pdf'),
 ('A08','art','Negotiating creator identity: agency and ethical awareness in AI-assisted art education','https://link.springer.com/article/10.1007/s00146-026-03187-3','https://link.springer.com/content/pdf/10.1007/s00146-026-03187-3.pdf'),
 ('E01','evaluation','How educational chatbots support self-regulated learning? A systematic review of the literature','https://link.springer.com/article/10.1007/s10639-024-12881-y','https://link.springer.com/content/pdf/10.1007/s10639-024-12881-y.pdf'),
 ('E02','evaluation','Does ChatGPT enhance student learning? A systematic review and meta-analysis of experimental studies','https://doi.org/10.1016/j.compedu.2024.105224',None),
]

class Tags(HTMLParser):
 def __init__(self,text):
  super().__init__();self.meta={};self.links=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta':
   k=a.get('name') or a.get('property') or ''
   if k.startswith('citation_'):self.meta.setdefault(k,[]).append(a.get('content',''))
  if tag=='a' and a.get('href'):self.links.append(a['href'])

def fetch(url):
 from types import SimpleNamespace
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=40) as r:
  return SimpleNamespace(content=r.read(),url=r.url,headers=r.headers)

def process(row):
 ident,topic,title,url,pdf = row
 x=dict(id=ident,topic=topic,title=title,url=url,pdf_url=pdf,accessed='2026-10-07',provenance='new download',read_depth='pending')
 attempts=[]
 try:
  r=fetch(url)
  (ROOT/'sources'/f'{ident}.html').write_bytes(r.content)
  soup=Tags(r.content.decode('utf-8',errors='replace'))
  meta=soup.meta
  x['metadata']=meta
  x['resolved_url']=r.url
  if not pdf and meta.get('citation_pdf_url'): pdf=meta['citation_pdf_url'][0];x['pdf_url']=pdf
  # Oxford author repository exposes a direct PDF link.
  if not pdf:
   from urllib.parse import urljoin
   for href in soup.links:
    if '.pdf' in href.lower(): pdf=urljoin(r.url,href);x['pdf_url']=pdf;break
 except Exception as e: attempts.append({'stage':'metadata','error':str(e)})
 if pdf:
  try:
   r=fetch(pdf)
   if not r.content.startswith(b'%PDF'): raise ValueError(f'Not PDF: {r.headers.get("Content-Type")}')
   p=ROOT/'papers/pdf'/f'{ident}.pdf';p.write_bytes(r.content)
   reader=PdfReader(p)
   txt='\n\n'.join(f'=== PDF PAGE {i+1} ===\n'+(pg.extract_text() or '') for i,pg in enumerate(reader.pages))
   (ROOT/'papers/text'/f'{ident}.txt').write_text(txt)
   x.update(pdf_status='downloaded',pdf_bytes=len(r.content),pdf_sha256=hashlib.sha256(r.content).hexdigest(),pages=len(reader.pages),download_resolved_url=r.url)
  except Exception as e: x['pdf_status']='failed';attempts.append({'stage':'pdf','error':str(e)})
 else: x['pdf_status']='no_pdf_link'
 x['attempts']=attempts
 print(ident,x['pdf_status'],flush=True)
 return x

def main():
 for d in ['papers/pdf','papers/text','sources']: (ROOT/d).mkdir(parents=True,exist_ok=True)
 with ThreadPoolExecutor(max_workers=3) as ex: results=list(ex.map(process,NEW))
 prior=json.loads((OLD/'papers/catalog.json').read_text())
 for oldid,newid in [('P32','B04'),('P33','B05'),('P01','B06'),('P02','B07'),('P04','B08'),('P17','E03'),('P20','E04'),('P23','E05'),('P24','E06'),('P25','E07'),('P47','E08')]:
  old=next(v for v in prior if v['id']==oldid)
  x={k:old.get(k) for k in ['title','url','pdf_url','year','authors','status','pdf_sha256','pdf_bytes']}
  x.update(id=newid,topic='evaluation' if newid.startswith('E') else 'branching',accessed='2026-10-03 (prior snapshot)',provenance=f'copied from prior library {oldid}; no new network verification',read_depth='pending')
  p=OLD/'papers/pdf'/f'{oldid}.pdf'
  if p.exists():
   q=ROOT/'papers/pdf'/f'{newid}.pdf';shutil.copy2(p,q)
   reader=PdfReader(q);x.update(pdf_status='reused',pages=len(reader.pages))
   (ROOT/'papers/text'/f'{newid}.txt').write_text('\n\n'.join(f'=== PDF PAGE {i+1} ===\n'+(pg.extract_text() or '') for i,pg in enumerate(reader.pages)))
  else: x['pdf_status']='missing_prior_pdf'
  results.append(x)
 (ROOT/'papers/catalog.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 fields=['id','topic','title','url','pdf_url','pdf_status','pages','provenance','read_depth']
 with (ROOT/'papers/catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(results)
 print('TOTAL',len(results),'PDF',sum(x['pdf_status'] in ['downloaded','reused'] for x in results),flush=True)

if __name__=='__main__': main()
