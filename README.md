# design-md-forge

`design-md-forge` 是一个用于从网站视觉证据生成 `DESIGN.md` 的 Codex skill 项目。

它的核心思路是：

1. 用 Playwright 打开目标页面，采集截图、CSS 变量、代表性元素 computed style、页面结构和基础交互文案。
2. 生成统一的 `analysis.json`，作为 LLM/agent 写设计文档的证据输入。
3. 由 agent 根据 `analysis.json` 和生成规则写出面向用户的 `DESIGN.md`。

CLI 不会直接生成最终 `DESIGN.md`，它负责生成可信证据。最终 `DESIGN.md` 由 agent 写在同一个 run 目录下。

## 适用场景

- 从一个产品官网、Web App、文档站或设计参考站提取视觉风格。
- 为后续原型开发生成一份可执行的 `DESIGN.md`。
- 把颜色、排版、间距、圆角、阴影、组件模式整理成 LLM 可消费的结构化输入。
- 在只给出一个 URL 时，先分析单页；如需要多页面覆盖，再补充 2-4 个关键同域 URL。

## 不适用场景

- 登录后页面、需要人工操作的复杂流程、强验证码页面。
- 深度整站 crawl。
- 精准还原完整设计系统或品牌规范。
- 用 Jina/Markdown 内容替代高保真视觉分析。

V1 明确不使用 Firecrawl、AgentKey、Browser Agent、Stagehand、Web UI、MCP 或深度爬取。

## 安装

要求 Node.js 20 或更高版本。

```bash
npm install
npx playwright install chromium
```

## 快速开始

分析一个 URL：

```bash
npm run analyze -- --url "https://example.com"
```

分析多个 URL：

```bash
npm run analyze -- \
  --url "https://example.com" \
  --url "https://example.com/pricing" \
  --url "https://example.com/docs"
```

使用固定 run id，方便复现输出路径：

```bash
npm run analyze -- \
  --url "https://example.com" \
  --run-id "example-home"
```

输出会类似：

```text
analysis.json written to /path/to/design-output/example.com/example-home/analysis.json
DESIGN.md should be written to /path/to/design-output/example.com/example-home/DESIGN.md
```

然后由 agent 读取 `analysis.json`，根据 `references/design-md-generation-rules.md` 写出 `DESIGN.md`。

## CLI 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `--url <url>` | 是 | 要分析的 URL。可以重复传入多个。支持 `https://`、`http://` 和 `file://`。没有协议的输入会按 `https://` 规范化。 |
| `--out-dir <dir>` | 否 | 输出根目录，默认是当前工作目录。 |
| `--run-id <id>` | 否 | 输出 run 目录名，默认按当前时间生成。只能包含字母、数字、点、下划线和连字符，且不能是 `.` 或 `..`。 |
| `--jina` | 否 | 显式启用 Jina Reader fallback。默认关闭。 |
| `--no-jina` | 否 | 保持 Jina Reader 关闭。默认就是关闭。 |

未知参数会直接报错，避免拼写错误导致静默失败。

## 输出结构

默认输出：

```text
design-output/
  <domain>/
    <run-id>/
      analysis.json
      screenshots/
        desktop-<page-slug>-<hash>.png
      DESIGN.md
```

其中：

- `analysis.json` 由 CLI 生成。
- `screenshots/` 由 Playwright 生成。
- `DESIGN.md` 由 agent/LLM 根据 `analysis.json` 生成。

`design-output/` 被 `.gitignore` 忽略，默认不会提交进仓库。

## analysis.json 内容

`analysis.json` 是生成 `DESIGN.md` 的主要证据文件。

顶层字段：

- `target`: 域名、输入 URL、实际分析 URL、采集时间。
- `pages`: 每个页面一份分析结果。
- `aggregate`: 多页面聚合后的 token 和组件模式。
- `warnings`: 运行级警告。

每个页面包含：

- `url`
- `title`
- `viewport`
- `screenshotPath`
- `htmlSummary`
- `tokens`
- `cssVars`
- `computedStyles`
- `components`
- `links`
- `confidence`
- `warnings`
- 可选 `fallbacks.jina`

聚合 confidence 包含：

- `overall`: 页面平均置信度。
- `bestPage`: 最高页面置信度。
- `weakestPage`: 最低页面置信度。
- `pageCount`: 分析页面数。

更详细的 schema 说明见 [references/analysis-schema.md](references/analysis-schema.md)。

## DESIGN.md 生成规则

生成 `DESIGN.md` 时应该遵守：

- 优先使用 Playwright 捕获到的视觉证据。
- 优先写具体观察值，不要过早抽象命名 token。
- 高置信证据可以成为规则。
- 低置信证据只能写成观察或推测。
- 不要凭空发明 dark mode、复杂表单状态、动画系统、图标系统或响应式行为。
- 如果只分析了一个 URL，需要在 `Confidence Notes` 里说明证据范围有限。
- 如果某类组件没有被观察到，不要写详细组件规则。
- 如果截图或 computed styles 失败，不要生成 `DESIGN.md`，应要求补充 URL 或重新采集证据。

每份 `DESIGN.md` 至少包含：

- YAML frontmatter with source URLs and core tokens.
- Visual Theme.
- Color System.
- Typography.
- Layout Principles.
- Components.
- Responsive Behavior.
- Interaction States.
- Do's and Don'ts.
- Confidence Notes.

生成规则见 [references/design-md-generation-rules.md](references/design-md-generation-rules.md)。

## Playwright 视觉采集

Playwright 是主证据来源。它会采集：

- desktop screenshot。
- CSS variables。
- 代表性元素 computed styles。
- heading、landmark、navigation、CTA 文案。
- links。
- button、card、form、nav、hero 等组件候选。

代表性选择器包括：

```text
body, header, nav, main, section, article, footer,
h1, h2, h3, p, a, button, input, textarea, select,
pre, code,
[class*='button'], [class*='card'], [class*='hero'], [class*='grid']
```

Playwright 会对以下情况硬失败：

- 页面主响应 HTTP 状态码大于等于 400。
- `body` 长时间不可见。
- 页面没有有意义的可见内容。
- 检测到 CAPTCHA、人机验证、access denied、403 或明确 login wall。
- 截图文件无效、异常小或疑似空白。

如果普通 screenshot 超时，会尝试 CDP screenshot fallback，并在 warnings 中记录。

## Jina Reader fallback

Jina Reader 默认关闭。只有显式传入 `--jina` 时才会尝试使用。

触发条件：

- `--jina` 已开启。
- URL 不是 `file://`。
- Playwright 捕获到的 headings 少于 2 个。

Jina 只作为语义/文本 fallback，用来补充页面语义、标题和内容结构。它不能覆盖 Playwright 的视觉证据。

安全策略：

- 不发送 `file://` URL。
- 不发送 localhost、private network、link-local、internal、test 域名。
- 阻止 IPv4、IPv6、IPv4-mapped IPv6 的私网/回环地址。
- 发给 Jina 前会移除 username、password、query string 和 hash。

如果 Jina 失败，只记录 warning/error；只要 Playwright 证据可用，整体运行不会因此中断。

## 置信度

单页置信度由以下证据加权：

- 页面文本长度。
- CSS 变量数量。
- representative computed styles 数量。
- 是否有截图。

如果页面有足够视觉证据，会设置最低视觉置信度 floor。

多页面聚合时，`overall` 使用平均值，而不是最高值，避免一个好页面掩盖多个弱页面。

## 失败策略

应该停止生成 `DESIGN.md` 的情况：

- 任一页面 Playwright 捕获失败。
- 页面不可达。
- body 不可见。
- 页面疑似登录墙、验证码或访问阻断。
- 截图空白或无效。

可以继续但需要写入 Confidence Notes 的情况：

- CSS variables 很少。
- computed styles 证据较少。
- 页面偏视觉化，文本较短。
- Jina fallback 失败。
- 只分析了一个 URL。

## 项目结构

```text
.
├── SKILL.md
├── README.md
├── package.json
├── references/
│   ├── analysis-schema.md
│   └── design-md-generation-rules.md
├── scripts/
│   ├── analyze-site.mjs
│   ├── core/
│   │   ├── aggregate.mjs
│   │   ├── confidence.mjs
│   │   ├── paths.mjs
│   │   ├── project.mjs
│   │   ├── schema.mjs
│   │   ├── tokens.mjs
│   │   └── url.mjs
│   └── providers/
│       ├── jina.mjs
│       └── playwright.mjs
└── tests/
    ├── core/
    ├── fixtures/
    ├── integration/
    └── providers/
```

## 脚本说明

```bash
npm run analyze
```

运行网站分析 CLI。

```bash
npm test
```

运行完整 Vitest 测试。

```bash
npm run test:watch
```

以 watch 模式运行测试。

## 测试覆盖

当前测试覆盖：

- URL 规范化。
- 输出路径和 run id 安全校验。
- schema 深拷贝。
- token 提取。
- 聚合逻辑。
- confidence 计算。
- Jina fallback、URL sanitization 和私网阻断策略。
- Playwright screenshot 空白检测。
- Playwright HTTP error、access-blocked、blank screenshot hard failure。
- CLI 集成输出。
- skill 文档关键行为。

运行：

```bash
npm test
```

## .gitignore 策略

仓库会忽略：

- `node_modules/`
- `dist/`
- `coverage/`
- `.cache/`
- `.vite/`
- `design-output/`
- `output/`
- `.worktrees/`
- `test-results/`
- `playwright-report/`
- `blob-report/`
- `.env*`
- macOS/editor 临时文件
- 本地规划文档 `design.md` 和 `docs/superpowers/`

这些通常是依赖、运行产物、测试产物、私密配置或本地规划文件，不应进入版本控制。

## 常见工作流

### 只分析一个页面

```bash
npm run analyze -- --url "https://example.com" --run-id "example-home"
```

然后读取：

```text
design-output/example.com/example-home/analysis.json
```

再写：

```text
design-output/example.com/example-home/DESIGN.md
```

### 分析多页面产品站

```bash
npm run analyze -- \
  --url "https://example.com" \
  --url "https://example.com/pricing" \
  --url "https://example.com/docs" \
  --run-id "example-design"
```

多页面会聚合 token 和组件模式，`aggregate.confidence` 会显示总体、最佳、最弱页面的置信度。

### 显式启用 Jina fallback

```bash
npm run analyze -- \
  --url "https://example.com/docs" \
  --run-id "example-docs" \
  --jina
```

只有在 Playwright headings 较少时才会触发 Jina。Jina 返回内容会写入 `fallbacks.jina`。

## 已知限制

- 目前只使用 desktop viewport。
- 不自动 crawl 或自动发现关键页面。
- 不处理登录态。
- 不执行复杂点击、筛选、分页或多步骤交互。
- 不直接生成最终 `DESIGN.md`，最终文档仍由 agent/LLM 根据证据写入。
- 截图空白检测是轻量级像素采样，适合阻止明显失败截图，不等于完整视觉质量评估。

## 维护建议

- 修改 provider 行为后，优先补 `tests/providers/`。
- 修改 schema 或聚合输出后，同步更新 `references/analysis-schema.md`。
- 修改 skill 使用方式后，同步更新 `SKILL.md` 和本 README。
- 增加新 provider 时，保持输出归一到当前 `analysis.json` schema。
- 不要把 runtime output、规划文档、截图或本地依赖提交到仓库。
