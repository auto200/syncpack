import { pipe } from 'tightrope/fn/pipe';
import type { CliConfig } from '../config/types';
import { getContext } from '../get-context';
import type { Effects } from '../lib/effects';
import { exitIfInvalid } from '../lib/exit-if-invalid';
import { listMismatches } from './list-mismatches';

export function listMismatchesCli(
  input: Partial<CliConfig>,
  effects: Effects,
): void {
  pipe(getContext(input, effects), listMismatches, exitIfInvalid);
}
