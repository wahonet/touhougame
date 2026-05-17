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
        skillColors: ['#ddaa00', '#cc8800', '#cccc44', '#88cc44'],
        skills: [
            { name: '魔法炮', type: 'damage', maxCooldown: 15, description: '蓄力后发射直线光炮，多段命中。' },
            { name: '二重魔法炮', type: 'damage', maxCooldown: 30, description: '更粗更远的光炮，爆发伤害更高。' },
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
        skillColors: ['#ff66aa', '#cc88ff', '#ffaadd', '#88ccff'],
        skills: [
            { name: '反魂蝶', type: 'damage', maxCooldown: 15, description: '放出蝶形弹幕，覆盖前方扇形范围。' },
            { name: '幽雅灵弹', type: 'damage', maxCooldown: 25, description: '缓慢追踪的幽魂弹，命中后爆发。' },
            { name: '死出之导', type: 'shield', maxCooldown: 20, description: '以幽魂护身，短时间吸收伤害。' },
            { name: '樱舞幽径', type: 'utility', maxCooldown: 30, description: '展开樱花领域，进入其中的敌人被减速。' }
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
        skillColors: ['#44ddaa', '#88ccff', '#aaffcc', '#66ffdd'],
        skills: [
            { name: '半灵追斩', type: 'damage', maxCooldown: 12, description: '半灵化作追踪斩击，自动追向敌人。' },
            { name: '幽魂回刃', type: 'damage', maxCooldown: 20, description: '放出往返幽魂剑气，去回程都可命中。' },
            { name: '半灵护佑', type: 'shield', maxCooldown: 20, description: '半灵环绕成盾，吸收一段伤害。' },
            { name: '幽体步', type: 'utility', maxCooldown: 16, description: '化为幽影快速位移，期间短暂无敌。' }
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
