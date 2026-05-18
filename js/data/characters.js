export const CHARACTER_DEFINITIONS = {
    reimu: {
        id: 'reimu',
        displayName: '灵梦',
        englishName: 'Reimu',
        selectName: '灵梦 (Reimu)',
        uiName: '灵梦 Reimu',
        resultName: '灵梦 (Reimu)',
        accentColor: '#ff6b8a',
        selectAccentColor: '#ff4466',
        maxHp: 1000,
        attackDamage: 10,
        attackRange: 100,
        skillColors: ['#cc3333', '#991133', '#6644aa', '#aa77dd'],
        skills: [
            { name: '梦想天生', type: 'damage', maxCooldown: 15, description: '散射八枚灵符，适合中距离压制。' },
            { name: '梦想封印', type: 'damage', maxCooldown: 30, description: '追踪封印弹，命中造成高额伤害。' },
            { name: '二重结界', type: 'shield', maxCooldown: 20, description: '展开结界，吸收一段时间内的伤害。' },
            { name: '飞行', type: 'utility', maxCooldown: 25, description: '短时间自由升降，用于追击或脱离。' }
        ]
    },
    marisa: {
        id: 'marisa',
        displayName: '魔理沙',
        englishName: 'Marisa',
        selectName: '魔理沙 (Marisa)',
        uiName: '魔理沙 Marisa',
        resultName: '魔理沙 (Marisa)',
        accentColor: '#ffcc00',
        selectAccentColor: '#ffcc00',
        maxHp: 850,
        attackDamage: 10,
        attackRange: 100,
        skillColors: ['#ddaa00', '#cc8800', '#cccc44', '#88cc44'],
        skills: [
            { name: '魔法炮', type: 'damage', maxCooldown: 15, description: '蓄力后发射追踪高度的小光炮，多段命中。' },
            { name: '双重魔法炮', type: 'damage', maxCooldown: 30, description: '更粗更远的光炮，爆发伤害更高。' },
            { name: '群星眩光', type: 'utility', maxCooldown: 20, description: '星弹不造成伤害，命中会眩晕目标3秒。' },
            { name: '防护罩', type: 'shield', maxCooldown: 20, description: '生成魔法护罩，吸收即将到来的伤害。' }
        ]
    },
    yuyuko: {
        id: 'yuyuko',
        displayName: '幽幽子',
        englishName: 'Yuyuko',
        selectName: '幽幽子 (Yuyuko)',
        uiName: '幽幽子 Yuyuko',
        resultName: '幽幽子 (Yuyuko)',
        accentColor: '#ff88cc',
        selectAccentColor: '#ff66bb',
        maxHp: 1500,
        attackDamage: 9,
        attackRange: 105,
        skillColors: ['#ff66aa', '#cc88ff', '#ffaadd', '#88ccff'],
        skills: [
            { name: '反魂蝶', type: 'damage', maxCooldown: 15, description: '八枚蝶弹扇形展开，命中造成稳定伤害。' },
            { name: '幽雅灵弹', type: 'damage', maxCooldown: 25, description: '高速追踪幽魂弹，命中后造成高额伤害。' },
            { name: '死出之导', type: 'shield', maxCooldown: 20, description: '展开坚固的幽灵护盾，吸收大量伤害。' },
            { name: '西行妖梦境', type: 'utility', maxCooldown: 30, description: '在敌人位置展开樱花梦境，束缚并大幅减速。' }
        ]
    },
    youmu: {
        id: 'youmu',
        displayName: '妖梦',
        englishName: 'Youmu',
        selectName: '妖梦 (Youmu)',
        uiName: '妖梦 Youmu',
        resultName: '妖梦 (Youmu)',
        accentColor: '#88eebb',
        selectAccentColor: '#66ddaa',
        maxHp: 900,
        attackDamage: 12,
        attackRange: 105,
        skillColors: ['#44ddaa', '#88ccff', '#aaffcc', '#66ffdd'],
        skills: [
            { name: '半灵追斩', type: 'damage', maxCooldown: 12, description: '半灵化作追踪斩击，自动追向敌人。' },
            { name: '幽魂回刃', type: 'damage', maxCooldown: 20, description: '放出往返幽魂剑气，去回程都可命中。' },
            { name: '半灵护网', type: 'shield', maxCooldown: 20, description: '半灵环绕成盾，吸收一段伤害。' },
            { name: '幽体步', type: 'utility', maxCooldown: 16, description: '化为幽影快速位移，期间短暂无敌。' }
        ]
    },
    sanae: {
        id: 'sanae',
        displayName: '早苗',
        englishName: 'Sanae',
        selectName: '东风谷早苗 (Sanae)',
        uiName: '早苗 Sanae',
        resultName: '早苗 (Sanae)',
        accentColor: '#68e0a0',
        selectAccentColor: '#63f3b0',
        maxHp: 1050,
        attackDamage: 9,
        attackRange: 120,
        skillColors: ['#7df5bd', '#ffe86b', '#68b8ff', '#9affd2'],
        skills: [
            { name: '神风之符', type: 'damage', maxCooldown: 13, description: '三道弧形风刃向前推进，命中会轻微击退。' },
            { name: '客星奇迹', type: 'damage', maxCooldown: 24, description: '短暂预兆后在敌人脚下落下星光柱。' },
            { name: '守矢护佑', type: 'shield', maxCooldown: 20, description: '蛇与蛙的双层护罩，破盾时击退近身敌人。' },
            { name: '奇迹祈愿', type: 'utility', maxCooldown: 28, description: '祈愿触发奇迹，回复、减CD或短暂强化下一击。' }
        ]
    },
    flandre: {
        id: 'flandre',
        displayName: '芙兰',
        englishName: 'Flandre',
        selectName: '芙兰朵露 (Flandre)',
        uiName: '芙兰 Flandre',
        resultName: '芙兰 (Flandre)',
        accentColor: '#ff5666',
        selectAccentColor: '#ff3d4f',
        maxHp: 800,
        attackDamage: 12,
        attackRange: 95,
        skillColors: ['#ff4a3f', '#ff9a2f', '#df3350', '#f06cff'],
        skills: [
            { name: '禁忌莱瓦汀', type: 'damage', maxCooldown: 14, description: '挥出火焰剑波，近中距离爆发很高。' },
            { name: '破坏之眼', type: 'damage', maxCooldown: 26, description: '锁定敌人当前位置，延迟后产生裂纹爆破。' },
            { name: '红魔结界', type: 'shield', maxCooldown: 20, description: '短时间高吸收的血红晶翼护盾。' },
            { name: '四重存在', type: 'utility', maxCooldown: 30, description: '召出残影分身扰乱锁定，下一次平A附带爆裂。' }
        ]
    },
    sakuya: {
        id: 'sakuya',
        displayName: '咲夜',
        englishName: 'Sakuya',
        selectName: '十六夜咲夜 (Sakuya)',
        uiName: '咲夜 Sakuya',
        resultName: '咲夜 (Sakuya)',
        accentColor: '#a9d7ff',
        selectAccentColor: '#7fc9ff',
        maxHp: 900,
        attackDamage: 11,
        attackRange: 165,
        skillColors: ['#dcefff', '#86c7ff', '#9dbbff', '#d8f2ff'],
        skills: [
            { name: '银刃阵', type: 'damage', maxCooldown: 13, description: '扇形投掷多把飞刀，中近距离压制。' },
            { name: '幻象杀人鬼', type: 'damage', maxCooldown: 24, description: '瞬移到敌人侧后方，释放交叉刀阵。' },
            { name: '怀表结界', type: 'shield', maxCooldown: 20, description: '时间护盾抵消伤害，并减速周围敌人。' },
            { name: '咲夜的世界', type: 'utility', maxCooldown: 34, description: '短暂时停敌人和怪物，咲夜可自由行动。' }
        ]
    },
    reisen: {
        id: 'reisen',
        displayName: '铃仙',
        englishName: 'Reisen',
        selectName: '铃仙·优昙华院 (Reisen)',
        uiName: '铃仙 Reisen',
        resultName: '铃仙 (Reisen)',
        accentColor: '#bc8cff',
        selectAccentColor: '#ff5fa8',
        maxHp: 950,
        attackDamage: 8,
        attackRange: 250,
        skillColors: ['#ff445f', '#636dff', '#bc8cff', '#ff5fa8'],
        skills: [
            { name: '月兔光束', type: 'damage', maxCooldown: 14, description: '蓄力发射细光束，会轻微追踪敌人高度。' },
            { name: '幻视波纹', type: 'damage', maxCooldown: 24, description: '穿透波长弹造成伤害，并让目标短暂混乱。' },
            { name: '波长偏转', type: 'shield', maxCooldown: 20, description: '偏转弹幕并减伤，近身攻击只部分抵消。' },
            { name: '狂气之眼', type: 'utility', maxCooldown: 30, description: '大范围狂气波，命中后强制眩晕目标3秒。' }
        ]
    },
    cirno: {
        id: 'cirno',
        displayName: '琪露诺',
        englishName: 'Cirno',
        selectName: '琪露诺 (Cirno)',
        uiName: '琪露诺 Cirno',
        resultName: '琪露诺 (Cirno)',
        accentColor: '#76d9ff',
        selectAccentColor: '#44bfff',
        maxHp: 820,
        attackDamage: 10,
        attackRange: 105,
        skillColors: ['#8eeaff', '#4fb8ff', '#d9fbff', '#5d8dff'],
        skills: [
            { name: '冰晶散射', type: 'damage', maxCooldown: 13, description: '散射多枚冰晶，适合中距离压制。' },
            { name: '完美冻结', type: 'damage', maxCooldown: 24, description: '在目标位置爆出寒霜，造成伤害并短暂冻结。' },
            { name: '冰之护盾', type: 'shield', maxCooldown: 20, description: '凝出冰盾吸收伤害，持续一小段时间。' },
            { name: '寒冰冲刺', type: 'utility', maxCooldown: 18, description: '向前快速滑行，期间短暂无敌并留下冰雾。' }
        ]
    },
    yukari: {
        id: 'yukari',
        displayName: '八云紫',
        englishName: 'Yukari',
        selectName: '八云紫 (Yukari)',
        uiName: '八云紫 Yukari',
        resultName: '八云紫 (Yukari)',
        accentColor: '#c48cff',
        selectAccentColor: '#b36bff',
        maxHp: 1100,
        attackDamage: 9,
        attackRange: 135,
        skillColors: ['#b36bff', '#7b3fb2', '#f5d0ff', '#ffd166'],
        skills: [
            { name: '间隙之刃', type: 'damage', maxCooldown: 15, description: '从隙间射出多道紫色刃痕。' },
            { name: '境界坍缩', type: 'damage', maxCooldown: 28, description: '在目标附近展开隙间，延迟后造成高额伤害。' },
            { name: '境界护幕', type: 'shield', maxCooldown: 22, description: '用境界护幕吸收伤害。' },
            { name: '神隐隙间', type: 'utility', maxCooldown: 30, description: '短距离穿梭到目标侧后方，并强化下一击。' }
        ]
    },
    suwako: {
        id: 'suwako',
        displayName: '泄矢诹访子',
        englishName: 'Suwako',
        selectName: '泄矢诹访子 (Suwako)',
        uiName: '诹访子 Suwako',
        resultName: '诹访子 (Suwako)',
        accentColor: '#d8b56a',
        selectAccentColor: '#7ed957',
        maxHp: 980,
        attackDamage: 10,
        attackRange: 115,
        skillColors: ['#77dd77', '#7fd7ff', '#d7b15d', '#9b6cff'],
        skills: [
            { name: '蛙石跃击', type: 'damage', maxCooldown: 14, description: '召出跳跃蛙石向前弹跳攻击。' },
            { name: '坤之御柱', type: 'damage', maxCooldown: 25, description: '在目标脚下升起水环与御符，造成范围伤害。' },
            { name: '土著神护符', type: 'shield', maxCooldown: 21, description: '展开守护符阵吸收伤害。' },
            { name: '洩矢之水域', type: 'utility', maxCooldown: 30, description: '制造水域减速并短暂束缚范围内敌人。' }
        ]
    },
    kaguya: {
        id: 'kaguya',
        displayName: '蓬莱山辉夜',
        englishName: 'Kaguya',
        selectName: '蓬莱山辉夜 (Kaguya)',
        uiName: '辉夜 Kaguya',
        resultName: '辉夜 (Kaguya)',
        accentColor: '#f5a4c7',
        selectAccentColor: '#ffd166',
        maxHp: 1020,
        attackDamage: 9,
        attackRange: 125,
        skillColors: ['#ffd166', '#ff8ab3', '#9d7cff', '#7fd7ff'],
        skills: [
            { name: '蓬莱宝玉', type: 'damage', maxCooldown: 14, description: '发射宝玉弹，命中后绽放星辉。' },
            { name: '龙颈之玉', type: 'damage', maxCooldown: 26, description: '召出五色宝玉阵，对目标区域造成爆发。' },
            { name: '永夜屏障', type: 'shield', maxCooldown: 22, description: '以永夜之光构筑屏障吸收伤害。' },
            { name: '难题宝具', type: 'utility', maxCooldown: 32, description: '在目标周围展开宝具阵，减速并增强下一击。' }
        ]
    }
};

export function getCharacterDefinition(characterId) {
    return CHARACTER_DEFINITIONS[characterId];
}

export function createSkillSlots(characterId) {
    const definition = getCharacterDefinition(characterId);
    if (!definition) {
        throw new Error(`Unknown character: ${characterId}`);
    }

    return definition.skills.map(skill => ({
        name: skill.name,
        type: skill.type,
        description: skill.description,
        cooldown: 0,
        maxCooldown: skill.maxCooldown,
        active: false,
        data: {}
    }));
}
