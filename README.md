# 📚 NILAM Assistant (教育部 AINS 自动/半自动刷书助手)

用于马来西亚教育部 **AINS (NILAM)** 系统的油猴 (Tampermonkey) 自动化刷书与填表辅助工具集。内置 18,000 本高质量华巫英三语题库、支持 API 快速批量提交与 DOM 辅助填表降级模式。

---

## 🚀 快速安装链接 (Install Options)

请根据你的需求选择合适的油猴脚本版本点击安装：

| 版本名称 | 核心机制与特性 | 适用的场景 | 一键安装链接 (Direct Install) |
| :--- | :--- | :--- | :--- |
| **⭐ NILAM Hybrid Assistant v1.0.9<br>(二合一双模融合版)** | • **Tab 选项卡紧凑界面**<br>• 默认 ⚡ **API 自动批量提交** (V2)<br>• 备用 📝 **DOM 辅助填表降级** (V1)<br>• 内置 **18,000 本华巫英巨量题库**<br>• 依账号 User ID 种子打乱防撞 | **【强烈推荐】**<br>兼顾极速提交与防封降级保障，适配各种屏幕尺寸不遮挡 | 👉 [**点击安装 v1.0.9 最新版**](https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-hybrid.user.js?v=1.0.9) |
| **📦 NILAM API Assistant v0.9.3<br>(SQLite 云端服务版)** | • 连接 `csc` 云端 FastAPI 服务<br>• 5,910 本真实书库数据<br>• 数据库服务端游标追踪 | **【云端高阶版】**<br>适合需要连接中央服务器统一记录游标的用户 | 👉 [**点击安装 v0.9.3 API版**](https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-api.user.js) |
| **📝 NILAM Assistant v0.6.0<br>(纯 DOM 半自动填表版)** | • 100% 模拟人类原生点击<br>• 自动填充输入框，手动点 Hantar | **【极简备用版】**<br>最原始安全的填表辅助，绝无 API 风控风险 | 👉 [**点击安装 v0.6.0 DOM版**](https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js) |

---

## 🛠️ 核心功能一览 (Features)

### 1. ⚡ API 自动提交模式 (Mode V2)
* 第一次在 AINS 页面任意提交一次（或点击半自动捕获），脚本将自动提取真实接口凭证与模板。
* 选择提交日期与语言分类，点击 `🚀 自动批量提交` 即可按 1 分钟/次的频率自动完成每日 30 本任务。

### 2. 📝 DOM 辅助填表模式 (Mode V1)
* 当 AINS 官方接口变更或报错 403/500 时，直接切换至 DOM 选项卡。
* 点击 `自动填入网页输入框` 即可一键填满标题、作者、出版社、页数、Summary 与 Lesson，用户只需点击网页底部的原生 `Hantar` 按钮。

### 3. 🎲 种子防撞算法 (Deterministic Hash Shuffling)
* 脚本自动提取学生的 AINS `User ID` 进行哈希数学运算，将 18,000 本书在本地为每个人重新打乱。
* **效果**：班级内多个学生同时使用，刷到的图书顺序完全错开，避免集体撞书。

---

## 📚 配套 18,000 本图书题库 (Nilam Book Database)

题库数据完全开源托管于 [cscLearn/nilam-book-database](https://github.com/cscLearn/nilam-book-database)：

* 🇨🇳 **华文图书 (`books-zh.json`)**: 6,000 本
* 🇲🇾 **巫文图书 (`books-bm.json`)**: 6,000 本
* 🇬🇧 **英文图书 (`books-en.json`)**: 6,000 本
* 📚 **全库总计 (`books-all.json`)**: 18,000 本 (12.2 MB)

---

## 📄 开源协议 (License)

[MIT License](LICENSE) © cscLearn
