from pathlib import Path
import json
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
core=['P01','P02','P03','P04','P05','P09','P24','P27','P30','P36','P37','P38']
(root/'papers/text').mkdir(exist_ok=True)
for pid in core:
    p=root/'papers/pdf'/f'{pid}.pdf'
    if not p.exists(): continue
    reader=PdfReader(p);pages=[x.extract_text() or '' for x in reader.pages]
    (root/'papers/text'/f'{pid}.txt').write_text('\n\n'.join(f'--- Page {i+1} ---\n{s}' for i,s in enumerate(pages)))
    print(pid,'pages',len(pages),'FIRST',pages[0][:1000].replace('\n',' '))
    for i,s in enumerate(pages):
        lower=s.lower()
        if any(x in lower for x in ['limitations','human evaluation','randomized','within-subject']):
            print('EVIDENCE',pid,i+1,s[:2000].replace('\n',' '))
            if i>5: break
papers=json.loads((root/'papers/catalog.json').read_text())
for p in papers:
    if p.get('verified_title') and p['title'].lower().replace('-',' ')!=p['verified_title'].lower().replace('-',' '): print('TITLE_CHECK',p['id'],p['verified_title'])
