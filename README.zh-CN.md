# design-md-forge

[English](README.md) | [中文](README.zh-CN.md)

`design-md-forge` 是一个 Codex skill，用于根据网站视觉证据生成 `DESIGN.md` 设计说明。

CLI 负责生成可信的 `analysis.json` 和截图。当 agent 正在使用这个 skill 时，分析成功后必须继续读取生成的 `analysis.json`，并在同一个 run 目录下写出参考版 `DESIGN.md`。

CLI 本身不会直接写 `DESIGN.md`。skill 工作流要求 agent 自动完成这个后续步骤。

## Agent 安装提示

需要让 coding agent 安装并使用这个 skill 时，可以复制下面这段提示：

```text
Install the skill: `github.com/conanxyz/design-md-forge`

Scope the work to this skill only. After install, read the skill's metadata and help me finish setup based only on what you can verify from that page — don't invent missing requirements. When analysis succeeds, automatically read the generated analysis.json and create a reference DESIGN.md in the same run directory. Ask before making any broader environment changes.
```

## 功能

- 使用 Playwright 捕获网站视觉风格。
- 提取 CSS 变量、computed styles、截图、标题、导航文案、CTA 文案、链接和组件候选。
- 把证据归一化为 `analysis.json`。
- 可显式启用 Jina Reader 作为公共 HTTP(S) 页面的文本 fallback。
- 让 agent 在分析成功后自动把证据整理成参考版 `DESIGN.md`。

## 适用场景

- 产品官网。
- 有公开页面的 Web App。
- 文档站。
- 设计参考页。
- 为 MVP 或原型生成设计说明。
- 在前端开发前提取视觉方向。

## 不适用场景

- 只登录后可见的页面。
- CAPTCHA 或访问受阻页面。
- 深度整站 crawl。
- 多步骤浏览器操作。
- 像素级复刻完整设计系统。
- 用 Markdown-only 抓取替代视觉证据。

V1 不使用 Firecrawl、AgentKey、Browser Agent、Stagehand、Web UI、MCP 或深度爬取。

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

采集所有支持的 viewport：

```bash
npm run analyze -- \
  --url "https://example.com" \
  --viewport all
```

显式自动选择浅层关键同域页面：

```bash
npm run analyze -- \
  --url "https://example.com" \
  --auto-pages \
  --max-pages 4
```

使用固定 run id：

```bash
npm run analyze -- \
  --url "https://example.com" \
  --run-id "example-home"
```

输出示例：

```text
analysis.json written to /path/to/design-output/example.com/example-home/analysis.json
next skill step: read analysis.json and write reference DESIGN.md to /path/to/design-output/example.com/example-home/DESIGN.md
```

当这个 skill 驱动任务时，agent 不应停在这里。它应该自动读取生成的 `analysis.json`，并按 [references/design-md-generation-rules.md](references/design-md-generation-rules.md) 在同一个 run 目录写出 `DESIGN.md`。

## CLI 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `--url <url>` | 是 | 要分析的 URL。可重复传入多个。支持 `https://`、`http://`、`file://`。无协议 URL 会按 `https://` 规范化。 |
| `--out-dir <dir>` | 否 | 输出根目录，默认当前工作目录。 |
| `--run-id <id>` | 否 | 稳定输出目录名，默认按时间生成。必须是单个安全路径片段，不能是 `.` 或 `..`。 |
| `--viewport <name>` | 否 | 要采集的 viewport preset。使用 `all` 可对每个分析 URL 采集所有支持的 viewport。 |
| `--auto-pages` | 否 | 从一个输入 URL 显式自动选择 2-4 个浅层关键同域页面。这是关键页发现，不是 crawl。 |
| `--max-pages <count>` | 否 | 启用 `--auto-pages` 时最多分析的总页面数，包含起始 URL。 |
| `--jina` | 否 | 显式启用 Jina Reader fallback。默认关闭。 |
| `--no-jina` | 否 | 保持 Jina Reader 关闭。默认就是关闭。 |

未知参数会直接报错，避免拼写错误被静默忽略。

## 输出结构

```text
design-output/
  <domain>/
    <run-id>/
      analysis.json
      screenshots/
        desktop-<page-slug>-<hash>.png
      DESIGN.md
```

- `analysis.json`: CLI 生成。
- `screenshots/`: Playwright 生成。
- `DESIGN.md`: skill 分析成功后，由 agent/LLM 自动根据 `analysis.json` 写入。

`design-output/` 已被 Git 忽略。

## analysis.json

`analysis.json` 是生成 `DESIGN.md` 的证据来源。

顶层字段：

- `target`: 域名、输入 URL、实际分析 URL、采集时间。
- `pages`: 每个 URL/viewport 采集结果一份分析结果。
- `aggregate`: 去重后的 tokens、组件模式和置信度摘要。
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

`aggregate.confidence` 包含：

- `overall`: 页面平均置信度。
- `bestPage`: 最高页面置信度。
- `weakestPage`: 最低页面置信度。
- `pageCount`: 分析页面数。

详见 [references/analysis-schema.md](references/analysis-schema.md)。

## DESIGN.md 生成规则

生成 `DESIGN.md` 时，agent 应该：

- 优先使用 Playwright 捕获的视觉证据。
- 优先写具体值，再抽象命名 token。
- 高置信证据可以写成规则。
- 低置信证据只能写成观察或弱推断。
- 不要凭空发明 dark mode、复杂表单状态、动画系统、图标系统或响应式行为。
- 如果只分析了一个 URL，在 `Confidence Notes` 中说明证据范围有限。
- 不要为未观察到的组件写详细规则。
- 如果截图或 computed styles 失败，停止并要求补充证据。

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

详见 [references/design-md-generation-rules.md](references/design-md-generation-rules.md)。

## Playwright 采集

Playwright 是主要视觉证据来源。

它会采集：

- 桌面截图。
- CSS 变量。
- 代表性元素 computed styles。
- headings、landmarks、navigation labels、CTA labels。
- links。
- button、card、form、nav、hero 组件候选。

Playwright 在以下情况硬失败：

- 主文档 HTTP 状态码大于等于 400。
- `body` 长时间不可见。
- 页面没有有意义的可见内容。
- 检测到 CAPTCHA、人机验证、access denied、403 或明确 login wall。
- 截图无效、异常小或疑似空白。

如果普通截图超时，会尝试 CDP screenshot fallback，并记录 warning。

## Jina Reader fallback

Jina Reader 默认关闭。只有显式传入 `--jina` 才会运行。

触发条件：

- `--jina` 已启用。
- URL 不是 `file://`。
- Playwright 捕获到的 headings 少于 2 个。

Jina 只作为语义/文本 fallback，用来补充页面含义、标题和内容结构，不能覆盖 Playwright 视觉证据。

安全策略：

- 不发送 `file://` URL。
- 阻止 localhost、private network、link-local、internal、test hostnames。
- 阻止私有 IPv4、IPv6、IPv4-mapped IPv6 地址。
- 发送给 Jina 前移除 username、password、query string 和 hash。

Jina 失败只记录 warnings/errors。只要 Playwright 证据可用，运行不会因此中断。

## 失败策略

以下情况停止生成 `DESIGN.md`：

- 任一页面 Playwright 捕获失败。
- 页面不可达。
- body 不可见。
- 页面疑似登录墙、验证码或访问受阻。
- 截图空白或无效。

以下情况可以继续，但需要在 `Confidence Notes` 中说明：

- CSS 变量很少。
- computed styles 证据较薄。
- 页面文本较短，因为页面偏视觉化。
- 显式 Jina fallback 失败。
- 只分析了一个 URL。

## 项目结构

```text
.
├── SKILL.md
├── README.md
├── README.zh-CN.md
├── package.json
├── references/
├── scripts/
│   ├── analyze-site.mjs
│   ├── core/
│   └── providers/
└── tests/
```

## 常用命令

```bash
npm run analyze -- --url "https://example.com"
npm test
npm run test:watch
```

## 测试覆盖

测试覆盖 URL 规范化、输出路径安全、schema 拷贝、token 提取、聚合、confidence、Jina URL 安全策略、Playwright 截图和硬失败路径、CLI 集成输出，以及 skill 文档关键行为。

## .gitignore 策略

仓库忽略本地产物和私有文件，包括：

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
- `design.md`
- `docs/superpowers/`

不要提交运行输出、截图、本地规划文档或本地依赖。

## 已知限制

- 不处理登录态。
- 不执行任意复杂点击、筛选、分页或多步骤交互。
- 关键页发现需要显式开启，并且是浅层选择，不是 crawler。
- 最终 `DESIGN.md` 在 CLI 成功后由 agent/LLM 写入，而不是 CLI 自己写入。
- 截图校验是启发式像素分析，不是完整视觉质量评估。

## 维护建议

- provider 行为变化时，更新 `tests/providers/`。
- schema 或聚合输出变化时，更新 [references/analysis-schema.md](references/analysis-schema.md)。
- skill 使用方式变化时，同步更新 `SKILL.md`、`README.md` 和 `README.zh-CN.md`。
- 新 provider 也应归一到当前 `analysis.json` 结构。
- 不要提交 runtime output、截图、本地规划文档或本地依赖。
