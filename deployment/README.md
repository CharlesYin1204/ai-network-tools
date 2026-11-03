# 已部署服务

`xunfu.service` 为当前服务器的真实服务定义副本。代码根目录 `/www/wwwroot/xunfu`，Node 路径 `/opt/laosiji-runtime/node-v22.16.0-linux-x64/bin/node`，HTTP 端口3050。

部署环境已创建系统用户 `xunfu-app`，并仅赋予环境文件读取、`data/` 和 `public/downloads/` 写入权限。升级后保留 `.env.local`、数据库、`data/android/` 和安装包。

```bash
export PATH=/opt/laosiji-runtime/node-v22.16.0-linux-x64/bin:$PATH
npm ci
npm run db:migrate
npm run build
chown -R xunfu-app:xunfu-app data public/downloads
systemctl restart xunfu
curl --fail http://127.0.0.1:3050/api/health
```

首次迁移到另一台服务器时还需安装 Java、Android SDK、MySQL，创建同名服务用户，准备私有环境文件与账号，导入数据库，并根据实际路径调整本服务定义。不要覆盖已有签名密钥。
