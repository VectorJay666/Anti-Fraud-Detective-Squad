"""Original instrumental score: 96 BPM, soft electronic pulse, no voice samples."""
from pathlib import Path
import json,wave,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'public/assets'
SR=48000;SECONDS=60;N=SR*SECONDS;BPM=96;BEAT=60/BPM
mix=np.zeros((N,2),dtype=np.float64)
def hz(m):return 440*2**((m-69)/12)
def add(start,duration,signal,pan=0):
    at=round(start*SR);count=min(len(signal),N-at)
    if at<0 or count<=0:return
    angle=(pan+1)*np.pi/4
    mix[at:at+count,0]+=signal[:count]*np.cos(angle)
    mix[at:at+count,1]+=signal[:count]*np.sin(angle)
def soft_note(start,midi,duration,gain,pan=0,kind='key'):
    dt=np.arange(round(duration*SR))/SR;f=hz(midi)
    if kind=='pad':
        env=(1-np.exp(-dt/1.0))*np.minimum(1,(duration-dt)/1.6)
        sig=(np.sin(2*np.pi*f*dt)+.18*np.sin(2*np.pi*(f*1.001)*dt)+.08*np.sin(2*np.pi*2*f*dt))*env*gain
    elif kind=='bass':
        env=(1-np.exp(-dt*34))*np.exp(-dt*2.0)*np.minimum(1,(duration-dt)/.15)
        sig=(np.sin(2*np.pi*f*dt)+.15*np.sin(2*np.pi*2*f*dt))*env*gain
    else:
        env=(1-np.exp(-dt*95))*np.exp(-dt*3.2)*np.minimum(1,(duration-dt)/.10)
        sig=(np.sin(2*np.pi*f*dt)+.21*np.sin(2*np.pi*2*f*dt)*np.exp(-dt*7)+.065*np.sin(2*np.pi*3*f*dt)*np.exp(-dt*10))*env*gain
    add(start,duration,sig,pan)
    if kind=='key':
        add(start+BEAT*.75,duration,sig*.20,-pan*.8)
        add(start+BEAT*1.5,duration,sig*.08,pan*.5)
# Four related chords in F major / D minor. Final sustained F6/9 resolves the film.
chords=[[50,57,60,64,65],[46,53,57,60,65],[41,53,57,60,67],[48,55,60,62,64]]
pattern=[0,0,1,1,2,2,3,3,0,0,1,1,0,0,3,3,2,2,1,1,2,3,2,2]
for bar,chord_index in enumerate(pattern):
    start=bar*4*BEAT
    if start>=54:break
    notes=chords[chord_index]
    pad_gain=.015 if start<14 else .020 if start<36 else .024
    for j,midi in enumerate(notes):soft_note(start,midi,4*BEAT+1.5,pad_gain,-.48+j*.24,'pad')
    # Soft bass on a stable pulse. Tension thins before human confirmation.
    for beat in [0,2]:
        if 31<=start+beat*BEAT<36:continue
        soft_note(start+beat*BEAT,notes[0]-12,1.4,.10 if start<24 else .075,0,'bass')
    if start>=8:
        for j,offset in enumerate([0,.75,1.5,2.5,3.25]):
            onset=start+offset*BEAT
            if 31<=onset<36 or onset>=54:continue
            midi=notes[1+(j%4)]+12
            soft_note(onset,midi,1.8,.034 if onset<24 else .025,(-.36,.2,-.1,.4,-.25)[j])
# Low, rounded kick: physical pulse without sharp attacks or noisy hi-hats.
for onset in np.arange(0,54,BEAT):
    if 31<=onset<36 or 36<=onset<42 and round(onset/BEAT)%2:continue
    dt=np.arange(round(.55*SR))/SR
    sig=.10*np.sin(2*np.pi*(48*dt+20*(1-np.exp(-dt*24))/24))*np.exp(-dt*10)*(1-np.exp(-dt*130))
    add(onset,.55,sig)
# Dry, very soft rim from synthesized partials, introduced only in the mechanism.
for onset in np.arange(14+BEAT,54,2*BEAT):
    if 31<=onset<36:continue
    dt=np.arange(round(.15*SR))/SR
    sig=.012*(np.sin(2*np.pi*780*dt)+.35*np.sin(2*np.pi*1147*dt))*np.exp(-dt*45)*(1-np.exp(-dt*500))
    add(onset,.15,sig,.12)
# Gate closure at the real result. A low musical accent, not a loud impact.
dt=np.arange(round(1.3*SR))/SR
sig=.14*np.sin(2*np.pi*(42*dt+23*(1-np.exp(-dt*8))/8))*np.exp(-dt*5)*(1-np.exp(-dt*130))
add(31,1.3,sig)
for j,midi in enumerate([41,53,57,60,62,67]):soft_note(53.7,midi,6.3,.032,-.5+j*.2,'pad')
for onset,midi in [(54,77),(54.625,72),(55.25,69)]:soft_note(onset,midi,3,.037,.2)
# Release when the human makes the decision; preserve a stable, calm ending.
t=np.arange(N)/SR
level=np.ones(N);level[(t>=31)&(t<36)]=.65;level[(t>=36)&(t<42)]=.78
fade=np.minimum(1,t/.22)*np.minimum(1,(60-t)/1.0)
mix*=level[:,None]*fade[:,None]
# Gentle master saturation, peak limited below clipping.
mix=np.tanh(mix*1.75)
peak=np.max(np.abs(mix));mix*=.84/max(peak,1e-6)
master=ASSETS/'music-master.wav'
with wave.open(str(master),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
ffmpeg=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
subprocess.run([str(ffmpeg),'-y','-hide_banner','-loglevel','error','-i',str(master),'-c:a','aac','-b:a','192k','-movflags','+faststart','-f','mp4',str(ASSETS/'soundtrack.m4a')],check=True)
report={'type':'instrumental_music_only','voice_tracks':0,'title':'留一步','composer':'Original procedural score for Transfer Guardian','bpm':BPM,'seconds':60,'sample_rate':SR,'channels':2,'peak_dbfs':round(20*np.log10(.84),2),'sections':[{'time':'0—8','music':'Low pulse and spacious pad'},{'time':'8—24','music':'Soft keys, curved stereo delays and restrained rhythm'},{'time':'24—36','music':'Lower register; gate accent at 31s'},{'time':'36—48','music':'Release, warm chord, light rhythm'},{'time':'48—54','music':'Measured return of the motif'},{'time':'54—60','music':'Stable F6/9 chord and gentle final release'}],'sources':'Synthesized tones only. No speech, samples, external music or network services.'}
(ASSETS/'audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
