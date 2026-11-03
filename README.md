# AI人脉工具 · AI 熟人资源协作平台

AI人脉工具是一套面向商务协作和人脉连接场景的数字名片平台，通过资源发布、需求大厅、好友关系、二度人脉引荐、合作跟进和 AI 助手，帮助用户更高效地发现和连接可合作资源。

## 核心能力

- 数字名片、职位资料和隐私范围管理。
- 资源发布、分类检索、收藏、审核和合作状态跟进。
- 好友关系、二度人脉引荐、私信、通知和动态互动。
- AI 内容润色、资源推荐、价值分析、智能找人和合作草稿。
- 用户中心、运营后台、审计日志和 Android 客户端。

## 产品界面

![AI人脉工具资源发现首页](docs/screenshots/desktop-home.png)

![AI人脉工具 AI 资源助手](docs/screenshots/desktop-ai.png)

![AI人脉工具运营管理后台](docs/screenshots/desktop-admin.png)

## 技术架构

- React 19、Next.js 16、Node.js 22
- MySQL、Android WebView
- Nginx、systemd

## 本地运行

1. 安装 Node.js 22 和 MySQL。
2. 执行 `npm ci`。
3. 复制 `.env.example` 为 `.env.local`，填写数据库、会话和 AI 配置。
4. 空数据库执行 `npm run db:init`；已有数据库执行 `npm run db:migrate`。
5. 执行 `npm run build`，然后运行 `npm start`。

开发模式使用 `npm run dev`，默认端口为 `3050`。

## 生产部署

为应用创建独立数据库账号和非登录系统用户，将 Nginx 反向代理到 `127.0.0.1:3050` 并启用 HTTPS，使用 `deployment/xunfu.service` 托管服务。上线前运行 `npm run test:api`、`npm run test:browser` 和 `npm run test:contract`。更新前备份 MySQL、私有配置和 Android 签名材料。

## 项目结构

- `app/`：页面与 API 路由
- `components/`：界面组件
- `lib/`：业务、鉴权和数据库访问
- `database/`：数据库结构与迁移
- `scripts/`：初始化、迁移、测试和备份
- `android/`：Android 客户端
- `deployment/`：生产部署配置
- `project-docs/`：需求、架构、进度和维护记录

## 联系方式

微信：`charlesyin6015`
