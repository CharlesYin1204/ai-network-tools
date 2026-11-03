import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'data/android');
const DOWNLOADS = path.join(ROOT, 'public/downloads');
const TOOL_DIR = process.env.ANDROID_BUILD_TOOLS || '/opt/gaoqiu-android/android-15';
const ANDROID_JAR = process.env.ANDROID_JAR || '/usr/lib/android-sdk/platforms/android-23/android.jar';
const PACKAGE = 'com.xunfu.app';
const DEFAULTS = Object.freeze({ appName: '询赋', versionName: '1.0.0', versionCode: 1, serverUrl: 'http://154.40.47.111:3050', releaseNotes: '' });
const MAX_APK_BYTES = 100 * 1024 * 1024;

function apkError(message, code = 'APK_ERROR') {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function initialize() {
  await fs.mkdir(STATE, { recursive: true, mode: 0o700 });
  await fs.chmod(STATE, 0o700);
  await fs.mkdir(DOWNLOADS, { recursive: true });
}

async function readJson(name, fallback) {
  try { return JSON.parse(await fs.readFile(path.join(STATE, name), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function writeJson(name, value) {
  await initialize();
  const target = path.join(STATE, name);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await fs.rename(temporary, target);
}

function validateConfig(value) {
  const config = Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, value[key] ?? DEFAULTS[key]]));
  config.appName = String(config.appName).trim();
  config.versionName = String(config.versionName).trim();
  config.versionCode = Number(config.versionCode);
  config.releaseNotes = String(config.releaseNotes).trim();
  if (!config.appName || config.appName.length > 30 || /[\x00-\x1f]/.test(config.appName)) throw apkError('应用名称应为 1–30 个可见字符', 'INVALID_CONFIG');
  if (!/^\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)*$/.test(config.versionName) || config.versionName.length > 40) throw apkError('版本名格式应为 1.0.0', 'INVALID_CONFIG');
  if (!Number.isSafeInteger(config.versionCode) || config.versionCode < 1 || config.versionCode > 2100000000) throw apkError('版本号应为 1–2100000000 的整数', 'INVALID_CONFIG');
  if (config.releaseNotes.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(config.releaseNotes)) throw apkError('更新说明不能超过 2000 字，且不得包含控制字符', 'INVALID_CONFIG');
  let url;
  try { url = new URL(String(config.serverUrl)); }
  catch { throw apkError('请输入有效的 HTTP 或 HTTPS 站点地址', 'INVALID_CONFIG'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw apkError('站点地址仅支持 HTTP/HTTPS 域名或 IP + 端口，不包含登录凭据、路径、参数或片段', 'INVALID_CONFIG');
  }
  config.serverUrl = url.origin;
  return config;
}

/** Returns {appName, versionName, versionCode, serverUrl, releaseNotes}. No signing secrets are exposed. */
export async function getApkConfig() {
  await initialize();
  return validateConfig({ ...DEFAULTS, ...await readJson('config.json', {}) });
}

export async function saveApkConfig(partial = {}) {
  const config = validateConfig({ ...await getApkConfig(), ...partial });
  assertReleaseVersion(config.versionCode, await releaseState());
  await writeJson('config.json', config);
  return config;
}

/** Newest first; statuses are building / success / failed. */
export async function listApkBuilds() {
  await initialize();
  return readJson('builds.json', []);
}

// The release pointer and version floor outlive the bounded build history. A run of
// failed builds must never erase the current download or allow an older release.
async function releaseState() {
  const saved = await readJson('release-state.json', null);
  if (saved) return saved;
  const successful = (await listApkBuilds()).filter(item => item.status === 'success');
  return {
    maxVersionCode: successful.reduce((max, item) => Math.max(max, Number(item.versionCode) || 0), 0),
    certificateSha256: successful.find(item => item.certificateSha256)?.certificateSha256 || null,
    published: successful[0] || null,
  };
}

function assertReleaseVersion(versionCode, state) {
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) throw apkError('APK 版本号无效', 'INVALID_APK');
  if (versionCode < state.maxVersionCode) {
    throw apkError(`版本序号不能低于已发布的最高版本 ${state.maxVersionCode}，当前为 ${versionCode}`, 'APK_VERSION_DOWNGRADE');
  }
}

export async function getPublishedApk() {
  const build = (await releaseState()).published;
  if (!build) return null;
  try { await fs.access(path.join(DOWNLOADS, build.fileName)); return build; }
  catch { return null; }
}

/** Public download helper: only successful, registered files may be read. */
export async function readApkDownload(fileName) {
  const builds = await listApkBuilds();
  if (fileName && (typeof fileName !== 'string' || fileName !== path.basename(fileName) || !/^xunfu-[a-zA-Z0-9._-]+\.apk$/.test(fileName))) {
    throw apkError('APK 文件名无效', 'APK_NOT_FOUND');
  }
  const published = (await releaseState()).published;
  const record = !fileName || published?.fileName === fileName ? published : builds.find(item => item.status === 'success' && item.fileName === fileName);
  if (!record) throw apkError('暂时没有可下载的 APK', 'APK_NOT_FOUND');
  let buffer;
  try { buffer = await fs.readFile(path.join(DOWNLOADS, record.fileName)); }
  catch { throw apkError('APK 文件不存在，请重新生成', 'APK_NOT_FOUND'); }
  return { buffer, fileName: record.fileName, sha256: record.sha256 };
}

async function saveBuild(record) {
  const builds = await listApkBuilds();
  const index = builds.findIndex(item => item.id === record.id);
  if (index >= 0) builds[index] = record;
  else builds.unshift(record);
  await writeJson('builds.json', builds.slice(0, 50));
}

async function withBuildLock(callback) {
  await initialize();
  const lockPath = path.join(STATE, 'build.lock');
  let handle;
  try { handle = await fs.open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const stat = await fs.stat(lockPath).catch(() => null);
    if (stat && Date.now() - stat.mtimeMs > 15 * 60 * 1000) {
      await fs.unlink(lockPath).catch(() => {});
      return withBuildLock(callback);
    }
    throw apkError('已有 APK 正在构建或上传，请稍后重试', 'BUILD_BUSY');
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    // Migrate existing releases before appending any new (potentially failing) run.
    await writeJson('release-state.json', await releaseState());
    return await callback();
  } finally {
    await handle.close();
    await fs.unlink(lockPath).catch(() => {});
  }
}

async function run(command, args, options = {}) {
  try {
    return await exec(command, args, {
      cwd: ROOT, timeout: 120000, maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, JAVA_TOOL_OPTIONS: '-Xmx256m', ...options.env },
      ...options,
    });
  } catch (error) {
    // Never surface command arguments or signing environment values to an API caller.
    const output = `${error.stderr || ''}\n${error.stdout || ''}`.trim().slice(-4000);
    throw apkError(`${path.basename(command)} 执行失败${output ? ': ' + output : ''}`, 'BUILD_COMMAND_FAILED');
  }
}

function xml(value) {
  return String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}

function androidString(value) {
  return xml(String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"'));
}

async function signing() {
  const saved = await readJson('signing.json', null);
  if (saved) {
    await fs.access(path.join(STATE, 'release.keystore'));
    return saved;
  }
  const credentials = { alias: 'xunfu-release', password: randomBytes(32).toString('hex') };
  const keystore = path.join(STATE, 'release.keystore');
  await run('keytool', ['-genkeypair', '-noprompt', '-keystore', keystore,
    '-alias', credentials.alias, '-storepass:env', 'XUNFU_KEYSTORE_PASS', '-keypass:env', 'XUNFU_KEYSTORE_PASS',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Xunfu Demo, OU=Product, O=Xunfu, C=CN'],
    { env: { ...process.env, JAVA_TOOL_OPTIONS: '-Xmx256m', XUNFU_KEYSTORE_PASS: credentials.password } });
  await fs.chmod(keystore, 0o600);
  await writeJson('signing.json', credentials);
  return credentials;
}

async function collectFiles(directory, suffix) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await collectFiles(entryPath, suffix));
    else if (entry.name.endsWith(suffix)) output.push(entryPath);
  }
  return output;
}

async function inspectApk(filePath) {
  const verification = await run(path.join(TOOL_DIR, 'apksigner'), ['verify', '--verbose', '--print-certs', filePath]);
  const { stdout } = await run(path.join(TOOL_DIR, 'aapt'), ['dump', 'badging', filePath]);
  const manifest = stdout.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']*)'/m);
  if (!manifest || manifest[1] !== PACKAGE) throw apkError(`APK 包名必须是 ${PACKAGE}`, 'INVALID_APK');
  const cert = verification.stdout.match(/certificate SHA-256 digest: ([a-fA-F0-9]+)/);
  return {
    packageName: manifest[1], versionCode: Number(manifest[2]), versionName: manifest[3],
    certificateSha256: cert?.[1] || null,
    signatureVerified: true,
    minimumSdk: stdout.match(/^sdkVersion:'(\d+)'/m)?.[1] || null,
    targetSdk: stdout.match(/^targetSdkVersion:'(\d+)'/m)?.[1] || null,
    appName: stdout.match(/^application-label:'([^']*)'/m)?.[1] || '询赋',
  };
}

async function publish(record, source) {
  const bytes = await fs.readFile(source);
  const metadata = await inspectApk(source);
  const state = await releaseState();
  assertReleaseVersion(metadata.versionCode, state);
  if (!metadata.certificateSha256 || (state.certificateSha256 && metadata.certificateSha256 !== state.certificateSha256)) {
    throw apkError('APK 签名证书与已发布版本不一致，无法覆盖升级，请使用原签名密钥', 'APK_SIGNATURE_MISMATCH');
  }
  const fileName = `xunfu-${metadata.versionName.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}-${record.id}.apk`;
  await fs.copyFile(source, path.join(DOWNLOADS, fileName));
  await fs.chmod(path.join(DOWNLOADS, fileName), 0o644);
  const completed = {
    ...record, ...metadata, status: 'success', fileName,
    downloadUrl: `/api/apk/download?file=${encodeURIComponent(fileName)}`,
    sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length,
    completedAt: new Date().toISOString(),
  };
  await saveBuild(completed);
  await writeJson('release-state.json', {
    maxVersionCode: Math.max(state.maxVersionCode, completed.versionCode),
    certificateSha256: state.certificateSha256 || completed.certificateSha256,
    published: completed,
  });
  return completed;
}

/** Builds, verifies, signs and publishes a real APK. Throws BUILD_BUSY on concurrent work. */
export async function buildApk(partial = {}) {
  return withBuildLock(async () => {
    const config = await saveApkConfig(partial);
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    const workspace = path.join(STATE, 'work', id);
    const record = { id, ...config, packageName: PACKAGE, source: 'build', status: 'building', createdAt: new Date().toISOString() };
    await saveBuild(record);
    try {
      const resources = path.join(workspace, 'res');
      const generated = path.join(workspace, 'generated');
      const classes = path.join(workspace, 'classes');
      const dex = path.join(workspace, 'dex');
      for (const directory of [path.join(resources, 'values'), generated, classes, dex]) await fs.mkdir(directory, { recursive: true });
      await fs.cp(path.join(ROOT, 'android/res/drawable'), path.join(resources, 'drawable'), { recursive: true });
      await fs.writeFile(path.join(resources, 'values/strings.xml'), `<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${androidString(config.appName)}</string><string name="server_url">${androidString(config.serverUrl)}</string><string name="version_name">${androidString(config.versionName)}</string></resources>`);
      const manifest = path.join(workspace, 'AndroidManifest.xml');
      await fs.writeFile(manifest, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${PACKAGE}" android:versionCode="${config.versionCode}" android:versionName="${xml(config.versionName)}">
  <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="35" />
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <application android:label="@string/app_name" android:icon="@drawable/ic_launcher" android:theme="@android:style/Theme.Material.Light.NoActionBar" android:allowBackup="false" android:usesCleartextTraffic="true" android:supportsRtl="true">
    <activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden" android:windowSoftInputMode="adjustResize">
      <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
    </activity>
  </application>
</manifest>`);
      const unsigned = path.join(workspace, 'unsigned.apk');
      const aligned = path.join(workspace, 'aligned.apk');
      const signed = path.join(workspace, 'signed.apk');
      await run(path.join(TOOL_DIR, 'aapt'), ['package', '-f', '-m', '-J', generated, '-M', manifest, '-S', resources, '-I', ANDROID_JAR, '-F', unsigned]);
      await run('javac', ['-source', '8', '-target', '8', '-encoding', 'UTF-8', '-classpath', ANDROID_JAR, '-d', classes,
        ...await collectFiles(path.join(ROOT, 'android/src'), '.java'), ...await collectFiles(generated, '.java')]);
      await run(path.join(TOOL_DIR, 'd8'), ['--release', '--min-api', '23', '--lib', ANDROID_JAR, '--output', dex, ...await collectFiles(classes, '.class')]);
      await run('zip', ['-j', unsigned, path.join(dex, 'classes.dex')]);
      await run(path.join(TOOL_DIR, 'zipalign'), ['-f', '4', unsigned, aligned]);
      const credentials = await signing();
      await run(path.join(TOOL_DIR, 'apksigner'), ['sign', '--ks', path.join(STATE, 'release.keystore'), '--ks-key-alias', credentials.alias,
        '--ks-pass', 'env:XUNFU_KEYSTORE_PASS', '--key-pass', 'env:XUNFU_KEYSTORE_PASS', '--out', signed, aligned],
        { env: { ...process.env, JAVA_TOOL_OPTIONS: '-Xmx256m', XUNFU_KEYSTORE_PASS: credentials.password } });
      await run(path.join(TOOL_DIR, 'zipalign'), ['-c', '-v', '4', signed]);
      return await publish(record, signed);
    } catch (error) {
      await saveBuild({ ...record, status: 'failed', error: error.message.slice(0, 4000), completedAt: new Date().toISOString() });
      throw error;
    } finally { await fs.rm(workspace, { recursive: true, force: true }); }
  });
}

/** Buffer must be supplied by an authenticated admin upload endpoint (maximum 100 MiB). */
export async function registerUploadedApk({ buffer, fileName = 'upload.apk' } = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_APK_BYTES || !fileName.toLowerCase().endsWith('.apk')) {
    throw apkError('请上传小于 100 MB 的 APK 文件', 'INVALID_APK');
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw apkError('文件不是有效的 APK 压缩包', 'INVALID_APK');
  return withBuildLock(async () => {
    const config = await getApkConfig();
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    const temporary = path.join(STATE, `upload-${id}.apk`);
    const record = { id, ...config, packageName: PACKAGE, source: 'upload', status: 'building', createdAt: new Date().toISOString() };
    await saveBuild(record);
    try {
      await fs.writeFile(temporary, buffer, { mode: 0o600 });
      return await publish(record, temporary);
    } catch (error) {
      await saveBuild({ ...record, status: 'failed', error: error.message.slice(0, 4000), completedAt: new Date().toISOString() });
      throw error;
    } finally { await fs.unlink(temporary).catch(() => {}); }
  });
}
