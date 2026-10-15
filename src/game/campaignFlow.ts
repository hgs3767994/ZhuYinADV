import type { CampaignLevelDefinition } from './campaignConfig';

export type CampaignFlowPhase =
  | 'pre-story'
  | 'mission'
  | 'tutorial'
  | 'gameplay'
  | 'saving'
  | 'post-story'
  | 'result'
  | 'defeat';

export type CampaignFlowOverlay =
  | null
  | 'pause'
  | 'how-to-direct'
  | 'how-to-paused'
  | 'abandon-confirm';

export interface CampaignStoryPage {
  text: string;
  speaker?: string;
  leadText?: string;
}

export interface CampaignTutorialPage {
  title: string;
  steps: readonly string[];
}

export interface CampaignLevelFlowContent {
  levelId: string;
  tutorialId: string;
  preStory: readonly CampaignStoryPage[];
  mission: string;
  tutorialSteps: readonly string[];
  tutorialPages?: readonly CampaignTutorialPage[];
  howToSteps?: readonly string[];
  postStory: readonly CampaignStoryPage[];
}

export interface CampaignFlowState {
  phase: CampaignFlowPhase;
  storyPage: number;
  overlay: CampaignFlowOverlay;
  tutorialRequired: boolean;
}

export type CampaignFlowAction =
  | { type: 'advance-pre-story'; pageCount: number }
  | { type: 'previous-pre-story' }
  | { type: 'skip-pre-story' }
  | { type: 'continue-mission' }
  | { type: 'complete-tutorial' }
  | { type: 'open-pause' }
  | { type: 'open-how-to'; origin: 'gameplay' | 'pause' }
  | { type: 'close-how-to' }
  | { type: 'resume' }
  | { type: 'request-abandon' }
  | { type: 'cancel-abandon' }
  | { type: 'begin-saving' }
  | { type: 'save-succeeded' }
  | { type: 'advance-post-story'; pageCount: number }
  | { type: 'previous-post-story' }
  | { type: 'skip-post-story' }
  | { type: 'defeat' }
  | { type: 'retry' };

export function campaignSystemBackAction(overlay: CampaignFlowOverlay): CampaignFlowAction {
  switch (overlay) {
    case 'pause':
      return { type: 'resume' };
    case 'how-to-direct':
    case 'how-to-paused':
      return { type: 'close-how-to' };
    case 'abandon-confirm':
      return { type: 'cancel-abandon' };
    default:
      return { type: 'open-pause' };
  }
}

const LEVEL_ONE_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-01',
  tutorialId: 'sequence-lock-basic',
  preStory: [
    { text: '冒險者來到注音王國的入口，卻發現通往王國的大門被迷霧封住了。' },
    { text: '門上有三道魔法封印。冒險者靠近時，項鍊上的注音水晶開始發出光芒。' },
    { text: '水晶中傳來一串聲音。只要依照正確順序重現聲音，或許就能解除封印。' }
  ],
  mission: '仔細聽注音的順序，依序將卡片放入鎖孔，解開三道封印！',
  tutorialSteps: [
    '點擊待選區的卡片，將它放入鎖孔。',
    '點擊鎖孔內的卡片，可以將它放回原位。',
    '按照正確順序填滿所有鎖孔後即可解開封印。',
    '可以不限次數重播聲音。'
  ],
  postStory: [
    { text: '三道封印全部解除，通往注音王國的大門終於打開了。' },
    { text: '但大門後沒有往日歡迎旅人的聲音，只有濃厚的迷霧籠罩著道路。' },
    { text: '冒險者握緊注音水晶，踏入迷霧之中，開始尋找王國的居民。' }
  ]
};

const LEVEL_TWO_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-02',
  tutorialId: 'sound-maze-basic',
  preStory: [
    { text: '冒險者穿過大門，眼前的道路全被濃厚的迷霧籠罩。' },
    { text: '迷霧很濃，只能勉強看得清前方一點距離內的道路。' },
    { text: '項鍊上的注音水晶感應到三枚散落的聲音碎片。只要找齊碎片，或許就能找到離開迷霧的方向。' }
  ],
  mission: '仔細聽目標讀音，選擇正確的岔路，找齊三枚聲音碎片並走出迷霧！',
  tutorialSteps: [
    '點擊目前可以到達的道路，讓冒險者移動前往。',
    '到達岔路時，仔細聽目標注音，選擇顯示正確符號的岔路。',
    '可以不限次數重播目標讀音。',
    '選錯時會進入迷霧死路，之後自動返回原本的岔路。',
    '找齊三枚聲音碎片後，依照出口提示離開迷霧。'
  ],
  postStory: [
    { text: '冒險者沿著聲音碎片形成的指引，終於走出了濃厚的迷霧。' },
    { text: '迷霧後方出現了一座村落，但村子裡安靜得聽不見任何說話聲。' },
    { text: '村裡的村民們徬徨無助的樣子，一位聲音典籍魔法師朝冒險者走來。' },
    { text: '冒險者胸前的注音水晶再次亮起，似乎能夠藉由水晶之力幫助到他們。' }
  ]
};

const LEVEL_THREE_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-03',
  tutorialId: 'memory-explore-basic',
  preStory: [
    { text: '聲音典籍魔法師來到冒險者面前，試著開口，卻發不出任何聲音。' },
    { text: '魔法師拿出紙筆，透過書寫告訴冒險者注音王國被攻佔，以及大家聲音被封印的事。' },
    { text: '突然，冒險者的注音水晶與魔法師身上的封印產生共鳴，水晶的力量將其中一道封印轉化成了注音符文。' },
    { text: '似乎只要依照讀音找出封印中相同的注音符文，就能逐一解除魔法師身上的迷霧封印。' }
  ],
  mission: '記住水晶符文的位置，聽清楚目標讀音，找出兩張相同的卡片，解除全部五組迷霧封印！',
  tutorialSteps: [
    '開始時，場上的九張注音符文卡片會以 3 × 3 排列並打開顯示 5 秒，請記住三組符文的位置。',
    '卡片蓋上後，魔法師只會播放一次目標讀音，不會顯示答案符號。',
    '翻出兩張與目標讀音相同的卡片後，第三張相同卡片會自動翻開，三張卡片一起移除。',
    '可以點擊重播圖示，不限次數重聽目標讀音。',
    '翻出的兩張卡片不同，或與目標讀音不符時，兩張卡片會重新蓋上。',
    '每完成一組，牌面會補入一組未出現過的新符文；九張卡片重新洗牌、重新分配字色並再次顯示 5 秒。',
    '找完全部五組即可解除封印，恢復魔法師的聲音。'
  ],
  postStory: [
    {
      leadText: '最後一道迷霧封印化為光點消失，魔法師終於重新發出了聲音。',
      speaker: '小亞',
      text: '「謝謝你幫我解開封印！我叫小亞，是負責管理王國聲音典籍的魔法師。」'
    },
    { speaker: '小亞', text: '「迷霧大軍封印了大家的聲音，必須破壞封印水晶才能恢復大家的聲音。」' },
    { speaker: '小亞', text: '「封印水晶被城堡裡的迷霧將軍守護著，但城堡的入口都被迷霧哨兵控制了。」' },
    { speaker: '小亞', text: '「我知道一條可以潛入城堡的地下秘道，但前往秘道的路上很危險。」' },
    { speaker: '小亞', text: '「你的注音水晶之力能夠對付迷霧大軍。冒險者，你願意護送我前往秘道嗎？」' }
  ]
};

const LEVEL_FOUR_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-04',
  tutorialId: 'escort-basic',
  preStory: [
    { speaker: '小亞', text: '「地下秘道的入口位在城堡外圍。只要穿過前方的道路，就能避開被控制的主要入口。」' },
    { text: '但通往秘道的道路也被迷霧魔法籠罩，後方的黑霧正逐漸逼近。' },
    { speaker: '小亞', text: '「我熟悉前往秘道的方向，但不擅長戰鬥。請你利用注音水晶之力辨認安全的道路，一起前往秘道！」' },
    { text: '冒險者走在前方替小亞開路，兩人開始朝地下秘道前進。' }
  ],
  mission: '仔細聽目標讀音，選擇正確的道路，護送小亞通過十個路段！',
  tutorialSteps: [
    '每個路段會播放一次目標讀音，請在 5 秒內選擇顯示正確符號的道路。',
    '可以不限次數重播目標讀音，但重播不會停止或重置倒數。',
    '選擇正確道路時，安全距離增加一格。',
    '選錯道路或時間結束時，安全距離減少一格。',
    '每連續答對三次，會觸發一次「疾風加速」，額外增加一格安全距離。',
    '安全距離降到零時護送失敗。',
    '通過全部十個路段即可完成護送。'
  ],
  postStory: [
    { text: '冒險者與小亞成功穿過了被迷霧籠罩的道路，將逼近的黑霧甩在後方。' },
    { speaker: '小亞', text: '「秘道的入口快到了，只要再越過這片區域，我們就能進入秘道。」' },
    { text: '就在兩人準備繼續前進時，一隊巡邏的迷霧哨兵擋住了道路。' },
    { speaker: '小亞', text: '「小心！他們是負責封鎖城堡周圍的迷霧哨兵！」' }
  ]
};

const LEVEL_FIVE_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-05',
  tutorialId: 'battle-basic',
  preStory: [
    { text: '巡邏的迷霧哨兵包圍了冒險者與小亞，舉起武器阻止兩人繼續前進。' },
    { speaker: '小亞', text: '「他們不會讓我們靠近秘道。我不擅長戰鬥，這場戰鬥只能拜託你了！」' },
    { text: '冒險者胸前的注音水晶發出光芒，將周圍散落的聲音轉化成可以用來戰鬥的注音符文。' },
    { speaker: '小亞', text: '「仔細聽注音的讀音，選出正確的符文，就能利用注音水晶的力量攻擊敵人！」' }
  ],
  mission: '選定敵人，聽清楚目標讀音並選出正確符文，擊敗五波迷霧哨兵！',
  tutorialSteps: [
    '畫面最上方顯示目前波次，例如「第 1／5 波」。',
    '場上只有一名敵人時自動選定；有多名敵人時，先點擊想攻擊的敵人。',
    '戰鬥依照「玩家進行 2 回合，再由敵人進行 1 回合」的順序循環。',
    '系統自動播放一次目標讀音，玩家需選出與讀音相符的注音符文。',
    '可以不限次數重播目標讀音。'
  ],
  tutorialPages: [
    {
      title: '基本操作',
      steps: [
        '畫面最上方顯示目前波次，例如「第 1／5 波」。',
        '場上只有一名敵人時自動選定；有多名敵人時，先點擊想攻擊的敵人。',
        '戰鬥依照「玩家進行 2 回合，再由敵人進行 1 回合」的順序循環。',
        '系統自動播放一次目標讀音，玩家需選出與讀音相符的注音符文。',
        '可以不限次數重播目標讀音。'
      ]
    },
    {
      title: '技能說明',
      steps: ['當敵人即將發動攻擊，而你只剩 1 點生命且至少有 3 點能量時，回音護盾會自動發動，擋下致命攻擊。']
    }
  ],
  howToSteps: [
    '場上只有一名敵人時會自動選定；有多名敵人時，先點擊想攻擊的敵人。',
    '戰鬥依照「玩家進行 2 回合，再由敵人進行 1 回合」的順序循環，每次作答都會完成目前回合。',
    '聽清楚目標讀音，選出相符的注音符文；讀音可以不限次數重播。',
    '玩家回合選對符文會攻擊選定敵人；選錯時遭敵人反擊並失去 1 點生命。',
    '敵人回合選對符文會防禦攻擊；選錯時敵人攻擊成功並失去 1 點生命。',
    '任何回合正確作答都取得 1 點聲音能量；能量最多 5 點。',
    '消耗 3 點聲音能量可以發動「符音穿透」，無視護盾並直接削減敵人 2 點生命，同時消耗一次玩家回合行動。',
    '當敵人即將攻擊、玩家只剩 1 點生命且至少有 3 點能量時，「回音護盾」會自動消耗 3 點能量並擋下致命攻擊。',
    '玩家生命歸零時戰敗；擊敗全部五波敵人即可獲勝。'
  ],
  postStory: [
    { text: '最後一批迷霧哨兵在注音水晶的光芒中潰散，化為黑霧消失了。' },
    { speaker: '小亞', text: '「成功了！你的注音水晶果然能夠對抗迷霧大軍！」' },
    { text: '但剛才的戰鬥驚動了附近的巡邏隊，遠處出現了更多追兵。' },
    { speaker: '小亞', text: '「更多敵人正在趕來！秘道入口已經不遠了，我們得趕快離開這裡！」' }
  ]
};

const LEVEL_SIX_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-06',
  tutorialId: 'chase-basic',
  preStory: [
    { text: '更多迷霧哨兵從遠處趕來。' },
    { speaker: '小亞', text: '「追兵太多了！秘道入口就在前方，我們必須趕在他們追上來之前抵達！」' },
    { text: '前方道路依舊佈滿迷霧。' },
    { speaker: '小亞', text: '「仔細聽注音水晶傳來的讀音，選出正確的道路，我們就能甩開追兵！」' }
  ],
  mission: '在 5 秒內選擇正確道路，穿過十個路段，在追兵趕上前抵達秘道入口！',
  tutorialSteps: [
    '正確選路可以拉開與追兵的距離。',
    '選錯或超過 5 秒未選擇會讓追兵接近。',
    '連續答對三次會觸發「疾風加速」。',
    '安全距離降到零時逃離失敗。'
  ],
  howToSteps: [
    '每個路段會播放一次目標讀音，請在 5 秒內選擇顯示正確符號的道路。',
    '可以不限次數重播目標讀音，但重播不會停止或重置倒數。',
    '正確選路可以拉開與追兵的距離。',
    '選錯或超過 5 秒未選擇會讓追兵接近。',
    '每連續答對三次，會觸發一次「疾風加速」，額外增加一格安全距離。',
    '安全距離降到零時逃離失敗。',
    '通過全部十個路段即可抵達地下秘道入口。'
  ],
  postStory: [
    { text: '冒險者與小亞衝過最後一個路段，終於看見隱藏在岩壁間的地下秘道入口。' },
    { speaker: '小亞', text: '「就是這裡！快跟我進來！」' },
    { text: '小亞發動咒語打開入口機關，兩人在追兵趕到前進入秘道，入口隨即在身後關閉。' },
    { text: '暫時逃離了追兵，但前方的地下秘道一片黑暗，看來得花一番功夫才能通過了。' }
  ]
};

const LEVEL_SEVEN_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-07',
  tutorialId: 'sound-maze-rune-gate',
  preStory: [
    { text: '小亞施展照明魔法，微弱的光芒照亮了地下秘道，但只能看清附近的一小段道路。' },
    { speaker: '小亞', text: '「這條秘道已經很久沒有人使用了，裡面的道路錯綜複雜，我只記得大致的方向。」' },
    { text: '秘道中的道路被一道道古老符文門阻隔，注音水晶也感應到三枚散落在秘道中的聲音碎片。' },
    { speaker: '小亞', text: '「仔細聽符文門發出的讀音，選出正確的門，再利用聲音碎片找出秘道出口！」' }
  ],
  mission: '仔細聽目標讀音，選擇正確的符文門，找齊三枚聲音碎片並抵達秘道出口！',
  tutorialSteps: [
    '點擊目前可以到達的道路，讓冒險者向前移動。',
    '遇到符文門時，仔細聽目標讀音，選擇顯示正確符號的門。',
    '可以不限次數重播目標讀音。',
    '選錯符文門會進入短小的死路，之後自動返回原本的判定位置。',
    '找齊三枚聲音碎片後，依照出口提示離開秘道。'
  ],
  postStory: [
    { text: '冒險者與小亞依照聲音碎片形成的指引，終於走出了錯綜複雜的地下秘道。' },
    { text: '秘道的盡頭連接著城堡內部，但出口被一扇刻滿魔法符文的大門封住。' },
    { speaker: '小亞', text: '「這道門以前還沒有，應該是後來首席魔法師為了防止有人潛入而新設下的。」' },
    { text: '大門上有三道封印。正當小亞苦惱著如何開啟時，冒險者胸前的注音水晶產生了共鳴，亮了起來。' }
  ]
};

const LEVEL_EIGHT_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-08',
  tutorialId: 'sequence-lock-magic-door',
  preStory: [
    { text: '注音水晶的光芒照向魔法之門，門上的三道封印也跟著依序亮了起來。' },
    { text: '第一道封印傳出了一段咒語聲，數張注音符文卡隨即浮現在大門前。' },
    { speaker: '小亞', text: '「這道門使用的也是注音魔法！你的注音水晶應該能夠重現封印裡的聲音順序。」' },
    { speaker: '小亞', text: '「只要按照正確順序排列注音符文卡，應該就能逐一解開三道封印！」' }
  ],
  mission: '仔細聽注音的順序，依序將卡片放入鎖孔，解開魔法之門的三道封印！',
  tutorialSteps: [
    '點擊待選區的卡片，將它放入鎖孔。',
    '點擊鎖孔內的卡片，可以將它放回原位。',
    '按照正確順序填滿所有鎖孔後即可解開封印。',
    '可以不限次數重播聲音。'
  ],
  postStory: [
    { text: '三道封印全部解除，首席魔法師設下的魔法之門終於打開了。' },
    { speaker: '小亞', text: '「成功了！穿過這道門就是城堡內部，我們得小心前進。」' },
    { text: '冒險者與小亞走出秘道，在城堡中小心地前進著，昏暗的走廊中瀰漫著黑色霧氣。' },
    { text: '突然，一群迷霧士兵從黑霧中現身，擋住了兩人的去路。' }
  ]
};

const LEVEL_NINE_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-09',
  tutorialId: 'battle-castle-reminder',
  preStory: [
    { text: '迷霧士兵迅速包圍了冒險者與小亞，封住了前後的道路。' },
    { speaker: '小亞', text: '「這些是駐守城堡的士兵，數量比外面的巡邏隊更多！」' },
    { text: '冒險者胸前的注音水晶再次釋放光芒，注音符文出現在迷霧士兵面前。' },
    { speaker: '小亞', text: '「我們已經接近封印水晶了。擊敗他們，繼續往城堡深處前進！」' }
  ],
  mission: '運用注音水晶的力量，擊敗五波駐守城堡的迷霧士兵！',
  tutorialSteps: [
    '選定敵人後，聽清楚目標讀音並選出正確符文。',
    '戰鬥依照「玩家進行 2 回合，再由敵人進行 1 回合」的順序循環。',
    '任何回合正確作答都可以累積聲音能量。',
    '消耗 3 點能量可以發動「符音穿透」，並消耗一次玩家回合行動。',
    '玩家生命與聲音能量會延續至下一波。',
    '擊敗全部五波敵人即可獲勝。'
  ],
  howToSteps: [
    '選定敵人後，聽清楚目標讀音並選出正確符文；讀音可以不限次數重播。',
    '戰鬥依照「玩家進行 2 回合，再由敵人進行 1 回合」的順序循環，每次作答都會完成目前回合。',
    '玩家回合答對會攻擊，敵人回合答對會防禦；任何回合正確作答都累積 1 點聲音能量。',
    '玩家回合答錯會遭到反擊；敵人回合答錯則防禦失敗，兩者都會失去 1 點生命。',
    '消耗 3 點聲音能量可以發動「符音穿透」，無視護盾並直接削減敵人 2 點生命，同時消耗一次玩家回合行動。',
    '一般攻擊會先摧毀護盾敵人的一層護盾，不會削減生命；摧毀護盾仍會取得 1 點能量。',
    '玩家只剩 1 點生命且至少有 3 點能量時，「回音護盾」會自動擋下致命攻擊。',
    '玩家生命歸零時戰敗；擊敗全部五波敵人即可獲勝。'
  ],
  postStory: [
    { text: '最後一名迷霧士兵被擊敗，籠罩走廊的黑霧也逐漸消散。' },
    { text: '冒險者與小亞繼續深入城堡，前方傳來一股強大的封印魔力。' },
    { text: '城堡深處的大廳被巨大結界包圍，結界上浮現五組迷霧封印。透過結界，依稀可以看見迷霧將軍與封印水晶。' },
    { speaker: '小亞', text: '「迷霧將軍就在結界後面！只要破除這五組封印，我們就能進去阻止他！」' }
  ]
};

const LEVEL_TEN_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-10',
  tutorialId: 'memory-battle',
  preStory: [
    { text: '巨大的迷霧結界擋在大廳前方，五組封印在結界表面不斷發出黑色光芒。' },
    { speaker: '小亞', text: '「這道結界由五組迷霧封印組成，而且封印中的注音符文會不斷改變位置。」' },
    { text: '冒險者的注音水晶與結界產生共鳴，九張注音符文卡浮現在兩人面前。' },
    { speaker: '小亞', text: '「記住符文的位置，聽清楚目標讀音，找出相同的注音符文，就能逐一擊破結界的封印！」' }
  ],
  mission: '記住注音符文的位置，完成五組目標配對，在生命歸零前擊破結界！',
  tutorialSteps: [
    '開始時，九張符文卡會以 3 × 3 排列並打開顯示 5 秒，畫面不顯示倒數。',
    '卡片蓋上後，小亞只會播放一次目標讀音，不會顯示答案符號。',
    '翻出兩張與目標讀音相同的卡片後，第三張相同卡片會自動翻開；三張卡片移除並擊破一層結界。',
    '找錯時，結界會發動攻擊，使玩家失去 1 點生命。',
    '成功配對後，牌面會補入一組未出現過的新符文；九張卡片重新洗牌、重新分配字色並再次顯示 5 秒。',
    '可以不限次數重播目標讀音。',
    '完成全部五組配對即可破除結界。'
  ],
  postStory: [
    { text: '最後一組迷霧封印破裂，包圍大廳的巨大結界隨之崩解。' },
    { text: '通往封印水晶所在房間的道路終於開啟，迷霧將軍正在房間深處等待著冒險者。' },
    { text: '但破裂的結界仍不斷聚集黑霧，似乎正在嘗試重新形成。' },
    { speaker: '小亞', text: '「結界還在試圖恢復。我會留在這裡阻止它再生，你快去阻止迷霧將軍！」' },
    { text: '冒險者握緊注音水晶，獨自走進封印水晶所在的房間，準備迎接最後的決戰。' }
  ]
};

const LEVEL_ELEVEN_FLOW: CampaignLevelFlowContent = {
  levelId: 'level-11',
  tutorialId: 'boss-battle-reminder',
  preStory: [
    { text: '冒險者獨自走進房間。巨大的封印水晶懸浮在房間中央，迷霧將軍正站在水晶前方。' },
    { speaker: '迷霧將軍', text: '「竟然能突破城堡的守衛與迷霧結界，看來我小看了注音水晶的力量。」' },
    { speaker: '迷霧將軍', text: '「不過，只要我還守在這裡，你就別想破壞封印水晶！」' },
    { text: '迷霧將軍舉起武器，周圍的黑霧化為一批又一批迷霧士兵。' },
    { speaker: '迷霧將軍', text: '「來吧！讓我看看你能不能突破迷霧大軍，走到我的面前！」' }
  ],
  mission: '擊敗迷霧將軍召喚的部隊，突破五波戰鬥並打倒迷霧將軍！',
  tutorialSteps: [
    '玩家以 5 點生命及 0 點聲音能量開始，狀態會延續全部五波。',
    '每題提供 3 個注音符文，不使用答題倒數。',
    '前四波是迷霧將軍召喚的部隊，第五波直接對戰迷霧將軍。',
    '一般攻擊會先摧毀護盾；「符音穿透」可以無視護盾直接造成 2 點傷害，並消耗一次玩家回合行動。',
    '只剩 1 點生命且至少有 3 點能量時，「回音護盾」會自動擋下致命攻擊。',
    '生命歸零時必須從第一波重新挑戰；擊敗迷霧將軍即可完成第一章。'
  ],
  postStory: [
    { text: '注音水晶的光芒擊中了迷霧將軍，將軍身上的黑霧力量開始崩解。' },
    { speaker: '迷霧將軍', text: '「這場戰鬥還沒有結束……黑魔王一定會奪回這個王國！」' },
    { text: '迷霧將軍化為黑霧，從城堡中撤退，只留下失去保護的封印水晶。' },
    { text: '冒險者走向封印水晶，胸前的注音水晶與它產生了強烈共鳴。' },
    { text: '注音水晶釋放出耀眼光芒，封印水晶隨之碎裂。被封印的聲音化為無數光點，飛向注音王國各地。' },
    { text: '村民們終於重新發出了聲音，沉默已久的注音王國再次充滿歡笑與交談聲。' },
    { text: '在遙遠的寂靜王國裡，黑魔王察覺到封印水晶被破壞，與迷霧大軍的戰爭似乎沒那麼容易結束……' }
  ]
};

const CAMPAIGN_FLOW_CONTENT = new Map<string, CampaignLevelFlowContent>([
  [LEVEL_ONE_FLOW.levelId, LEVEL_ONE_FLOW],
  [LEVEL_TWO_FLOW.levelId, LEVEL_TWO_FLOW],
  [LEVEL_THREE_FLOW.levelId, LEVEL_THREE_FLOW],
  [LEVEL_FOUR_FLOW.levelId, LEVEL_FOUR_FLOW],
  [LEVEL_FIVE_FLOW.levelId, LEVEL_FIVE_FLOW],
  [LEVEL_SIX_FLOW.levelId, LEVEL_SIX_FLOW],
  [LEVEL_SEVEN_FLOW.levelId, LEVEL_SEVEN_FLOW],
  [LEVEL_EIGHT_FLOW.levelId, LEVEL_EIGHT_FLOW],
  [LEVEL_NINE_FLOW.levelId, LEVEL_NINE_FLOW],
  [LEVEL_TEN_FLOW.levelId, LEVEL_TEN_FLOW],
  [LEVEL_ELEVEN_FLOW.levelId, LEVEL_ELEVEN_FLOW]
]);

export function hasCampaignFlowContent(levelId: string): boolean {
  return CAMPAIGN_FLOW_CONTENT.has(levelId);
}

export function campaignFlowContent(level: CampaignLevelDefinition): CampaignLevelFlowContent {
  const content = CAMPAIGN_FLOW_CONTENT.get(level.id);
  if (!content) throw new Error('這個關卡的流程內容尚未建立');
  return content;
}

export function createCampaignFlowState(tutorialRequired: boolean): CampaignFlowState {
  return {
    phase: 'pre-story',
    storyPage: 0,
    overlay: null,
    tutorialRequired
  };
}

export function campaignFlowReducer(
  state: CampaignFlowState,
  action: CampaignFlowAction
): CampaignFlowState {
  switch (action.type) {
    case 'advance-pre-story':
      if (state.phase !== 'pre-story') return state;
      return state.storyPage + 1 < action.pageCount
        ? { ...state, storyPage: state.storyPage + 1 }
        : { ...state, phase: 'mission', storyPage: 0 };
    case 'previous-pre-story':
      return state.phase === 'pre-story' && state.storyPage > 0
        ? { ...state, storyPage: state.storyPage - 1 }
        : state;
    case 'skip-pre-story':
      return state.phase === 'pre-story'
        ? { ...state, phase: 'mission', storyPage: 0 }
        : state;
    case 'continue-mission':
      return state.phase === 'mission'
        ? { ...state, phase: state.tutorialRequired ? 'tutorial' : 'gameplay' }
        : state;
    case 'complete-tutorial':
      return state.phase === 'tutorial'
        ? { ...state, phase: 'gameplay', tutorialRequired: false }
        : state;
    case 'open-pause':
      return state.phase === 'gameplay' && state.overlay === null
        ? { ...state, overlay: 'pause' }
        : state;
    case 'open-how-to':
      return state.phase === 'gameplay'
        ? { ...state, overlay: action.origin === 'pause' ? 'how-to-paused' : 'how-to-direct' }
        : state;
    case 'close-how-to':
      if (state.overlay === 'how-to-paused') return { ...state, overlay: 'pause' };
      if (state.overlay === 'how-to-direct') return { ...state, overlay: null };
      return state;
    case 'resume':
      return state.overlay === 'pause' ? { ...state, overlay: null } : state;
    case 'request-abandon':
      return state.overlay === 'pause' ? { ...state, overlay: 'abandon-confirm' } : state;
    case 'cancel-abandon':
      return state.overlay === 'abandon-confirm' ? { ...state, overlay: 'pause' } : state;
    case 'begin-saving':
      return state.phase === 'gameplay'
        ? { ...state, phase: 'saving', overlay: null }
        : state;
    case 'save-succeeded':
      return state.phase === 'saving'
        ? { ...state, phase: 'post-story', storyPage: 0 }
        : state;
    case 'advance-post-story':
      if (state.phase !== 'post-story') return state;
      return state.storyPage + 1 < action.pageCount
        ? { ...state, storyPage: state.storyPage + 1 }
        : { ...state, phase: 'result', storyPage: 0 };
    case 'previous-post-story':
      return state.phase === 'post-story' && state.storyPage > 0
        ? { ...state, storyPage: state.storyPage - 1 }
        : state;
    case 'skip-post-story':
      return state.phase === 'post-story'
        ? { ...state, phase: 'result', storyPage: 0 }
        : state;
    case 'defeat':
      return state.phase === 'gameplay'
        ? { ...state, phase: 'defeat', overlay: null }
        : state;
    case 'retry':
      return state.phase === 'result' || state.phase === 'defeat'
        ? { ...state, phase: 'mission', storyPage: 0, overlay: null }
        : state;
    default:
      return state;
  }
}
