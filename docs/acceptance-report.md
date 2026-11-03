# 询赋产品体验版最终验收

验收日期：2026-10-14（Asia/Shanghai）。

## 已交付

- 网站：http://154.40.47.111:3050/
- 用户中心：http://154.40.47.111:3050/account
- 管理后台：http://154.40.47.111:3050/admin
- Android 下载页：http://154.40.47.111:3050/download
- 最新 APK：http://154.40.47.111:3050/api/apk/download
- 飞书 PRD：https://rjppwe2dlq09.jp.larksuite.com/docx/HToadNRZpoJMN0xvZn0jT3h0pwg
- 飞书功能表：https://rjppwe2dlq09.jp.larksuite.com/sheets/RGixszqVzhxDWVt55RyjMWpupDb

代码位于 `/www/wwwroot/xunfu`，使用 MySQL `xunfu` 数据库。项目内 `database/schema.sql` 与两份迁移脚本记录数据结构，`database/backups/` 已保存权限受限的完整交付快照。登录资料见本机 `data/access.json`（600）；本报告不包含密码或 API 密钥。

## 验证结果

| 类别 | 结果 | 证据 |
|---|---|---|
| 生产构建 | `next build --webpack` 通过 | `.next/BUILD_ID`、当前运行服务 |
| 核心 HTTP 集成 | 65 项通过，初次验证端口3051 | `data/api-test-results.json` |
| 生产合同/机域/隐私 | 65 项通过，验证端口3050 | `data/contract-test-results.json` |
| 真实 AI 模型/功能 | 两个模型连接与六类核心动作，8 项通过 | `data/ai-test-results.json` |
| 桌面/移动/后台浏览器 | 21 项通过 | `data/browser-test-results.json` |
| 发布/审核/互动/草稿浏览器 | 9 项通过 | `data/browser-workflow-results.json` |
| 最终手机导航与排版 | 4 项通过，320px和390px | `data/mobile-final-results.json` |
| APK 发布管理 | 7 组隔离检查通过，真实服务用户运行 | `android/apk-release.test.mjs`、`docs/android-report.md` |

最终浏览器测试共34项，所覆盖页面无 JavaScript 运行时异常。初次验收发现的状态映射、个人统计、技能保存、通知已读、私信目标、手机菜单和标题折行问题均已修复并复测；最终结果文件均无失败项。测试临时资源、动态、用户及评论已清理。

## 已实际跑通的业务

- 分类与关键词搜索、资源详情、邮箱登录、15项用户功能导航及本人数据统计。
- 发布资源→我的资源→编辑→后台通过/拒绝（填写原因）→发布者查看反馈→下架→重新送审。
- 需求可见范围、好友/二度人脉资源与机域权限、隐藏名片与职位、联系人私信跳转。
- 人脉引荐申请→共同好友同意→目标好友再次确认的完整后端闭环。
- 机域发布、点赞/取消、评论提交与回读；后台内容隐藏及权限拒绝。
- 小赋聊天、智能发布、供需推荐、参考价值分析、需求分析、AI找人真实调用。
- 浏览器 AI 找人及历史回读；真实名片文案生成→用户确认采用→由用户决定保存。
- 模型列表、密钥脱敏、新增/修改/启停/默认、连接测试与日志；审核开关与每日 AI 调用限额。
- Android 配置/更新说明、上传验证、后台点击生成、签名、版本防回退、失败保留旧包、公开下载。
- 15个桌面业务路由、9个移动业务路由和11个管理路由加载正常；移动菜单、底部五项导航及后台APK界面可用。

## 部署与数据

服务名 `xunfu.service`，以专用用户 `xunfu-app` 运行，已设置开机启动与异常自动重启。监听 `0.0.0.0:3050`，UFW已开放3050/TCP；服务器通过公网IP访问首页返回HTTP200，健康接口确认MySQL已连接。

API密钥加密保存于数据库，解密密钥与会话密钥仅在服务器环境文件。管理接口执行角色校验；密码使用bcrypt；会话采用HttpOnly Cookie；写操作执行同源检查。Android签名资料仅在`data/android`，权限700/600。

## 当前边界

- 此作品为根据公开介绍进行产品推演的独立面试版本，示例资源、名片与关系均为演示数据，不代表官方商业服务。
- Android为联网WebView客户端，已验证构建、v1/v2/v3签名、包元数据和下载；没有实体Android设备，未验证真机安装、启动与设备兼容性。
- AI推荐为基于实时可见数据的文字建议，尚无结构化候选ID后验校验；参考估值不保证成交。历史助手推荐不重新送入模型，仅保留最近用户需求与当前可见资料。
- 上游不返回tokens时后端历史数值可能为0，前端显示“用量未返回”；不据此核算或宣称成本为零。
- 短信登录、扫码/通讯录、音视频通话、语音识别、媒体转码、真实支付、注销与数据治理列入后续规划，未伪装为已实现。

## 界面截图

`docs/screenshots/` 内含首页、手机用户中心、AI、后台概览、模型管理、APK管理及下载页截图。`mobile-home-viewport.png` 为最终手机首屏；`desktop-home.png` 为最终桌面首页。
