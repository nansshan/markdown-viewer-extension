import { createBuildConfig as createChromeBuildConfig } from '../chrome/build-config.js';

export const createBuildConfig = () => createChromeBuildConfig({
  browserName: 'Edge',
  browserProtocol: 'chrome-extension',
  manifestPath: 'edge/manifest.json',
  outdir: 'dist/edge',
  platformTag: 'chrome',
  extraCopyDirectories: [
    { src: 'edge/_locales', dest: '_locales' },
  ],
  readyMessage: 'edge://extensions/ -> Load unpacked -> select dist/edge/',
});