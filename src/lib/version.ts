import packageJson from '../../package.json';

export interface VersionInfo {
  version: string;
  name: string;
}

export function getAppVersion(): VersionInfo {
  return {
    version: packageJson.version,
    name: packageJson.name,
  };
}

export function formatVersion(version: string): string {
  return `v${version}`;
}