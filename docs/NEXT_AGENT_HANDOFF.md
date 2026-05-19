# 下一位 Agent 交接

## 当前状态

- 已清理历史生成资源：`preview/` 与 `tmp/` 已从工作树删除，并加入 `.gitignore`。
- 已删除未使用旧运行时资源：`action/reimu_fly.png`、`assets/fly_aura.png`、`assets/reimu_defeated.png`、`assets/marisa_defeated.png`。
- 已整理运行时素材目录：
  - `character/{id}/{normal|happy|angry|sad}.png`
  - `action/{id}/{stand|walk1..walk8|attack1..attack4}.png`
  - `assets/icons/{id}/{1..4}.png`
  - `assets/effects/`
  - `assets/stage/`
  - `assets/pickups/`
- 已同步资源加载和校验入口：`js/core/asset-loader.js`、`js/core/asset-store.js`、`js/data/asset-manifest.js`、`scripts/check-project.mjs`、`scripts/refresh-action-animations.py`。
- README 已更新为新的目录说明和扩展流程。
- 灵梦技能已完成一轮更新：梦想封印、二重结界、阴阳宝玉、八方鬼缚阵。

## 下步工作思路

按照人物逐个生成并实现一套新技能，每次只处理一个角色，避免同时改动过多角色逻辑。

建议流程：

1. 参考 `docs/SKILL_CANDIDATES.md` 选定下一个角色。
2. 在 `js/data/characters.js` 确认 4 个技能的名称、类型、冷却和描述。
3. 在 `js/entities/fighter-skills.js` 实现该角色 4 个技能的 PvP 激活、更新、绘制。
4. 在 `js/systems/pve-skill-hits.js` 补同一套技能的 PvE 敌人命中逻辑。
5. 在 `js/entities/fighter-ai.js` 让 CPU 能合理使用新技能。
6. 如需新资源，优先复用 `assets/effects/` 的通用特效；确实需要新图标或特效时，放到 `assets/icons/{id}/` 或 `assets/effects/` 并同步 loader/checker。
7. 跑 `npm run check`，必要时开本地服务确认战斗和 PvE 都能进入。

建议角色顺序：`marisa` -> `yuyuko` -> `youmu` -> `sanae` -> `flandre` -> `sakuya` -> `reisen` -> `cirno` -> `yukari` -> `suwako` -> `kaguya`。

## 注意事项

- 不要恢复 `preview/`、`tmp/` 到版本目录；它们只作为临时生成输出。
- 动作图仍保持“源图面向左侧”，运行时自动镜像右向。
- 死亡表现当前由站立帧旋转绘制，不再维护单独死亡立绘。
- 如果继续清理飞行相关代码，先确认是否要保留未来移动技能接口；本轮只移除了无触发路径的飞行动作/光环素材加载。
