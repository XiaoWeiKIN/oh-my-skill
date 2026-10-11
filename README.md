# oh-my-skill

个人 Codex skills 的唯一源码仓库。每个 skill 位于 `skills/<skill-name>/`；已安装目录和其他项目中的副本都视为部署产物。

## Skills

- `llm-wiki-maintainer`：把 Obsidian vault 维护为可持续编译、可追溯和可巡检的 LLM Wiki。
- `economist-visual`：使用**中文生图提示词**，将科技、经济和科普主题转译为 Economist-inspired 的原创编辑插画、封面感图片、科学机制图与解释型信息图。只依赖 Agent 可用的生图模型，不要求绘图库。详见 [SKILL.md](skills/economist-visual/SKILL.md)。

## 校验与安装

```bash
# 比较仓库源码与默认 Codex 安装目录
python3 scripts/sync_skill.py check llm-wiki-maintainer
python3 scripts/sync_skill.py check economist-visual

# 安装或更新到 ~/.codex/skills
python3 scripts/sync_skill.py install llm-wiki-maintainer --force
python3 scripts/sync_skill.py install economist-visual --force

# 安装到指定的 skill 根目录
python3 scripts/sync_skill.py install economist-visual \
  --dest-root "/path/to/project/skills" --force
```

`install` 先复制到临时目录，再替换目标副本。`check` 对所有受管文件计算 SHA-256，发现缺失、多余或内容漂移时返回非零状态。
