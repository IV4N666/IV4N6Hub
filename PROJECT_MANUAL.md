# IV4N6Hub 架构字典与全功能维护开发手册

> **最后整理与验证时间**：2026-08-25  
> **系统状态**：全模块通过 Next.js 生产编译与类型检查 (`npm run build` 100% 通过，0 错误)  
> **代码库路径**：`c:\Users\Ivan\Downloads\Test`

---

## 目录
1. [项目全局概览与技术栈](#1-项目全局概览与技术栈)
2. [项目完整文件结构与代码地图](#2-项目完整文件结构与代码地图)
3. [数据库模型字典 (Prisma Schema)](#3-数据库模型字典-prisma-schema)
4. [全量 API 接口清单与请求格式](#4-全量-api-接口清单与请求格式)
5. [安全与单人私密认证架构](#5-安全与单人私密认证架构)
6. [核心功能模块详解](#6-核心功能模块详解)
7. [环境变量字典 (.env)](#7-环境变量字典-env)
8. [上线部署指南 (Vercel + Supabase 100% 免费)](#8-上线部署指南)
9. [未来维护与二次开发指南](#9-未来维护与二次开发指南)

---

## 1. 项目全局概览与技术栈

**IV4N6Hub** 是一个现代化、单人私密保护的**全能智能财务、AI 语音记账、发票识别、灵感备忘与电脑硬件监控中心**。

* **前端框架**：Next.js 14.2 (App Router) + React 18 + TypeScript 5
* **UI 与样式**：TailwindCSS 3.4 + 赛博发光暗黑美学 + HTML5 Canvas 交互星空粒子
* **图标与图表**：Lucide React + Recharts (动态折线图、面积图、饼图、仪表盘)
* **数据库 ORM**：Prisma ORM 5.22 (本地 SQLite `dev.db` / 线上 Supabase PostgreSQL)
* **人工智能**：Google Gemini 1.5 Flash (多模态视觉 OCR、语音转录 Speech-to-Text、自然语言消费解析、智能意图分流)
* **认证安全**：原生 Web Crypto HMAC-SHA256 签名 + HttpOnly 加密 Cookie + Next.js 全局中间件拦截

---

## 2. 项目完整文件结构与代码地图

```text
c:\Users\Ivan\Downloads\Test/
├── app/                                # Next.js 14 App Router 页面与路由
│   ├── api/                            # 后端 RESTful API 接口
│   │   ├── ai/
│   │   │   ├── ocr-receipt/route.ts   # 🧾 拍照发票视觉识别 API (Gemini Vision OCR)
│   │   │   └── parse/route.ts          # 💬 自然语言 & 语音多模态记账解析 API
│   │   ├── auth/
│   │   │   ├── check/route.ts          # 🔍 检查当前登录状态 API
│   │   │   ├── login/route.ts          # 🔑 单人密码登录与 HttpOnly Cookie 签发
│   │   │   └── logout/route.ts         # 🚪 登出与清除 Cookie API
│   │   ├── config/route.ts             # ⚙️ 系统配置 API (API Key 脱敏返回与更新)
│   │   ├── finance/
│   │   │   ├── budgets/route.ts        # 💰 分类预算管理 API
│   │   │   ├── stats/route.ts          # 📊 月度/年度收支与统计计算 API
│   │   │   └── transactions/route.ts   # 📝 交易流水 CRUD 接口
│   │   ├── modules/route.ts            # 🧩 模块化插件配置 API
│   │   ├── notes/route.ts              # 📝 灵感便签 CRUD API
│   │   ├── system/metrics/route.ts     # 💻 电脑 CPU/RAM/OS/网络指标采集 API
│   │   ├── todos/route.ts              # 📋 待办任务 CRUD 与状态勾选 API
│   │   └── webhook/whatsapp/route.ts   # 📱 WhatsApp Cloud API 消息回调接口 (带白名单)
│   ├── finance/page.tsx                # 📊 财务总览看板页面 (月/年收支、预算条、图表)
│   ├── login/page.tsx                  # 🔐 单人私密密码解锁页面 (带 Suspense 与毛玻璃)
│   ├── modules/page.tsx                # 🧩 模块中心页面
│   ├── notes/page.tsx                  # 📝 闪念便签与语音待办任务页面
│   ├── settings/page.tsx               # ⚙️ 系统设置、密码修改、API Key与白名单配置
│   ├── system-monitor/page.tsx         # 💻 PC & 系统硬件实时大屏监控页面
│   ├── transactions/page.tsx           # 🧾 交易流水明细与 CSV 导出页面
│   ├── whatsapp-hub/page.tsx           # 💬 WhatsApp 模拟器与配置向导页面
│   ├── globals.css                     # 全局样式、网格背景、动画关键帧
│   ├── layout.tsx                      # 根布局容器 (挂载 Canvas 动态背景与 Header/Sidebar)
│   └── page.tsx                        # 首页路由 (自动重定向至 /finance)
├── components/                         # 前端复用组件
│   ├── finance/
│   │   ├── AddTransactionModal.tsx     # 记账弹窗 (支持手动录入 + 📸 拍照扫描小票)
│   │   ├── CategoryBudgetList.tsx      # 分类预算进度条与编辑列表
│   │   ├── ExpenseCharts.tsx           # 支出分析图表组件 (折线趋势图、饼图)
│   │   ├── MetricCards.tsx             # 顶部指标卡片 (总收入、总支出、净结余、储蓄率)
│   │   └── RecentTransactions.tsx      # 最近交易记录列表组件
│   ├── layout/
│   │   ├── AnimatedCyberBackground.tsx # ✨ HTML5 Canvas 交互式发光粒子星空背景组件
│   │   ├── Header.tsx                  # 顶部导航栏 (货币切换、实时时间、一键锁屏)
│   │   ├── MobileNav.tsx               # 手机端底部悬浮导航栏
│   │   └── Sidebar.tsx                 # 桌面端侧边导航栏 (包含各模块快捷入口)
│   └── whatsapp/
│       ├── WhatsAppSimulator.tsx       # 📱 内置 WhatsApp 聊天与语音录音模拟器
│       └── WhatsAppWebhookGuide.tsx    # 📚 Meta WhatsApp Cloud API 对接教程与配置生成器
├── lib/                                # 核心工具函数与业务逻辑
│   ├── auth.ts                         # 🔐 Web Crypto 密码加盐哈希与 HMAC Session 签名验证
│   ├── category-meta.ts                # 🏷️ 分类元数据、色彩与币种格式化工具
│   ├── db.ts                           # 🗄️ Prisma 客户端单例工厂
│   ├── finance-utils.ts                # 🧮 月度/年度财务统计聚合计算逻辑
│   ├── gemini.ts                       # 🧠 Google Gemini 1.5 Flash (OCR、语音、文本解析)
│   └── types.ts                        # 📐 TypeScript 核心数据类型定义
├── prisma/
│   ├── dev.db                          # 本地 SQLite 数据库文件 (由 .gitignore 自动保护)
│   └── schema.prisma                   # Prisma 数据库架构定义
├── middleware.ts                       # 🛡️ Next.js 全局路由拦截中间件 (鉴权守卫)
├── next.config.mjs                     # Next.js 生产配置 (注入安全 HTTP 响应头)
├── package.json                        # 项目依赖与启动脚本
├── .env.example                        # 环境变量模板文件
├── .env                                # 本地开发私密配置文件 (不提交到 GitHub)
└── .gitignore                          # Git 忽略规则 (严格隔离密码、数据库与构建产物)
```

---

## 3. 数据库模型字典 (Prisma Schema)

### 1. `Transaction` (交易流水表)
* `id` (String, 主键 CUID)
* `amount` (Float): 金额
* `type` (String): `"EXPENSE"` 或 `"INCOME"`
* `category` (String): 分类名称 (如 "Food & Dining", "Transport & Fuel")
* `description` (String?): 商家/消费描述
* `source` (String): 来源 (`"WEB_MANUAL"`, `"RECEIPT_OCR"`, `"WHATSAPP_TEXT"`, `"WHATSAPP_VOICE"`, `"API"`)
* `rawInput` (String?): 原始输入文本或小票明细
* `currency` (String): 币种 (`"USD"`, `"MYR"`, `"SGD"` 等)
* `date` (DateTime): 交易日期
* `createdAt` / `updatedAt` (DateTime): 创建与修改时间戳

### 2. `CategoryBudget` (分类预算表)
* `id` (String, 主键)
* `category` (String, 唯一): 目标分类
* `monthlyLimit` (Float): 每月限额预算
* `color` (String): 进度条主色
* `icon` (String): 图标名称

### 3. `Note` (灵感便签表)
* `id` (String, 主键)
* `title` (String): 便签标题
* `content` (String): 便签内容 (支持多行文本与链接)
* `category` (String): 分类 (`"Idea"`, `"Work"`, `"Personal"`, `"Voice"`, `"General"`)
* `isPinned` (Boolean): 是否置顶
* `color` (String): 标签主色

### 4. `TodoTask` (待办任务表)
* `id` (String, 主键)
* `title` (String): 任务标题
* `description` (String?): 任务详情
* `status` (String): `"PENDING"` (待办) 或 `"COMPLETED"` (已完成)
* `priority` (String): `"HIGH"`, `"MEDIUM"`, `"LOW"`
* `dueDate` (DateTime?): 截止日期

### 5. `AppConfig` (系统全局配置表)
* `id` (String, 默认为 `"default"`)
* `defaultCurrency` (String): 默认主货币 (如 "USD", "MYR")
* `geminiApiKey` (String?): 存储在后端的 Google Gemini API Key
* `adminPasswordHash` (String?): 加盐哈希后的主密码
* `whatsappPhone` (String?): 绑定的 WhatsApp 号码
* `allowedPhoneNumbers` (String?): 允许触发记账的手机号白名单 (逗号分隔)
* `webhookSecret` (String?): Webhook 握手令牌
* `theme` (String): 界面主题

---

## 4. 全量 API 接口清单与请求格式

| API 路径 | Method | 鉴权保护 | 功能描述 | 请求参数 / 示例 Body |
| :--- | :---: | :---: | :--- | :--- |
| `/api/auth/login` | `POST` | 否 | 单人密码登录 | `{ "password": "your-passcode" }` |
| `/api/auth/logout` | `POST` | 否 | 清除会话 Cookie 登出 | 无 |
| `/api/auth/check` | `GET` | 否 | 查询当前登录有效性 | 返回 `{ "authenticated": boolean }` |
| `/api/config` | `GET` | **是** | 获取配置 (Key 脱敏) | 返回掩码 API Key、货币等 |
| `/api/config` | `POST` | **是** | 更新配置 / 修改密码 | `{ "defaultCurrency": "USD", "newAdminPassword": "...", ... }` |
| `/api/finance/stats` | `GET` | **是** | 获取月/年财务聚合统计 | `?month=YYYY-MM&year=YYYY` |
| `/api/finance/transactions` | `GET` | **是** | 分页/筛选交易流水 | `?category=...&type=...&q=...&limit=20` |
| `/api/finance/transactions` | `POST` | **是** | 新增交易流水 | `{ "amount": 25, "type": "EXPENSE", "category": "...", ... }` |
| `/api/finance/transactions` | `PUT` | **是** | 修改单笔交易 | `{ "id": "...", "amount": 30, ... }` |
| `/api/finance/transactions` | `DELETE` | **是** | 删除单笔交易 | `?id=...` |
| `/api/finance/budgets` | `GET` / `PUT` | **是** | 查询/更新分类预算 | `{ "category": "Food & Dining", "monthlyLimit": 600 }` |
| `/api/ai/parse` | `POST` | **是** | 文本/语音记账智能提取 | `{ "text": "Lunch 15" }` 或 FormData 语音流 |
| `/api/ai/ocr-receipt` | `POST` | **是** | 小票照片视觉 OCR 解析 | `{ "imageBase64": "...", "mimeType": "image/jpeg" }` |
| `/api/notes` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 灵感便签增删改查 | `{ "title": "...", "content": "...", "category": "Idea" }` |
| `/api/todos` | `GET`/`POST`/`PUT`/`DELETE` | **是** | 待办任务增删改查 | `{ "title": "Pay bill", "priority": "HIGH" }` |
| `/api/system/metrics` | `GET` | **是** | 实时采集电脑硬件状态 | 返回 CPU%、RAM%、OS、Uptime、网络 IP 等 |
| `/api/webhook/whatsapp` | `GET` | 否 | Meta 握手校验 | URL Search Params: `hub.mode`, `hub.verify_token` |
| `/api/webhook/whatsapp` | `POST` | 否(内部白名单) | WhatsApp 消息入账 | Meta Cloud API 标准消息体 (自动核对白名单) |

---

## 5. 安全与单人私密认证架构

1. **中间件统一拦截 ([`middleware.ts`](file:///c:/Users/Ivan/Downloads/Test/middleware.ts))**：
   * 所有访问请求先过中间件；除公开接口（登录、WhatsApp Webhook 回调、静态资源）外，未授权请求直接拦截：
     * 页面路由：307 重定向至 `/login?from=...`
     * API 路由：返回 HTTP `401 Unauthorized`
2. **防篡改 Session 签发 ([`lib/auth.ts`](file:///c:/Users/Ivan/Downloads/Test/lib/auth.ts))**：
   * 基于 Web Crypto 原生实现 HMAC-SHA256 签名，生成包含有效期与随机 Nonce 的 Token。
   * Cookie 配置为：`HttpOnly; SameSite=Lax; Path=/; MaxAge=7天; Secure (生产环境)`，彻底杜绝 JavaScript 脚本通过 XSS 窃取会话。
3. **敏感密钥绝密脱敏**：
   * `/api/config` 绝不向客户端暴露明文 `GEMINI_API_KEY`，统一返回掩码（如 `AIzaSy...4xQ9`），更新时若未修改则自动保留原密钥。
4. **WhatsApp 白名单防御**：
   * 仅允许 `ALLOWED_PHONE_NUMBERS` 中登记的手机号触发记账，外部恶意陌生人消息会被直接忽略，防止数据污染与刷爆 AI 额度。
5. **安全 HTTP 标头 ([`next.config.mjs`](file:///c:/Users/Ivan/Downloads/Test/next.config.mjs))**：
   * 注入 HSTS、`X-Frame-Options: SAMEORIGIN`（防点击劫持）、`X-Content-Type-Options: nosniff`，移除 `X-Powered-By`。

---

## 6. 核心功能模块详解

### 📊 1. 智能财务与预算看板 (`app/finance`, `app/transactions`)
* 实时计算当月与当年的总收入、总支出、结余净资产、储蓄率。
* 分类预算智能预警（绿色安全、黄色接近上限、红色超支）。
* 交易记录支持关键字搜索、类型筛选、按月筛选与一键导出 CSV。

### 🧾 2. 拍照/发票视觉识图记账 (`components/finance/AddTransactionModal.tsx`)
* 在记账弹窗中点击 **“📸 Scan Receipt (AI)”**，拍照或上传购物收据图片。
* 后端调用 Gemini 1.5 Flash 视觉模型，结构化抽取商家、商品清单明细、单价、税额与总金额并自动填充表单。

### 📝 3. 闪念便签与智能待办 (`app/notes`)
* **待办任务**：设置优先级、截止日期，一键勾选完成并带划线归档。
* **灵感便签**：置顶重要便签、分类色彩管理（Idea / Work / Personal / Voice）。
* **语音闪念录音**：按住麦克风直接说话，AI 自动转写保存为便签。

### 💻 4. 电脑硬件实时监控大屏 (`app/system-monitor`)
* **CPU**：实时负载占用率波动曲线、核心数、主频。
* **内存 (RAM)**：已用/总容量、动态环形仪表。
* **显卡 (GPU) 与显示器**：WebGL 硬件检测真实显卡型号、物理分辨率、DPI 缩放比。
* **电源与电池**：实时电量百分比、充电状态检测。
* **网络与延迟**：本地 IP、实时 Ping 延迟 (ms)。
* **波形图**：25 帧实时 CPU & RAM 波动图（支持 1s / 2s / 5s 刷新率切换）。

### ✨ 5. 交互式发光星空粒子背景 (`components/layout/AnimatedCyberBackground.tsx`)
* 采用 HTML5 Canvas + GPU 硬件加速。
* 浮动发光霓虹粒子，粒子靠近时自动连成星座/神经网络流光线条，支持鼠标滑过引力扩散互动。

---

## 7. 环境变量字典 (.env)

| 变量名 | 类型 | 必需 | 说明与示例 |
| :--- | :---: | :---: | :--- |
| `ADMIN_PASSWORD` | string | **是** | 单人访问主密码 (例如: `admin888` 或自定义强密码) |
| `AUTH_SECRET` | string | **是** | 32位以上随机密钥，用于签名 Session Cookie |
| `DATABASE_URL` | string | **是** | 数据库连接串 (本地 `file:./dev.db`；线上填 Supabase PostgreSQL 连接串) |
| `GEMINI_API_KEY` | string | 否 | Google Gemini AI 密钥 (也可在网页设置中配置) |
| `WHATSAPP_VERIFY_TOKEN` | string | 否 | Meta Webhook 握手令牌 (默认 `omnihub_secret_verify_token`) |
| `ALLOWED_PHONE_NUMBERS` | string | 否 | 允许发消息记账的手机号白名单 (如 `+60123456789,+6598765432`) |

---

## 8. 上线部署指南

### 方案 A：Vercel + Supabase (永久免费、最安全、免运维)
1. **创建免费数据库 (Supabase)**：
   * 登录 [supabase.com](https://supabase.com) 免费创建项目，在 Settings -> Database 复制 `DATABASE_URL`。
2. **推送到 GitHub**：
   * 在 GitHub 创建私有仓库 `IV4N6Hub`，在本地运行：
     ```bash
     git remote add origin https://github.com/IV4N666/IV4N6Hub.git
     git push -u origin main
     ```
3. **在 Vercel 导入部署**：
   * 登录 [vercel.com](https://vercel.com)，导入 `IV4N6Hub` 仓库。
   * 在 **Environment Variables** 添加：`ADMIN_PASSWORD`, `AUTH_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`。
   * 点击 **Deploy** 即可上线获得永久免费专属 HTTPS 域名！
4. **同步数据库表**：
   * 本地执行 `npx prisma db push` 一键在 Supabase 中生成所有表。

---

## 9. 未来维护与二次开发指南

### 如何重置/修改管理员密码？
* **方法 1（推荐）**：直接在 IV4N6Hub 网页进入 **Settings (设置)** 页面，输入新密码并保存。
* **方法 2**：在 `.env` 或 Vercel 环境变量中修改 `ADMIN_PASSWORD="新密码"`，重启后立即生效。

### 如何增加新的分类或币种？
* 打开 [`lib/category-meta.ts`](file:///c:/Users/Ivan/Downloads/Test/lib/category-meta.ts)，在 `CATEGORY_DEFINITIONS` 或 `CURRENCY_SYMBOLS` 字典中追加即可。

### 如何修改 AI 提取规则或 Prompt？
* 打开 [`lib/gemini.ts`](file:///c:/Users/Ivan/Downloads/Test/lib/gemini.ts)，调整 `parseTextWithAI`、`parseReceiptImageWithAI` 或 `parseAudioWithAI` 中的 Prompt 描述。
