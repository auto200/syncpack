import { Effect } from 'effect';
import { Specifier } from '.';
import type { Ctx } from '../get-context';
import { BaseSpecifier } from './base';
import type { WorkspaceProtocolResult } from './lib/parse-specifier';

/** Represents "workspace:*" and "workspace:~" */
export class WorkspaceProtocolSpecifier extends BaseSpecifier<WorkspaceProtocolResult> {
  _tag = 'WorkspaceProtocolSpecifier';

  /**
   * Return an equivalent value which actually is semver, so that it can be used
   * with tools which expect values which conform to the spec. This value is
   * used only when sorting versions.
   */
  getSemverEquivalent(ctx: Ctx): Effect.Effect<never, never, string> {
    if (this.raw === 'workspace:*') {
      return Effect.succeed('*');
    }
    if (this.raw === 'workspace:~') {
      const local = ctx.packageJsonFilesByName[this.instance.name];
      const version = local?.jsonFile?.contents?.version;
      if (version) return Effect.succeed(`~${version}`);
    }
    return Effect.succeed('0.0.0');
  }

  // @TODO: this name is inaccurate, check how it is used and change logic or rename
  getSemver(): Effect.Effect<never, never, string> {
    return Effect.succeed(this.raw);
  }

  setSemver(version: string): Effect.Effect<never, never, Specifier.Any> {
    return Effect.succeed(Specifier.create(this.instance, version));
  }
}
