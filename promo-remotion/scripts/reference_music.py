"""Prepare the selected music with an immediate start and an 18s transition.

Usage: python scripts/reference_music.py <reference.m4a>
The original reference stays outside the delivery; only the 60s film excerpt is exported.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / 'node_modules/@remotion/compositor-win32-x64-msvc'
SOURCE = Path(sys.argv[1]).resolve()
CACHE = ROOT / '.cache'
ASSETS = ROOT / 'public/assets'
OUT = ROOT / 'delivery'
CACHE.mkdir(exist_ok=True)
decoded = CACHE / 'reference-pcm.wav'

def ffmpeg(*args):
    subprocess.run([str(BIN / 'ffmpeg.exe'), '-y', '-hide_banner', '-loglevel', 'error',
                    *map(str, args)], check=True)

ffmpeg('-i', SOURCE, '-t', '60', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-f', 'wav', decoded)
with wave.open(str(decoded), 'rb') as w:
    samples = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float64) / 32768

rate = 48000
start,anchor = .8225,17.76
repeat_seconds=1.0625
pickup=samples[round(start*rate):round((start+repeat_seconds)*rate)]
intro=np.concatenate([pickup,samples[round(start*rate):round(anchor*rate)]])
assert len(intro)==18*rate
audio=np.zeros((60*rate,2))
audio[:18*rate]=intro
audio[18*rate:]=samples[round(anchor*rate):round(anchor*rate)+42*rate]
audio[:round(.08*rate)]*=np.linspace(0,1,round(.08*rate))[:,None]
# Preserve the reference's timbre and dynamics; only lower playback level by 5dB.
audio *= 10 ** (-5 / 20)
fade = round(1.1 * rate)
audio[-fade:] *= (np.cos(np.linspace(0, np.pi, fade)) * .5 + .5)[:, None]
master = ASSETS / 'music-master.wav'
with wave.open(str(master), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(np.rint(np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())

ffmpeg('-i', master, '-c:a', 'aac', '-b:a', '192k', '-t', '60', '-movflags', '+faststart', '-f', 'mp4', ASSETS / 'soundtrack.m4a')
ffmpeg('-i', master, '-c:a', 'libmp3lame', '-b:a', '192k', '-t', '60', OUT / '转账前保镖-背景音乐.mp3')
(OUT / '转账前保镖-背景音乐.m4a').write_bytes((ASSETS / 'soundtrack.m4a').read_bytes())
report = {
    'type': 'reference_instrumental_excerpt', 'title': '千年之后',
    'reference_title': '《算法の小曲》《AIの小曲》《科普の小曲》Cladue Opus5.5',
    'source_url': 'https://www.bilibili.com/video/BV1uiHs63Ev6/',
    'source_uploader': 'TimeGoTime',
    'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'credit_note': '曲名依据用户确认及参考视频简介；不将视频上传者认定为作曲者。',
    'source_excerpt_start': start, 'source_excerpt_end': anchor+42,
    'offset_frames': 0, 'audio_offset_seconds': 0,
    'intro_source_start': start, 'intro_source_end': anchor,
    'intro_video_seconds': 18, 'intro_tempo_factor': 1, 'intro_repeat_seconds': repeat_seconds,
    'main_source_start': anchor, 'main_video_start': 18,
    'measured_transition_source_seconds': 17.78,
    'transition_video_seconds': 18, 'transition_video_frame': 810,
    'tempo_changed': False, 'tempo_scope': 'original_speed_with_two_beat_pickup',
    'first_100ms_rms': float(np.sqrt(np.mean(audio[:4800]**2))),
    'gain_db': -5, 'end_fade_seconds': 1.1,
    'voice_tracks': 0, 'subtitle_tracks': 0, 'seconds': 60,
    'sample_rate': rate, 'channels': 2, 'video_fps': 45,
    'sample_peak_dbfs': float(20*np.log10(np.max(np.abs(audio)))),
    'rms_dbfs': float(20*np.log10(np.sqrt(np.mean(audio**2)))),
}
(ASSETS / 'audio-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Prepared immediate musical start, original speed with two-beat pickup, exact 18s transition, -5dB, 1.1s end fade.')
