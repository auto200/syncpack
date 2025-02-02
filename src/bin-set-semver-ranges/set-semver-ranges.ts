import { Context, Effect, pipe } from 'effect';
import { isNonEmptyArray } from 'tightrope/guard/is-non-empty-array';
import {
  fixMismatch,
  logAlreadyValidSize,
  logFixedSize,
  logUnfixableSize,
} from '../bin-fix-mismatches/fix-mismatches';
import { logSemverGroupsDisabledWarning } from '../bin-lint-semver-ranges/lint-semver-ranges';
import { logUnsupportedMismatch } from '../bin-list-mismatches/list-mismatches';
import { CliConfigTag } from '../config/tag';
import { type CliConfig } from '../config/types';
import type { ErrorHandlers } from '../error-handlers/default-error-handlers';
import { chainErrorHandlers, defaultErrorHandlers } from '../error-handlers/default-error-handlers';
import { getContext } from '../get-context';
import { getInstances } from '../get-instances';
import type { Io } from '../io';
import { IoTag } from '../io';
import { exitIfInvalid } from '../io/exit-if-invalid';
import { writeIfChanged } from '../io/write-if-changed';
import { withLogger } from '../lib/with-logger';

interface Input {
  io: Io;
  cli: Partial<CliConfig>;
  errorHandlers?: ErrorHandlers;
}

export function setSemverRanges({ io, cli, errorHandlers = defaultErrorHandlers }: Input) {
  return pipe(
    getContext({ io, cli, errorHandlers }),
    Effect.flatMap((ctx) =>
      pipe(
        Effect.gen(function* ($) {
          // no semver groups have been configured, they are disabled by default
          if (!isNonEmptyArray(ctx.config.rcFile.semverGroups)) {
            ctx.isInvalid = true;
            yield* $(logSemverGroupsDisabledWarning());
            return ctx;
          }

          const { semverGroups } = yield* $(getInstances(ctx, io, errorHandlers));
          let fixedCount = 0;
          let unfixableCount = 0;
          let validCount = 0;

          for (const group of semverGroups) {
            if (group._tag === 'WithRange') {
              for (const instance of group.instances) {
                const report = yield* $(group.inspect(instance));
                const _tag = report._tag;
                if (_tag === 'SemverRangeMismatch') {
                  yield* $(fixMismatch(report));
                  fixedCount++;
                } else if (_tag === 'UnsupportedMismatch') {
                  yield* $(logUnsupportedMismatch(report));
                  unfixableCount++;
                } else {
                  validCount++;
                }
              }
            }
          }

          if (validCount) yield* $(logAlreadyValidSize(validCount));
          if (fixedCount) yield* $(logFixedSize(fixedCount));
          if (unfixableCount) yield* $(logUnfixableSize(unfixableCount));

          return ctx;
        }),
        Effect.flatMap(writeIfChanged),
        Effect.catchTags(chainErrorHandlers(ctx, errorHandlers)),
        Effect.flatMap(exitIfInvalid),
      ),
    ),
    Effect.provide(pipe(Context.empty(), Context.add(CliConfigTag, cli), Context.add(IoTag, io))),
    withLogger,
  );
}
