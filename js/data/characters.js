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
        skillColors: ['#cc3333', '#991133', '#6644aa', '#aa77dd'],
        skills: [
            { name: '梦想天生', maxCooldown: 15 },
            { name: '梦想封印', maxCooldown: 30 },
            { name: '二重结界', maxCooldown: 20 },
            { name: '飞行', maxCooldown: 25 }
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
        skillColors: ['#ddaa00', '#cc8800', '#cccc44', '#88cc44'],
        skills: [
            { name: '魔法炮', maxCooldown: 15 },
            { name: '二重魔法炮', maxCooldown: 30 },
            { name: '群星闪耀', maxCooldown: 20 },
            { name: '防护罩', maxCooldown: 20 }
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
        skillColors: ['#ff66aa', '#cc88ff', '#ffaadd', '#88ccff'],
        skills: [
            { name: '反魂蝶', maxCooldown: 15 },
            { name: '幽雅地死去', maxCooldown: 25 },
            { name: '死出之导', maxCooldown: 20 },
            { name: '樱舞幻阵', maxCooldown: 30 }
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
        skillColors: ['#44ddaa', '#88ccff', '#aaffcc', '#66ffdd'],
        skills: [
            { name: '楼观剑', maxCooldown: 12 },
            { name: '白楼剑斩', maxCooldown: 25 },
            { name: '半灵冲刺', maxCooldown: 18 },
            { name: '现世斩', maxCooldown: 28 }
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
        cooldown: 0,
        maxCooldown: skill.maxCooldown,
        active: false,
        data: {}
    }));
}
