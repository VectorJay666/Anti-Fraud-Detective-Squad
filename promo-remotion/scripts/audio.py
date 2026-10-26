"""A 60-second original score spotted to the 20-shot, 45fps film. No voices."""
from pathlib import Path
import json,shutil,subprocess,wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/assets';DELIVERY=ROOT/'delivery'
SR=48000;SECONDS=60;FPS=45;N=SR*SECONDS
GRID_BPM=120;BEAT=60/GRID_BPM
mix=np.zeros((N,2),dtype=np.float64)
notes=[]
cues=json.loads((ROOT/'src/music-cues.json').read_text(encoding='utf-8-sig'))

def snap(seconds):return round(seconds*FPS)/FPS

def hz(midi):return 440*2**((midi-69)/12)

def add(start,signal,pan=0):
    at=round(start*SR)
    if at<0:signal=signal[-at:];at=0
    count=min(len(signal),N-at)
    if count<=0:return
    angle=(np.clip(pan,-1,1)+1)*np.pi/4
    mix[at:at+count,0]+=signal[:count]*np.cos(angle)
    mix[at:at+count,1]+=signal[:count]*np.sin(angle)

def key(seconds,midi,gain=.032,pan=0,duration=1.8,echo=True):
    onset=snap(seconds);dt=np.arange(round(duration*SR))/SR;f=hz(midi)
    env=(1-np.exp(-dt*95))*np.exp(-dt*3.0)*np.minimum(1,(duration-dt)/.12)
    # Rounded electric-key partials; the high partial disappears quickly.
    signal=(np.sin(2*np.pi*f*dt)+.19*np.sin(2*np.pi*2*f*dt)*np.exp(-dt*6)+.055*np.sin(2*np.pi*3.01*f*dt)*np.exp(-dt*11))*env*gain
    add(onset,signal,pan)
    if echo:
        add(onset+.375,signal*.17,-pan*.75)
        add(onset+.750,signal*.06,pan*.5)
    notes.append({'time':round(onset,6),'frame':round(onset*FPS),'midi':midi,'kind':'soft_key'})

def pad(start,end,chord,gain=.017,width=.7):
    onset=max(0,start-.35);duration=min(60-onset,end-onset+1.15)
    dt=np.arange(round(duration*SR))/SR
    attack=1-np.exp(-dt/.67);release=np.minimum(1,(duration-dt)/1.25)
    for i,midi in enumerate(chord):
        f=hz(midi);pan=-width+2*width*i/max(1,len(chord)-1)
        # Slow beating creates space without noisy textures or vocal samples.
        signal=(np.sin(2*np.pi*f*dt)+.13*np.sin(2*np.pi*f*1.0013*dt)+.055*np.sin(2*np.pi*2*f*dt))*attack*release*gain
        add(onset,signal,pan)

def bass(seconds,midi,gain=.065):
    dt=np.arange(round(1.35*SR))/SR;f=hz(midi)
    signal=(np.sin(2*np.pi*f*dt)+.12*np.sin(2*np.pi*2*f*dt))*(1-np.exp(-dt*38))*np.exp(-dt*3.1)*gain
    add(snap(seconds),signal)

def pulse(seconds,gain=.055):
    dt=np.arange(round(.52*SR))/SR
    signal=gain*np.sin(2*np.pi*(48*dt+18*(1-np.exp(-dt*25))/25))*np.exp(-dt*11)*(1-np.exp(-dt*145))
    add(snap(seconds),signal)

def closure(seconds,gain=.13):
    dt=np.arange(round(1.16*SR))/SR
    phase=2*np.pi*(42*dt+24*(1-np.exp(-dt*9))/9)
    signal=gain*(np.sin(phase)+.12*np.sin(2*np.pi*113*dt)*np.exp(-dt*16))*np.exp(-dt*5.4)*(1-np.exp(-dt*140))
    add(snap(seconds),signal)
    notes.append({'time':round(snap(seconds),6),'frame':round(seconds*FPS),'kind':'low_gate_closure'})

DM=[50,57,60,64,65];BB=[46,53,57,60,65];F6=[41,53,57,60,62];CS=[48,55,60,62,64]
# Chord changes follow narrative turns, rather than an unrelated looping bar count.
sections=[(0,8,DM,.010),(8,12,BB,.016),(12,14,F6,.018),(14,18,CS,.017),(18,22,DM,.021),(22,24,BB,.018),(24,28,DM,.013),(28,31,CS,.010),(31,33,DM,.007),(33,36,BB,.014),(36,39,F6,.021),(39,42,BB,.019),(42,46,F6,.020),(46,48,CS,.017),(48,54,DM,.024),(54,60,F6+[67],.029)]
for start,end,chord,gain in sections:pad(start,end,chord,gain)

# A 120BPM synchronization grid with a calm half-time pulse, not a dance beat.
# Every whole-second cut can sit on the grid; pauses are composed deliberately.
for start,end,chord,_ in sections:
    if start>=54:continue
    for seconds in np.arange(start,end,1.0):
        if 31<=seconds<36 or 36<=seconds<39:continue
        if start<8 and seconds not in (0,2,4,6):continue
        if 28<=seconds<31 and round(seconds)%2:continue
        if 42<=seconds<48 and round(seconds)%2:continue
        bass(seconds,chord[0]-12,.062 if 8<=seconds<24 else .045)
        pulse(seconds,.050 if 8<=seconds<24 else .032)

# Three situations: one sonic idea, repeated with a different answering note.
key(0,74,.023,-.25,2.0)
for start,main,response in [(2,69,76),(4,65,72),(6,64,69)]:
    key(start,main,.034,-.20)
    key(start+1.32,response,.022,.30)
key(8,74,.048,-.25);key(8.25,69,.032,.28)
# Two streams of case material merge into one file.
key(9,62,.031,-.4);key(9.32,65,.027,.4)
key(10.52,69,.036,-.25);key(10.88,74,.036,.25)
key(12,69,.033,-.18);key(12.25,74,.027,.25)
# Conversational handoffs, aligned to completed paths.
key(14,62,.030,-.2)
for seconds,midi in [(15.36,65),(16.08,69),(16.8,64)]:key(seconds,midi,.031,(-.3 if midi==65 else .3))
# Seven notes for the seven roles. This motif exists only in this shot.
for i,(offset,midi) in enumerate(zip([0,.20,.68,1.16,1.64,2.12,2.60],[62,64,65,69,72,69,74])):key(18+offset,midi,.035,-.45+i*.15,1.5)
key(21.36,74,.041,.10);bass(21.36,38,.065)
for seconds,midi in [(22.84,74),(23.16,69),(23.48,65)]:key(seconds,midi,.029,.2,duration=1.2)
# Rules: remove ornament, then score the exact physical gate landing.
key(24,50,.032,-.1,echo=False)
closure(25.6,.155)
key(28,60,.025,-.3,echo=False)
key(29.6,57,.022,-.15,.8,False);key(30.2,55,.022,.15,.8,False)
closure(31,.054)
# Two distinct checkpoints, then an audible reduction in pressure.
key(33.84,65,.029,-.25);key(34.76,69,.030,.25)
key(36,72,.031,.1,duration=2.2)
# Local chain and four actionable steps, with space left to read.
for seconds,midi in [(40.28,65),(40.76,69),(41.24,72)]:key(seconds,midi,.026,.12)
for i,(offset,midi) in enumerate(zip([0,.20,.68,1.16],[65,69,72,74])):key(42+offset,midi,.030,-.3+i*.2,1.3)
key(46,69,.027,-.2);key(46.5,64,.023,.3)
# Five-stage recap, a whole-film motif brought to completion.
for i,midi in enumerate([62,65,69,72,74]):key(48+i*.8,midi,.040,-.4+i*.2,1.8)
key(52.08,76,.029,.2);key(53,74,.035,-.1)
# From 54s onward, only the already-arrived stable chord and natural tails.

# Gentle breathing around the gate's transient; no pumping or sudden loudness.
t=np.arange(N)/SR
breath=1-.19*np.exp(-((t-25.6)/.16)**2)
fade=np.minimum(1,t/.18)*np.minimum(1,(60-t)/.8)
mix*=breath[:,None]*fade[:,None]
mix=np.tanh(mix*1.7)
peak=np.max(np.abs(mix));mix*=.84/max(peak,1e-9)
master=ASSETS/'music-master.wav'
with wave.open(str(master),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
local_ffmpeg=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
ffmpeg=str(local_ffmpeg) if local_ffmpeg.exists() else shutil.which('ffmpeg')
if not ffmpeg:raise RuntimeError('FFmpeg is required to encode the generated WAV')
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(master),'-c:a','aac','-b:a','192k','-movflags','+faststart','-f','mp4',str(ASSETS/'soundtrack.m4a')],check=True)
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(master),'-c:a','libmp3lame','-b:a','192k','-f','mp3',str(DELIVERY/'转账前保镖-专属配乐.mp3')],check=True)
shutil.copyfile(ASSETS/'soundtrack.m4a',DELIVERY/'转账前保镖-背景音乐.m4a')
for cue in cues:
    cue['video_frame']=round(cue['time']*FPS);cue['aligned_time']=round(cue['video_frame']/FPS,6)
report={'type':'instrumental_music_only','voice_tracks':0,'title':'留一步 · 逐镜配乐','composer':'Original audiovisual score for Transfer Guardian','grid_bpm':GRID_BPM,'felt_pulse_bpm':60,'seconds':60,'sample_rate':SR,'channels':2,'video_fps':FPS,'peak_dbfs':round(20*np.log10(.84),2),'rms_dbfs':round(20*np.log10(np.sqrt(np.mean(mix*mix))),2),'cue_count':len(cues),'cue_sheet':cues,'note_events':notes,'sources':'Synthesized instruments only. No voices, samples, third-party music or network services.'}
(ASSETS/'audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Generated 60s custom score: {len(cues)} cues; {len(notes)} note/impact events; peak {report['peak_dbfs']} dBFS; RMS {report['rms_dbfs']} dBFS.")
