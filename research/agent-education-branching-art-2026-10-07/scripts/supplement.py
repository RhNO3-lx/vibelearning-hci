import json,csv
from collect import ROOT,process

rows=[
 ('I02','interruption','Handling User Interruptions in an Embodied Conversational Agent','https://www.cs.ox.ac.uk/publications/publication3549-abstract.html','https://www.csc.kth.se/~jboye/publications/aamas2010_interruptions.pdf'),
 ('A04','art','DrawMyPhoto: Assisting Novices in Drawing from Photographs','https://doi.org/10.1145/3325480.3325507','https://www.microsoft.com/en-us/research/wp-content/uploads/2019/10/DrawMyPhoto-CC-2019.pdf'),
 ('I05','interruption','Interruption Handling for Conversational Robots','https://arxiv.org/abs/2501.01568','https://www.roboticsproceedings.org/rss21/p089.pdf'),
 ('I06','interruption','When Users Change Their Mind: Evaluating Interruptible Agents in Long-Horizon Web Navigation','https://arxiv.org/abs/2604.00892','https://arxiv.org/pdf/2604.00892'),
 ('B09','branching','Branchat: A Tree-Structured Interface for Efficient Revisitation in Long-Horizon LLM Conversations','https://dl.acm.org/doi/10.1145/3772363.3798792','https://dl.acm.org/doi/pdf/10.1145/3772363.3798792'),
]
data=json.loads((ROOT/'papers/catalog.json').read_text())
for row in rows:
 new=process(row)
 old=next((x for x in data if x['id']==new['id']),None)
 if old:
  new['attempts']=old.get('attempts',[])+new['attempts'];data[data.index(old)]=new
 else:data.append(new)
 (ROOT/'papers/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
fields=['id','topic','title','url','pdf_url','pdf_status','pages','provenance','read_depth']
with (ROOT/'papers/catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(data)
print('TOTAL',len(data),'PDF',sum(x['pdf_status'] in ['downloaded','reused'] for x in data))
