"""Supplementary snapshot; uses the previous collector's standard-library fetch/parser."""
import importlib.util,json,shutil,csv
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
PREVIOUS=ROOT.parent/'agent-education-branching-art-2026-10-07'
spec=importlib.util.spec_from_file_location('previous_collector',PREVIOUS/'scripts/collect.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT

ROWS=[
 ('T01','education','The Theory Underlying Concept Maps and How to Construct and Use Them','https://cmap.ihmc.us/docs/theory-of-concept-maps','https://cmap.ihmc.us/Publications/ResearchPapers/TheoryUnderlyingConceptMaps.pdf'),
 ('T02','education','Cognitive Flexibility Theory: Advanced Knowledge Acquisition in Ill-Structured Domains','https://escholarship.org/uc/item/1dr9x302','https://files.eric.ed.gov/fulltext/ED302821.pdf'),
 ('T03','education','Phases of inquiry-based learning: Definitions and the inquiry cycle','https://doi.org/10.1016/j.edurev.2015.02.003','https://ris.utwente.nl/ws/files/7001676/1-s2.0-S1747938X15000068-main.pdf'),
 ('T04','education','Question Asking During Tutoring','https://doi.org/10.3102/00028312031001104','https://citeseerx.ist.psu.edu/document?doi=11a0dabaacc40144adcae5df3b06873236acca8f&repid=rep1&type=pdf'),
 ('T05','education','Learning With Concept and Knowledge Maps: A Meta-Analysis','https://doi.org/10.3102/00346543076003413','https://www.sfu.ca/~jcnesbit/research/NesbitAdesope2006.pdf'),
 ('T06','education','Studying and Constructing Concept Maps: a Meta-Analysis','https://link.springer.com/article/10.1007/s10648-017-9403-9','https://link.springer.com/content/pdf/10.1007/s10648-017-9403-9.pdf'),
 ('T07','education','Cognitive load in hypertext reading: A review','https://www.sciencedirect.com/science/article/pii/S0747563205000658',None),
 ('T08','education','Effects of prior knowledge and concept-map structure on disorientation, cognitive load, and learning','https://doi.org/10.1016/j.learninstruc.2009.02.005','https://research.ou.nl/files/1022307/Amadieu-etal_LI_2009.pdf'),
 ('T09','education','Retrieval Practice Produces More Learning than Elaborative Studying with Concept Mapping','https://doi.org/10.1126/science.1199327','https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Blunt_Science.pdf'),
 ('T10','education','Hypertext Learning Environments, Cognitive Flexibility, and the Transfer of Complex Knowledge: An Empirical Investigation (1993 technical report; related 1995 journal article)','https://eric.ed.gov/?id=ED355508','https://files.eric.ed.gov/fulltext/ED355508.pdf'),
 ('M01','memory','From Isolated Conversations to Hierarchical Schemas: Dynamic Tree Memory Representation for LLMs','https://proceedings.iclr.cc/paper_files/paper/2025/hash/0382cb76309820f71c6eacd47b36ce71-Abstract-Conference.html','https://proceedings.iclr.cc/paper_files/paper/2025/file/0382cb76309820f71c6eacd47b36ce71-Paper-Conference.pdf'),
 ('M02','memory','Temporal Order Matters for Agentic Memory: Segment Trees for Long-Horizon Agents','https://arxiv.org/abs/2606.04555','https://arxiv.org/pdf/2606.04555'),
 ('M03','memory','MemForest: An Efficient Agent Memory System with Hierarchical Temporal Indexing','https://arxiv.org/abs/2605.23986','https://arxiv.org/pdf/2605.23986'),
 ('M04','memory','Weighted Memory Tree: Remembering What Matters for Long-Horizon LLM Agents','https://arxiv.org/abs/2608.20631','https://arxiv.org/pdf/2608.20631'),
 ('M05','memory','HiAgent: Hierarchical Working Memory Management for Solving Long-Horizon Agent Tasks with Large Language Model','https://aclanthology.org/2025.acl-long.1575/','https://aclanthology.org/2025.acl-long.1575.pdf'),
 ('M06','memory','RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval','https://openreview.net/forum?id=GN921JHCRw','https://proceedings.iclr.cc/paper_files/paper/2024/file/8a2acd174940dbca361a6398a4f9df91-Paper-Conference.pdf'),
 ('M07','memory','H-MEM: Hierarchical Memory for High-Efficiency Long-Term Reasoning in LLM Agents','https://aclanthology.org/2026.eacl-long.15/','https://aclanthology.org/2026.eacl-long.15.pdf'),
 ('M08','memory','Beyond Semantic Organization: Memory as Execution State Management for Long-Horizon Agents','https://arxiv.org/abs/2606.06090','https://arxiv.org/pdf/2606.06090'),
 ('D01','discourse','Attention, Intentions, and the Structure of Discourse','https://aclanthology.org/J86-3001/','https://aclanthology.org/J86-3001.pdf'),
 ('D04','education-dialogue','Interaction of Discourse Planning, Instructional Planning and Dialogue Management in an Interactive Tutoring System','http://cs.iit.edu/~circsim/','http://cs.iit.edu/~circsim/documents/rfdiss.pdf'),
]

def main():
 for d in ['papers/pdf','papers/text','sources']: (ROOT/d).mkdir(parents=True,exist_ok=True)
 with ThreadPoolExecutor(max_workers=3) as ex:data=list(ex.map(base.process,ROWS))
 for x in data:
  if x['id']=='T10':
   x.update(year='1993',pdf_version='1993 technical report CSR-TR-573, not 1995 journal typesetting',journal_url='https://doi.org/10.2190/4T1B-HBP0-3F7E-J4PN')
  if x['id']=='D04':
   x.update(year='1996',authors=['Reva K. Freedman'])
   if x['pdf_status']=='downloaded':
    import re
    p=ROOT/'papers/text/D04.txt';s=p.read_text()
    s=re.sub(r'/G([0-9A-Fa-f]{2})(?![0-9A-Fa-f])',lambda m:chr(int(m[1],16)),s)
    p.write_text(s);x['extraction_note']='PDF /Gxx glyph names mapped to hex characters; validate against rendered pages'
 prior=json.loads((PREVIOUS/'papers/catalog.json').read_text())
 for oldid,newid in [('B01','D02'),('B02','D03')]:
  x=next(x for x in prior if x['id']==oldid).copy();x.update(id=newid,provenance=f'reused previous follow-up {oldid}',pdf_status='reused')
  for ext,folder in [('pdf','pdf'),('txt','text')]:
   shutil.copy2(PREVIOUS/'papers'/folder/f'{oldid}.{ext}',ROOT/'papers'/folder/f'{newid}.{ext}')
  data.append(x)
 (ROOT/'papers/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
 with (ROOT/'papers/catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=['id','topic','title','url','pdf_status','pages','provenance','read_depth'],extrasaction='ignore');w.writeheader();w.writerows(data)
 print('ENTRIES',len(data),'PDF',sum(x['pdf_status'] in ['downloaded','reused'] for x in data),flush=True)
if __name__=='__main__':main()
