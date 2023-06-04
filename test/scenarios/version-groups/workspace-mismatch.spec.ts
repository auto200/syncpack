import { fixMismatchesCli } from '../../../src/bin-fix-mismatches/fix-mismatches-cli';
import { lintCli } from '../../../src/bin-lint/lint-cli';
import { listMismatchesCli } from '../../../src/bin-list-mismatches/list-mismatches-cli';
import { listCli } from '../../../src/bin-list/list-cli';
import { promptCli } from '../../../src/bin-prompt/prompt-cli';
import { mockPackage } from '../../mock';
import { createScenario } from '../lib/create-scenario';

describe('versionGroups', () => {
  describe('WORKSPACE_MISMATCH', () => {
    [
      () =>
        createScenario(
          [
            {
              path: 'packages/a/package.json',
              before: mockPackage('a', { otherProps: { packageManager: 'c@2.0.0' } }),
              after: mockPackage('a', { otherProps: { packageManager: 'c@0.0.1' } }),
            },
            {
              path: 'packages/b/package.json',
              before: mockPackage('b', { otherProps: { packageManager: 'c@3.0.0' } }),
              after: mockPackage('b', { otherProps: { packageManager: 'c@0.0.1' } }),
            },
            {
              path: 'packages/c/package.json',
              before: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
              after: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
            },
          ],
          {
            customTypes: {
              engines: {
                strategy: 'name@version',
                path: 'packageManager',
              },
            },
            versionGroups: [
              {
                dependencies: ['**'],
                packages: ['**'],
                preferVersion: 'highestSemver',
              },
            ],
          },
        ),
      () =>
        createScenario(
          [
            {
              path: 'packages/a/package.json',
              before: mockPackage('a', { otherProps: { deps: { custom: { c: '2.0.0' } } } }),
              after: mockPackage('a', { otherProps: { deps: { custom: { c: '0.0.1' } } } }),
            },
            {
              path: 'packages/b/package.json',
              before: mockPackage('b', { otherProps: { deps: { custom: { c: '3.0.0' } } } }),
              after: mockPackage('b', { otherProps: { deps: { custom: { c: '0.0.1' } } } }),
            },
            {
              path: 'packages/c/package.json',
              before: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
              after: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
            },
          ],
          {
            customTypes: {
              engines: {
                strategy: 'versionsByName',
                path: 'deps.custom',
              },
            },
            versionGroups: [
              {
                dependencies: ['**'],
                packages: ['**'],
                preferVersion: 'highestSemver',
              },
            ],
          },
        ),
      () =>
        createScenario(
          [
            {
              path: 'packages/a/package.json',
              before: mockPackage('a', { otherProps: { deps: { custom: { c: '2.0.0' } } } }),
              after: mockPackage('a', { otherProps: { deps: { custom: { c: '0.0.1' } } } }),
            },
            {
              path: 'packages/b/package.json',
              before: mockPackage('b', { otherProps: { deps: { custom: { c: '3.0.0' } } } }),
              after: mockPackage('b', { otherProps: { deps: { custom: { c: '0.0.1' } } } }),
            },
            {
              path: 'packages/c/package.json',
              before: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
              after: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
            },
          ],
          {
            customTypes: {
              engines: {
                strategy: 'version',
                path: 'deps.custom.c',
              },
            },
            versionGroups: [
              {
                dependencies: ['**'],
                packages: ['**'],
                preferVersion: 'highestSemver',
              },
            ],
          },
        ),
      () =>
        createScenario(
          [
            {
              path: 'packages/a/package.json',
              before: mockPackage('a', { deps: ['c@0.1.0'] }),
              after: mockPackage('a', { deps: ['c@0.0.1'] }),
            },
            {
              path: 'packages/b/package.json',
              before: mockPackage('b', { devDeps: ['c@0.2.0'] }),
              after: mockPackage('b', { devDeps: ['c@0.0.1'] }),
            },
            {
              path: 'packages/c/package.json',
              before: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
              after: mockPackage('c', { otherProps: { name: 'c', version: '0.0.1' } }),
            },
          ],
          {
            versionGroups: [
              {
                dependencies: ['**'],
                packages: ['**'],
                preferVersion: 'highestSemver',
              },
            ],
          },
        ),
    ].forEach((getScenario) => {
      describe('versionGroup.inspect()', () => {
        test('should identify as a mismatch against the canonical local package version', () => {
          const scenario = getScenario();
          expect(scenario.report.versionGroups).toEqual([
            [
              expect.objectContaining({
                expectedVersion: '0.0.1',
                isValid: false,
                name: 'c',
                status: 'WORKSPACE_MISMATCH',
              }),
            ],
          ]);
        });
      });

      describe('fix-mismatches', () => {
        test('should fix the mismatch', () => {
          const scenario = getScenario();
          fixMismatchesCli({}, scenario.effects);
          expect(scenario.effects.process.exit).not.toHaveBeenCalled();
          expect(scenario.effects.writeFileSync.mock.calls).toEqual([
            scenario.files['packages/a/package.json'].effectsWriteWhenChanged,
            scenario.files['packages/b/package.json'].effectsWriteWhenChanged,
          ]);
          expect(scenario.log.mock.calls).toEqual([
            scenario.files['packages/a/package.json'].logEntryWhenChanged,
            scenario.files['packages/b/package.json'].logEntryWhenChanged,
            scenario.files['packages/c/package.json'].logEntryWhenUnchanged,
          ]);
        });
      });

      describe('list-mismatches', () => {
        test('should exit with 1 on the mismatch', () => {
          const scenario = getScenario();
          listMismatchesCli({}, scenario.effects);
          expect(scenario.effects.process.exit).toHaveBeenCalledWith(1);
        });
      });

      describe('lint', () => {
        test('should exit with 1 on the mismatch', () => {
          const scenario = getScenario();
          lintCli({}, scenario.effects);
          expect(scenario.effects.process.exit).toHaveBeenCalledWith(1);
        });
      });

      describe('list', () => {
        test('should exit with 1 on the mismatch', () => {
          const scenario = getScenario();
          listCli({}, scenario.effects);
          expect(scenario.effects.process.exit).toHaveBeenCalledWith(1);
        });
      });

      describe('prompt', () => {
        test('should have nothing to do', () => {
          const scenario = getScenario();
          promptCli({}, scenario.effects);
          expect(scenario.effects.askForChoice).not.toHaveBeenCalled();
          expect(scenario.effects.askForInput).not.toHaveBeenCalled();
        });
      });
    });
  });
});
