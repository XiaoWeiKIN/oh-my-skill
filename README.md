# oh-my-skill

个人 Codex Skills 的源码仓库。每个 Skill 存放在 `skills/<skill-name>/`，可以让具备 GitHub 访问和文件操作能力的 Codex Agent **直接通过自然语言提示词安装**，无需手工执行安装脚本。

## Skills

| Skill | 用途 |
| --- | --- |
| [`llm-wiki-maintainer`](skills/llm-wiki-maintainer/SKILL.md) | 将 Obsidian vault 维护为可持续编译、可追溯、可巡检的 LLM Wiki。 |
| [`economist-visual`](skills/economist-visual/SKILL.md) | 用中文生图提示词生成 Economist-inspired 编辑插画、封面感图片、经济与科学科普解释图；使用 Agent 的生图模型，不依赖绘图库。 |

## 安装：直接把提示词发给 Codex

在具有仓库访问权限和文件操作能力的 **Codex** 会话中，复制下面任意一段话发送给 Agent。它应当**实际执行安装并报告结果**，而不是仅返回命令或安装教程。

### 安装整个仓库中的 Skills

```text
请帮我安装 GitHub 仓库中的所有 Codex Skills：
https://github.com/XiaoWeiKIN/oh-my-skill

请直接执行，不要只给我 shell / Python 命令：

1. 读取仓库的 skills/ 目录，识别所有含 SKILL.md 的 Skill。
2. 找到当前 Codex 环境实际使用的 Skills 安装目录；优先遵循当前环境的配置（如 CODEX_HOME），不要猜测工作目录。
3. 将每个 Skill 的完整目录安装进去，保留 SKILL.md、references/、agents/ 和其他必要文件，不要仅复制 SKILL.md。
4. 如果已存在同名 Skill，先比较内容；需要覆盖本地修改时先征求我的确认。不要修改无关文件。
5. 检查每个 Skill 的 SKILL.md、引用文件和目录结构，并确认已安装到可供 Codex 发现的位置。
6. 告诉我安装了哪些 Skill、实际安装路径、验证结果，以及是否需要开启新会话才能使用。

如果当前环境没有仓库访问或写入权限，请明确说明阻碍，不要声称安装成功。
```

### 只安装一个 Skill

例如安装 `economist-visual`：

```text
请从 https://github.com/XiaoWeiKIN/oh-my-skill
安装 skills/economist-visual 这个 Codex Skill。

请直接读取仓库文件，将 economist-visual 的完整目录安装到当前 Codex 环境使用的 Skills 目录，保留 SKILL.md、references/、agents/ 与示例文件。

若已安装，请先检查差异；需要覆盖本地修改时先征求我的确认。安装完成后检查文件完整性，报告实际安装路径和能否被当前 Codex 环境发现。

请直接完成操作，不要只提供命令或教程。若没有所需权限，请如实说明。
```

要安装其他 Skill，只需把提示词中的 `economist-visual` 换成上表对应的目录名。

## 使用示例

安装 `economist-visual` 后，可以向 Codex 发送：

> 使用 `$economist-visual`，生成一张 Economist 风格的中文科普图，解释为什么 AI 推理成本下降可能导致算力需求增长。直接生图，避免虚构统计数据。

## 适用范围

上述提示词适用于**能读取 GitHub 并写入 Skills 目录的 Agent 环境**。它不会仅凭发送文字就让普通 ChatGPT 对话永久安装本地 Codex Skill；在不支持自定义 Skill 安装的 ChatGPT 账户中，可以提供 Skill 文件作为当前对话的参考，但这不等同于安装。
