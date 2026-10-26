from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'delivery'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
manifest=json.loads((OUT/'stills/manifest.json').read_text(encoding='utf-8'))
def sheet(items,target):
    out=Image.new('RGB',(2048,((len(items)+3)//4)*328),'#111113');d=ImageDraw.Draw(out)
    for i,item in enumerate(items):
        im=Image.open(OUT/item['file']).convert('RGB');im.thumbnail((492,277));x=(i%4)*512+10;y=(i//4)*328+8
        out.paste(im,(x,y));d.text((x+6,y+289),item['label'],font=font,fill='#aaaab0')
    out.save(OUT/target,quality=94)
sheet(manifest['shots'],'90秒分镜总览.jpg')
sheet(manifest['transitions'],'90秒转场校验.jpg')
print('Contact sheets generated from the current render manifest.')
