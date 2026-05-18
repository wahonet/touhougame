# 东方横版战斗 Demo

这是一个基于 HTML5 Canvas + ES Module 的 2D 横版动作/格斗游戏。当前版本包含 12 名可选角色、角色对话、1v1 对战、PvE 闯关、音效和完整的资源加载管线。

## 运行

```bash
npm run serve
```

打开 `http://localhost:8000`。

提交代码或重构前，先跑一遍：

```bash
npm run check
```

## 当前内容

- 角色选择：12 人角色网格，先选玩家，再选对手。
- 对话阶段：根据对阵组合显示专属对白和立绘表情。
- 对战阶段：本地 1v1 形式的横版对战，玩家对 CPU。
- PvE 阶段：横向卷轴闯关，带关卡、敌人、平台、拾取物和 Boss。
- 结算阶段：对战胜负、PvE 胜利/失败、重开提示。
- 音频系统：BGM + SFX。

当前可选角色：

`reimu`、`marisa`、`yuyuko`、`youmu`、`sanae`、`flandre`、`sakuya`、`reisen`、`cirno`、`yukari`、`suwako`、`kaguya`

## 操作

### 角色选择

| 按键 | 功能 |
|---|---|
| 方向键 / `WASD` | 移动光标 |
| `1`-`9`、`0`、`-`、`=` | 直接选角 |
| `Enter` / `Space` | 确认选择 |
| `P` | 直接进入 PvE |
| `Esc` / `Backspace` | 返回上一层选择 |

### 对战

| 按键 | 功能 |
|---|---|
| `A` / `D` | 左右移动 |
| `W` / `Space` | 跳跃 |
| `J` | 普通攻击 |
| `1`-`4` | 释放四个技能 |
| `R` | 重新开始 |
| `M` | 静音 |

### PvE

| 按键 | 功能 |
|---|---|
| `R` | 重新开始 |
| `N` | PvE 胜利后进入下一关 |
| `M` | 静音 |

## 游戏框架

入口链路是：

```text
index.html -> js/app.js
js/main.js -> 旧入口兼容壳，负责再注入 js/app.js
```

- `index.html` 直接挂载 Canvas，并加载 `js/app.js`。
- `js/app.js` 才是当前主入口，负责 Canvas 初始化、资源预加载、输入注册、主循环和状态切换。
- `js/main.js` 是旧入口兼容壳，方便以老方式打开时仍然能启动。

状态机由 `js/core/game-state.js` 统一管理，当前状态包括：

`loading`、`select`、`dialogue`、`battle`、`gameover`、`pve`、`pve_victory`、`pve_defeat`

模块分工大致如下：

- `js/config/`：屏幕尺寸、场地宽度、HP、字体等常量。
- `js/core/`：资源加载、资源仓库、音频、输入、全局状态、战斗事件钩子。
- `js/data/`：角色定义、资源清单、对白、关卡、场地布局。
- `js/entities/`：角色、敌人、拾取物、动画、技能、渲染。
- `js/systems/`：碰撞、命中判定、PvE 技能伤害结算。
- `js/scenes/`：选人、对话、对战、PvE、结算场景。
- `js/render/`：加载画面。

## 玩法结构

### 角色选择

`SelectScene` 使用 4 列网格展示 12 名角色。先选玩家角色，再选对手角色，然后进入对战；也可以直接进入 PvE。

### 对话

`DialogueScene` 会根据对阵组合从 `js/data/dialogue-data.js` 取对白。每一句对白会同时驱动两侧立绘表情显示，当前说话者高亮。

### 对战

`BattleScene` 是固定场地的横版对战，画面包含：

- 远景星空、月亮、山体、树影和云层的视差背景
- 地面和平台
- 双方角色、技能特效、命中特效、屏幕震动
- HP 条、技能栏、控制提示

当前实现里，`pvp` 模式实际是本地 1v1 对战，敌方由 CPU 控制。

### PvE

`PvEScene` 是横向卷轴闯关，包含：

- 分段刷怪
- 移动平台
- 计分、连击和伤害数字
- 掉落拾取物
- 胜利/失败判定

当前有 3 个关卡：

- `forest`：竹林迷途
- `cave`：灼炎地狱
- `castle`：白玉殿

敌人类型包括：

- `slime`
- `bat`
- `skeleton`
- `skullman`
- `boss`

拾取物包括：

- `hp`：回血
- `cd`：重置技能冷却
- `power`：短时增伤
- `bomb`：清屏伤害

## 动画与立绘

### 立绘

立绘统一放在 `character/`：

```text
character/{id}_normal.png
character/{id}_happy.png
character/{id}_angry.png
character/{id}_sad.png
```

加载逻辑在 `js/core/asset-loader.js`：

- 立绘会被缩放到固定高度 500px。
- 进入对话时，`DialogueScene` 根据当前对白的 `speaker` 和 `expr` 取对应表情图。
- 如果某个角色没有完整立绘，loader 会生成程序化占位图，保证项目能继续运行。

### 动作图

动作图统一放在 `action/`：

```text
action/{id}_stand.png
action/{id}_walk1.png ~ walk8.png
action/{id}_attack1.png ~ attack4.png
action/reimu_fly.png   # 仅灵梦使用
```

动作素材有一个固定约定：

- 源图必须以“面向左侧”为准。
- loader 会把左向素材加载到 `Assets.sprites[char].left`。
- 再通过 `flipImage(...)` 自动镜像生成右向版本，写入 `Assets.sprites[char].right`。

也就是说，运行时不会单独维护两套动作图。只要左向素材正确，角色朝右时会自动翻转。

### 动画控制

动画由 `js/entities/animation.js` 的 `Anim` 管理：

- 支持逐帧播放
- 支持循环和非循环
- 支持重置
- `isHitFrame` 用来标记攻击命中的有效帧区间

`Fighter` 会根据当前状态切换动画：

- `idle` -> `stand`
- `walk` -> `walk1..8`
- `attack` -> `attack1..4`
- `dead` -> 倒地表现

普通攻击的命中判定在 `js/systems/combat.js` 里做：

- 只在攻击动画的有效帧上检查命中
- 通过 `hitbox` 和 `hurtbox` 的矩形重叠来判定
- 命中后再结算伤害、音效、震屏和粒子

飞行状态会改用 `reimu_fly.png`；死亡状态则由渲染层把站立图旋转成倒地效果。

## 资源清单

- `character/`：对话立绘
- `action/`：战斗动作图
- `assets/icon_{id}_{1..4}.png`：技能图标
- `assets/{id}_defeated.png`：结算/失败立绘
- `assets/*.png`：技能特效、平台、拾取物等
- `audio/*.wav`：SFX 和 BGM

资源加载统一从 `js/core/asset-loader.js` 进入 `Assets` 仓库，避免各模块各自读文件。

## 核心实现

- `js/entities/fighter.js`：角色核心实体，负责移动、跳跃、状态、冷却、护盾、飞行和动画切换。
- `js/entities/fighter-skills.js`：四技能注册表，每个角色 4 个技能，按角色分发逻辑。
- `js/entities/fighter-renderer.js`：角色绘制、飞行图、死亡图、状态特效和调试框。
- `js/entities/fighter-ai.js`：CPU 对手决策。
- `js/entities/enemy.js`：PvE 敌人，包含程序化像素风敌人和 Boss 行为。
- `js/entities/pickup.js`：PvE 拾取物。
- `js/systems/collision.js`：通用矩形碰撞与角色挤开。
- `js/systems/combat.js`：普通攻击命中。
- `js/systems/pve-skill-hits.js`：PvE 技能对敌人的伤害结算。
- `js/core/battle-events.js`：震屏和命中粒子的事件钩子。

## 配置

关键常量在 `js/config/game-config.js`：

- 屏幕分辨率：`1280 x 720`
- 场地宽度：`3200`
- 默认 HP：`1000`
- 动作图显示高度：`120`
- 调试模式：`true`

当前调试模式开启时，会在战斗中显示 hurtbox / hitbox，方便校验动作和判定。

## 扩展角色

新增角色时，通常要同步这些地方：

1. 在 `js/data/characters.js` 添加角色定义、数值、技能描述和颜色。
2. 在 `js/data/asset-manifest.js` 的 `CHARACTER_IDS` 里加入新 id。
3. 放入立绘：`character/{id}_{normal|happy|angry|sad}.png`。
4. 放入动作图：`action/{id}_stand.png`、`walk1-8`、`attack1-4`。
5. 放入技能图标：`assets/icon_{id}_{1..4}.png`。
6. 如需结算图，再补 `assets/{id}_defeated.png`。
7. 到 `js/entities/fighter-skills.js` 注册四个技能行为，必要时补 `fighter-ai.js`。
8. 跑 `npm run check`。

注意：动作图仍然要按“左向源图”的约定制作，否则运行时镜像方向会反。
