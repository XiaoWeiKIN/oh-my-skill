# 示例｜Transformer Attention

用户请求：解释 Transformer 的 Attention 机制。

- 类型：`scientific-explainer`。
- 论点：每个 token 的查询与相关 token 的键计算匹配，再用权重汇总值向量以生成上下文化表示。
- 主结构：Token → 向量 → Q/K/V → 相关性/归一化 → 加权值 → 新表示。
- 标题：「模型如何分配注意力」。
- 标签：输入 Token、Q/K/V、注意力权重、加权求和、输出表示。
- 事实边界：默认解释单头自注意力的简化计算；完整 Transformer 还有残差、归一化和前馈网络，不能暗示其已被一图完整覆盖。
- 重点检查：Q/K/V 的符号、箭头方向、权重语义正确；不把注意力机制画成人脑。
