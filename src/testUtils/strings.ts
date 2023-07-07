export function dropStringPrefix(str: string, prefix: string): string {
  // eslint-disable-next-line security/detect-non-literal-regexp
  return str.replace(new RegExp(`^${prefix}`, 'u'), '');
}
