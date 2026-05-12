# 东方横版战斗 Demo

一个基于 HTML5 Canvas + JavaScript 的 2D 横版战斗 Demo，使用东方 Project 角色（灵梦 & 魔理沙）。

## 运行方式

```bash
cd F:\vibecodinggame\vb_touhou
python -m http.server 8000
```

然后打开浏览器访问: http://localhost:8000

## 操作方式

### 角色选择

| 按键 | 功能 |
|------|------|
| 点击角色 / 按 1 / 按 2 | 选择角色 |
| Enter | 确认选择，开始战斗 |

### 对话阶段

| 按键 | 功能 |
|------|------|
| Enter / Space | 推进对话 |

### 战斗阶段

| 按键 | 功能 |
|------|------|
| A | 向左移动 |
| D | 向右移动 |
| W / Space | 跳跃 |
| J | 攻击 |
| R | 重新开始（战斗结束后或战斗中） |

## 战斗规则

- 双方初始 HP = 100
- 攻击命中造成 10 点伤害
- 攻击动画播放期间无法再次攻击
- 伤害判定在攻击动画的中间帧触发
- 每次攻击最多造成一次伤害
- 一方 HP 归零即判定胜负

## 文件结构

```
vb_touhou/
├── index.html           # Web 版主入口
├── style.css            # 样式文件
├── js/
│   ├── app.js           # 应用装配、主循环、状态机
│   ├── main.js          # 旧 HTML 兼容启动器
│   ├── scenes.js        # 旧 HTML 兼容占位
│   ├── scenes/          # 场景渲染（选角、对话、战斗、结算）
│   ├── config/          # 全局配置常量
│   ├── core/            # 资源、音频、输入、运行态等基础服务
│   ├── data/            # 角色、对话、地图、资源清单等纯数据
│   ├── entities/        # Fighter、Anim 等实体对象
│   ├── systems/         # 碰撞、命中等战斗规则系统
│   └── render/          # 独立渲染辅助
├── character/           # 角色立绘（对话场景使用）
│   ├── reimu_normal.png
│   ├── reimu_happy.png
│   ├── reimu_angry.png
│   ├── reimu_sad.png
│   ├── marisa_normal.png
│   ├── marisa_happy.png
│   ├── marisa_angry.png
│   └── marisa_sad.png
├── action/              # 动作小人（战斗场景使用）
│   ├── reimu_stand.png
│   ├── reimu_walk1.png ~ walk4.png
│   ├── reimu_attack1.png ~ attack4.png
│   ├── marisa_stand.png
│   ├── marisa_walk1.png ~ walk4.png
│   └── marisa_attack1.png ~ attack4.png
└── README.md            # 说明文档
```

完整架构说明见 `docs/ARCHITECTURE.md`。后续添加角色、技能、场景或资源前，优先按该文档的模块边界修改。

## 关于右向角色

所有动作小人的原始素材均为 **面向左** 的版本。

Web 版在加载时通过 Canvas `scale(-1, 1)` 水平翻转自动生成面向右的版本，并缓存到离屏 Canvas 以避免每帧重复翻转。

**原始素材文件不会被修改或覆盖。**

## 技术细节

- 画布分辨率：1280 x 720
- 帧率：requestAnimationFrame（~60 FPS）
- 动作小人缩放至 250px 高度
- 立绘缩放至 500px 高度
- 中文字体：Microsoft YaHei → SimHei → simsun → sans-serif
- 缺失图片不会导致崩溃，会在控制台打印警告
- 攻击判定使用矩形 hitbox，仅在攻击动画中间帧触发
- 调试模式下 hurtbox 以绿色半透明显示，hitbox 以红色半透明显示
