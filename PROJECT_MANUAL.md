# IV4N6Hub 架构字典与全功能维护开发手册

> **最后更新与实战验证**：2026-10-12  
> **生产环境线上域名**：`https://iv4n6hub.vercel.app` (已正式上线，100% 连通 Supabase 云端数据库与 Gemini AI)  
> **官方 GitHub 仓库**：`https://github.com/IV4N666/IV4N6Hub`  
> **本地开发目录**：`./` (项目根目录)

---

## 目录
1. [项目全局概览与技术栈](#1-项目全局概览与技术栈)
2. [项目完整文件结构与代码地图](#2-项目完整文件结构与代码地图)
3. [数据库模型字典 (Prisma Schema)](#3-数据库模型字典-prisma-schema)
4. [全量 API 接口清单与请求格式](#4-全量-api-接口清单与请求格式)
5. [安全与单人私密认证架构](#5-安全与单人私密认证架构)
6. [核心功能模块详解](#6-核心功能模块详解)
7. [环境变量字典 (.env)](#7-环境变量字典-env)
8. [上线部署指南与实战排错要点](#8-上线部署指南与实战排错要点)
9. [新电脑迁移与继续配置指南 (Multi-Device Setup)](#9-新电脑迁移与继续配置指南-multi-device-setup)
10. [未来维护与二次开发指南](#10-未来维护与二次开发指南)

---

## 1. 项目全局概览与技术栈

**IV4N6Hub** 是一个现代化、单人私密保护的**全能智能财务、AI 语音记账、电子对账单/发票多模态视觉识别、吃青蛙日历智能规划、灵感备忘与电脑硬件监控中心**。

* **前端框架**：Next.js 14.2 (App Router) + React 18 + TypeScript 5
* **默认基准货币**：`MYR` (马来西亚令吉 RM)，支持下拉无缝切换 USD、SGD、EUR、CNY、GBP、AUD、CAD 等
* **UI 与样式**：TailwindCSS 3.4 + 赛博发光暗黑美学 + HTML5 Canvas 交互星空粒子（低功耗 GPU 加速）
* **图表与可视化**：Lucide React + Recharts (动态折线图、面积图、分类进度条、硬件波形图)
* **数据库与持久化**：Prisma ORM 5.22 + Supabase PostgreSQL (自带 `lib/db.ts` PgBouncer 自动适配层)
* **人工智能能力**：Google Gemini 3.x Flash / Pro Preview（自适应发现 `gemini-3.1-pro-preview` / `gemini-3.8-flash` / `gemini-3.7-flash`，自带 16k Token 输出、截断语法自动修复解析器 `repairAndParseJson`、多模态视觉 OCR、语音转录 Speech-to-Text、智能意图分流与自动容灾降级）
* **安全防护**：Web Crypto HMAC-SHA256 签名 + HttpOnly 加密 Cookie + Next.js 全局中间件鉴权拦截 + 密钥脱敏 + WhatsApp 手机号白名单

---

## 2. 项目完整文件结构与代码地图

```text
./
├── app/                                # Next.js 14 App Router 页面与路由
│   ├── api/                            # 后端 RESTful API 接口
│   │   ├── ai/
│   │   │   ├── ocr-receipt/route.ts   # 🧾 拍照发票视觉识别 API (Gemini Vision OCR)
│   │   │   ├── parse/route.ts          # 💬 自然语言 & 语音多模态记账解析 API
│   │   │   ├── reconcile/route.ts      # 📑 电子对账单/PDF/长截图多模态智能对账解析 API
│   │   │   └── test-key/route.ts       # ⚡ Google Gemini API 连通性测试 API
│   │   ├── auth/
│   │   │   ├── check/route.ts          # 🔍 检查当前登录状态 API
│   │   │   ├── login/route.ts          # 🔑 单人密码登录 (支持环境变量秒级比对)
│   │   │   └── logout/route.ts         # 🚪 登出与清除 Cookie API
│   │   ├── config/route.ts             # ⚙️ 系统配置 API (Key 脱敏返回与更新，默认 MYR)
│   │   ├── finance/
│   │   │   ├── accounts/route.ts       # 💳 多账户资产管理 API (余额增减、账户建档)
│   │   │   ├── backup/route.ts         # 💾 全量数据 JSON 导出归档与一键恢复恢复 API
│   │   │   ├── budgets/route.ts        # 💰 分类预算管理 API
│   │   │   ├── recurring/route.ts      # 🔄 周期性固定扣款与订阅管理 API
│   │   │   ├── stats/route.ts          # 📊 月度/年度收支与统计计算 API
│   │   │   └── transactions/route.ts   # 📝 交易流水 CRUD 接口
│   │   ├── modules/route.ts            # 🧩 模块化插件配置 API
│   │   ├── notes/route.ts              # 📝 灵感便签 CRUD API
│   │   ├── system/metrics/route.ts     # 💻 电脑 CPU/RAM/OS/网络指标采集 API
│   │   ├── todos/
│   │   │   ├── ai/route.ts             # 🤖 AI 任务拆解、智能时间调度与生产力每日复盘
│   │   │   ├── export/route.ts         # 📅 待办任务日历 (.ics) 与数据导出 API
│   │   │   └── route.ts                # 📋 待办任务 CRUD 与原子批量调度 API
│   │   └── webhook/whatsapp/route.ts   # 📱 WhatsApp Cloud API 消息回调接口 (带白名单)
│   ├── finance/page.tsx                # 📊 财务总览看板页面 (月/年收支、预算条、图表)
│   ├── login/page.tsx                  # 🔐 独立全屏居中沉浸式解锁页面 (带 Suspense 与粒子)
│   ├── modules/page.tsx                # 🧩 模块中心页面
│   ├── notes/page.tsx                  # 📝 闪念便签与智能日程待办计划本 (支持吃青蛙理论与习惯打卡)
│   ├── settings/page.tsx               # ⚙️ 系统设置、密码修改、API Key与白名单配置
│   ├── system-monitor/page.tsx         # 💻 PC & 系统硬件实时大屏监控页面
│   ├── transactions/page.tsx           # 🧾 交易流水明细、高级筛选与 CSV 导出页面
│   ├── whatsapp-hub/page.tsx           # 💬 WhatsApp 模拟器、对账单长截图解析与配置向导
│   ├── globals.css                     # 全局样式、网格背景、动画关键帧
│   ├── layout.tsx                      # 根布局容器 (挂载 Canvas 背景，登录页自动全屏居中)
│   └── page.tsx                        # 首页路由 (自动重定向至 /finance)
├── components/                         # 前端复用组件
│   ├── finance/
│   │   ├── AddTransactionModal.tsx     # 记账弹窗 (支持手动录入 + 📸 拍照扫描小票)
│   │   ├── CategoryBudgetList.tsx      # 分类预算进度条与编辑列表
│   │   ├── DashboardTasksAndNotes.tsx  # 财务看板联动待办便签卡片
│   │   ├── ExpenseCharts.tsx           # 支出分析图表组件 (折线趋势图、饼图)
│   │   ├── MetricCards.tsx             # 顶部指标卡片 (总收入、总支出、净结余、储蓄率)
│   │   └── RecentTransactions.tsx      # 最近交易记录列表组件
│   ├── layout/
│   │   ├── AnimatedCyberBackground.tsx # ✨ HTML5 Canvas 交互式发光粒子星空背景组件
│   │   ├── Header.tsx                  # 顶部导航栏 (MYR 优先货币切换、时间、一键锁屏)
│   │   ├── MobileNav.tsx               # 手机端底部悬浮导航栏
│   │   └── Sidebar.tsx                 # 桌面端侧边导航栏 (包含各模块快捷入口)
│   ├── planner/                        # 智能计划与日程管理组件
│   │   ├── AIReviewModal.tsx           # 🧠 每日生产力 AI 复盘弹窗
│   │   ├── AITaskBreakdownModal.tsx    # 🧩 AI 子任务智能拆解弹窗
│   │   ├── PlannerExportModal.tsx      # 📤 计划日历导出弹窗
│   │   ├── PlannerFrogBanner.tsx       # 🐸 今日“吃掉那只青蛙”核心要务横幅
│   │   ├── PlannerHabitTracker.tsx     # ⚡ 每日习惯打卡条
│   │   └── PlannerTimeline.tsx         # ⏰ 早/中/晚/全天时间轴视图
│   └── whatsapp/
│       ├── WhatsAppSimulator.tsx       # 📱 内置 WhatsApp 聊天与语音录音模拟器
│       └── WhatsAppWebhookGuide.tsx    # 📚 Meta WhatsApp Cloud API 对接教程与配置生成器
├── lib/                                # 核心工具函数与业务逻辑
│   ├── auth.ts                         # 🔐 Web Crypto 密码加盐哈希与 HMAC Session 签名验证
│   ├── category-meta.ts                # 🏷️ 分类元数据、色彩、包含宵夜/汽油/门票/赌博等定义
│   ├── db.ts                           # 🗄️ Prisma 客户端单例 (自动注入 Supabase pgbouncer=true)
│   ├── finance-utils.ts                # 🧮 月度/年度财务统计聚合计算逻辑
│   ├── gemini.ts                       # 🧠 Google Gemini 智能引擎 (自适应模型检测与 repairAndParseJson)
│   ├── planner-utils.ts                # 🗓️ 计划任务元数据编解码与 iCalendar 导出构建器
│   └── types.ts                        # 📐 TypeScript 核心数据类型定义
├── prisma/
│   └── schema.prisma                   # Prisma 数据库架构定义 (PostgreSQL 云端)
├── middleware.ts                       # 🛡️ Next.js 全局路由拦截中间件 (鉴权守卫)
├── next.config.mjs                     # Next.js 生产配置 (注入安全 HTTP 响应头)
├── package.json                        # 项目依赖与启动脚本 (集成 prisma generate)
├── .env.example                        # 环境变量模板文件
├── .env                                # 本地开发私密配置文件 (不提交到 GitHub)
└── .gitignore                          # Git 忽略规则 (严格隔离密码、数据库与构建产物)
```

---

## 3. 数据库模型字典 (Prisma Schema)

### 1. `Transaction` (财务交易流水表)
* `id` (String, 主键 CUID)
* `amount` (Float): 金额
* `type` (String): `"EXPENSE"`、`"INCOME"` 或 `"TRANSFER"`
* `category` (String): 一级分类 (如 "Food & Dining", "Transport & Fuel", "Entertainment & Leisure", "Gambling & Lottery")
* `subCategory` (String?): 二级子分类 (如 "Supper/宵夜", "Petrol/汽油", "Tickets/门票", "Groceries")
* `tags` (String?): 跨维度标签 (如 "#Trip, #Supper, #CIMB")
* `description` (String?): 商家/消费描述 (如 "Thong Kee", "Shell Petrol", "TNG Transfer")
* `source` (String): 来源 (`"WEB_MANUAL"`, `"RECEIPT_OCR"`, `"WHATSAPP_TEXT"`, `"WHATSAPP_VOICE"`, `"BANK_STATEMENT"`, `"RECURRING"`)
* `rawInput` (String?): 原始语音转录内容、小票清单或对账单原文
* `currency` (String, 默认 "MYR"): 交易币种
* `accountId` (String?): 付款/转出账户 ID
* `toAccountId` (String?): 收款/转入账户 ID (当 type 为 TRANSFER 时生效)
* `date` (DateTime): 交易日期
* `createdAt` / `updatedAt` (DateTime): 时间戳

### 2. `Account` (多账户资产表)
* `id` (String, 主键)
* `name` (String): 账户名称 (如 "Cash Wallet", "CIMB / Primary Bank", "Touch 'n Go eWallet")
* `type` (String): 账户类型 (`"CASH"`, `"BANK"`, `"E_WALLET"`, `"CREDIT_CARD"`, `"INVESTMENT"`, `"OTHER"`)
* `currency` (String, 默认 "MYR"): 币种
* `balance` (Float): 当前实时余额
* `initialBalance` (Float): 初始建账金额
* `color` / `icon` (String): 主题色彩与图标
* `isArchived` (Boolean): 是否归档

### 3. `CategoryBudget` (分类预算表)
* `id` (String, 主键)
* `category` (String, 唯一): 目标分类
* `monthlyLimit` (Float, 默认 500): 每月限额预算
* `color` / `icon` (String): 进度条主色与图标

### 4. `TodoTask` (待办任务与日程表)
* `id` (String, 主键)
* `title` (String): 任务标题
* `description` (String?): 编码存储的详情 (包含青蛙标记 `isFrog`、时间分块 `timeBlock`、子任务清单 `subtasks` 等)
* `status` (String): `"PENDING"` 或 `"COMPLETED"`
* `priority` (String): `"HIGH"`, `"MEDIUM"`, `"LOW"`
* `dueDate` (DateTime?): 截止日期

### 5. `Note` (闪念便签表)
* `id` (String, 主键)
* `title` / `content` (String): 标题与便签内容
* `category` (String): 分类 (`"Idea"`, `"Work"`, `"Personal"`, `"Voice"`, `"General"`)
* `isPinned` (Boolean): 是否置顶

### 6. `AppConfig` (系统全局配置表)
* `id` (String, 默认为 `"default"`)
* `defaultCurrency` (String, 默认 "MYR"): 默认主货币
* `geminiApiKey` (String?): Google Gemini API Key
* `adminPasswordHash` (String?): 加盐哈希后的管理员密码
* `whatsappPhone` / `allowedPhoneNumbers` (String?): 白名单号码
* `webhookSecret` (String?): Webhook 握手令牌

---

## 4. 全量 API 接口清单与请求格式

| API 路径 | Method | 鉴权保护 | 功能描述 | 请求参数 / 示例 Body |
| :--- | :---: | :---: | :--- | :--- |
| `/api/auth/login` | `POST` | 否 | 单人密码登录 (支持环境变量秒级快速比对) | `{ "password": "your-passcode" }` |
| `/api/auth/logout` | `POST` | 否 | 清除会话 Cookie 登出 | 无 |
| `/api/auth/check` | `GET` | 否 | 查询当前登录有效性 | 返回 `{ "authenticated": boolean }` |
| `/api/config` | `GET` / `POST` | **是** | 查询/更新配置 (API Key 脱敏掩码返回) | `{ "defaultCurrency": "MYR", ... }` |
| `/api/finance/stats` | `GET` | **是** | 月/年财务聚合统计 (自动剥离转账) | `?month=YYYY-MM&year=YYYY` |
| `/api/finance/transactions` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 交易流水增删改查 (自动联动账户余额) | `{ "amount": 20, "type": "EXPENSE", ... }` |
| `/api/finance/accounts` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 多账户资产管理与净资产计算 | `{ "name": "Maybank", "balance": 1000 }` |
| `/api/finance/backup` | `GET`/`POST` | **是** | 全量 JSON 备份归档导出与一键恢复 | `?format=json` 或 `POST` 恢复包 |
| `/api/finance/budgets` | `GET` / `PUT` | **是** | 分类预算查询与更新 | `{ "category": "Food & Dining", "monthlyLimit": 600 }` |
| `/api/finance/recurring` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 周期性订阅固定账单管理 | `{ "name": "Spotify", "amount": 16.9 }` |
| `/api/ai/parse` | `POST` | **是** | 文本/语音多模态记账提取 (带自动入账) | `{ "text": "KFC 35" }` 或 FormData 语音 |
| `/api/ai/ocr-receipt` | `POST` | **是** | 购物小票照片视觉 OCR 解析 | `{ "imageBase64": "...", "mimeType": "..." }` |
| `/api/ai/reconcile` | `POST` | **是** | 银行对账单/TNG电子长截图多模态解析对账 | FormData (PDF 或图片附件) |
| `/api/todos` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 待办任务增删改查与原子批量时间块调度 | `{ "title": "Buy milk", "priority": "HIGH" }` |
| `/api/todos/ai` | `POST` | **是** | AI 任务拆解、智能时间调度与生产力每日复盘 | `{ "action": "BREAKDOWN", "taskTitle": "..." }` |
| `/api/todos/export` | `GET` | **是** | 待办任务日历 (.ics) 与 30 天数据导出 | `?format=ics` |
| `/api/notes` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 灵感便签增删改查 | `{ "title": "Note", "content": "..." }` |
| `/api/system/metrics` | `GET` | **是** | 电脑 CPU/RAM/OS 硬件实时指标采集 | 返回硬件状态 JSON |
| `/api/webhook/whatsapp` | `GET` / `POST` | 否(白名单) | Meta WhatsApp 握手与消息自动入账 | WhatsApp Cloud API 标准格式 |

---

## 5. 安全与单人私密认证架构

1. **中间件统一拦截 ([`middleware.ts`](middleware.ts))**：
   * 所有页面与 API 全局受保护；未授权访问自动 307 重定向至 `/login`，API 返回 `401 Unauthorized`。
2. **防篡改 Session 签发 ([`lib/auth.ts`](lib/auth.ts))**：
   * 基于 Web Crypto 原生实现 HMAC-SHA256 签名，Cookie 标记为 `HttpOnly; SameSite=Lax; Path=/; MaxAge=7天; Secure`，防御 XSS 攻击。
3. **秒级登录容错 (Fast-Path Auth)**：
   * `/api/auth/login` 优先比对环境变量 `ADMIN_PASSWORD`，不受数据库网络波动影响。
4. **数据库连接池安全与自动容灾 ([`lib/db.ts`](lib/db.ts))**：
   * 自动检测 Supabase Pooler，智能注入 `pgbouncer=true`，彻底杜绝 Postgres 26000 报错。

---

## 6. 核心功能模块详解

### 📊 1. 智能财务与看板 (`/finance`, `/transactions`, `/accounts`)
* 实时计算当月/当年总收支、净资产与储蓄率（默认以 `MYR RM` 结算）。
* 分类预算预警（安全、临近、超支进度条）。
* 支持跨账户转账（例如从 CIMB 转账到 TNG eWallet，双方余额自动对冲）。

### 📑 2. 电子对账单与长截图智能对账 (`/whatsapp-hub`)
* 支持上传 Touch 'n Go eWallet、Maybank、CIMB 等银行对账单 PDF 或长截图。
* 自动识别模糊转账（DuitNow 个人转账自动标记 `isAmbiguous` 并生成中文向导询问用途）。
* 配备 16,384 Token 超长输出与截断自动修复解析器（`repairAndParseJson`），保证长截图 100% 提取不报错。

### 🐸 3. 智能计划本与“吃青蛙”日程规划 (`/notes`)
* **Eat That Frog (吃掉那只青蛙)**：每天指定 1 个最重要的青蛙任务，顶部高亮激励完成。
* **时间分块视图**：早晨 (Morning)、下午 (Afternoon)、晚间 (Evening)、随时 (Anytime)。
* **AI 智能赋能**：一键 AI 拆解复杂任务为 3-5 个行动清单；每日一键生成 AI 生产力复盘建议。
* **习惯打卡条**：每日固定习惯（阅读、健身、记账等）一键打卡。

### 🏷️ 4. 本地化特色分类体系 ([`lib/category-meta.ts`](lib/category-meta.ts))
* **宵夜 (Supper)**：深夜聚餐、Mamak 档、拉茶与夜宵。
* **车与汽油费 (Transport & Fuel -> Petrol)**：RON95 / RON97 加油、洗车、保养。
* **门票 (Entertainment & Leisure -> Tickets)**：演唱会、展会、电影、景点入场券。
* **赌博与彩票 (Gambling & Lottery)**：Sports Toto、Magnum、Damacai、娱乐城。

---

## 7. 环境变量字典 (.env)

| 变量名 | 类型 | 必需 | 说明与示例 |
| :--- | :---: | :---: | :--- |
| `ADMIN_PASSWORD` | string | **是** | 单人访问主密码 (例如: `admin888` 或自定义强密码) |
| `AUTH_SECRET` | string | **是** | 32位以上随机密钥，用于签名 Session Cookie |
| `DATABASE_URL` | string | **是** | Supabase 数据库连接池串 (端口 6543 带 `pgbouncer=true`) |
| `GEMINI_API_KEY` | string | 否 | Google Gemini AI 密钥 (用于拍照识图、语音记账与智能对账) |
| `WHATSAPP_VERIFY_TOKEN` | string | 否 | Meta Webhook 握手暗号 (默认 `omnihub_secret_verify_token`) |
| `ALLOWED_PHONE_NUMBERS` | string | 否 | 允许发消息记账的手机号白名单 (如 `+60123456789`) |

---

## 8. 上线部署指南与实战排错要点

### 🌟 生产环境连接格式 (Vercel + Supabase)
在 Vercel 中设置的环境变量 `DATABASE_URL` 格式：
```text
postgresql://postgres.wyqfxbihtmntvwbermbb:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```
> **排错经验备忘**：
> 1. **报错 `Can't reach database server`**：前往 Supabase 控制台查看项目是否因闲置被挂起（Paused），点击绿色的 **"Restore project"** 即可在 1 分钟内唤醒。
> 2. **报错 `prepared statement "s8" does not exist` (Postgres 26000)**：这是因为 PgBouncer Transaction Pooler 不支持 prepared statements。本项目已在 `lib/db.ts` 中加入自动识别与修正代码，只要 URL 带上 `pgbouncer=true`，即可彻底解决此问题。

---

## 9. 新电脑迁移与继续配置指南 (Multi-Device Setup)

如果需要在新笔记本上继续开发与配置：

### 步骤 1：在新电脑克隆代码
```bash
git clone https://github.com/IV4N666/IV4N6Hub.git
cd IV4N6Hub
npm install
```

### 步骤 2：创建本地配置文件 (`.env`)
在项目根目录新建 `.env` 文件：
```env
ADMIN_PASSWORD="你的登录密码"
AUTH_SECRET="iv4n6hub-super-secret-key-2026-auth"
DATABASE_URL="postgresql://postgres.wyqfxbihtmntvwbermbb:你的数据库密码@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
GEMINI_API_KEY="你的GoogleGeminiKey"
```

### 步骤 3：本地启动与 AI 助手协同
1. 运行本地开发服务器：
   ```bash
   npm run dev
   ```
   打开 `http://localhost:3000` 即可在本地进行所有操作。
2. **在 Antigravity 助手里继续对话**：
   在新电脑打开项目时，直接在对话框输入：
   > *"阅读 PROJECT_MANUAL.md，我们继续之前的配置开发"*  
   AI 将立即自动读取本手册，100% 掌握所有架构和业务逻辑，无缝接续当前工作！

---

## 10. 未来维护与二次开发指南

### 如何同步更新到线上？
1. 本地修改代码后执行：
   ```bash
   git add .
   git commit -m "feat: 你的更新描述"
   git push origin main
   ```
2. Vercel 会在 30 秒内全自动完成重新构建并热更新部署到 `https://iv4n6hub.vercel.app`。

### 如何导出全量冷备份？
在浏览器登录状态下访问：
👉 `https://iv4n6hub.vercel.app/api/finance/backup?format=json`  
即可下载全量账本的 JSON 数据文件备份到本地电脑。
