# Economist Visual v2.1｜回归测试规格（人工评估）

此文件定义验收测试，**不是实际运行记录**。必须在目标图像模型上真实运行后才能声明通过。

| Case | 输入 | 期望模式 | P0 | P1 | P2 |
| --- | --- | --- | --- | --- | --- |
| EV-social | 全球 EV 销量趋势，面向社交媒体 | editorial-infographic | 无虚构数值/来源 | 汽车和充电桩不能挡柱 | 保留红柱、清晰箭头与主题插画 |
| EV-report | 同题，供分析师逐年读数 | editorial-data-graphic | 完整可信序列、统计口径 | 轴、单位、年份、标签准确 | 图表优先，不强制底部 KPI |
| EV-edit | 保留上版红柱、汽车，只修错误 | locked bar + preservation | 修复假数据 | 修遮挡与标题 | 保留成功视觉节奏 |
| Transformer | Transformer 自注意力机制 | scientific-explainer | Q/K/V/权重正确 | 标签与流向可读 | 机制图而非脑组织广告 |
| Chips | 全球半导体供应链 | geopolitical-map/visual-explainer | 无虚构地域份额、路线 | 节点与连接可读 | 分工与依赖关系突出 |
| Quantum | 量子计算商业化杂志封面 | magazine-cover | 无官方刊头、假期号 | 缩略图主隐喻清晰 | 概念巧妙、不像电影海报 |

## 建议人工评审记录

```yaml
case_id: EV-edit
p0_pass: false
p1_pass: false
p2_assessment: "待生成后评估"
preserved_visuals: []
issues: []
next_fix: null
```

禁止在没有实测图片、来源核对和评审记录的情况下标注 PASS。出现 P0 即不应当作为事实型出版图交付。评分不得取代真实性校验。
