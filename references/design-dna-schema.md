# Design DNA Schema（设计系统三维度 JSON 结构）

项目的设计系统以 `cocos-dna/design-dna.json` 存储，包含三个维度。以下是完整的字段清单。

首次为项目生成 cocos-dna/design-dna.json 时，从用户提供的参考图中提取所有字段值。
每个字段都必须填充，不允许空字符串。

## 顶层结构

```json
{
  "meta": { "name", "description", "source_references", "created_at" },
  "design_system": { ... },
  "design_style": { ... },
  "visual_effects": { ... }
}
```

---

## Dimension 1: design_system（结构/可度量层）

具体的 token 级值 — 颜色 hex、像素尺寸、间距等。

### color
| 字段 | 说明 | 示例值 |
|------|------|--------|
| `palette_type` | 调色板类型 | "monochromatic" / "analogous" / "complementary" |
| `primary.hex` / `primary.role` | 主色 | "#C4A962", "主要交互元素" |
| `secondary.hex` / `secondary.role` | 辅色 | "#8B7355", "边框、次要文本" |
| `accent.hex` / `accent.role` | 强调色 | "#FFD700", "高光、悬停" |
| `neutral.scale` | 中性色阶数组 | ["#1A1410", "#2D241C", ..., "#C4B8A8"] |
| `neutral.usage` | 用途说明 | "背景层次、文本层级" |
| `semantic.success/warning/error/info` | 语义色 | "#4A8C4A" |
| `surface.background` | 背景 | "linear-gradient(...)" 或 hex |
| `surface.card` / `surface.elevated` | 卡片/悬浮色 | "rgba(...)" |
| `contrast_strategy` | 对比策略 | "高对比度 - 深色背景配亮色前景" |

### typography
| 字段 | 说明 |
|------|------|
| `type_scale.display/heading_1/heading_2/heading_3/body/body_small/caption/overline` | 每级: `.size`, `.weight`, `.line_height`, `.tracking` |
| `font_families.heading/body/mono` | 字体族 |
| `font_style_notes` | 字体风格说明 |

### spacing
| 字段 | 说明 |
|------|------|
| `base_unit` | 基础单位 (如 "8px") |
| `scale` | 间距阶梯数组 |
| `content_density` | "compact" / "comfortable" / "spacious" |
| `section_rhythm` | 区域间距规律说明 |

### layout
| 字段 | 说明 |
|------|------|
| `grid_system` | 网格系统 |
| `max_content_width` | 最大内容宽度 |
| `columns` / `gutter` | 列数 / 间距 |
| `alignment_tendency` | "strict grid" / "centered" / "asymmetric" |

### shape
| 字段 | 说明 |
|------|------|
| `border_radius.small/medium/large/pill` | 圆角值 |
| `border_usage` / `divider_style` | 边框和分隔线风格 |

### elevation
| 字段 | 说明 |
|------|------|
| `shadow_style` | "none" / "soft diffused" / "hard drop" |
| `levels.low/medium/high` | 各级阴影值 |
| `depth_cues` | 深度线索方式 |

### iconography
| 字段 | 说明 |
|------|------|
| `style` / `stroke_weight` | 图标风格和描边 |
| `size_scale.small/medium/large/hero` | 图标尺寸 |
| `preferred_set` | 推荐图标集 |

### motion
| 字段 | 说明 |
|------|------|
| `easing` | 缓动曲线 |
| `duration_scale.micro/normal/macro` | 各级时长 |
| `entrance_pattern` / `exit_pattern` | 入场/退出模式 |
| `philosophy` | 动效哲学 |

### components
| 字段 | 说明 |
|------|------|
| `button_style.primary/secondary/disabled` | 按钮样式描述 |
| `input_style` / `card_style` / `navigation_pattern` | 各组件风格 |
| `modal_style` / `list_style` / `component_notes` | 更多组件风格 |

---

## Dimension 2: design_style（定性/感知层）

主观的视觉感受描述。

### aesthetic
- `mood`: 3-5 个情绪词数组
- `visual_metaphor`: 视觉隐喻
- `era_influence`: 时代影响
- `genre`: 风格流派
- `personality_traits`: 性格特质
- `adjectives`: 形容词

### visual_language
- `complexity`: "minimal" / "moderate" / "rich" / "maximal"
- `ornamentation`: "none" / "subtle accents" / "decorative" / "heavily ornamented"
- `whitespace_usage` / `visual_weight_distribution` / `focal_strategy`
- `contrast_level` / `texture_usage`

### composition
- `hierarchy_method` / `balance_type` / `flow_direction`
- `grouping_strategy` / `negative_space_role`

### imagery
- `photo_treatment` / `illustration_style` / `graphic_elements`
- `pattern_usage` / `image_shape`

### interaction_feel
- `feedback_style` / `hover_behavior` / `transition_personality`
- `loading_style` / `microinteraction_density`

### brand_voice_in_ui
- `tone` / `formality` / `cta_style`
- `empty_state_approach` / `error_tone`

---

## Dimension 3: visual_effects（特效/高级渲染层）

超出标准 CSS 的视觉效果。每个子类别都有 `enabled` 开关。

### overview
- `effect_intensity`: "none" / "subtle-accent" / "moderate" / "heavy-immersive"
- `performance_tier`: "lightweight" / "medium" / "heavy"
- `fallback_strategy` / `primary_technology`

### 各效果子类别

每个子类别结构：`{ enabled, type, description, technology, params: {...} }`

- `background_effects` — 背景动画/渐变
- `particle_systems` — 粒子系统
- `3d_elements` — 3D 元素
- `shader_effects` — 着色器效果
- `scroll_effects.parallax/scroll_triggered_animations/scroll_morphing` — 滚动效果
- `text_effects` — 文字效果
- `cursor_effects` — 光标效果
- `image_effects` — 图片效果
- `glassmorphism_neumorphism` — 玻璃态/新拟态
- `canvas_drawings` — Canvas 绘制
- `svg_animations` — SVG 动画
- `composite_notes` — 复合效果自由文本
