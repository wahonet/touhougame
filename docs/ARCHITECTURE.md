# 架构文档

本文档是给后续开发者和 agent 使用的协作契约。目标是让功能继续增加时，代码仍然能按边界生长，而不是把所有逻辑继续塞进单个文件。

## 设计目标

- 入口只做装配：`js/app.js` 负责初始化 Canvas、加载资源、注册输入、驱动主循环和场景切换。
- 数据与逻辑分离：角色数值、对话、地图平台、资源清单放在 `js/data/`，不要散落在渲染或实体逻辑里。
- 实体只表达实体行为：角色移动、AI、技能状态、技能表现仍在 `entities/fighter.js`，但通用战斗规则和碰撞规则放到 `systems/`。
- 全局状态集中：运行态统一放在 `core/game-state.js`，不要在任意模块新建全局变量。
- 资源统一入口：图片通过 `core/asset-loader.js` 加载到 `core/asset-store.js`，音频通过 `core/audio-manager.js` 播放。

## 当前目录

```text
vb_touhou/
├── index.html
├── style.css
├── docs/
│   └── ARCHITECTURE.md
├── js/
│   ├── app.js                       # 应用装配、主循环、顶层状态切换
│   ├── main.js                      # 旧 HTML 兼容启动器
│   ├── scenes.js                    # 旧 HTML 兼容占位
│   ├── scenes/
│   │   ├── index.js                 # 场景 barrel re-export
│   │   ├── select-scene.js          # 选角场景
│   │   ├── dialogue-scene.js        # 对话场景
│   │   ├── battle-scene.js          # PvP 战斗场景
│   │   ├── pve-scene.js             # PvE 场景编排
│   │   ├── pve-hud.js               # PvE HUD 与结算绘制
│   │   └── pve-background.js        # PvE 背景和平台绘制
│   ├── config/
│   │   └── game-config.js           # 屏幕、场地、HP、字体、调试等常量
│   ├── core/
│   │   ├── asset-loader.js          # 图片加载、缩放、翻转、预加载流程
│   │   ├── asset-store.js           # 已加载资源容器
│   │   ├── audio-manager.js         # BGM/SFX 播放与静音
│   │   ├── battle-events.js         # 战斗表现事件钩子，如震屏、粒子
│   │   ├── game-state.js            # Game 单例与重置辅助
│   │   └── input-controller.js      # 键鼠输入适配
│   ├── data/
│   │   ├── asset-manifest.js        # 资源命名清单
│   │   ├── characters.js            # 角色显示名、颜色、技能冷却
│   │   ├── dialogue-data.js         # 对话脚本
│   │   ├── level-data.js            # PvE 多关卡配置
│   │   └── stage-data.js            # PvP 地面和平台布局
│   ├── entities/
│   │   ├── animation.js             # 帧动画控制器
│   │   ├── fighter.js               # Fighter 核心实体与物理流程
│   │   ├── fighter-ai.js            # Fighter AI 决策
│   │   ├── fighter-skills.js        # 技能激活、更新与绘制
│   │   └── fighter-renderer.js      # Fighter 基础绘制
│   ├── systems/
│   │   ├── collision.js             # 矩形重叠、角色挤开等通用碰撞
│   │   └── combat.js                # 普通攻击命中结算
│   └── render/
│       └── loading-screen.js        # Loading 场景绘制
├── assets/
│   ├── effects/
│   ├── icons/{id}/
│   ├── pickups/
│   └── stage/
├── action/
│   └── {id}/
├── character/
│   └── {id}/
└── audio/
```

## 运行流程

1. `index.html` 以 ES module 方式加载 `js/app.js`。
2. `app.js` 创建 Canvas 上下文，注册输入，绘制初始 Loading。
3. `preloadAssets()` 把图片加载到 `Assets`，`AudioManager.init()` 预加载音效。
4. 主状态进入 `select`，`requestAnimationFrame` 持续调用 `gameLoop()`。
5. 每帧读取输入快照，根据 `Game.state` 调用对应场景的 `draw/update`。
6. 战斗场景创建 `Fighter`，调用 `systems/combat.js` 和 `systems/collision.js` 结算规则。

## 依赖方向

允许的依赖方向：

```text
app -> core/data/render/scenes
scenes -> config/core/data/entities/systems
entities -> config/core/data/systems
systems -> core 或纯函数
core -> data/config
data -> 无运行时依赖或只依赖 config
render -> config/core/data
```

不要反向依赖：

- `core/` 不要 import `scenes.js`。
- `data/` 不要 import `entities/`、`scenes/`、`core/asset-store.js`。
- `systems/` 不要直接读写 `Game.state`，除非该系统本身就是状态机。
- `entities/` 不要直接调用 `BattleScene`。需要表现反馈时，通过 `core/battle-events.js`。

## 模块职责

### `app.js`

只负责组合模块和主循环。不要在这里添加角色、技能、地图、UI 细节。

适合放在这里：

- 初始化 Canvas。
- 调用资源和音频初始化。
- 注册输入。
- 根据 `Game.state` 分派场景。
- 顶层重置流程。

不适合放在这里：

- 技能实现。
- 地图平台数组。
- HP 条绘制细节。
- 资源路径清单。

### `core/`

`core/` 是服务层，提供资源、音频、输入、运行态等基础能力。

- `game-state.js`：集中保存当前运行态。新增全局运行字段前，先判断它是否真的跨场景共享。
- `asset-loader.js`：新增图片资源时，优先更新这里和 `data/asset-manifest.js`。
- `asset-store.js`：只保存加载结果，不写业务逻辑。
- `audio-manager.js`：统一播放音频，其他模块不要直接 `new Audio()`。
- `input-controller.js`：只把 DOM 事件转换成游戏输入，不写角色移动逻辑。
- `battle-events.js`：实体向战斗场景发出表现事件，避免实体反向依赖场景。

### `data/`

这里存纯数据。未来 agent 加内容时应优先改数据文件，而不是复制逻辑。

- 新角色显示名、技能名、冷却、主题色：改 `characters.js`。
- 对话文本：改 `dialogue-data.js`。
- 平台布局、地面高度：改 `stage-data.js`。
- 资源命名模式、音效列表：改 `asset-manifest.js`。

### `entities/`

实体层保存角色自己的状态和行为。当前 `fighter.js` 仍然较大，后续如果继续扩展，应按以下方向拆：

- `fighter-ai.js`：AI 决策。
- `fighter-skills.js` 或 `skills/`：技能激活和更新。
- `fighter-renderer.js`：角色与技能特效绘制。
- `fighter-physics.js`：移动、跳跃、平台落地。

拆分原则：先让新模块拥有明确职责，再迁移相关函数；不要只为了文件变小而制造交叉调用。

### `systems/`

系统层放“不属于某个实体自身”的规则。

- 碰撞、命中、拾取、伤害结算、状态效果都可以逐步放到这里。
- 系统函数应尽量接收参数并返回结果，少读全局状态。

### `scenes.js`

当前仍集中管理四个场景对象。随着场景增多，建议拆成：

```text
js/scenes/
├── select-scene.js
├── dialogue-scene.js
├── battle-scene.js
└── game-over-scene.js
```

新增场景时不要把全部逻辑继续追加到 `scenes.js`。先评估是否应该独立文件。

## 添加新角色

1. 在 `data/characters.js` 新增角色定义，包括 `id`、显示名、颜色、四个技能槽。
2. 在 `data/asset-manifest.js` 的 `CHARACTER_IDS` 加入角色 id。
3. 按现有命名放入立绘：`character/{id}/normal.png`、`happy.png`、`angry.png`、`sad.png`。
4. 按现有命名放入动作：`action/{id}/stand.png`、`walk1-8`、`attack1-4`。
5. 按现有命名放入技能图标：`assets/icons/{id}/1.png`、`2.png`、`3.png`、`4.png`。
6. 如果需要特殊动作图，在 `core/asset-loader.js` 增加加载规则，并在实体渲染中使用。
7. 在选角场景中增加角色选项。目前选角 UI 已支持 12 人网格，继续扩展前应确认键盘直选映射。

## 添加新技能

当前每个角色固定四个技能槽。添加或修改技能时：

1. 先在 `data/characters.js` 修改技能名与冷却。
2. 资源路径放在 `data/asset-manifest.js` 或 `core/asset-loader.js`。
3. 技能激活、更新、绘制现在位于 `entities/fighter-skills.js`。新增技能时按角色和技能序号集中放置。
4. 普通命中、碰撞、状态效果若能复用，应放到 `systems/`，不要复制在多个技能函数里。
5. 技能产生震屏、粒子等表现反馈时，使用 `emitHitImpact()` 或扩展 `battle-events.js`，不要 import `BattleScene`。

## 添加新场景

1. 创建场景对象，至少提供 `draw(ctx)`，如果有运行逻辑则提供 `update(dt)`。
2. 在 `app.js` 的状态分派中加入新状态。
3. 输入处理如果只属于该场景，放在场景的 `handleKey/handleClick`，由 `input-controller.js` 分派。
4. 场景私有状态保存在场景对象内；跨场景状态才进入 `Game`。

## 添加资源

- 图片：更新 `data/asset-manifest.js` 或 `core/asset-loader.js`，加载结果写入 `Assets`。运行时图片按用途放入 `character/`、`action/`、`assets/icons/`、`assets/effects/`、`assets/stage/`、`assets/pickups/`。
- 音效：把文件放到 `audio/`，并在 `SFX_FILES` 中加入不带扩展名的 key。
- BGM：通过 `AudioManager.playBGM('bgm_name')` 播放，对应 `audio/bgm_name.wav`。
- 不要在绘制函数里临时 `new Image()` 或 `fetch()`，资源应在 Loading 阶段加载。
- `preview/` 和 `tmp/` 只作为本地生成/审阅输出目录，不作为运行时资源目录提交。

## 编码规范

- 使用 ES module 的 `import/export`，不要恢复多脚本全局变量模式。
- 新文件默认 ASCII；已有中文文案文件继续使用 UTF-8。
- 数据命名使用稳定 id，如 `reimu`、`marisa`，显示文本从 `data/characters.js` 读取。
- 不要在多个文件重复常量。屏幕尺寸、场地宽度、HP、字体等放 `config/game-config.js`。
- 渲染代码可以读 `Assets`，但不要改变资源结构。
- 每次重构后至少运行 `npm run check`。该命令会做 JS 语法检查、基础数据校验、音效/特效资源校验和常见乱码检测。

## 质量闸门

- `scripts/check-project.mjs` 是当前最小自动化检查入口。
- 新增角色时，`CHARACTER_IDS` 与 `CHARACTER_DEFINITIONS` 必须同步，且每个角色固定 4 个技能槽。
- 新增 PvE 关卡时，`spawnZones[*].spawnIndices` 必须引用存在的敌人索引。
- 新增音效和特效帧时，资源清单必须能映射到真实文件。
- 角色真实动作图缺失时，`asset-loader` 会生成临时 Canvas 占位，保证原型可运行；正式内容上线前仍应补齐真实素材。

## 已知技术债

- `entities/fighter-skills.js` 仍然较大，且按角色名和技能序号集中分发。下一轮建议演进为 `skills/{character}.js` + 技能注册表。
- `entities/fighter-ai.js` 和 `entities/enemy.js` 仍包含较多策略分支。后续可按敌人类型或行为树拆分。
- `battle-scene.js` 与 `pve-scene.js` 仍承担较多编排和表现细节。后续可继续拆出 `camera-system`、`pickup-system`、`spawn-system`、`projectile-system`。
- 自动化测试仍偏少。可以先为 `systems/collision.js`、`systems/combat.js` 这类纯规则补浏览器外可运行的单元测试。
- `Game` 仍是共享可变对象。短期适合小型 Canvas 游戏，长期可以演进为场景上下文对象或事件驱动状态机。
