# 东方横版战斗 Demo

这是一个基于 HTML5 Canvas + ES Module 的 2D 横版动作/格斗游戏。当前版本包含 12 名可选角色、角色对话、1v1 对战、PvE 闯关、音效和统一的资源加载管线。

## 运行

```bash
npm run serve
```

打开 `http://localhost:18081`。

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

### 对战 / PvE

| 按键 | 功能 |
|---|---|
| `A` / `D` | 左右移动 |
| `W` / `Space` | 跳跃 |
| `J` | 普通攻击 |
| `1`-`4` | 释放四个技能 |
| `R` | 重新开始 |
| `N` | PvE 胜利后进入下一关 |
| `M` | 静音 |

## 目录结构

当前仓库只保留运行时正在使用的素材和必要脚本，历史生成图、预览图、旧备份已经从版本目录移除。

```text
vb_touhou/
├── index.html
├── style.css
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SKILL_CANDIDATES.md
│   └── NEXT_AGENT_HANDOFF.md
├── js/
│   ├── app.js
│   ├── config/
│   ├── core/
│   ├── data/
│   ├── entities/
│   ├── render/
│   ├── scenes/
│   └── systems/
├── scripts/
│   ├── check-project.mjs
│   └── refresh-action-animations.py
├── character/
│   └── {id}/
│       ├── normal.png
│       ├── happy.png
│       ├── angry.png
│       └── sad.png
├── action/
│   └── {id}/
│       ├── stand.png
│       ├── walk1.png ... walk8.png
│       └── attack1.png ... attack4.png
├── assets/
│   ├── icons/{id}/1.png ... 4.png
│   ├── effects/
│   ├── stage/
│   └── pickups/
└── audio/
```

`preview/` 和 `tmp/` 已加入 `.gitignore`。后续生成审阅图、临时裁切、动作刷新备份时可以继续放在这两个目录，但不要把它们当作运行时素材提交。

## 资源约定

### 立绘

立绘统一放在 `character/{id}/`：

```text
character/{id}/normal.png
character/{id}/happy.png
character/{id}/angry.png
character/{id}/sad.png
```

加载逻辑在 `js/core/asset-loader.js`。立绘会被缩放到固定高度 500px，对话场景根据 `speaker` 和 `expr` 取对应表情图。

### 动作图

动作图统一放在 `action/{id}/`：

```text
action/{id}/stand.png
action/{id}/walk1.png ... walk8.png
action/{id}/attack1.png ... attack4.png
```

源图必须以“面向左侧”为准。loader 会加载左向素材到 `Assets.sprites[char].left`，再通过 `flipImage(...)` 自动镜像生成右向版本。

### 图标与特效

- `assets/icons/{id}/{1..4}.png`：每名角色的 4 个技能图标。
- `assets/effects/`：技能和命中特效，如 `spellcard_*`、`seal_*`、`laser_*`、`shield.png`、妖梦专属剑气/魂魄特效。
- `assets/stage/`：平台素材。
- `assets/pickups/`：PvE 拾取物素材。
- `audio/`：`bgm_*.wav` 和 `sfx_*.wav`。

死亡表现当前由 `fighter-renderer.js` 将站立帧旋转绘制，不再维护单独的 `{id}_defeated.png`。旧的 `reimu_fly.png`、`fly_aura.png`、死亡立绘、预览生成目录和临时动作备份已经清理。

## 游戏框架

入口链路是：

```text
index.html -> js/app.js
js/main.js -> 旧入口兼容壳，负责再注入 js/app.js
```

- `js/app.js`：Canvas 初始化、资源预加载、输入注册、主循环和状态切换。
- `js/core/`：资源加载、资源仓库、音频、输入、全局状态、战斗事件钩子。
- `js/data/`：角色定义、资源清单、对白、关卡、场地布局。
- `js/entities/`：角色、敌人、拾取物、动画、技能、渲染。
- `js/systems/`：碰撞、命中判定、PvE 技能伤害结算。
- `js/scenes/`：选人、对话、对战、PvE、结算场景。

## 玩法结构

`SelectScene` 使用 4 列网格展示 12 名角色。先选玩家角色，再选对手角色，然后进入对战；也可以直接进入 PvE。

`DialogueScene` 会根据对阵组合从 `js/data/dialogue-data.js` 取对白。每一句对白会同时驱动两侧立绘表情显示，当前说话者高亮。

`BattleScene` 是固定场地的横版对战，画面包含视差背景、地面、平台、双方角色、技能特效、命中特效、屏幕震动、HP 条和技能栏。当前 `pvp` 模式实际是本地 1v1 对战，敌方由 CPU 控制。

`PvEScene` 是横向卷轴闯关，包含分段刷怪、移动平台、计分、连击、伤害数字、掉落拾取物和胜利/失败判定。当前关卡为 `forest`、`cave`、`castle`。

## 核心实现

- `js/entities/fighter.js`：角色核心实体，负责移动、跳跃、状态、冷却、护盾和动画切换。
- `js/entities/fighter-skills.js`：四技能注册表，每个角色 4 个技能，按角色分发逻辑。
- `js/entities/fighter-renderer.js`：角色绘制、死亡表现、状态特效和调试框。
- `js/entities/fighter-ai.js`：CPU 对手决策。
- `js/entities/enemy.js`：PvE 敌人，包含程序化像素风敌人和 Boss 行为。
- `js/entities/pickup.js`：PvE 拾取物。
- `js/systems/combat.js`：普通攻击命中。
- `js/systems/pve-skill-hits.js`：PvE 技能对敌人的伤害结算。

灵梦当前四个技能已经更新为：梦想封印、二重结界、阴阳宝玉、八方鬼缚阵。

## 扩展角色

新增角色时，通常要同步这些地方：

1. 在 `js/data/characters.js` 添加角色定义、数值、技能描述和颜色。
2. 在 `js/data/asset-manifest.js` 的 `CHARACTER_IDS` 里加入新 id。
3. 放入立绘：`character/{id}/{normal|happy|angry|sad}.png`。
4. 放入动作图：`action/{id}/stand.png`、`walk1-8`、`attack1-4`。
5. 放入技能图标：`assets/icons/{id}/{1..4}.png`。
6. 如需新的通用特效，放入 `assets/effects/` 并在 `asset-loader.js` 或 `asset-manifest.js` 登记。
7. 到 `js/entities/fighter-skills.js` 注册四个技能行为，必要时补 `fighter-ai.js` 和 `pve-skill-hits.js`。
8. 跑 `npm run check`。

注意：动作图仍然要按“左向源图”的约定制作，否则运行时镜像方向会反。

## 下一步方向

后续开发按照人物逐个补齐新技能套装。建议顺序参考 `docs/SKILL_CANDIDATES.md`，每次只处理一个角色的 4 个技能：先更新 `characters.js` 的技能名/描述/冷却，再实现 PvP 技能行为、PvE 命中结算、AI 使用策略，最后补必要的技能图标或特效资产并跑 `npm run check`。
