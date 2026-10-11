---
name: economist-visual
description: 使用图像生成模型创作 Economist-inspired 原创编辑视觉图；适用于杂志封面、编辑插画、科技科普、经济机制、数据型信息图与数据新闻配图、产业地理。自动区分 Editorial Infographic（传播优先）和 Editorial Data Graphic（数据阅读优先）；支持基于参考图的保留式优化，执行事实准入与视觉验收。
---

# Economist Visual v2.1｜编辑型生图 Skill

## 目标与边界

将议题变成**原创、可解释、有编辑判断的视觉论点**。默认通过当前环境的图像生成工具交付图片；不是《The Economist》的官方图形规范，不使用未经授权的刊头、Logo、真实期号，也不复制既有封面。

**设计原则：Visual richness is not visual clutter.** 简洁不等于删除一切；保留能够帮助理解的主题物体、图形节奏、适量趋势标注与编辑隐喻。任何装饰不能遮挡数据、篡改比例或冒充证据。

这是 image-first Skill：可制作原创编辑图、概念图、以核实数据为依据的图表插画；**不能保证像素级数字、坐标、地图的精确性**。需要出版级可审计图表时，先要求可信数据并建议使用独立的确定性绘图流程，不要假装图像模型能替代统计渲染器。用户明确仅要 prompt 才只返回 prompt。

## 必执行的 9 步

1. **理解意图**：确定主题、用途（文章配图/社交传播/研究报告/杂志封面）、目标读者、语言、画幅、用户提供的数据、参考图与限制。未指定则简体中文、横向 16:9、受教育的非专业读者；封面竖向 3:4。
2. **编辑判断**：写出内部一句话 `visual_argument`（读者看图后应理解什么），分清事实、推论、隐喻。拒绝额外编造事实。
3. **先看现有作品**：如为改图或优化，先读 `references/edit-preservation.md`，提取「必须保留 / 需要修复 / 不可新增」，在改善准确性之前不随意改变图型、主色与有效的构图。
4. **选图型与用途模式**：读 `references/visual-router.md`。数据主题必须选 `editorial-infographic` 或 `editorial-data-graphic` 的用途模式，再读 `references/data-infographic.md`（兼容入口）和对应模块；其他主题按类型加载。
5. **事实准入**：对所有具体数值、年份、统计份额、科学公式、地理路线与来源，读 `references/evidence-gate.md` 并建立内部 Evidence Manifest。事实不足则明确标注「概念示意」，**不要画虚构的坐标轴/柱高/年份/市场份额**。
6. **组装指令**：读 `references/global-style.md`、对应类型文档及 `references/prompt-template.md`；约束图中**只出现批准的文字和数值**；明确绘图区不能被插画遮挡。
7. **实际生成**：调用可用的图像生成工具；改图优先定向编辑，别每次从零重新生成。工具不可用时直说，不宣称已出图。
8. **两道验收关**：按 `references/quality-checklist.md` 先做 P0（事实/品牌/科学）检查，再做 P1（遮挡/刻度/排版）及 P2（美学）检查；不允许为了更极简牺牲编辑表现力。发现错误进行有目标的修复，并复检。
9. **交付**：交付实际图片（若生成成功）；必要时标注概念图性质、来源缺失或精度限制。不要声称机器自行完成了无法验证的事实校对。

## 视觉路由与加载索引

| 目的 | 主文件 |
| --- | --- |
| 主题隐喻 | `references/editorial-illustration.md` |
| 杂志封面 | `references/magazine-cover.md` |
| 科学原理 | `references/scientific-explainer.md` |
| 系统流程 | `references/visual-explainer.md` |
| 经济因果 | `references/economic-diagram.md` |
| 地理依赖 | `references/geopolitical-map.md` |
| 传播性数据叙事（信息更丰富） | `references/editorial-infographic.md` |
| 数据优先的编辑图表（更克制） | `references/editorial-data-graphic.md` |

必读：`references/visual-router.md`、`references/global-style.md`、`references/prompt-template.md`、`references/quality-checklist.md`；含定量或事实地图时必读 `references/evidence-gate.md`；改图时必读 `references/edit-preservation.md`。`references/data-infographic.md` 为旧入口兼容指引。

## 关键不可违背规则

- **图表区是禁遮挡区域**：汽车、机器人、设备等主题插画应置于图表外侧或不遮挡任何数据条、趋势线、坐标轴、刻度、标签、图例；必要时缩小插画而不是缩小字体。
- **不强制极简**：标题、趋势强调、主题插画、次要事实面板可以共存，但各自必须承担不同信息功能。不得以「更简单」为唯一改进理由。
- **不得默默改图型**：用户喜欢的柱形序列不可无理由改为面积图；如果改动，必须有更强的比较/阅读依据。
- **数据可信 > 视觉精致**：未验证的数据不能标记为实测，过去发行的资料不能自动用作之后年份的实测来源；明确统计口径（如 BEV、PHEV、市场范围）。
- **单图一个主论点**：多面板可用，但不应靠小字堆砌意义。
- **文字白名单**：不得额外杜撰书名、日期、页码、来源、百分数和装饰性英文。

## 完成标准

主题与论点一眼可读；视觉呈现符合所选模式；事实边界清楚；重要文字与数据不被遮挡；没有冒充官方出版物的元素；没有因「优化」导致视觉表达力无理由退化。
