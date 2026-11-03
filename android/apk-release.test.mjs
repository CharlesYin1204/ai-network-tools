// Isolated release-management tests. Reuses an existing signed APK; never compiles one.
// Run as the service user: runuser -u xunfu-app -- node android/apk-release.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const signedBuilds = JSON.parse(await fs.readFile(path.join(root, 'data/android/builds.json'), 'utf8')).filter(item => item.status === 'success');
const baseline = signedBuilds[0];
assert.ok(baseline, 'An existing signed APK is required as the fixture');
const bytes = await fs.readFile(path.join(root, 'public/downloads', baseline.fileName));
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'xunfu-apk-release-'));
const stateDirectory = path.join(sandbox, 'data/android');
const notes = '优化资源连接体验\n改进 AI 助手与移动端导航';
const checks = [];
try {
  for (const directory of ['lib', 'data/android', 'public/downloads']) await fs.mkdir(path.join(sandbox, directory), { recursive: true });
  await fs.copyFile(path.join(root, 'lib/apk.mjs'), path.join(sandbox, 'lib/apk.mjs'));
  await fs.writeFile(path.join(stateDirectory, 'builds.json'), JSON.stringify([baseline]));
  await fs.writeFile(path.join(sandbox, 'public/downloads', baseline.fileName), bytes);
  const apk = await import(pathToFileURL(path.join(sandbox, 'lib/apk.mjs')).href);
  assert.equal((await apk.getApkConfig()).releaseNotes, '');
  const config = await apk.saveApkConfig({ ...baseline, releaseNotes: ` ${notes} ` });
  assert.equal(config.releaseNotes, notes);
  assert.equal((await apk.getApkConfig()).releaseNotes, notes);
  await assert.rejects(apk.saveApkConfig({ releaseNotes: '长'.repeat(2001) }), { code: 'INVALID_CONFIG' });
  checks.push('release notes persisted, trimmed and length-validated');

  const uploaded = await apk.registerUploadedApk({ buffer: bytes, fileName: 'existing-signed.apk' });
  assert.equal(uploaded.versionCode, baseline.versionCode);
  assert.equal(uploaded.releaseNotes, notes);
  assert.equal(uploaded.certificateSha256, baseline.certificateSha256);
  assert.equal(uploaded.sha256, baseline.sha256);
  checks.push('same-version upload accepted; release notes, hash and certificate retained');

  const releaseFile = path.join(stateDirectory, 'release-state.json');
  const savedState = JSON.parse(await fs.readFile(releaseFile, 'utf8'));
  await fs.writeFile(releaseFile, JSON.stringify({ ...savedState, maxVersionCode: baseline.versionCode + 1 }));
  await assert.rejects(apk.saveApkConfig({ versionCode: baseline.versionCode }), { code: 'APK_VERSION_DOWNGRADE' });
  // This rejection occurs before the compilation path and does not create an APK.
  await assert.rejects(apk.buildApk({ versionCode: baseline.versionCode }), { code: 'APK_VERSION_DOWNGRADE' });
  await assert.rejects(apk.registerUploadedApk({ buffer: bytes, fileName: 'downgrade.apk' }), { code: 'APK_VERSION_DOWNGRADE' });
  assert.equal((await apk.getPublishedApk()).id, uploaded.id);
  assert.equal((await apk.readApkDownload()).sha256, uploaded.sha256);
  checks.push('configuration, build and uploaded manifest reject downgrade; current download preserved');

  await fs.writeFile(releaseFile, JSON.stringify({ ...savedState, certificateSha256: '0'.repeat(64) }));
  await assert.rejects(apk.registerUploadedApk({ buffer: bytes, fileName: 'wrong-cert.apk' }), { code: 'APK_SIGNATURE_MISMATCH' });
  assert.equal((await apk.getPublishedApk()).id, uploaded.id);
  await fs.writeFile(releaseFile, JSON.stringify(savedState));
  checks.push('a different signing certificate is rejected before replacing the current package');

  await assert.rejects(apk.registerUploadedApk({ buffer: Buffer.from('PK invalid archive'), fileName: 'invalid.apk' }), { code: 'BUILD_COMMAND_FAILED' });
  const failed = (await apk.listApkBuilds())[0];
  assert.equal(failed.status, 'failed');
  assert.equal(failed.releaseNotes, notes);
  assert.equal((await apk.getPublishedApk()).id, uploaded.id);
  await fs.writeFile(path.join(stateDirectory, 'builds.json'), JSON.stringify(Array.from({ length: 50 }, (_, index) => ({ id: `failure-${index}`, status: 'failed' }))));
  assert.equal((await apk.getPublishedApk()).id, uploaded.id);
  const preserved = await apk.readApkDownload();
  assert.equal(createHash('sha256').update(preserved.buffer).digest('hex'), uploaded.sha256);
  checks.push('failed upload and 50 failed history entries preserve the published APK and hash');

  const tools = '/opt/gaoqiu-android/android-15';
  for (const item of signedBuilds) {
    const { stdout } = await exec(path.join(tools, 'apksigner'), ['verify', '--print-certs', path.join(root, 'public/downloads', item.fileName)], { env: { ...process.env, JAVA_TOOL_OPTIONS: '-Xmx256m' } });
    assert.equal(stdout.match(/certificate SHA-256 digest: ([a-fA-F0-9]+)/)?.[1], baseline.certificateSha256);
  }
  checks.push(`all ${signedBuilds.length} existing published APKs have the same verified certificate`);

  for (const directory of ['data/android', 'public/downloads']) {
    const probe = path.join(root, directory, `.permission-probe-${process.pid}`);
    await fs.writeFile(probe, 'permission check', { flag: 'wx', mode: 0o600 });
    await fs.unlink(probe);
  }
  await fs.access(path.join(root, 'data/android/release.keystore'), fs.constants.R_OK);
  await fs.access(path.join(root, 'data/android/signing.json'), fs.constants.R_OK);
  await fs.access('/usr/lib/android-sdk/platforms/android-23/android.jar', fs.constants.R_OK);
  for (const tool of ['aapt', 'd8', 'zipalign', 'apksigner']) await fs.access(path.join(tools, tool), fs.constants.X_OK);
  for (const command of [['javac', ['-version']], ['java', ['-version']], [path.join(tools, 'd8'), ['--version']], [path.join(tools, 'aapt'), ['version']]]) await exec(command[0], command[1], { env: { ...process.env, JAVA_TOOL_OPTIONS: '-Xmx256m' } });
  checks.push('service user can read signing files and SDK, write both output directories, and execute build tools');
  console.log(JSON.stringify({ result: 'PASS', uid: process.getuid(), newlyCompiledApks: 0, productionReleaseChanged: false, checks }, null, 2));
} finally {
  await fs.rm(sandbox, { recursive: true, force: true });
}
