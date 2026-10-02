# Zailong Tian 个人主页源码

已切换为新的正式版主页，可直接上传到 GitHub，无需 npm、Ruby 或本地构建。已包含推送到 `main` 后自动部署的 GitHub Pages 工作流。

## 目录结构

```text
.
├── index.html                 # 个人主页入口：简介、论文、经历和访客地图
├── assets/                    # 主页样式、脚本和图片
│   ├── styles.css
│   ├── site.js
│   ├── visitors.js
│   ├── logos/                 # 学校和机构 Logo
│   └── …
├── lora-norm/                 # 来自 lora-norm-github 的完整论文网站
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── results-data.js
│   ├── assets/                # 方法图、实验图表、论文 PDF 和 LaTeX 源文件
│   └── .nojekyll
├── .github/workflows/pages.yml # GitHub Pages 自动部署
├── .nojekyll
├── .gitignore
└── README_DEPLOY.md
```

主页中 LoRA-Norm 论文条目的 **Project website** 按钮、方法图以及 News 中的项目页链接均指向 `lora-norm/`。原始 `lora-norm-github` 目录保留，之后修改论文网站时请同步到本目录的 `lora-norm/`。

主页照片拍摄于 2023.07.19，地点为青岛西海岸新区；英文说明分行展示日期、`West Coast New Area, Qingdao` 和 `A beautiful place, full of memories.`。论文列表默认展示前三篇，其余四篇可展开、收起；搜索、年份和研究方向筛选会显示所有匹配论文。

切换前的完整网站及设计稿已备份到 `backups/site-before-redesign-promotion-20261003.zip`。`preview/` 的旧页面地址会跳转到正式主页；今后请直接修改根目录中的正式文件。

## 上传与部署

1. 在 GitHub 账号 `TTtianTT` 下创建公开仓库 **`tttiantt.github.io`**，默认分支使用 **`main`**。
2. 把本目录的内容上传到仓库根目录。根目录必须直接包含 `index.html`、`assets/`、`lora-norm/`、`.github/` 和 `.nojekyll`，不要套上 `Zailong_Tian_Github_pages` 外层目录，也不要只上传 ZIP。
3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 打开 **Actions → Deploy personal website to GitHub Pages → Run workflow → main**。等待部署成功。

部署成功后的地址：

- 个人主页：https://tttiantt.github.io/
- LoRA-Norm 论文网站：https://tttiantt.github.io/lora-norm/

之后推送到 `main` 会自动重新部署。工作流仅发布 `index.html`、`.nojekyll`、`assets/` 和 `lora-norm/`，不会发布 `preview/` 或 `backups/`。手动上传时也无需上传这两个目录。

macOS 按 **Command + Shift + .** 显示隐藏文件，上传时注意包含 `.github/` 和 `.nojekyll`。本地 `.git/` 与 `.DS_Store` 不需要上传；配套 ZIP 已排除这两项。

也可以不上传 `.github/`，改在 Pages 中选择 **Deploy from a branch → main → /(root)**，静态网站同样可用。

## 本地预览与修改

在本目录执行 `python3 -m http.server 8000`，然后访问 http://localhost:8000/ 。论文网站位于 http://localhost:8000/lora-norm/ 。

- 主页内容：`index.html`；样式：`assets/styles.css`；导航交互：`assets/site.js`。
- 论文网站内容与引用：`lora-norm/index.html`；动画：`lora-norm/app.js`；实验数据：`lora-norm/results-data.js`。
- 网站链接使用相对路径。若部署到其他仓库或域名，还需同步修改两个 HTML 文件中 `canonical` 和 `og:url` 的绝对地址。

## 访客地图与自建统计

2026.10.03 参照 `https://chenyanzhe.page/` 的实现方式，访客地图改为点阵世界地图；地点圆点的大小、绿色深浅表示累计访问量，悬停、点击及键盘聚焦可查看地点与次数。完整地点明细可展开。地图几何沿用原有的公共领域 Natural Earth 数据，点阵 SVG 保存在 `assets/visitor-map.svg`。桌面地图最大宽度调整为 780px，并收紧上下留白，文字大小保持不变。

统计改由自己的 Sites / Cloudflare Worker 和 D1 数据库累计，不再使用 SmallCounter，也不受最近 100 条记录限制。正式统计从空数据库开始，不导入之前的测试记录。

前端每次加载正式页面向 `https://zailong-tian.grassy-koi-4336.chatgpt.site/api/visit` 发出一次 POST；地图从 `/api/visitor-stats` 读取累计统计。`Page views` 每次页面加载增加；地点的 `Visits` 通过浏览器本地时间标记限制为每 24 小时一次，并非严格的独立访客人数。优先使用 Cloudflare 城市信息；当前 Sites 环境不提供此信息，因此每个浏览器每天首次正式访问时查询 IPWHOIS 城市位置，并由后台核对国家信息。后台也有服务端查询补充；查询失败或达到免费服务的每日限额时降级为近似国家位置。无需浏览器定位许可，也不向数据库保存 IP 或访客标识。服务说明：`https://ipwhois.io/documentation`。

仅正式 HTTPS 域名 `tttiantt.github.io` 会记录访问，本地预览、文件预览、后台站点预览及 `/preview/` 路径不计数。更换部署域名时请同步修改前端 `productionHosts` 和后台 `productionOrigins`。GitHub Pages 不运行后台，因此需保留此服务。正式统计使用 D1 的 `homepage_totals` 和 `homepage_places`，通过 `VISITOR_DB` 绑定读取；开发验证的旧 `visitor_*` 表不参与主页统计。

统计后台源码及数据库迁移备份到 `backups/visitor-map-own-backend-20261003.zip`，无需上传到 GitHub Pages。原 SmallCounter 的第三方历史记录保留，但不再读取或记录。

## 本地检查

已检查两站 HTML 中的本地资源及页面锚点、主页 Website 链接，以及四个 JavaScript 文件的语法。最终线上访问和自动部署状态需在上传后验证。

官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
