# oh-my-skill

可复用的 **Agent Skills** 源码仓库，适用于支持 `SKILL.md` 技能机制的 AI Agent，例如 **Claude Code、Cursor、OpenAI Codex**。每个 Skill 的源码位于 `skills/<skill-name>/`。

**安装方式：将下面的中文提示词直接发给你正在使用的 Agent，由它自行读取仓库、识别运行环境并完成安装。** 无需手工执行安装脚本。

## Skills

| Skill | 用途 |
| --- | --- |
| [`llm-wiki-maintainer`](skills/llm-wiki-maintainer/SKILL.md) | 将 Obsidian vault 维护为可持续编译、可追溯、可巡检的 LLM Wiki。 |
| [`economist-visual`](skills/economist-visual/SKILL.md) | 使用中文提示词生成 Economist-inspired 原创编辑插画、封面感图片、科技和经济科普解释图。需要运行环境提供生图能力。 |
| [`macos-disk-cleanup`](skills/macos-disk-cleanup/SKILL.md) | 排查 macOS 磁盘占用，按授权清理缓存和旧环境，保留指定数据并核验实际释放空间。 |

## 一句话安装

复制下面的提示词，发送给 **Claude Code / Cursor / Codex 或其他支持 Agent Skills 的 Agent**：

```text
请从 https://github.com/XiaoWeiKIN/oh-my-skill 安装所有适用于当前环境的 Agent Skills。

先识别你当前运行的 Agent、Skills 支持情况、实际安装目录和所需的技能格式。
阅读仓库 skills/ 下的 SKILL.md 及其引用文件，检查内容后，将每个兼容 Skill 的完整目录安装到当前 Agent 可发现的位置。
保留 references/、examples/、assets/ 等必要文件；平台专属元数据只在适用时使用，不要照搬另一平台的配置。
如存在同名 Skill，先比较差异；涉及覆盖用户修改或影响其他文件时先征求确认。
完成后验证安装文件和 Skill 发现情况，报告每个 Skill 的安装路径、状态，以及重启或新会话是否必要。

请直接执行安装，不要只回复命令或教程。如果当前环境不支持 Skills，或者缺少访问 GitHub、写入文件的权限，请明确说明限制，不要声称安装成功。
```

## 只安装一个 Skill

例如只安装 `economist-visual`：

```text
请从 https://github.com/XiaoWeiKIN/oh-my-skill
安装 skills/economist-visual。

请识别当前 Agent（Claude Code、Cursor、Codex 或其他）的 Skills 机制与安装位置，阅读 Skill 内容并执行安装。复制完整目录，包括 SKILL.md、references/ 和 examples/；仅在适用时使用平台专属文件。
如果已有同名 Skill，请比较差异并在覆盖本地修改之前征求我的确认。
安装后验证文件完整性、Skill 是否可被当前 Agent 发现，并告诉我实际安装路径。

请直接执行，不要只给我安装命令。如果缺少权限或当前平台不支持，请如实说明。
```

安装其他 Skill 时，将 `skills/economist-visual` 替换为上表中对应的路径即可。

## 平台兼容性

下表仅提供常见的**用户级**目录示例。实际应由安装 Agent 依据自身配置选择；也可根据项目需要安装到项目级 Skills 目录。

| Agent | 常见用户级目录 | 常见项目级目录 |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Cursor | `~/.cursor/skills/` 或 `~/.agents/skills/` | `.cursor/skills/` 或 `.agents/skills/` |
| OpenAI Codex | `~/.codex/skills/`（受 `CODEX_HOME` 等配置影响） | 按当前 Codex 环境支持的目录与配置 |

安装时保留标准的 `SKILL.md` 及引用文件。仓库中的 `agents/openai.yaml` 属于特定平台的可选元数据，不应被视为其他平台的必要配置。

## 使用示例

安装后，向支持生图工具的 Agent 发送：

> 使用 economist-visual，生成一张《经济学人》风格的中文科普图，解释为什么 AI 推理成本下降可能导致算力需求增长。直接生成图片，不要虚构统计数据。

Skill 负责指导设计和生图流程，**不负责为 Claude Code、Cursor 等 Agent 自动提供图像生成模型**；运行环境必须已有相应的生图工具，否则 Agent 应说明限制。

## 使用前须知

- 安装需要 Agent 具备读取 GitHub 和写入目标 Skills 目录的权限；单纯发送提示词不保证能完成安装。
- 请审阅远程 Skill 内容，再授权安装；不应无提示地覆盖本地已有技能。
- ChatGPT 的普通聊天界面与本地 Claude Code、Cursor、Codex 是不同运行环境，不能把对话中的提示词视作已经永久安装。
