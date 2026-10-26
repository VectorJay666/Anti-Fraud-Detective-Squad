import React from 'react';
import {Composition, registerRoot, staticFile} from 'remotion';
import {Film} from './Film';
import {DURATION,FPS,HEIGHT,WIDTH} from './timeline';
const Root = () => <Composition id="TransferGuardian" component={Film} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{assets:{live:staticFile('assets/project_live.png'),gate:staticFile('assets/project_gate_crop.png'),replay:staticFile('assets/project_replay.png'),sound:staticFile('assets/soundtrack.m4a')}}}/>;
registerRoot(Root);
