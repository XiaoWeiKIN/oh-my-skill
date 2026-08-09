# oh-my-skill

个人 Codex skills 的唯一源码仓库。每个 skill 位于 `skills/<skill-name>/`；已安装目录和其他项目中的副本都视为部署产物。

## Skills

- `llm-wiki-maintainer`：把 Obsidian vault 维护为可持续编译、可追溯和可巡检的 LLM Wiki。

## 校验与安装

```bash
# 比较仓库源码与默认 Codex 安装目录
python3 scripts/sync_skill.py check llm-wiki-maintainer

# 安装或更新到 ~/.codex/skills
python3 scripts/sync_skill.py install llm-wiki-maintainer --force

# 安装到指定的 skill 根目录
python3 scripts/sync_skill.py install llm-wiki-maintainer \
  --dest-root "/path/to/project/skills" --force
```

`install` 先复制到临时目录，再替换目标副本。`check` 对所有受管文件计算 SHA-256，发现缺失、多余或内容漂移时返回非零状态。
