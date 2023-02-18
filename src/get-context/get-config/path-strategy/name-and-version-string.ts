import { O, pipe, R } from '@mobily/ts-belt';
import { isNonEmptyString } from 'expect-more/dist/is-non-empty-string';
import { isObject } from 'expect-more/dist/is-object';
import { BaseError } from '../../../lib/error';
import { props } from '../../get-package-json-files/get-patterns/props';
import { getNonEmptyStringProp } from './lib/get-non-empty-string-prop';
import type { Strategy } from './types';

export const nameAndVersionString: Strategy<'name@version'> = {
  read(file, pathDef) {
    return pipe(
      // get version prop
      getNonEmptyStringProp(pathDef.path, file),
      // if it is a non empty string, we can read it
      R.flatMap((value) => {
        const [name, version] = value.split('@');
        return isNonEmptyString(name) && isNonEmptyString(version)
          ? R.Ok([[name, version]])
          : R.Error(
              new BaseError(
                `Strategy<name@version> failed to get ${pathDef.path} in ${file.shortPath}`,
              ),
            );
      }),
    );
  },
  write(file, pathDef, [name, version]) {
    const { contents, shortPath } = file;
    const isNestedPath = pathDef.path.includes('.');
    if (isNestedPath) {
      const fullPath = pathDef.path.split('.');
      const pathToParent = fullPath.slice(0, fullPath.length - 1).join('.');
      const key = fullPath.slice(-1).join('');
      return pipe(
        contents,
        props(pathToParent, isObject),
        O.toResult<Record<string, string | undefined>, BaseError>(onError()),
        R.tap((parent) => {
          parent[key] = `${name}@${version}`;
        }),
        R.mapError(onError),
        R.map(() => file),
      );
    } else {
      return pipe(
        R.fromExecution<void>(() => {
          contents[pathDef.path] = `${name}@${version}`;
        }),
        R.mapError(onError),
        R.map(() => file),
      );
    }

    function onError() {
      const msg = `Strategy<name@version> failed to set ${pathDef.path} in ${shortPath}`;
      return new BaseError(msg);
    }
  },
};
