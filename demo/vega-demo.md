# Vega/Vega-Lite 图表完整演示

[返回主测试文档](./test.md)

本文档包含 Vega 和 Vega-Lite 图表的完整演示，涵盖各种图表类型和高级特性。

- **Vega-Lite**: 高级声明式语法，适合快速创建常见图表
- **Vega**: 底层语法，支持更复杂的可视化和交互

---

## 1. 柱状图

### 1.1 简单柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data.",
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55},
      {"category": "C", "value": 43},
      {"category": "D", "value": 91},
      {"category": "E", "value": 81},
      {"category": "F", "value": 53},
      {"category": "G", "value": 19},
      {"category": "H", "value": 87}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

### 1.2 水平柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A horizontal bar chart.",
  "data": {
    "values": [
      {"category": "Alpha", "value": 28},
      {"category": "Beta", "value": 55},
      {"category": "Gamma", "value": 43},
      {"category": "Delta", "value": 91},
      {"category": "Epsilon", "value": 81}
    ]
  },
  "mark": "bar",
  "encoding": {
    "y": {"field": "category", "type": "nominal", "sort": "-x"},
    "x": {"field": "value", "type": "quantitative"}
  }
}
```

### 1.3 堆叠柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A stacked bar chart.",
  "data": {
    "values": [
      {"category": "A", "group": "x", "value": 10},
      {"category": "A", "group": "y", "value": 20},
      {"category": "A", "group": "z", "value": 15},
      {"category": "B", "group": "x", "value": 15},
      {"category": "B", "group": "y", "value": 25},
      {"category": "B", "group": "z", "value": 10},
      {"category": "C", "group": "x", "value": 20},
      {"category": "C", "group": "y", "value": 15},
      {"category": "C", "group": "z", "value": 25}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "group", "type": "nominal"}
  }
}
```

### 1.4 分组柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A grouped bar chart.",
  "data": {
    "values": [
      {"category": "A", "group": "x", "value": 28},
      {"category": "A", "group": "y", "value": 55},
      {"category": "B", "group": "x", "value": 43},
      {"category": "B", "group": "y", "value": 91},
      {"category": "C", "group": "x", "value": 81},
      {"category": "C", "group": "y", "value": 53}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "group", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "group", "type": "nominal"},
    "xOffset": {"field": "category"}
  }
}
```

---

## 2. 散点图

### 2.1 基础散点图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A scatterplot showing horsepower and miles per gallon.",
  "data": {
    "values": [
      {"x": 10, "y": 20},
      {"x": 20, "y": 40},
      {"x": 30, "y": 25},
      {"x": 40, "y": 50},
      {"x": 50, "y": 45},
      {"x": 60, "y": 60}
    ]
  },
  "mark": "point",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"},
    "size": {"value": 100},
    "color": {"value": "steelblue"}
  }
}
```

### 2.2 带趋势线的散点图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Scatter plot with a trend line.",
  "data": {
    "values": [
      {"x": 10, "y": 22},
      {"x": 20, "y": 38},
      {"x": 30, "y": 31},
      {"x": 40, "y": 52},
      {"x": 50, "y": 48},
      {"x": 60, "y": 65},
      {"x": 70, "y": 59},
      {"x": 80, "y": 78}
    ]
  },
  "layer": [
    {
      "mark": "point",
      "encoding": {
        "x": {"field": "x", "type": "quantitative"},
        "y": {"field": "y", "type": "quantitative"}
      }
    },
    {
      "mark": {
        "type": "line",
        "color": "firebrick"
      },
      "transform": [
        {
          "regression": "y",
          "on": "x"
        }
      ],
      "encoding": {
        "x": {"field": "x", "type": "quantitative"},
        "y": {"field": "y", "type": "quantitative"}
      }
    }
  ]
}
```

---

## 3. 折线图

### 3.1 基础折线图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple line chart.",
  "data": {
    "values": [
      {"month": "Jan", "sales": 100},
      {"month": "Feb", "sales": 150},
      {"month": "Mar", "sales": 120},
      {"month": "Apr", "sales": 180},
      {"month": "May", "sales": 200},
      {"month": "Jun", "sales": 170}
    ]
  },
  "mark": {
    "type": "line",
    "point": true
  },
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "sales", "type": "quantitative"}
  }
}
```

### 3.2 多系列折线图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Multi-series line chart.",
  "data": {
    "values": [
      {"month": 1, "series": "A", "value": 28},
      {"month": 2, "series": "A", "value": 55},
      {"month": 3, "series": "A", "value": 43},
      {"month": 4, "series": "A", "value": 91},
      {"month": 1, "series": "B", "value": 35},
      {"month": 2, "series": "B", "value": 48},
      {"month": 3, "series": "B", "value": 52},
      {"month": 4, "series": "B", "value": 63}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "series", "type": "nominal"}
  }
}
```

### 3.3 折线丢失 bug

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "图测试",
  "width": 400,
  "height": 250,
  "data": {
    "values": [
      {
        "title": "上周",
        "value": 222,
        "type": "故障1"
      },
      {
        "title": "上周",
        "value": 26,
        "type": "故障2"
      },
      {
        "title": "上周",
        "value": 171,
        "type": "故障3"
      },
      {
        "title": "本周",
        "value": 333,
        "type": "故障1"
      },
      {
        "title": "本周",
        "value": 31,
        "type": "故障2"
      },
      {
        "title": "本周",
        "value": 189,
        "type": "故障3"
      }
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {
      "field": "title",
      "type": "nominal",
      "title": "时间",
      "axis": {
        "labelAngle": -20
      }
    },
    "y": {
      "field": "value",
      "type": "quantitative",
      "title": "故障1"
    },
    "color": {
      "field": "type",
      "type": "nominal",
      "scale": {
        "domain": [
          "故障1",
          "故障2",
          "故障3"
        ],
        "range": [
          "#4CAF50",
          "#F44336",
          "#d40306"
        ]
      },
      "title": "类型"
    },
    "xOffset": {
      "field": "type"
    }
  }
}
```
---

## 4. 饼图和甜甜圈图

### 4.1 饼图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple pie chart.",
  "data": {
    "values": [
      {"category": "A", "value": 4},
      {"category": "B", "value": 6},
      {"category": "C", "value": 10},
      {"category": "D", "value": 3},
      {"category": "E", "value": 7}
    ]
  },
  "mark": "arc",
  "encoding": {
    "theta": {"field": "value", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal"}
  },
  "view": {"stroke": null}
}
```

### 4.2 甜甜圈图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A donut chart.",
  "data": {
    "values": [
      {"category": "A", "value": 30},
      {"category": "B", "value": 45},
      {"category": "C", "value": 25}
    ]
  },
  "mark": {"type": "arc", "innerRadius": 50},
  "encoding": {
    "theta": {"field": "value", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal"}
  }
}
```

---

## 5. 面积图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "An area chart.",
  "data": {
    "values": [
      {"x": 1, "y": 10},
      {"x": 2, "y": 30},
      {"x": 3, "y": 20},
      {"x": 4, "y": 45},
      {"x": 5, "y": 35},
      {"x": 6, "y": 50}
    ]
  },
  "mark": "area",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"}
  }
}
```

---

## 6. 热力图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple heatmap.",
  "data": {
    "values": [
      {"x": "A", "y": "1", "value": 10},
      {"x": "A", "y": "2", "value": 20},
      {"x": "A", "y": "3", "value": 15},
      {"x": "B", "y": "1", "value": 25},
      {"x": "B", "y": "2", "value": 30},
      {"x": "B", "y": "3", "value": 18},
      {"x": "C", "y": "1", "value": 12},
      {"x": "C", "y": "2", "value": 22},
      {"x": "C", "y": "3", "value": 28}
    ]
  },
  "mark": "rect",
  "encoding": {
    "x": {"field": "x", "type": "nominal"},
    "y": {"field": "y", "type": "nominal"},
    "color": {"field": "value", "type": "quantitative"}
  }
}
```

---

## 7. 箱线图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A box plot.",
  "data": {
    "values": [
      {"group": "A", "value": 12},
      {"group": "A", "value": 23},
      {"group": "A", "value": 15},
      {"group": "A", "value": 28},
      {"group": "A", "value": 19},
      {"group": "A", "value": 35},
      {"group": "B", "value": 18},
      {"group": "B", "value": 25},
      {"group": "B", "value": 22},
      {"group": "B", "value": 31},
      {"group": "B", "value": 27},
      {"group": "B", "value": 40}
    ]
  },
  "mark": "boxplot",
  "encoding": {
    "x": {"field": "group", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

---

## 8. 直方图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A histogram showing distribution.",
  "data": {
    "values": [
      {"value": 12}, {"value": 15}, {"value": 18}, {"value": 22},
      {"value": 25}, {"value": 28}, {"value": 31}, {"value": 35},
      {"value": 38}, {"value": 42}, {"value": 45}, {"value": 48},
      {"value": 52}, {"value": 55}, {"value": 58}, {"value": 62},
      {"value": 65}, {"value": 68}, {"value": 72}, {"value": 75}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "bin": {"maxbins": 10},
      "field": "value",
      "type": "quantitative"
    },
    "y": {
      "aggregate": "count",
      "type": "quantitative"
    }
  }
}
```

---

## 9. 中文数据可视化示例

### 9.1 产品销售分析柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "2024年第三季度各地区智能手机销售额统计",
    "fontSize": 18,
    "anchor": "middle"
  },
  "description": "展示不同地区的产品销售情况",
  "data": {
    "values": [
      {"地区": "华北地区", "销售额": 285000, "产品类别": "旗舰机型"},
      {"地区": "华东地区", "销售额": 456000, "产品类别": "旗舰机型"},
      {"地区": "华南地区", "销售额": 398000, "产品类别": "旗舰机型"},
      {"地区": "西南地区", "销售额": 267000, "产品类别": "旗舰机型"},
      {"地区": "东北地区", "销售额": 189000, "产品类别": "旗舰机型"},
      {"地区": "西北地区", "销售额": 145000, "产品类别": "旗舰机型"},
      {"地区": "华北地区", "销售额": 156000, "产品类别": "中端机型"},
      {"地区": "华东地区", "销售额": 245000, "产品类别": "中端机型"},
      {"地区": "华南地区", "销售额": 218000, "产品类别": "中端机型"},
      {"地区": "西南地区", "销售额": 134000, "产品类别": "中端机型"},
      {"地区": "东北地区", "销售额": 98000, "产品类别": "中端机型"},
      {"地区": "西北地区", "销售额": 76000, "产品类别": "中端机型"}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "地区",
      "type": "nominal",
      "axis": {
        "labelAngle": -45,
        "labelFontSize": 12,
        "title": "销售地区",
        "titleFontSize": 14
      }
    },
    "y": {
      "field": "销售额",
      "type": "quantitative",
      "axis": {
        "labelFontSize": 11,
        "title": "销售额（人民币/元）",
        "titleFontSize": 14
      }
    },
    "color": {
      "field": "产品类别",
      "type": "nominal",
      "scale": {
        "domain": ["旗舰机型", "中端机型"],
        "range": ["#3b82f6", "#10b981"]
      },
      "legend": {
        "title": "产品类别",
        "titleFontSize": 13,
        "labelFontSize": 11
      }
    },
    "xOffset": {"field": "产品类别"}
  },
  "width": 600,
  "height": 350
}
```

### 9.2 教育数据多系列折线图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "各学科平均成绩趋势分析（2020-2024学年）",
    "fontSize": 18
  },
  "description": "学生学科成绩变化趋势",
  "data": {
    "values": [
      {"学年": "2020学年", "学科": "语文", "平均分": 78.5},
      {"学年": "2021学年", "学科": "语文", "平均分": 81.2},
      {"学年": "2022学年", "学科": "语文", "平均分": 83.8},
      {"学年": "2023学年", "学科": "语文", "平均分": 85.3},
      {"学年": "2024学年", "学科": "语文", "平均分": 87.1},
      {"学年": "2020学年", "学科": "数学", "平均分": 82.3},
      {"学年": "2021学年", "学科": "数学", "平均分": 84.7},
      {"学年": "2022学年", "学科": "数学", "平均分": 86.2},
      {"学年": "2023学年", "学科": "数学", "平均分": 88.5},
      {"学年": "2024学年", "学科": "数学", "平均分": 90.2},
      {"学年": "2020学年", "学科": "英语", "平均分": 75.8},
      {"学年": "2021学年", "学科": "英语", "平均分": 77.9},
      {"学年": "2022学年", "学科": "英语", "平均分": 80.4},
      {"学年": "2023学年", "学科": "英语", "平均分": 82.6},
      {"学年": "2024学年", "学科": "英语", "平均分": 84.8},
      {"学年": "2020学年", "学科": "物理", "平均分": 71.2},
      {"学年": "2021学年", "学科": "物理", "平均分": 73.5},
      {"学年": "2022学年", "学科": "物理", "平均分": 76.1},
      {"学年": "2023学年", "学科": "物理", "平均分": 78.9},
      {"学年": "2024学年", "学科": "物理", "平均分": 81.3},
      {"学年": "2020学年", "学科": "化学", "平均分": 73.6},
      {"学年": "2021学年", "学科": "化学", "平均分": 75.8},
      {"学年": "2022学年", "学科": "化学", "平均分": 78.2},
      {"学年": "2023学年", "学科": "化学", "平均分": 80.7},
      {"学年": "2024学年", "学科": "化学", "平均分": 83.1}
    ]
  },
  "mark": {
    "type": "line",
    "point": true
  },
  "encoding": {
    "x": {
      "field": "学年",
      "type": "ordinal",
      "axis": {
        "labelAngle": -30,
        "labelFontSize": 11,
        "title": "学年",
        "titleFontSize": 14
      }
    },
    "y": {
      "field": "平均分",
      "type": "quantitative",
      "scale": {"domain": [65, 95]},
      "axis": {
        "labelFontSize": 11,
        "title": "平均分数",
        "titleFontSize": 14
      }
    },
    "color": {
      "field": "学科",
      "type": "nominal",
      "scale": {
        "domain": ["语文", "数学", "英语", "物理", "化学"],
        "range": ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]
      },
      "legend": {
        "title": "学科类别",
        "titleFontSize": 13,
        "labelFontSize": 11
      }
    }
  },
  "width": 600,
  "height": 350
}
```

### 9.3 城市人口分布饼图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "中国主要城市群人口分布情况（2024年统计数据）",
    "fontSize": 18
  },
  "description": "展示不同城市群的人口占比",
  "data": {
    "values": [
      {"城市群": "京津冀城市群", "人口": 11200, "备注": "包括北京、天津、河北等地区"},
      {"城市群": "长三角城市群", "人口": 23500, "备注": "包括上海、江苏、浙江等地区"},
      {"城市群": "珠三角城市群", "人口": 8600, "备注": "包括广州、深圳等地区"},
      {"城市群": "成渝城市群", "人口": 9700, "备注": "包括成都、重庆等地区"},
      {"城市群": "长江中游城市群", "人口": 12800, "备注": "包括武汉、长沙、南昌等地区"},
      {"城市群": "中原城市群", "人口": 16700, "备注": "包括郑州等中原地区"},
      {"城市群": "关中平原城市群", "人口": 5400, "备注": "包括西安等地区"},
      {"城市群": "其他地区", "人口": 32100, "备注": "其他省市地区"}
    ]
  },
  "mark": {"type": "arc", "innerRadius": 60, "tooltip": true},
  "encoding": {
    "theta": {
      "field": "人口",
      "type": "quantitative"
    },
    "color": {
      "field": "城市群",
      "type": "nominal",
      "scale": {
        "domain": [
          "京津冀城市群",
          "长三角城市群",
          "珠三角城市群",
          "成渝城市群",
          "长江中游城市群",
          "中原城市群",
          "关中平原城市群",
          "其他地区"
        ],
        "range": [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#06b6d4",
          "#ec4899",
          "#94a3b8"
        ]
      },
      "legend": {
        "title": "城市群名称",
        "titleFontSize": 13,
        "labelFontSize": 11,
        "orient": "right"
      }
    },
    "tooltip": [
      {"field": "城市群", "type": "nominal", "title": "城市群"},
      {"field": "人口", "type": "quantitative", "title": "人口（万人）"},
      {"field": "备注", "type": "nominal", "title": "说明"}
    ]
  },
  "view": {"stroke": null},
  "width": 400,
  "height": 400
}
```

### 9.4 企业员工部门分布堆叠柱状图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "科技公司各部门员工学历分布统计",
    "fontSize": 18
  },
  "description": "展示不同部门员工的学历构成",
  "data": {
    "values": [
      {"部门": "技术研发部", "学历": "博士", "人数": 45},
      {"部门": "技术研发部", "学历": "硕士", "人数": 156},
      {"部门": "技术研发部", "学历": "本科", "人数": 234},
      {"部门": "技术研发部", "学历": "专科", "人数": 32},
      {"部门": "产品设计部", "学历": "博士", "人数": 12},
      {"部门": "产品设计部", "学历": "硕士", "人数": 67},
      {"部门": "产品设计部", "学历": "本科", "人数": 98},
      {"部门": "产品设计部", "学历": "专科", "人数": 23},
      {"部门": "市场营销部", "学历": "博士", "人数": 5},
      {"部门": "市场营销部", "学历": "硕士", "人数": 43},
      {"部门": "市场营销部", "学历": "本科", "人数": 87},
      {"部门": "市场营销部", "学历": "专科", "人数": 34},
      {"部门": "人力资源部", "学历": "博士", "人数": 3},
      {"部门": "人力资源部", "学历": "硕士", "人数": 28},
      {"部门": "人力资源部", "学历": "本科", "人数": 52},
      {"部门": "人力资源部", "学历": "专科", "人数": 18},
      {"部门": "财务管理部", "学历": "博士", "人数": 2},
      {"部门": "财务管理部", "学历": "硕士", "人数": 35},
      {"部门": "财务管理部", "学历": "本科", "人数": 48},
      {"部门": "财务管理部", "学历": "专科", "人数": 15}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "部门",
      "type": "nominal",
      "axis": {
        "labelAngle": -45,
        "labelFontSize": 11,
        "title": "部门名称",
        "titleFontSize": 14
      }
    },
    "y": {
      "field": "人数",
      "type": "quantitative",
      "axis": {
        "labelFontSize": 11,
        "title": "员工人数",
        "titleFontSize": 14
      }
    },
    "color": {
      "field": "学历",
      "type": "nominal",
      "scale": {
        "domain": ["博士", "硕士", "本科", "专科"],
        "range": ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"]
      },
      "legend": {
        "title": "学历类别",
        "titleFontSize": 13,
        "labelFontSize": 11
      }
    }
  },
  "width": 500,
  "height": 350
}
```

### 9.5 气温变化面积图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "北京市2024年全年气温变化趋势（月度统计）",
    "fontSize": 18
  },
  "description": "展示全年气温变化情况",
  "data": {
    "values": [
      {"月份": "1月", "最高温": 5, "平均温": -2, "最低温": -8, "季节": "冬季"},
      {"月份": "2月", "最高温": 8, "平均温": 1, "最低温": -5, "季节": "冬季"},
      {"月份": "3月", "最高温": 15, "平均温": 8, "最低温": 2, "季节": "春季"},
      {"月份": "4月", "最高温": 22, "平均温": 15, "最低温": 9, "季节": "春季"},
      {"月份": "5月", "最高温": 28, "平均温": 21, "最低温": 15, "季节": "春季"},
      {"月份": "6月", "最高温": 32, "平均温": 26, "最低温": 20, "季节": "夏季"},
      {"月份": "7月", "最高温": 34, "平均温": 28, "最低温": 23, "季节": "夏季"},
      {"月份": "8月", "最高温": 33, "平均温": 27, "最低温": 22, "季节": "夏季"},
      {"月份": "9月", "最高温": 28, "平均温": 22, "最低温": 16, "季节": "秋季"},
      {"月份": "10月", "最高温": 21, "平均温": 14, "最低温": 8, "季节": "秋季"},
      {"月份": "11月", "最高温": 12, "平均温": 5, "最低温": -1, "季节": "秋季"},
      {"月份": "12月", "最高温": 6, "平均温": -1, "最低温": -7, "季节": "冬季"}
    ]
  },
  "mark": {"type": "area", "line": true, "point": true},
  "encoding": {
    "x": {
      "field": "月份",
      "type": "ordinal",
      "axis": {
        "labelAngle": 0,
        "labelFontSize": 11,
        "title": "月份",
        "titleFontSize": 14
      }
    },
    "y": {
      "field": "平均温",
      "type": "quantitative",
      "axis": {
        "labelFontSize": 11,
        "title": "平均温度（摄氏度）",
        "titleFontSize": 14
      }
    },
    "color": {"value": "#3b82f6"},
    "opacity": {"value": 0.6}
  },
  "width": 600,
  "height": 300
}
```

---

## 10. 双轴图 (Dual-Axis Chart)

在同一图表中展示两个不同量纲或数量级的指标，便于观察两者之间的关联关系。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "销售额与增长率双轴图",
  "width": 600,
  "height": 350,
  "data": {
    "values": [
      {"quarter": "Q1", "revenue": 100, "growth": 12},
      {"quarter": "Q2", "revenue": 135, "growth": 35},
      {"quarter": "Q3", "revenue": 170, "growth": 26},
      {"quarter": "Q4", "revenue": 210, "growth": 24},
      {"quarter": "Q5", "revenue": 250, "growth": 19},
      {"quarter": "Q6", "revenue": 285, "growth": 14},
      {"quarter": "Q7", "revenue": 310, "growth": 9},
      {"quarter": "Q8", "revenue": 330, "growth": 6}
    ]
  },
  "encoding": {
    "x": {
      "field": "quarter",
      "type": "ordinal",
      "axis": {"title": "季度"}
    }
  },
  "layer": [
    {
      "mark": {
        "type": "area",
        "opacity": 0.3,
        "color": "#4c78a8"
      },
      "encoding": {
        "y": {
          "field": "revenue",
          "type": "quantitative",
          "axis": {
            "title": "销售额（万元）",
            "titleColor": "#4c78a8"
          }
        }
      }
    },
    {
      "mark": {
        "type": "line",
        "strokeWidth": 3,
        "color": "#4c78a8"
      },
      "encoding": {
        "y": {
          "field": "revenue",
          "type": "quantitative"
        }
      }
    },
    {
      "mark": {
        "type": "line",
        "strokeWidth": 2,
        "color": "#e45756",
        "strokeDash": [5, 5]
      },
      "encoding": {
        "y": {
          "field": "growth",
          "type": "quantitative",
          "axis": {
            "title": "增长率（%）",
            "titleColor": "#e45756",
            "orient": "right"
          }
        }
      }
    },
    {
      "mark": {
        "type": "point",
        "filled": true,
        "size": 100,
        "color": "#e45756"
      },
      "encoding": {
        "y": {
          "field": "growth",
          "type": "quantitative"
        }
      }
    }
  ],
  "resolve": {
    "scale": {
      "y": "independent"
    }
  }
}
```

---

## 11. 流图 (Streamgraph)

展示多个数据系列随时间的变化趋势，围绕中轴线对称分布，强调整体流动感。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "编程语言流行度演变",
    "fontSize": 16
  },
  "width": 600,
  "height": 350,
  "data": {
    "values": [
      {"year": 2018, "language": "Python", "popularity": 28},
      {"year": 2018, "language": "JavaScript", "popularity": 35},
      {"year": 2018, "language": "Java", "popularity": 32},
      {"year": 2018, "language": "Go", "popularity": 12},
      {"year": 2018, "language": "Rust", "popularity": 5},
      {"year": 2019, "language": "Python", "popularity": 32},
      {"year": 2019, "language": "JavaScript", "popularity": 36},
      {"year": 2019, "language": "Java", "popularity": 30},
      {"year": 2019, "language": "Go", "popularity": 15},
      {"year": 2019, "language": "Rust", "popularity": 7},
      {"year": 2020, "language": "Python", "popularity": 38},
      {"year": 2020, "language": "JavaScript", "popularity": 37},
      {"year": 2020, "language": "Java", "popularity": 28},
      {"year": 2020, "language": "Go", "popularity": 18},
      {"year": 2020, "language": "Rust", "popularity": 10},
      {"year": 2021, "language": "Python", "popularity": 42},
      {"year": 2021, "language": "JavaScript", "popularity": 38},
      {"year": 2021, "language": "Java", "popularity": 25},
      {"year": 2021, "language": "Go", "popularity": 22},
      {"year": 2021, "language": "Rust", "popularity": 13},
      {"year": 2022, "language": "Python", "popularity": 48},
      {"year": 2022, "language": "JavaScript", "popularity": 39},
      {"year": 2022, "language": "Java", "popularity": 22},
      {"year": 2022, "language": "Go", "popularity": 25},
      {"year": 2022, "language": "Rust", "popularity": 16},
      {"year": 2023, "language": "Python", "popularity": 52},
      {"year": 2023, "language": "JavaScript", "popularity": 40},
      {"year": 2023, "language": "Java", "popularity": 20},
      {"year": 2023, "language": "Go", "popularity": 28},
      {"year": 2023, "language": "Rust", "popularity": 20},
      {"year": 2024, "language": "Python", "popularity": 55},
      {"year": 2024, "language": "JavaScript", "popularity": 41},
      {"year": 2024, "language": "Java", "popularity": 18},
      {"year": 2024, "language": "Go", "popularity": 30},
      {"year": 2024, "language": "Rust", "popularity": 24}
    ]
  },
  "mark": "area",
  "encoding": {
    "x": {
      "field": "year",
      "type": "ordinal",
      "title": "年份",
      "axis": {"labelAngle": 0}
    },
    "y": {
      "field": "popularity",
      "type": "quantitative",
      "title": "流行度指数",
      "stack": "center",
      "axis": null
    },
    "color": {
      "field": "language",
      "type": "nominal",
      "title": "编程语言",
      "scale": {
        "domain": ["Python", "JavaScript", "Java", "Go", "Rust"],
        "range": ["#3776AB", "#F7DF1E", "#007396", "#00ADD8", "#CE422B"]
      }
    }
  }
}
```

---

## 12. 范围点图 (Ranged Dot Plot)

通过点和连线展示数据的变化范围和前后对比，直观显示改进效果。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "系统优化前后性能对比",
    "fontSize": 16
  },
  "width": 400,
  "height": 280,
  "data": {
    "values": [
      {"metric": "启动时间(s)", "before": 8.5, "after": 3.2},
      {"metric": "内存占用(MB)", "before": 450, "after": 280},
      {"metric": "响应时间(ms)", "before": 120, "after": 45},
      {"metric": "CPU使用率(%)", "before": 65, "after": 38},
      {"metric": "错误率(%)", "before": 2.1, "after": 0.3}
    ]
  },
  "encoding": {
    "y": {
      "field": "metric",
      "type": "nominal",
      "title": "性能指标",
      "axis": {"labelAngle": 0}
    }
  },
  "layer": [
    {
      "mark": "rule",
      "encoding": {
        "x": {"field": "before", "type": "quantitative", "title": "数值"},
        "x2": {"field": "after"},
        "color": {
          "condition": {
            "test": "datum.before > datum.after",
            "value": "#2ca02c"
          },
          "value": "#d62728"
        }
      }
    },
    {
      "mark": {"type": "point", "filled": true, "size": 100},
      "encoding": {
        "x": {"field": "before", "type": "quantitative"},
        "color": {"value": "#1f77b4"}
      }
    },
    {
      "mark": {"type": "point", "filled": true, "size": 100},
      "encoding": {
        "x": {"field": "after", "type": "quantitative"},
        "color": {"value": "#ff7f0e"}
      }
    }
  ]
}
```

---

## 13. K线图 (Candlestick Chart)

展示开盘、收盘、最高、最低四个维度的数据，适合项目进度、性能指标等场景。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "服务器每日性能指标",
  "width": 500,
  "height": 280,
  "data": {
    "values": [
      {"date": "周一", "low": 72, "open": 78, "close": 85, "high": 92},
      {"date": "周二", "low": 80, "open": 85, "close": 82, "high": 90},
      {"date": "周三", "low": 75, "open": 82, "close": 88, "high": 95},
      {"date": "周四", "low": 82, "open": 88, "close": 86, "high": 93},
      {"date": "周五", "low": 78, "open": 86, "close": 91, "high": 97},
      {"date": "周六", "low": 85, "open": 91, "close": 89, "high": 96},
      {"date": "周日", "low": 80, "open": 89, "close": 94, "high": 98}
    ]
  },
  "encoding": {
    "x": {
      "field": "date",
      "type": "ordinal",
      "title": null,
      "axis": {"labelFontSize": 12}
    },
    "y": {
      "type": "quantitative",
      "scale": {"domain": [65, 100]},
      "axis": {"title": "性能得分", "grid": true}
    },
    "color": {
      "condition": {
        "test": "datum.open < datum.close",
        "value": "#2ca02c"
      },
      "value": "#d62728"
    }
  },
  "layer": [
    {
      "mark": {"type": "rule", "strokeWidth": 1.5},
      "encoding": {
        "y": {"field": "low"},
        "y2": {"field": "high"}
      }
    },
    {
      "mark": {"type": "bar", "width": 18},
      "encoding": {
        "y": {"field": "open"},
        "y2": {"field": "close"}
      }
    }
  ]
}
```

---

## 14. 瀑布图 (Waterfall Chart)

展示数值的累计变化过程，通过浮动柱形显示每个阶段的增减情况。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": {
    "text": "月度利润变化瀑布图",
    "fontSize": 16
  },
  "data": {
    "values": [
      {"label": "期初余额", "amount": 10000, "type": "start"},
      {"label": "销售收入", "amount": 8000, "type": "increase"},
      {"label": "成本支出", "amount": -4500, "type": "decrease"},
      {"label": "运营费用", "amount": -2000, "type": "decrease"},
      {"label": "营销费用", "amount": -1500, "type": "decrease"},
      {"label": "期末余额", "amount": 10000, "type": "end"}
    ]
  },
  "transform": [
    {"window": [{"op": "sum", "field": "amount", "as": "sum"}]},
    {"window": [{"op": "lead", "field": "label", "as": "lead"}]},
    {
      "calculate": "datum.lead === null ? datum.label : datum.lead",
      "as": "lead"
    },
    {
      "calculate": "datum.type === 'end' ? 0 : datum.sum - datum.amount",
      "as": "previous_sum"
    },
    {
      "calculate": "datum.type === 'end' ? datum.sum : datum.sum",
      "as": "amount_end"
    },
    {
      "calculate": "datum.type === 'start' || datum.type === 'end' ? 0 : datum.amount",
      "as": "calc_amount"
    },
    {
      "calculate": "(datum.type === 'start' || datum.type === 'end' ? datum.sum : datum.calc_amount) > 0 ? '增加' : '减少'",
      "as": "direction"
    }
  ],
  "encoding": {
    "x": {
      "field": "label",
      "type": "ordinal",
      "sort": null,
      "axis": {"title": "项目", "labelAngle": -30}
    }
  },
  "layer": [
    {
      "mark": {"type": "bar", "size": 45},
      "encoding": {
        "y": {
          "field": "previous_sum",
          "type": "quantitative",
          "title": "金额（元）"
        },
        "y2": {"field": "sum"},
        "color": {
          "field": "direction",
          "type": "nominal",
          "scale": {
            "domain": ["增加", "减少"],
            "range": ["#2e7d32", "#c62828"]
          },
          "legend": {"title": "变化方向"}
        }
      }
    },
    {
      "mark": {
        "type": "rule",
        "color": "#999",
        "opacity": 0.5,
        "strokeWidth": 2,
        "xOffset": -22.5,
        "x2Offset": 22.5
      },
      "encoding": {
        "x2": {"field": "lead"},
        "y": {"field": "sum", "type": "quantitative"}
      }
    }
  ],
  "width": 500,
  "height": 300
}
```

---

## 15. 子弹图 (Bullet Chart)

紧凑地展示实际值与目标值的对比，适合 KPI 仪表板和目标达成情况展示。

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "月度业务指标完成情况",
  "data": {
    "values": [
      {"title": "销售额", "ranges": [500, 800, 1000], "measures": [600, 850], "markers": [900]},
      {"title": "利润率", "ranges": [10, 15, 20], "measures": [12, 16], "markers": [18]},
      {"title": "客户增长", "ranges": [100, 200, 300], "measures": [150, 220], "markers": [250]},
      {"title": "转化率", "ranges": [2, 3.5, 5], "measures": [2.8, 4.2], "markers": [4.5]}
    ]
  },
  "facet": {
    "row": {
      "field": "title",
      "type": "ordinal",
      "header": {
        "labelAngle": 0,
        "title": "",
        "labelAlign": "left"
      }
    }
  },
  "spacing": 10,
  "spec": {
    "encoding": {
      "x": {
        "type": "quantitative",
        "scale": {"nice": false},
        "title": null
      }
    },
    "layer": [
      {
        "mark": {"type": "bar", "color": "#fce8e6"},
        "encoding": {"x": {"field": "ranges[2]"}}
      },
      {
        "mark": {"type": "bar", "color": "#f7c9c3"},
        "encoding": {"x": {"field": "ranges[1]"}}
      },
      {
        "mark": {"type": "bar", "color": "#f2aaa1"},
        "encoding": {"x": {"field": "ranges[0]"}}
      },
      {
        "mark": {"type": "bar", "color": "#ffb366", "size": 10},
        "encoding": {"x": {"field": "measures[1]"}}
      },
      {
        "mark": {"type": "bar", "color": "#e67e22", "size": 10},
        "encoding": {"x": {"field": "measures[0]"}}
      },
      {
        "mark": {"type": "tick", "color": "#c0392b"},
        "encoding": {"x": {"field": "markers[0]"}}
      }
    ]
  },
  "resolve": {"scale": {"x": "independent"}},
  "config": {"tick": {"thickness": 2}}
}
```

---

# Vega 原版图表

以下图表使用 Vega（非 Vega-Lite）语法，支持更复杂的可视化效果。

---

## 16. 雷达图 (Radar Chart)

多维度对比分析，同时展示多个指标的表现，适合产品对比、能力评估。

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "description": "产品能力雷达图对比",
  "width": 400,
  "height": 400,
  "padding": 40,
  "autosize": {"type": "none", "contains": "padding"},

  "signals": [
    {"name": "radius", "update": "width / 2"}
  ],

  "data": [
    {
      "name": "table",
      "values": [
        {"维度": "性能", "分数": 85, "产品": "产品A"},
        {"维度": "易用性", "分数": 72, "产品": "产品A"},
        {"维度": "稳定性", "分数": 90, "产品": "产品A"},
        {"维度": "扩展性", "分数": 65, "产品": "产品A"},
        {"维度": "安全性", "分数": 88, "产品": "产品A"},
        {"维度": "成本", "分数": 60, "产品": "产品A"},
        
        {"维度": "性能", "分数": 70, "产品": "产品B"},
        {"维度": "易用性", "分数": 88, "产品": "产品B"},
        {"维度": "稳定性", "分数": 75, "产品": "产品B"},
        {"维度": "扩展性", "分数": 82, "产品": "产品B"},
        {"维度": "安全性", "分数": 68, "产品": "产品B"},
        {"维度": "成本", "分数": 85, "产品": "产品B"}
      ]
    },
    {
      "name": "keys",
      "source": "table",
      "transform": [
        {"type": "aggregate", "groupby": ["维度"]}
      ]
    }
  ],

  "scales": [
    {
      "name": "angular",
      "type": "point",
      "range": {"signal": "[-PI, PI]"},
      "padding": 0.5,
      "domain": {"data": "table", "field": "维度"}
    },
    {
      "name": "radial",
      "type": "linear",
      "range": {"signal": "[0, radius]"},
      "zero": true,
      "nice": false,
      "domain": [0, 100],
      "domainMin": 0
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "table", "field": "产品"},
      "range": ["#3b82f6", "#f59e0b"]
    }
  ],

  "encode": {
    "enter": {
      "x": {"signal": "radius"},
      "y": {"signal": "radius"}
    }
  },

  "marks": [
    {
      "type": "group",
      "name": "categories",
      "zindex": 1,
      "from": {
        "facet": {"data": "table", "name": "facet", "groupby": ["产品"]}
      },
      "marks": [
        {
          "type": "line",
          "name": "category-line",
          "from": {"data": "facet"},
          "encode": {
            "enter": {
              "interpolate": {"value": "linear-closed"},
              "x": {"signal": "scale('radial', datum.分数) * cos(scale('angular', datum.维度))"},
              "y": {"signal": "scale('radial', datum.分数) * sin(scale('angular', datum.维度))"},
              "stroke": {"scale": "color", "field": "产品"},
              "strokeWidth": {"value": 2},
              "fill": {"scale": "color", "field": "产品"},
              "fillOpacity": {"value": 0.1}
            }
          }
        },
        {
          "type": "symbol",
          "name": "category-point",
          "from": {"data": "facet"},
          "encode": {
            "enter": {
              "x": {"signal": "scale('radial', datum.分数) * cos(scale('angular', datum.维度))"},
              "y": {"signal": "scale('radial', datum.分数) * sin(scale('angular', datum.维度))"},
              "fill": {"scale": "color", "field": "产品"},
              "size": {"value": 50}
            }
          }
        }
      ]
    },
    {
      "type": "rule",
      "name": "radial-grid",
      "from": {"data": "keys"},
      "zindex": 0,
      "encode": {
        "enter": {
          "x": {"value": 0},
          "y": {"value": 0},
          "x2": {"signal": "radius * cos(scale('angular', datum.维度))"},
          "y2": {"signal": "radius * sin(scale('angular', datum.维度))"},
          "stroke": {"value": "lightgray"},
          "strokeWidth": {"value": 1}
        }
      }
    },
    {
      "type": "text",
      "name": "key-label",
      "from": {"data": "keys"},
      "zindex": 1,
      "encode": {
        "enter": {
          "x": {"signal": "(radius + 15) * cos(scale('angular', datum.维度))"},
          "y": {"signal": "(radius + 15) * sin(scale('angular', datum.维度))"},
          "text": {"field": "维度"},
          "align": [
            {"test": "abs(scale('angular', datum.维度)) > PI / 2", "value": "right"},
            {"value": "left"}
          ],
          "baseline": [
            {"test": "scale('angular', datum.维度) > 0", "value": "top"},
            {"test": "scale('angular', datum.维度) == 0", "value": "middle"},
            {"value": "bottom"}
          ],
          "fill": {"value": "black"},
          "fontWeight": {"value": "bold"}
        }
      }
    },
    {
      "type": "line",
      "name": "outer-line",
      "from": {"data": "radial-grid"},
      "encode": {
        "enter": {
          "interpolate": {"value": "linear-closed"},
          "x": {"field": "x2"},
          "y": {"field": "y2"},
          "stroke": {"value": "lightgray"},
          "strokeWidth": {"value": 1}
        }
      }
    }
  ]
}
```

---

## 17. 树形布局 (Tree Layout)

展示层级结构的节点-链接图，适合组织架构、文件目录、分类体系。

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "description": "组织架构层级树形图",
  "width": 600,
  "height": 500,
  "padding": 5,

  "data": [
    {
      "name": "tree",
      "values": [
        {"id": "ceo", "parent": null, "name": "CEO"},
        
        {"id": "cto", "parent": "ceo", "name": "CTO"},
        {"id": "cto.backend", "parent": "cto", "name": "后端团队"},
        {"id": "cto.backend.api", "parent": "cto.backend", "name": "API开发"},
        {"id": "cto.backend.db", "parent": "cto.backend", "name": "数据库"},
        {"id": "cto.frontend", "parent": "cto", "name": "前端团队"},
        {"id": "cto.frontend.web", "parent": "cto.frontend", "name": "Web开发"},
        {"id": "cto.frontend.mobile", "parent": "cto.frontend", "name": "移动端"},
        {"id": "cto.qa", "parent": "cto", "name": "测试团队"},
        
        {"id": "cpo", "parent": "ceo", "name": "CPO"},
        {"id": "cpo.product", "parent": "cpo", "name": "产品经理"},
        {"id": "cpo.design", "parent": "cpo", "name": "设计团队"},
        {"id": "cpo.ux", "parent": "cpo.design", "name": "UX设计"},
        {"id": "cpo.ui", "parent": "cpo.design", "name": "UI设计"},
        
        {"id": "coo", "parent": "ceo", "name": "COO"},
        {"id": "coo.sales", "parent": "coo", "name": "销售部"},
        {"id": "coo.marketing", "parent": "coo", "name": "市场部"},
        {"id": "coo.support", "parent": "coo", "name": "客服部"}
      ],
      "transform": [
        {
          "type": "stratify",
          "key": "id",
          "parentKey": "parent"
        },
        {
          "type": "tree",
          "method": "tidy",
          "size": [{"signal": "height"}, {"signal": "width - 100"}],
          "as": ["y", "x", "depth", "children"]
        }
      ]
    },
    {
      "name": "links",
      "source": "tree",
      "transform": [
        { "type": "treelinks" },
        {
          "type": "linkpath",
          "orient": "horizontal",
          "shape": "diagonal"
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "color",
      "type": "linear",
      "range": {"scheme": "blues"},
      "domain": {"data": "tree", "field": "depth"},
      "zero": true
    }
  ],

  "marks": [
    {
      "type": "path",
      "from": {"data": "links"},
      "encode": {
        "update": {
          "path": {"field": "path"},
          "stroke": {"value": "#ccc"},
          "strokeWidth": {"value": 1.5}
        }
      }
    },
    {
      "type": "symbol",
      "from": {"data": "tree"},
      "encode": {
        "enter": {
          "size": {"value": 150},
          "stroke": {"value": "#fff"},
          "strokeWidth": {"value": 1.5}
        },
        "update": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "fill": {"scale": "color", "field": "depth"}
        }
      }
    },
    {
      "type": "text",
      "from": {"data": "tree"},
      "encode": {
        "enter": {
          "text": {"field": "name"},
          "fontSize": {"value": 10},
          "baseline": {"value": "middle"},
          "fontWeight": {"value": "bold"}
        },
        "update": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "dx": {"signal": "datum.children ? -10 : 10"},
          "align": {"signal": "datum.children ? 'right' : 'left'"}
        }
      }
    }
  ]
}
```

---

## 18. Force-Directed 力导向图 (Vega)

力导向图用于展示网络关系，节点根据相互作用力自动布局。

### 社交网络图

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "社交网络力导向图",
  "width": 500,
  "height": 400,
  "padding": 0,
  "autosize": "none",

  "signals": [
    {"name": "cx", "update": "width / 2"},
    {"name": "cy", "update": "height / 2"},
    {"name": "nodeRadius", "value": 15},
    {"name": "nodeCharge", "value": -200},
    {"name": "linkDistance", "value": 120}
  ],

  "data": [
    {
      "name": "nodes",
      "values": [
        {"id": 0, "name": "张三", "group": 1},
        {"id": 1, "name": "李四", "group": 1},
        {"id": 2, "name": "王五", "group": 2},
        {"id": 3, "name": "赵六", "group": 2},
        {"id": 4, "name": "钱七", "group": 3},
        {"id": 5, "name": "孙八", "group": 3},
        {"id": 6, "name": "周九", "group": 1},
        {"id": 7, "name": "吴十", "group": 2}
      ]
    },
    {
      "name": "links",
      "values": [
        {"source": 0, "target": 1},
        {"source": 0, "target": 2},
        {"source": 1, "target": 3},
        {"source": 2, "target": 3},
        {"source": 2, "target": 4},
        {"source": 3, "target": 5},
        {"source": 4, "target": 5},
        {"source": 4, "target": 6},
        {"source": 5, "target": 7},
        {"source": 6, "target": 7},
        {"source": 0, "target": 6},
        {"source": 1, "target": 7}
      ]
    }
  ],

  "scales": [
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "nodes", "field": "group"},
      "range": {"scheme": "category10"}
    }
  ],

  "marks": [
    {
      "name": "nodeMarks",
      "type": "symbol",
      "zindex": 1,
      "from": {"data": "nodes"},
      "encode": {
        "enter": {
          "fill": {"scale": "color", "field": "group"},
          "stroke": {"value": "white"},
          "strokeWidth": {"value": 1.5}
        },
        "update": {
          "size": {"signal": "2 * nodeRadius * nodeRadius"},
          "tooltip": {"field": "name"}
        }
      },
      "transform": [
        {
          "type": "force",
          "iterations": 500,
          "static": true,
          "signal": "force",
          "forces": [
            {"force": "center", "x": {"signal": "cx"}, "y": {"signal": "cy"}},
            {"force": "collide", "radius": {"signal": "nodeRadius + 5"}},
            {"force": "nbody", "strength": {"signal": "nodeCharge"}},
            {"force": "link", "links": "links", "distance": {"signal": "linkDistance"}}
          ]
        }
      ]
    },
    {
      "type": "path",
      "from": {"data": "links"},
      "interactive": false,
      "encode": {
        "update": {
          "stroke": {"value": "#ccc"},
          "strokeWidth": {"value": 1}
        }
      },
      "transform": [
        {
          "type": "linkpath",
          "require": {"signal": "force"},
          "shape": "line",
          "sourceX": "datum.source.x",
          "sourceY": "datum.source.y",
          "targetX": "datum.target.x",
          "targetY": "datum.target.y"
        }
      ]
    }
  ]
}
```

---

## 19. Word Cloud 词云图 (Vega)

词云图根据词频展示文本数据。

### 技术关键词词云

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "技术关键词词云",
  "width": 600,
  "height": 400,
  "padding": 0,

  "data": [
    {
      "name": "table",
      "values": [
        {"text": "JavaScript", "count": 100},
        {"text": "Python", "count": 95},
        {"text": "React", "count": 85},
        {"text": "Vue", "count": 80},
        {"text": "TypeScript", "count": 75},
        {"text": "Node.js", "count": 70},
        {"text": "Docker", "count": 65},
        {"text": "Kubernetes", "count": 60},
        {"text": "GraphQL", "count": 55},
        {"text": "REST API", "count": 50},
        {"text": "MongoDB", "count": 48},
        {"text": "PostgreSQL", "count": 45},
        {"text": "Redis", "count": 42},
        {"text": "AWS", "count": 40},
        {"text": "Azure", "count": 38},
        {"text": "Git", "count": 90},
        {"text": "CI/CD", "count": 35},
        {"text": "Agile", "count": 32},
        {"text": "DevOps", "count": 55},
        {"text": "Microservices", "count": 45},
        {"text": "Machine Learning", "count": 50},
        {"text": "Deep Learning", "count": 40},
        {"text": "TensorFlow", "count": 35},
        {"text": "PyTorch", "count": 38}
      ],
      "transform": [
        {
          "type": "formula",
          "as": "angle",
          "expr": "[-45, 0, 45][~~(random() * 3)]"
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "table", "field": "text"},
      "range": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]
    }
  ],

  "marks": [
    {
      "type": "text",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "text": {"field": "text"},
          "align": {"value": "center"},
          "baseline": {"value": "alphabetic"},
          "fill": {"scale": "color", "field": "text"},
          "tooltip": {"signal": "datum.text + ': ' + datum.count"}
        },
        "update": {
          "fillOpacity": {"value": 1}
        },
        "hover": {
          "fillOpacity": {"value": 0.7}
        }
      },
      "transform": [
        {
          "type": "wordcloud",
          "size": [600, 400],
          "text": {"field": "text"},
          "rotate": {"field": "datum.angle"},
          "font": "Helvetica Neue, Arial",
          "fontSize": {"field": "datum.count"},
          "fontSizeRange": [14, 56],
          "padding": 2
        }
      ]
    }
  ]
}
```

---

## 20. Parallel Coordinates 平行坐标图 (Vega)

平行坐标图用于多维数据的可视化比较。

### 产品多维度评估

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "产品多维度平行坐标图",
  "width": 600,
  "height": 350,
  "padding": 5,

  "config": {
    "axisY": {
      "titleX": -2,
      "titleY": 360,
      "titleAngle": 0,
      "titleAlign": "right",
      "titleBaseline": "top"
    }
  },

  "data": [
    {
      "name": "products",
      "values": [
        {"name": "产品A", "性能": 85, "价格": 70, "易用性": 90, "支持": 80, "稳定性": 88},
        {"name": "产品B", "性能": 92, "价格": 55, "易用性": 75, "支持": 85, "稳定性": 90},
        {"name": "产品C", "性能": 78, "价格": 85, "易用性": 95, "支持": 70, "稳定性": 82},
        {"name": "产品D", "性能": 88, "价格": 60, "易用性": 80, "支持": 90, "稳定性": 85}
      ]
    },
    {
      "name": "fields",
      "values": ["性能", "价格", "易用性", "支持", "稳定性"]
    }
  ],

  "scales": [
    {
      "name": "ord",
      "type": "point",
      "range": "width",
      "round": true,
      "domain": {"data": "fields", "field": "data"}
    },
    {
      "name": "性能",
      "type": "linear",
      "range": "height",
      "zero": false,
      "nice": true,
      "domain": [50, 100]
    },
    {
      "name": "价格",
      "type": "linear",
      "range": "height",
      "zero": false,
      "nice": true,
      "domain": [50, 100]
    },
    {
      "name": "易用性",
      "type": "linear",
      "range": "height",
      "zero": false,
      "nice": true,
      "domain": [50, 100]
    },
    {
      "name": "支持",
      "type": "linear",
      "range": "height",
      "zero": false,
      "nice": true,
      "domain": [50, 100]
    },
    {
      "name": "稳定性",
      "type": "linear",
      "range": "height",
      "zero": false,
      "nice": true,
      "domain": [50, 100]
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "products", "field": "name"},
      "range": {"scheme": "category10"}
    }
  ],

  "axes": [
    {"orient": "left", "zindex": 1, "scale": "性能", "title": "性能", "offset": {"scale": "ord", "value": "性能", "mult": -1}},
    {"orient": "left", "zindex": 1, "scale": "价格", "title": "价格", "offset": {"scale": "ord", "value": "价格", "mult": -1}},
    {"orient": "left", "zindex": 1, "scale": "易用性", "title": "易用性", "offset": {"scale": "ord", "value": "易用性", "mult": -1}},
    {"orient": "left", "zindex": 1, "scale": "支持", "title": "支持", "offset": {"scale": "ord", "value": "支持", "mult": -1}},
    {"orient": "left", "zindex": 1, "scale": "稳定性", "title": "稳定性", "offset": {"scale": "ord", "value": "稳定性", "mult": -1}}
  ],

  "marks": [
    {
      "type": "group",
      "from": {"data": "products"},
      "marks": [
        {
          "type": "line",
          "from": {"data": "fields"},
          "encode": {
            "enter": {
              "x": {"scale": "ord", "field": "data"},
              "y": {"scale": {"datum": "data"}, "field": {"parent": {"datum": "data"}}},
              "stroke": {"scale": "color", "field": {"parent": "name"}},
              "strokeWidth": {"value": 2},
              "strokeOpacity": {"value": 0.7}
            }
          }
        }
      ]
    }
  ],
  
  "legends": [
    {
      "stroke": "color",
      "title": "产品",
      "orient": "right"
    }
  ]
}
```

---

## 21. Sunburst 旭日图 (Vega)

旭日图是一种径向空间填充的层级数据可视化。

### 组织架构旭日图

```vega
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "组织架构旭日图",
  "width": 500,
  "height": 500,
  "padding": 5,
  "autosize": "none",

  "data": [
    {
      "name": "tree",
      "values": [
        {"id": 1, "parent": null, "name": "公司", "size": null},
        {"id": 2, "parent": 1, "name": "技术部", "size": null},
        {"id": 3, "parent": 1, "name": "市场部", "size": null},
        {"id": 4, "parent": 1, "name": "销售部", "size": null},
        {"id": 5, "parent": 2, "name": "前端组", "size": 25},
        {"id": 6, "parent": 2, "name": "后端组", "size": 30},
        {"id": 7, "parent": 2, "name": "运维组", "size": 15},
        {"id": 8, "parent": 3, "name": "品牌组", "size": 12},
        {"id": 9, "parent": 3, "name": "推广组", "size": 18},
        {"id": 10, "parent": 4, "name": "国内销售", "size": 35},
        {"id": 11, "parent": 4, "name": "海外销售", "size": 20}
      ],
      "transform": [
        {
          "type": "stratify",
          "key": "id",
          "parentKey": "parent"
        },
        {
          "type": "partition",
          "field": "size",
          "sort": {"field": "value"},
          "size": [{"signal": "2 * PI"}, {"signal": "width / 2"}],
          "as": ["a0", "r0", "a1", "r1", "depth", "children"]
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "tree", "field": "depth"},
      "range": {"scheme": "tableau20"}
    }
  ],

  "marks": [
    {
      "type": "arc",
      "from": {"data": "tree"},
      "encode": {
        "enter": {
          "x": {"signal": "width / 2"},
          "y": {"signal": "height / 2"},
          "fill": {"scale": "color", "field": "depth"},
          "tooltip": {"signal": "datum.name + (datum.size ? ' (' + datum.size + '人)' : '')"}
        },
        "update": {
          "startAngle": {"field": "a0"},
          "endAngle": {"field": "a1"},
          "innerRadius": {"field": "r0"},
          "outerRadius": {"field": "r1"},
          "stroke": {"value": "white"},
          "strokeWidth": {"value": 0.5},
          "zindex": {"value": 0}
        },
        "hover": {
          "stroke": {"value": "red"},
          "strokeWidth": {"value": 2},
          "zindex": {"value": 1}
        }
      }
    },
    {
      "type": "text",
      "from": {"data": "tree"},
      "encode": {
        "enter": {
          "x": {"signal": "width / 2"},
          "y": {"signal": "height / 2"},
          "text": {"field": "name"},
          "fontSize": {"value": 10},
          "baseline": {"value": "middle"},
          "align": {"value": "center"},
          "fill": {"value": "#333"}
        },
        "update": {
          "radius": {"signal": "(datum.r0 + datum.r1) / 2"},
          "theta": {"signal": "(datum.a0 + datum.a1) / 2"}
        }
      },
      "transform": [
        {
          "type": "label",
          "offset": [1],
          "size": {"signal": "[width, height]"}
        }
      ]
    }
  ]
}
```

---

## 22. Violin Plot 小提琴图 (Vega-Lite)

小提琴图结合了箱线图和密度图的特点。

### 数据分布小提琴图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "不同组别数据分布小提琴图",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"group": "A", "value": 28}, {"group": "A", "value": 55},
      {"group": "A", "value": 43}, {"group": "A", "value": 91},
      {"group": "A", "value": 81}, {"group": "A", "value": 53},
      {"group": "A", "value": 19}, {"group": "A", "value": 87},
      {"group": "A", "value": 52}, {"group": "A", "value": 48},
      {"group": "B", "value": 38}, {"group": "B", "value": 45},
      {"group": "B", "value": 63}, {"group": "B", "value": 71},
      {"group": "B", "value": 49}, {"group": "B", "value": 58},
      {"group": "B", "value": 42}, {"group": "B", "value": 67},
      {"group": "B", "value": 55}, {"group": "B", "value": 60},
      {"group": "C", "value": 68}, {"group": "C", "value": 75},
      {"group": "C", "value": 83}, {"group": "C", "value": 91},
      {"group": "C", "value": 79}, {"group": "C", "value": 88},
      {"group": "C", "value": 72}, {"group": "C", "value": 85},
      {"group": "C", "value": 77}, {"group": "C", "value": 80}
    ]
  },
  "layer": [
    {
      "mark": {"type": "area", "orient": "horizontal"},
      "transform": [
        {
          "density": "value",
          "groupby": ["group"],
          "extent": [0, 100]
        }
      ],
      "encoding": {
        "y": {"field": "value", "type": "quantitative", "title": "数值"},
        "x": {
          "field": "density", "type": "quantitative",
          "stack": "center",
          "impute": null,
          "axis": null
        },
        "color": {"field": "group", "type": "nominal", "title": "组别"},
        "column": {"field": "group", "type": "nominal"}
      }
    }
  ]
}
```

---

## 23. Population Pyramid 人口金字塔 (Vega-Lite)

人口金字塔用于展示年龄和性别分布。

### 年龄性别分布图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "年龄性别人口金字塔",
  "width": 200,
  "data": {
    "values": [
      {"age": "0-9", "sex": "男", "people": 4500},
      {"age": "0-9", "sex": "女", "people": 4300},
      {"age": "10-19", "sex": "男", "people": 5200},
      {"age": "10-19", "sex": "女", "people": 5000},
      {"age": "20-29", "sex": "男", "people": 6800},
      {"age": "20-29", "sex": "女", "people": 6500},
      {"age": "30-39", "sex": "男", "people": 7200},
      {"age": "30-39", "sex": "女", "people": 7000},
      {"age": "40-49", "sex": "男", "people": 6500},
      {"age": "40-49", "sex": "女", "people": 6300},
      {"age": "50-59", "sex": "男", "people": 5500},
      {"age": "50-59", "sex": "女", "people": 5800},
      {"age": "60-69", "sex": "男", "people": 4200},
      {"age": "60-69", "sex": "女", "people": 4600},
      {"age": "70+", "sex": "男", "people": 2800},
      {"age": "70+", "sex": "女", "people": 3500}
    ]
  },
  "transform": [
    {"calculate": "datum.sex == '女' ? -datum.people : datum.people", "as": "signed_people"}
  ],
  "mark": "bar",
  "encoding": {
    "y": {
      "field": "age",
      "type": "nominal",
      "axis": {"title": "年龄段"},
      "sort": ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"]
    },
    "x": {
      "field": "signed_people",
      "type": "quantitative",
      "axis": {"title": "人口数", "format": "s"}
    },
    "color": {
      "field": "sex",
      "type": "nominal",
      "scale": {"domain": ["男", "女"], "range": ["steelblue", "salmon"]},
      "legend": {"title": "性别"}
    },
    "tooltip": [
      {"field": "age", "title": "年龄段"},
      {"field": "sex", "title": "性别"},
      {"field": "people", "title": "人口数", "format": ","}
    ]
  }
}
```

---

## 24. Interactive Global Development 交互式全球发展 (Vega-Lite)

展示国家发展指标的交互式散点图。

### 健康与收入关系图

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "健康与收入关系交互图",
  "width": 500,
  "height": 350,
  "data": {
    "values": [
      {"country": "中国", "income": 16000, "life_exp": 77, "pop": 1400, "region": "亚洲"},
      {"country": "印度", "income": 7000, "life_exp": 70, "pop": 1380, "region": "亚洲"},
      {"country": "美国", "income": 65000, "life_exp": 79, "pop": 330, "region": "北美"},
      {"country": "日本", "income": 42000, "life_exp": 84, "pop": 126, "region": "亚洲"},
      {"country": "德国", "income": 53000, "life_exp": 81, "pop": 83, "region": "欧洲"},
      {"country": "巴西", "income": 15000, "life_exp": 76, "pop": 213, "region": "南美"},
      {"country": "英国", "income": 46000, "life_exp": 81, "pop": 67, "region": "欧洲"},
      {"country": "法国", "income": 45000, "life_exp": 82, "pop": 67, "region": "欧洲"},
      {"country": "意大利", "income": 38000, "life_exp": 83, "pop": 60, "region": "欧洲"},
      {"country": "加拿大", "income": 48000, "life_exp": 82, "pop": 38, "region": "北美"},
      {"country": "韩国", "income": 44000, "life_exp": 83, "pop": 52, "region": "亚洲"},
      {"country": "澳大利亚", "income": 55000, "life_exp": 83, "pop": 26, "region": "大洋洲"},
      {"country": "墨西哥", "income": 20000, "life_exp": 75, "pop": 129, "region": "北美"},
      {"country": "印尼", "income": 12000, "life_exp": 72, "pop": 274, "region": "亚洲"},
      {"country": "俄罗斯", "income": 28000, "life_exp": 73, "pop": 144, "region": "欧洲"}
    ]
  },
  "params": [
    {
      "name": "region_selection",
      "select": {"type": "point", "fields": ["region"]},
      "bind": "legend"
    }
  ],
  "mark": {"type": "circle", "opacity": 0.8},
  "encoding": {
    "x": {
      "field": "income",
      "type": "quantitative",
      "scale": {"type": "log"},
      "axis": {"title": "人均收入 (美元)", "grid": true}
    },
    "y": {
      "field": "life_exp",
      "type": "quantitative",
      "scale": {"zero": false},
      "axis": {"title": "预期寿命 (岁)"}
    },
    "size": {
      "field": "pop",
      "type": "quantitative",
      "scale": {"range": [100, 2000]},
      "legend": {"title": "人口 (百万)"}
    },
    "color": {
      "field": "region",
      "type": "nominal",
      "scale": {"scheme": "category10"},
      "legend": {"title": "地区"}
    },
    "opacity": {
      "condition": {"param": "region_selection", "value": 1},
      "value": 0.2
    },
    "tooltip": [
      {"field": "country", "title": "国家"},
      {"field": "region", "title": "地区"},
      {"field": "income", "title": "人均收入", "format": "$,.0f"},
      {"field": "life_exp", "title": "预期寿命", "format": ".1f"},
      {"field": "pop", "title": "人口(百万)", "format": ","}
    ]
  }
}
```

---

[返回主测试文档](./test.md)
