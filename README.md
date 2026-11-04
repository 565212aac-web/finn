# 拾光 · 生活的私人放映室

2026-11-04 更新：网站界面改为英文，版本 1.1.0。三页导航为 Keep a Moment、My Life、Time Trail；包含英文示例标题、日期、表单、提示与为英文调整的字号和间距。先前 PDF 教程保留部署时的中文截图，网站地址和部署流程不变。

MECC1143 Cloud Computing — Group PaaS Tutorial Assignment。

保留已确认的三页中文交互界面：留下这一刻、我的生活、时光足迹。
包含 38 张示例照片。新增照片使用浏览器 IndexedDB 保存，刷新后恢复，照片不上传服务器。
不同设备、浏览器及域名的数据各自独立，清除站点数据会删除新增照片。这里没有云相册同步或账号系统。

## 本地运行

安装 Node.js 22 后，在本目录执行：

```sh
npm ci
npm run build
npm test
npm start
```

打开 http://localhost:3101/ 。Render 会自动提供 PORT，服务监听 0.0.0.0。

## Render 部署

1. 把此目录内容提交到 GitHub 仓库根目录，包括 public、test、server.mjs、package.json、package-lock.json、render.yaml。
2. Render Dashboard → New → Web Service，可使用 Public Git Repository 填入本仓库 URL；或者先连接 Git Provider 后选择仓库。
3. Runtime: Node；Branch: main；Root Directory 留空。
4. Build Command: `npm ci && npm run build && npm test`。
5. Start Command: `npm start`。
6. Instance Type: **Free**；Region: Singapore；环境变量 NODE_VERSION=22、NODE_ENV=production。
7. Health Check Path: `/api/health`。若用插件创建服务，需在控制台补充这个设置。
8. Deploy 后等待 Live，打开 Render 返回的真实 onrender.com 地址。不得把 localhost 链接作为提交链接。

也可 New → Blueprint，连接仓库并使用根目录 render.yaml 导入上述配置。

## 验证

- 首页磁吸按钮、添加照片弹窗、照片归属选择。
- 我的生活：左右区域控制转轮，中间停止，点击看大图。
- 时光足迹：滚动前进、日期跳转、同一天多个时刻、暖色悬停。
- 添加照片后刷新，仍显示新增照片，图片正常解码。
- `/api/health` 返回 status=ok。
- 本次使用公开仓库 URL 创建服务，更新代码后选择 Manual Deploy → Deploy latest commit。实际已经验证版本从 1.0.0 更新到 1.0.1。
- 可选：在 Render 连接并授权 Git Provider 后再启用提交后自动部署。公开仓库 URL 方式不会因推送自动更新，即使配置中存在 autoDeploy 字段。

Render 免费 Web Service 空闲约 15 分钟后会休眠，重新访问可能需要约一分钟启动。课堂前提前打开应用。免费实例文件系统不持久，所以本项目不将照片写入服务器磁盘。

## 文件

- public/：公开的页面、脚本、样式、图片
- server.mjs：Node HTTP 服务及健康检查，只公开 public 下允许的文件类型
- public/storage.js：IndexedDB 照片存储，批量写入采用事务
- test/server.test.mjs：健康检查、38 张素材、HEAD、敏感路径与写请求检查
- render.yaml：Render Blueprint 配置

## 素材与参考

示例照片来自 Unsplash，不是用户私人照片；日期、标题为虚构演示数据。
原始 8 张照片来源见 ASSETS.md，其余 30 张来源见 public/assets/additional-sources.json。
Unsplash 授权：https://unsplash.com/license
设计参考：https://github.com/mouse-lin/finesse-skill

平台资料：
- https://render.com/docs/web-services
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec

部署状态以实际 Render 结果为准；本地运行成功不等于公网部署成功。

