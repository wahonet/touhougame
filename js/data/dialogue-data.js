/**
 * Dialogue data for PvP pre-battle scenes
 * Key format: "char1_vs_char2" (alphabetical order)
 */
const DIALOGUES = {
    reimu_vs_marisa: [
        { speaker: 'reimu', expr: 'normal', text: '魔理沙，你又把我的东西拿走了吗？' },
        { speaker: 'marisa', expr: 'happy', text: '只是借用一下啦，别这么小气。' },
        { speaker: 'reimu', expr: 'angry', text: '这次一定要让你还回来！' },
        { speaker: 'marisa', expr: 'happy', text: '那就来试试看吧！' },
        { speaker: 'reimu', expr: 'normal', text: '准备战斗！' }
    ],
    reimu_vs_yuyuko: [
        { speaker: 'reimu', expr: 'normal', text: '幽幽子，又来蹭饭了吗？' },
        { speaker: 'yuyuko', expr: 'happy', text: '今天的樱花好美呢，陪我散散步吧。' },
        { speaker: 'reimu', expr: 'angry', text: '别转移话题！' },
        { speaker: 'yuyuko', expr: 'normal', text: '那就用弹幕来决定吧～' }
    ],
    reimu_vs_youmu: [
        { speaker: 'reimu', expr: 'normal', text: '妖梦，白玉楼的修行结束了吗？' },
        { speaker: 'youmu', expr: 'normal', text: '尚未。但我感受到了一股强大的灵力。' },
        { speaker: 'reimu', expr: 'happy', text: '那一定是我吧？' },
        { speaker: 'youmu', expr: 'normal', text: '不……是您身后那个。不过先解决您再说。' }
    ],
    marisa_vs_yuyuko: [
        { speaker: 'marisa', expr: 'happy', text: '幽幽子大人在，一定有好吃的吧？' },
        { speaker: 'yuyuko', expr: 'happy', text: '当然啦！不过你得先通过我的考验。' },
        { speaker: 'marisa', expr: 'normal', text: '考验？弹幕那种？' },
        { speaker: 'yuyuko', expr: 'happy', text: '没错！准备接招吧～' }
    ],
    marisa_vs_youmu: [
        { speaker: 'marisa', expr: 'happy', text: '妖梦！来比试一下剑法吧！' },
        { speaker: 'youmu', expr: 'normal', text: '楼观剑从不轻易出鞘。' },
        { speaker: 'marisa', expr: 'happy', text: '那我可不客气了！看我的魔炮！' },
        { speaker: 'youmu', expr: 'normal', text: '……看来不出鞘不行了。' }
    ],
    yuyuko_vs_youmu: [
        { speaker: 'yuyuko', expr: 'happy', text: '妖梦，来陪主人练习一下吧～' },
        { speaker: 'youmu', expr: 'normal', text: '是，大小姐。请手下留情。' },
        { speaker: 'yuyuko', expr: 'happy', text: '留情？那多没意思啊！' },
        { speaker: 'youmu', expr: 'normal', text: '……我尽量吧。' }
    ]
};

function createDefaultDialogue(char1, char2) {
    return [
        { speaker: char1, expr: 'normal', text: '异变的气息越来越近了。' },
        { speaker: char2, expr: 'normal', text: '既然遇上了，就用弹幕确认一下吧。' },
        { speaker: char1, expr: 'happy', text: '正合我意。' },
        { speaker: char2, expr: 'angry', text: '开始吧。' }
    ];
}

/**
 * Get dialogue lines for a character matchup
 * @param {string} char1 - First character ID
 * @param {string} char2 - Second character ID
 * @returns {Array} dialogue lines array
 */
export function getDialogue(char1, char2) {
    // Sort alphabetically for consistent key lookup
    const sorted = [char1, char2].sort();
    const key = `${sorted[0]}_vs_${sorted[1]}`;
    return DIALOGUES[key] || createDefaultDialogue(char1, char2);
}

// Backward compatible: export default dialogue for reimu vs marisa
export const DIALOGUE_LINES = DIALOGUES.reimu_vs_marisa;
