# Somnium 博客优化设计：Astro 静态化 + Edge Policy Router

> 状态：M1–M4 实施中（M5 独立 Vercel 项目与切流未做）
> 分支：`cursor/astro-policy-router-design-b768`

## 1. 背景与目标

对线上站点（blog.jihuayu.com）与当前 Next.js 代码的诊断结论：

1. **TTFB 不是主要瓶颈。** 首页与文章页已是 ISR（`revalidate = 300`）+ `generateStaticParams()` 预生成，正常访问命中 Vercel CDN（`x-vercel-cache: HIT`）。换框架对 TTFB p50 几乎没有帮助，只改善 ISR 过期后的长尾请求。
2. **优化空间在前端资产。** 首页有 3 个 render-blocking CSS（`notion-react/styles.css` 约 47KB 被 RootLayout 全局加载，但首页不渲染 Notion 正文）、Next runtime JS 与 RSC Flight payload 使 HTML 膨胀。这些影响 FCP / LCP / JS 传输量。
3. **站点性质适合彻底静态化。** Notion → 渲染模型转换、Shiki 高亮均已在服务端完成；真正的客户端交互只有阅读进度、灯箱、代码复制、目录、评论等少量组件，是 Astro Islands 的典型场景。

因此本方案的目标形态：

- **Astro 全静态输出 + 少量 Islands，继续部署 Vercel**；
- 同时落地三条产品需求，统一为「**地区策略 × 语言版本**」架构：
  - 中国大陆地区不渲染评论框；
  - 部分文章对大陆不可见（返回 404）；
  - 不同语言读者看到对应语言版本（一期 zh-CN + en）。

## 2. 已确认的决策

| 决策点 | 结论 |
|---|---|
| 范围 | 完整路线：Astro 迁移 + 地区/语言功能一起规划实施 |
| 受限文章响应 | **404**（不使用 451） |
| 语言范围 | 一期 **zh-CN + en**（架构预留扩展第三语言） |
| Notion 多语言组织 | **同一 database、相同 `slug`、新增语言标识属性**；同 slug 不同语言的条目互为翻译 |
| 实施方式 | 新分支推进，不影响现有 Next 产线；旧 `astro-migration` 分支不复用 |

## 3. 维度模型

两个完全解耦的请求维度 + 一个输出格式维度：

```ts
type RegionPolicy = 'mainland' | 'global'   // 地区决定「能看到什么」
type Locale       = 'zh-CN' | 'en'          // 语言决定「以什么语言看」

interface RenderContext {
  region: RegionPolicy
  locale: Locale
  format: 'html' | 'markdown' | 'feed' | 'search'
}
```

原则：

- **不允许**把「中国用户 = 中文」耦合：人在上海 + 英文浏览器 → `mainland + en`；人在新加坡 + 中文浏览器 → `global + zh-CN`。
- 地区维度永远只有 2 个 profile，不按国家逐一生成版本。
- 所有内容出口（HTML、首页/分页/Tag/Archive、搜索索引、RSS、sitemap、Agent Markdown、上一篇/下一篇、相关推荐）必须经过同一个 policy engine，禁止只在 HTML 路由做隐藏。

## 4. 目标架构总览

```text
                        Request
                           │
                           ▼
              Vercel Routing Middleware（Edge Policy Router）
                           │
             ┌─────────────┴─────────────┐
        resolveRegion               resolveLocale
             │                           │
     X-Vercel-IP-Country      URL → cookie → Accept-Language
             │                           │
             └─────────────┬─────────────┘
                           │
                 Policy Manifest lookup（构建期生成，0 网络请求）
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       allowed          blocked        locale redirect（仅首页首访）
          │                │
          ▼                ▼
   internal rewrite       404
          │
          ▼
 /site/{region}/{locale}/...   ← 用户永远看不到的内部路径（Astro 路由目录，非 `__site` 前缀）
          │
          ▼
     Static HTML（Vercel CDN）
```

请求期计算量：一次 Map lookup + 几个字符串判断 + 一次 internal rewrite。正文渲染、Notion 拉取、Shiki、翻译分组、首页过滤全部发生在 build time。

## 5. Notion 数据模型

### 5.1 属性扩展（同库同 slug 方案）

在现有 database 上新增三个 select 属性，全部**缺省兼容**（不填等于现状）：

| 属性 | 类型 | 取值 | 缺省语义 |
|---|---|---|---|
| `lang` | select | `zh-CN` / `en` | 空 = `zh-CN`（存量条目零改动） |
| `visibility` | select | `public` / `blocked-mainland` | 空 = `public` |
| `comments` | select | `default` / `disabled-mainland` / `disabled` | 空 = `default` |

现有属性不变：`title`、`slug`、`summary`、`type`（仍为 `Post` / `Page`）、`status`、`tags`、`date`、`格式`。

> 注：用户表述为「有一个 type 标识语言」。为避免与现有 `type`（Post/Page）冲突，设计为独立的 `lang` 属性；若希望复用 `type` 字段扩展值（如 `Post-EN`），字段读取层可以适配，但不推荐（Post/Page 与语言是两个正交概念）。

### 5.2 翻译分组（TranslationGroup）

构建期按 `slug` 分组：

```text
slug = "mise-good-good"
├── 条目 A：lang 空(zh-CN)  status=Published   ← canonical
└── 条目 B：lang = en       status=Published

URL：
  zh-CN → /mise-good-good        （现有 URL 完全不变）
  en    → /en/mise-good-good     （同 slug，前缀区分语言）
```

规则：

- **同组策略合并取最严格值**：任一语言条目标了 `blocked-mainland`，整组（`/foo` 与 `/en/foo`）在大陆全部 404；`comments` 同理。这样不会出现「中文版禁了、英文翻译忘了配置」的漏洞。
- **canonical locale 固定为 zh-CN**（组内无 zh-CN 条目时取组内唯一语言为 canonical）。
- **翻译缺失不 fallback**：`/en/foo` 无英文条目 → 404，绝不返回中文内容；`/foo` 页面上的语言切换器把 en 标记为不可用。
- 各语言条目的 `status` / `date` 独立生效：英文翻译未 Published 时组内只有中文版存在。
- `Page` 类型（About 等）同样支持 `lang` 分组。

## 6. 仓库结构与包设计

```text
Somnium/
├── apps/
│   └── blog/                      ← 新增 Astro 项目（Next 产线迁移完成前并存）
│       ├── astro.config.ts        output: 'static' + @astrojs/vercel adapter + @astrojs/react
│       ├── middleware.ts          ← Vercel Routing Middleware（Edge Policy Router）
│       └── src/
│           ├── layouts/           BaseLayout / ArticleLayout
│           ├── pages/site/[region]/[locale]/   ← 全部页面挂在变体矩阵下（Astro 忽略 `_` 前缀目录）
│           │   ├── index.astro                  首页
│           │   ├── [slug].astro                 文章页
│           │   ├── page/[page].astro            分页
│           │   ├── tag/[tag]/...                标签
│           │   ├── search.astro + search-index.json.ts
│           │   ├── feed.xml.ts / sitemap.xml.ts
│           │   └── md/[slug].md.ts              Agent Markdown
│           ├── pages/api/                       仅保留必要动态端点（见 §11）
│           ├── components/        Astro 组件 + 评论 React island
│           └── scripts/           原生 JS 交互（TOC/进度条/复制/灯箱/主题）
│
├── packages/
│   ├── notion-type/               保留
│   ├── notion-data/               保留（核心资产，不动）
│   ├── notion-render-core/        新增：从 notion-react/prepare.ts 抽出框架无关层
│   │                              （NotionRenderModel：document/toc/highlightedCode/
│   │                                linkPreviewMap/pageHrefMap/pagePreviewMap）
│   ├── notion-astro/              新增：NotionRenderModel → HTML（.astro 渲染器）
│   ├── notion-react/              保留：依赖 notion-render-core；Storybook 继续可用
│   ├── notion-vue/                保留，后续同样下沉到 render-core
│   ├── site-policy/               新增：策略引擎（下述 §6.1）
│   └── somnium-comments/          保留 React，作为 island 使用
```

### 6.1 `site-policy` 包

```text
packages/site-policy/src/
├── types.ts        RegionPolicy / Locale / ArticlePolicy / RenderContext
├── region.ts       resolveRegionPolicy(country) ；MAINLAND_COUNTRIES = Set(['CN'])（可配）
├── locale.ts       resolveLocale(url, cookie, acceptLanguage)；negotiate 逻辑
├── article.ts      canAccessArticle(group, region) / canShowComments(group, region)
│                   / getTranslation(group, locale)
├── group.ts        groupPostsBySlug(posts) → TranslationGroup[]（含策略合并）
└── manifest.ts     buildPolicyManifest(groups) / manifest 类型与查询
```

关键接口（middleware 与构建脚本共用同一实现）：

```ts
resolveRegionPolicy(country?: string): RegionPolicy   // 不出现 country === 'CN' 的散落硬编码
resolveLocale(input: { pathname, cookie?, acceptLanguage? }): { locale, explicit: boolean }
canAccessArticle(policy: ArticlePolicy, region: RegionPolicy): boolean
canShowComments(policy: ArticlePolicy, region: RegionPolicy): boolean
```

## 7. 构建流水线

### 7.1 变体矩阵

一次 `astro build` 输出 2 × 2 = 4 套 HTML（资产共享）：

```text
                 locale
              zh-CN      en
global      /__site/global/zh-CN/**     /__site/global/en/**
mainland    /__site/mainland/zh-CN/**   /__site/mainland/en/**
```

- 页面路由统一放在 `src/pages/__site/[region]/[locale]/`，由 `getStaticPaths()` 枚举矩阵 × 内容；
- CSS / JS / 字体 / 图片走 `/_astro/**` 与 `/public`，四套变体共用，不随矩阵翻倍；
- 变体差异全部在 HTML 层：
  - `mainland` 变体：**HTML 中不存在评论组件**（无 DOM、无 island、无评论 JS、无 Atrium 请求），受限文章从首页/分页/Tag/Archive/搜索索引/RSS/sitemap/上一篇下一篇/相关推荐中全部过滤；
  - `en` 变体：仅包含存在英文条目的文章（见 §14 待确认项 1）。

### 7.2 Policy Manifest

构建开始时先拉取 Notion 全量条目 → 分组 → 生成：

```jsonc
// generated/policy-manifest.ts（打进 middleware bundle，请求期零网络查询）
{
  "routes": {
    "/mise-good-good":      { "key": "mise-good-good", "locale": "zh-CN" },
    "/en/mise-good-good":   { "key": "mise-good-good", "locale": "en" }
  },
  "articles": {
    "mise-good-good": {
      "visibility": "public",
      "comments": "disabled-mainland",
      "translations": { "zh-CN": true, "en": true }
    },
    "some-sensitive-post": {
      "visibility": "blocked-mainland",
      "comments": "default",
      "translations": { "zh-CN": true }
    }
  }
}
```

约束：manifest 只含路由与策略位，不含正文；当前文章量级下体积远小于 middleware bundle 限制。

### 7.3 每个变体的完整产物清单

| 产物 | 说明 |
|---|---|
| 页面 HTML | 首页 / 分页 / 文章 / Tag / Archive / About / 404 |
| `search-index.json` | 变体内本地搜索索引（受限文章不进 mainland 索引） |
| `feed.xml` | RSS 按变体过滤 |
| `sitemap.xml` | 按变体过滤；canonical URL 一致（见 §9） |
| `md/[slug].md` | Agent Markdown 输出，同样走 policy 过滤 |

## 8. Edge Policy Router（middleware.ts）

使用 Vercel Routing Middleware（`@vercel/functions` 的 `rewrite()` / `geolocation()`），运行在 CDN cache 之前。

```ts
export const config = {
  matcher: ['/((?!_astro/|api/|favicon|robots\\.txt|\\.well-known/).*)']
}

export default function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // 1. 内部变体路径禁止直接访问
  if (pathname.startsWith('/__site/')) return new Response(null, { status: 404 })

  // 2. 解析两维度
  const region = resolveRegionPolicy(geolocation(request).country)
  const { locale, explicit } = resolveLocale({
    pathname,
    cookie: readLocaleCookie(request),
    acceptLanguage: request.headers.get('accept-language')
  })

  // 3. 首页首访语言重定向（仅 '/'，无显式语言、无 cookie 时）
  if (pathname === '/' && !explicit && locale === 'en') {
    return Response.redirect(new URL('/en/', url), 307)
  }

  // 4. 策略检查：受限文章 + mainland → 404
  const route = manifest.routes[normalize(pathname)]
  if (route) {
    const article = manifest.articles[route.key]
    if (!canAccessArticle(article, region)) return new Response(null, { status: 404 })
    if (!article.translations[locale] && isLocalePrefixed(pathname)) {
      return new Response(null, { status: 404 })   // /en/foo 无翻译，不 fallback
    }
  }

  // 5. internal rewrite（浏览器 URL 不变）
  return rewrite(new URL(`/__site/${region}/${stripLocalePrefix(pathname, locale)}`, url))
}
```

行为细则：

- **locale 解析优先级**：URL 显式前缀（`/en/**` 永远是英文） > `somnium-locale` cookie（用户手动切换语言时由几行原生 JS 写入） > `Accept-Language` 协商 > 默认 `zh-CN`。
- **不使用 `Vary: Accept-Language / X-Vercel-IP-Country`** 让同一 URL 返回不同内容——SEO、分享、canonical、缓存组合都会失控；一切分裂发生在 middleware rewrite。
- 重定向只发生在首页首访；用户主动打开中文文章链接时不强制跳转英文版，只在页面顶部提示「English version available」。
- 未命中 manifest 的路径（Tag、分页、搜索页等非文章路由）直接按 region/locale rewrite。
- 404 响应 rewrite 到对应变体的 404 页面（保持地区/语言一致的 404 体验）。
- 本地开发：Astro dev 提供一个等价的 dev-only middleware（读同一个 site-policy 实现），支持 `?__region=mainland` 查询参数模拟地区。

## 9. URL 与 SEO

- 中文 URL **完全不变**（`/mise-good-good`），英文加前缀（`/en/mise-good-good`），同 slug；
- 每篇文章各语言版本互相输出 hreflang，`x-default` 指向 canonical（zh-CN）：

```html
<link rel="alternate" hreflang="zh-CN" href="https://blog.jihuayu.com/mise-good-good" />
<link rel="alternate" hreflang="en"    href="https://blog.jihuayu.com/en/mise-good-good" />
<link rel="alternate" hreflang="x-default" href="https://blog.jihuayu.com/mise-good-good" />
```

- `<html lang>` 是 URL 级属性（`/en/**` 输出 `lang="en"`）；
- **地区 policy 不改变 canonical**：mainland/global 是呈现策略而非两份内容，canonical 始终是同一 URL；
- 受限文章不进入 mainland 变体的 sitemap / RSS / 搜索索引，避免搜索结果泄露不可见内容。

## 10. 页面与组件迁移映射

### 10.1 路由映射

| Next.js 现状 | Astro 目标 |
|---|---|
| `app/layout.tsx` + `ContainerServer` | `BaseLayout.astro` / `ArticleLayout.astro` |
| `app/page.tsx`（ISR 300s） | `__site/[region]/[locale]/index.astro`（纯静态） |
| `app/[slug]/page.tsx` + `generateStaticParams` | `[slug].astro` + `getStaticPaths()` |
| `app/page/[page]` / `app/tag/[tag]` | 对应 `.astro` 页面 |
| `app/search` + `/api/search` | `search.astro` + 构建期 `search-index.json`（本地搜索，去 Serverless） |
| `app/feed` / `app/sitemap.ts` | `feed.xml.ts` / `sitemap.xml.ts`（构建期端点） |
| `generateMetadata()` | Astro `<head>` / SEO 组件 |
| Agent Markdown（`markdownForAgents`） | 构建期 `md/[slug].md.ts` |

### 10.2 交互组件

| 功能 | 现状 | 目标 |
|---|---|---|
| 文章正文渲染 | React `NotionRenderer`（服务端） | 阶段一：React 组件无 `client:*`（纯 HTML 输出，零 hydration）；阶段二：`notion-astro` 渲染器 |
| ReadingProgress | React client component | 原生 JS（scroll + rAF） |
| TOC / WideTOC | React | 静态 HTML + IntersectionObserver |
| 代码复制 | React | 事件委托原生 JS |
| 图片灯箱 | React | 小型原生 JS / custom element |
| Mermaid | 客户端渲染 | 可见时动态 import |
| Header 交互 / 主题切换 | React + hooks | 原生 JS；主题为 `<head>` 内联数行防闪烁 |
| 评论（somnium-comments） | React | **保留 React island**，`client:visible`；mainland 变体不输出 |
| LinkPreview hover card | React + `/api/link-preview` | 构建期 `linkPreviewMap` 内联 + 小 JS 展示（运行时 API 保留待观察，见 §11） |

CSS 策略：拆分 `base / typography / header / article(notion/code/table/media)`；首页不再加载 Notion 正文 CSS；关键 CSS 内联。字体从 `next/font` 改为 `@font-face` + 仅 preload 首屏必需字体（中文字体不整包 preload）。

## 11. API 路由去留

| 现有路由 | 去向 |
|---|---|
| `/api/notion/webhook` | **保留**（Vercel Function）：验证/事件分类逻辑不变，`revalidatePath/Tag` 替换为触发 Vercel Deploy Hook |
| `/api/cache/revalidate` | 移除（全静态后无意义，Deploy Hook 取代） |
| `/api/search`、`/api/tags` | 移除，改构建期静态索引 |
| `/api/og/notion` | 保留 Vercel Function（可选二期改构建期生成 OG 图） |
| `/api/link-preview`（+image） | 一期保留 Function；若构建期预取覆盖率足够则二期移除 |
| `/api/request-geo` | 保留（调试地区判定用），middleware 也可注入 `x-somnium-region` 响应头便于排查 |
| `/api/health` | 保留 |

## 12. 内容更新链路

放弃固定 5 分钟 ISR：

```text
Notion 修改
   │ webhook（现有验证/分类逻辑保留）
   ▼
/api/notion/webhook ──判断需要更新──► Vercel Deploy Hook ──► astro build（全量）──► CDN
```

- 普通访问 CDN 永远 HIT，没有 PRERENDER 长尾；
- 全量 build 在当前文章量级可接受；未来嫌慢再评估 Astro ISR（`@astrojs/vercel` 支持 on-demand invalidation），不在本期范围；
- webhook 需做去抖（短时间多次编辑合并为一次部署）与失败告警。

## 13. 里程碑与验收标准

| 里程碑 | 内容 | 验收 |
|---|---|---|
| **M1 骨架** | `apps/blog` 脚手架；抽取 `notion-render-core`（`notion-react` 改为依赖它，现有测试/Storybook 不回归）；复用 React renderer（无 hydration）跑通首页/分页/Tag/文章页 | 本地 build 出全部页面；`notion-react` 单测全绿 |
| **M2 静态化** | `notion-astro` 渲染器逐块替换；交互组件原生 JS 化；评论 island；构建期搜索索引；feed/sitemap/Agent MD 静态化 | 文章页除评论外 0 React；Lighthouse 本地对照 |
| **M3 Policy Router** | `site-policy` 包 + Notion 属性读取（`lang`/`visibility`/`comments`）+ 变体矩阵构建 + manifest + middleware + hreflang | 四个变体行为符合 §5–§9 全部规则；`?__region` 模拟验证 |
| **M4 更新链路** | webhook → Deploy Hook；下线废弃 API | Notion 编辑后自动重建生效 |
| **M5 切换** | 独立 Vercel Preview 项目与现网 A/B 对照（Speed Insights / Lighthouse / 关键 URL diff） | FCP/LCP/JS 传输量达标、无 URL 回归后切 `blog.jihuayu.com` |

回滚策略：域名切换前 Next 产线保持可部署；切换后发现问题直接把域名指回原项目。

## 14. 待确认的小决策

1. **en 首页/列表策略**：`en` 变体首页只列出有英文翻译的文章（语义干净，但初期列表较稀疏）；备选：列出全部文章、无翻译的条目直接链接到中文 URL 并加语言角标。当前设计取**前者**。
2. **`lang` 属性命名**：设计为独立 select 属性 `lang`（`zh-CN` / `en`，空 = zh-CN）。如你确实想复用现有 `type` 字段承载语言，请指出，字段读取层可适配。
3. **首页语言重定向**：当前设计仅对 `/` 首访（无 cookie、无显式前缀）按 `Accept-Language` 307 至 `/en/`；如不想要任何自动跳转（只靠页面内切换器），可以关掉。

## 15. 风险与边界

- **IP 地理判断是产品策略，不是安全边界**：VPN/代理会绕过。「不想向大陆读者展示」适用；若将来需求变为「法律上绝对不可访问」，Geo-IP 路由不能作为唯一措施。
- middleware bundle 内含 manifest，文章量增长到数千篇量级时需评估体积（届时可拆为 Edge Config / 精简位图）。
- 变体矩阵使页面数 ×4：构建时间上升，需在 M3 实测（Notion 拉取应只做一次、四变体共享数据）。
- `cleanUrls` / `trailingSlash` 行为需与现网逐 URL 对齐（现有 `vercel.json` 为 `cleanUrls: true, trailingSlash: false`），避免迁移产生 301 链。
