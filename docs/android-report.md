# Android APK 交付与验证

验证日期：2026-10-14（北京时间）。

## 交付物

- 原生源码：`android/src/com/xunfu/app/MainActivity.java`。
- 图标资源：`android/res/drawable/ic_launcher.xml`。
- 构建及上传管理模块：`lib/apk.mjs`。
- 命令行构建：`node scripts/build-apk.mjs [配置JSON路径]`。
- 下载目录：`public/downloads/`；签名及记录目录：`data/android/`。
- 公开下载入口：`GET /api/apk/download`（最新版），或指定 `?file=构建记录中的文件名`。

初始应用名称为「询赋」，版本 `1.0.0`（versionCode `1`），包名固定 `com.xunfu.app`，站点地址 `http://154.40.47.111:3050`。最低 Android 6.0 / API 23，target SDK 35。APK 是真实签名的 WebView 客户端，网页功能由线上 React 应用提供，APK 不内置服务端。

## 已验证结果

最新版初始验证文件：`xunfu-1.0.0-1791965388032-e3a625.apk`，大小 16,885 字节。

SHA-256：`b446f7125bd218e7f7043741057fbc572f88f04e74f1a7cd160669ce79c4362b`。

签名证书 SHA-256：`d67974f3d873155f1c8a2f280f8f8da76ef5edc38fa989241543862f40b7224c`。

| 验证项 | 结果 |
| --- | --- |
| Java 源码编译与 D8 转换 | 通过 |
| `apksigner verify --verbose --print-certs` | 通过，v1 / v2 / v3 签名有效 |
| `zipalign -c -v 4` | 通过 |
| `aapt dump badging` | 包名、版本、启动 Activity、SDK 信息正确 |
| 配置验证 | 拒绝非 HTTP(S)、URL 凭据、路径、非法版本号 |
| 并发构建 | 两个同时发起的构建仅一个执行，另一个返回 `BUILD_BUSY` |
| 无效上传 | 拒绝非 APK 数据；实际上传还验证签名和包名 |
| 有效上传 | 上传已签名 APK 成功，SHA-256 与原文件一致 |
| 下载路径 | 仅成功构建记录中的文件可读取，路径穿越和未知文件被拒绝 |
| 密钥权限 | `data/android` 为 700，keystore 与 signing.json 为 600 |

测试过程中保留了真实构建与上传记录，初次编译兼容性问题已修复，对应失败记录可在构建历史查看。后续重新构建可能因 ZIP 时间戳不同产生不同 SHA-256，以后台当前记录为准。

## 客户端行为

- Cookie 和 DOM Storage 支持登录会话持久化，切入后台时主动 flush Cookie。
- 同源页面在 App 内打开，外部 HTTP(S)、电话和邮件交由系统处理。
- 文件选择使用系统选择器；下载交给 Android DownloadManager，带上同源 Cookie 并显示完成通知。
- 系统返回键优先返回上一网页；网页主导航和移动端底部菜单来自线上前端。
- 网络加载失败显示中文重试页；网页不能调用原生 JavaScript 桥接。
- 仅声明网络和网络状态权限，无联系人、定位等权限。

服务器上没有 Android 真机或模拟器，**未执行安装启动、设备兼容性及真机交互验收**。上述原生行为已实现，APK 的结构、签名、生成/上传/下载流程已验证。首次安装属于系统侧载流程，需在 Android 系统中允许来源；没有进行应用商店上架。

## 后台模块合同

所有函数均为异步 Promise，不泄露签名密码。

| 函数 | 用途 |
| --- | --- |
| `getApkConfig()` | 获取 appName、versionName、versionCode、serverUrl |
| `saveApkConfig(partial)` | 校验并持久化配置 |
| `listApkBuilds()` | 最近 50 条构建/上传记录，按时间倒序 |
| `getPublishedApk()` | 最新成功记录或 null |
| `buildApk(partial?)` | 保存配置、编译、签名、校验并发布 APK |
| `registerUploadedApk({buffer,fileName})` | 校验并发布上传 APK，100 MiB 上限，要求包名相同且签名有效 |
| `readApkDownload(fileName?)` | 返回 `{buffer,fileName,sha256}`，省略文件名下载最新成功版本 |

成功记录包含 `id/status/source/appName/versionName/versionCode/serverUrl/packageName/fileName/downloadUrl/size/sha256/certificateSha256/signatureVerified/createdAt/completedAt`。失败记录包含 error；错误码包括 `INVALID_CONFIG`、`BUILD_BUSY`、`INVALID_APK`、`APK_NOT_FOUND`、`BUILD_COMMAND_FAILED`。

构建、配置和上传接口必须由管理员鉴权，下载接口可公开。构建参数不经 shell 拼接，子进程执行有超时，Java 堆限制为 256 MiB。构建锁跨进程生效，临时目录在任务结束后删除。

## 运维

- 备份 `data/android/release.keystore` 与 `data/android/signing.json`，密钥丢失会导致未来版本无法覆盖安装旧版本。
- 新版本发布时增加 versionCode；同包名的外部上传 APK 若使用其他签名，不能覆盖已有安装。
- 上传 APK 的版本、名称和证书以包内实际数据为准；后台配置的站点 URL 仅影响本平台新生成的 APK。
- 当前按 IP + 端口需求使用 HTTP，因此构建允许明文 HTTP；配置 HTTPS 域名后重新生成即可迁移。
- APK 生成不需要 Gradle、Maven 下载；使用服务器现有 `/opt/gaoqiu-android/android-15` 构建工具及 Android 23 API JAR。

## 最终发布能力补充

- 配置新增 `releaseNotes`（0–2000 字），保存后随构建与上传记录持久化；下载页展示对应版本说明。
- 配置、构建与上传均拒绝低于历史最高 `versionCode` 的版本；允许同版本重复构建。
- 独立 `release-state.json` 保存当前发布包、最高版本和签名摘要，最近 50 条历史截断不会导致可用包丢失。
- 上传必须与现有发布包签名一致；不同签名、无效 APK、版本回退都会失败，原有下载包仍保留。
- `android/apk-release.test.mjs` 已由真实服务用户 `xunfu-app` 执行隔离验证，所有检查通过；未更改线上发布记录。
- 生产浏览器验收通过：管理员在 `/admin/apk` 点击生成 APK，非 root 服务成功编译、签名、发布；公开下载可返回有效 ZIP/APK。当前包元数据以 `/api/apk` 返回为准。
