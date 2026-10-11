# 视觉路由 v2.1｜先看沟通目的，再选视觉模式

优先判断「希望读者理解什么」和「作品用于哪里」，避免凭主题关键词机械匹配。选一种主图型，最多引入一种次级视觉语言。

| 读者任务 | 图型 | 必读文档 |
| --- | --- | --- |
| 抽象悖论/制度冲突/社会影响 | editorial-illustration | editorial-illustration.md |
| 需要封面式强表达 | magazine-cover | magazine-cover.md |
| 解释步骤、流程与路径 | visual-explainer | visual-explainer.md |
| 成本、激励、需求、反馈 | economic-diagram | economic-diagram.md |
| AI、芯片、能源等技术原理 | scientific-explainer | scientific-explainer.md |
| 实证走势、类别对比、趋势数据 | data-infographic | data-infographic.md + 二选一子模式 |
| 区域分布、贸易与供应链流向 | geopolitical-map | geopolitical-map.md |

## 数据图必须再决定呈现模式

### A. Editorial Infographic（传播优先）
适用于社交传播、专题头图、科普配图：允许「主图表 + 上升方向标记 + 主题物体 + 简洁驱动因素/要点」。信息层次相对丰富，但主图表的数据必须完整可读。读 `editorial-infographic.md`。

### B. Editorial Data Graphic（数据阅读优先）
适用于报告、新闻正文、读者需要看具体年份和尺度：以柱、线、点及清晰标注为绝对主体。主题插画可作为边缘识别符，不可侵入绘图区。读 `editorial-data-graphic.md`。

用户指定模式则优先遵守；不指定时：希望一眼看懂并传播，选 A；要求数据比较、逐年读数或正式报告，选 B。混合用途时明确主次，不要求两种模式同时最大化。

## 顺序

1. 用户明确指定图型或希望保留原图图型：优先遵守。
2. 任务依赖可靠数值？进入数据模式并走 Evidence Gate；资料不足则转概念示意（**不能留下带刻度的伪数据图**）。
3. 依赖真实位置/边界？先确认依据，再选择地图或明确标注的拓扑关系示意。
4. 依赖结构准确性？科学机制图。
5. 依赖成本、激励或反馈？经济机制图。
6. 依赖阶段和流程？视觉解释图。
7. 开放观点则编辑插画；封面要求优先封面。

## 回归样例

- “2010—2025 年全球 EV 销量，做一张传播性头图” → editorial-infographic，优先保留逐年柱形与适量主题插画；缺少数据不造数字。
- “同一主题，供分析师阅读，每年值都要准确” → editorial-data-graphic；若无可验证完整数据，应先获取数据或转交确定性绘图流程。
- “优化我喜欢的红色柱状图” → 锁定柱状图，优先修遮挡、文字、数据口径，而非转换为面积图。
- “Transformer Attention” → scientific-explainer，简化 token/QKV 的关系。
- “半导体供应链地理依赖” → geopolitical-map；地理不准确时仅拓扑示意。
- “量子计算商业化封面” → magazine-cover；单一隐喻，无真实刊头/虚构页码。
