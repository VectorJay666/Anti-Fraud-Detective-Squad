from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'delivery'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
FPS=45
frames=[round(f*FPS/25) for f in [32,84,134,184,214,280,330,430,532,580,681,762,810,881,953,1035,1132,1180,1322,1350]]
def sheet(files,labels,target):
    out=Image.new('RGB',(2048,((len(files)+3)//4)*328),'#111113');d=ImageDraw.Draw(out)
    for i,(file,label) in enumerate(zip(files,labels)):
        im=Image.open(file).convert('RGB');im.thumbnail((492,277));x=(i%4)*512+10;y=(i//4)*328+8
        out.paste(im,(x,y));d.text((x+6,y+289),label,font=font,fill='#aaaab0')
    out.save(OUT/target,quality=94)
sheet([OUT/f'stills/{i+1:02d}-{f}.png' for i,f in enumerate(frames)],[f'镜{i+1:02d}  /  {f/FPS:.2f}s' for i,f in enumerate(frames)],'60秒分镜总览.jpg')
cuts=[round(f*FPS/25) for f in [94,99,100,106,294,299,300,306,544,549,550,556,769,774,775,781,1344,1349,1350,1356]]
if all((OUT/f'stills/transition-{f}.png').exists() for f in cuts):
    sheet([OUT/f'stills/transition-{f}.png' for f in cuts],[f'转场 / {f/FPS:.2f}s' for f in cuts],'60秒转场校验.jpg')
print('Contact sheets generated.')
