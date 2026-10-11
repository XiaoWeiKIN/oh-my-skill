# Economist Visual Skill — v2.1

## 安装

将此目录复制为 `skills/economist-visual/`，保留 `SKILL.md`、`references/`、`examples/`、`agents/` 的相对路径。与原仓库同名文件可以直接替换；新增文件随包一起复制。

## 设计方向

- 传播型信息图（Editorial Infographic）：鲜明的逐年柱形、局部红色强调、主题插画和简短驱动因素。
- 数据优先图（Editorial Data Graphic）：图表和直接标注优先，减少无关装饰，画面数据零遮挡。
- 图型保留：已有有效设计不因为极简化而被删除；改图前建立保留清单。
- 事实安全：真实统计图只使用可追溯的数值；缺来源就转「概念示意」而不填补臆测数据。

## 验证提示

- 这是图像模型的设计与验收规约，不能保证自动统计计算、地图绘制、OCR 或数学准确。
- `tests/regression-cases.md` 是待运行的回归测试清单，不代表已测试通过。
- 完整改动参考 `CHANGELOG.md`。
