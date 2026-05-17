# PvE模式升级计划

## 目标
将PvE模式从基础原型升级为完整的横版过关体验（Contra/Metal Slug风格）。

## 执行顺序

### Phase 3: 重构 — 遵循ARCHITECTURE.md拆分大文件
- `fighter.js`(2180行) → 拆分为 fighter-core + fighter-skills + fighter-renderer
- `scenes/index.js`(1368行) → 拆分为 select-scene + dialogue-scene + battle-scene + game-over-scene
- `pve-scene.js`(790行) → 拆分为 pve-scene + pve-hud + pve-background

### Phase 4: PvE核心内容增强
- **多关卡系统**: data/level-data/ — 至少3个关卡(森林/洞窟/魔王城)
- **道具拾取**: HP恢复、CD重置、武器强化(攻击力临时提升)
- **移动平台**: 往复移动的平台
- **Boss攻击模式强化**: 多阶段Boss，弹幕攻击模式
- **关卡结算画面**: 统计数据、评级系统(S/A/B/C)

### Phase 5: 新增角色
- **幽幽子(Yuyuko)**: 近战型，扇子攻击，技能：蝶舞/幽冥/反魂蝶/冥界蝶
- **妖梦(Youmu)**: 速攻型，双刀，技能：楼观剑/观柳/现世斩/半灵形态

### Phase 6: 视觉增强
- 击杀特效(爆炸粒子)
- 连击数显示
- 伤害数字弹出
- 背景动态元素(流水、火焰、飘落的花瓣)
- Boss血条UI增强

### Phase 7: 音效完善
- 新增PvE专属音效
- Boss战斗BGM

### Phase 8: Bug修复
- 确保无圆柱体碰撞问题
- 确保无卡死问题
- 边界情况测试

## 架构约束
- 遵循ARCHITECTURE.md的依赖方向
- 数据在data/，逻辑在entities/，规则在systems/
- 新增场景独立文件
- 全局状态集中在Game
- 资源通过asset-loader加载
