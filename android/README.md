# AI人脉工具 Android

轻量 Android WebView 客户端，原生 Java + Android SDK 构建，不需要 Gradle 或远程 Maven 依赖。

构建：`node scripts/build-apk.mjs`。可选传入本地 JSON 配置文件路径，支持 `appName`、`versionName`、`versionCode`、`serverUrl`、`releaseNotes`（最多 2000 字，支持换行）。后台通过 `lib/apk.mjs` 调用同一构建流程，更新说明写入配置及每次生成/上传记录。

- 包名固定为 `com.xunfu.app`，Android 6.0（API 23）及以上，target SDK 35。
- 同站点页面保持在应用内；外部 HTTP/HTTPS、电话和邮件链接由系统打开。
- Cookie、DOM Storage 持久化；支持文件选择、下载通知和返回页面。
- 不向网页暴露原生 JavaScript 接口，不申请联系人、相机、定位等权限。
- 首次构建生成专用签名密钥；文件仅保存在 `data/android/`，不得放入 Web 目录或版本控制。**请独立备份签名密钥和 signing.json，否则后续 APK 不能覆盖升级。**
- 发布版本序号 `versionCode` 不得小于任何已成功发布版本；允许使用相同序号重复构建。配置保存、构建发布、上传 APK 均进行校验，上传以 APK 内真实序号为准。上传还要求证书与已发布版本一致，以保证覆盖安装。
- `data/android/release-state.json` 独立保留最高版本、签名证书和当前发布记录。构建失败或超过 50 条历史记录均不会使当前下载包丢失，也不会重置版本下限。
- 下载在 App 的外部文件目录，通过系统下载通知访问；应用卸载会清除此目录。
- `serverUrl` 使用 HTTP 是当前 IP 部署要求，生产使用建议配置 HTTPS 域名后重新构建。

本工程创建可安装、签名完整的 APK，不包含应用商店发布与真机认证。
