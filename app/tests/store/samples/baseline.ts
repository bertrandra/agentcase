import { addTeamRowFor, alignTeam, buildTeam, clearPins, pinPhase, resetTargetLoc, setPin, setRate, setTargetLoc, setTeamTotal } from '@/controllers/baseline';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'baseline.setRate': () => setRate('France', 'B', 777),
  'baseline.setTargetLoc': () => setTargetLoc('Portugal', 30),
  'baseline.resetTargetLoc': () => resetTargetLoc(),
  'baseline.setTeamTotal': () => setTeamTotal(20),
  // the default team IS the mix-built team (a no-op writes nothing since B10a): build it after adding a row
  'baseline.buildTeam': { prep: () => addTeamRowFor('Functional Safety'), run: () => buildTeam() },
  'baseline.alignTeam': { prep: () => setPin(0, 'A017', true), run: () => alignTeam() },
  'baseline.addTeamRowFor': () => addTeamRowFor('Functional Safety'),
  'baseline.setPin': () => setPin(0, 'A017', true),
  'baseline.clearPins': { prep: () => setPin(0, 'A017', true), run: () => clearPins(0) },
  'baseline.pinPhase': () => pinPhase(0, 'V3', true),
};
