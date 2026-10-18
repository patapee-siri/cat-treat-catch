/** Static game data and tuning. No side effects, safe to import anywhere. */

export const CATS = [
  {
    id: 'crookshanks',
    name: 'ครุกแชงค์ส',
    img: 'img/cats/crookshanks-sticker.png',
    pitch: 0.82,
    pros: ['ขี้อ้อนมากกกก!', 'จำชื่อตัวเองได้'],
    cons: ['ฉี่เหม็น'],
  },
  {
    id: 'ginny',
    name: 'จินนี่',
    img: 'img/cats/ginny-sticker.png',
    pitch: 1.0,
    pros: ['ขี้อ้อนบางเวลา', 'ฉลาด', 'กลบขี้เก่ง'],
    cons: ['ดื้อมาก', 'ขี้สงสัยเกินเหตุ'],
  },
  {
    id: 'lumos',
    name: 'ลูมอส',
    img: 'img/cats/lumos-sticker.png',
    pitch: 1.25,
    pros: ['น่ารัก', 'กอดอุ่น', 'เสียงหวาน'],
    cons: ['ขี้ผิดที่'],
  },
];

/** kind: good = catch it, bad = dodge it, power = special pickup. */
export const ITEM_DEFS = {
  fish:      { src: 'img/items/fish.svg',      kind: 'good',  weight: 3 },
  drumstick: { src: 'img/items/drumstick.svg', kind: 'good',  weight: 2 },
  sushi:     { src: 'img/items/sushi.svg',     kind: 'good',  weight: 2 },
  yarn:      { src: 'img/items/yarn.svg',      kind: 'good',  weight: 2 },
  cookie:    { src: 'img/items/cookie.svg',    kind: 'good',  weight: 2 },
  cucumber:  { src: 'img/items/cucumber.svg',  kind: 'bad',   weight: 1 },
  bomb:      { src: 'img/items/bomb.svg',      kind: 'bad',   weight: 1 },
  magnet:    { src: 'img/items/magnet.svg',    kind: 'power', weight: 0 },
};

export const TUNING = {
  comboWindow: 1.2,        // seconds between catches to keep a combo alive
  magnetDuration: 4,       // seconds
  fallSpeed: [130, 190],   // px/s before the difficulty multiplier
  speedGain: 0.014,        // difficulty ramp per second
  speedCap: 2.5,
  readyStep: 0.55,         // seconds per 3-2-1-GO tick
  ratingSteps: [8, 20, 40] // score needed for 1 / 2 / 3 paws
};

export const END_LINES = [
  'พวกเรารักแม่นะ! 💕',
  'ขอบใจที่มาเล่นด้วยนะ เหมียว~',
  'เก่งมาก! ไปเล่นกับแมวตัวจริงมั้ย?',
  'ของว่างหมดแล้ว มาเติมใหม่กันเถอะ',
  'หิวจัง เล่นอีกตาได้ป่ะ? 🥺',
];

export const PALETTES = {
  day: {
    skyTop: '#fff3f0', skyBottom: '#ffc2d6',
    hillFar: '#ffd5e3', hillNear: '#ffb5cb',
    groundTop: '#ffb0c8', groundBottom: '#ff8fb3', groundLine: '#d9587f',
    cloud: '#ffffff', cloudShade: '#f6cfdd', glow: '#fff1c2',
  },
  night: {
    skyTop: '#1e1646', skyBottom: '#4a3a8f',
    hillFar: '#4b3d92', hillNear: '#3a2d7c',
    groundTop: '#322766', groundBottom: '#241b50', groundLine: '#7a69d4',
    cloud: '#8d82cf', cloudShade: '#6d62b3', glow: '#b9a8ff',
  },
};

export const INK = '#4a2c3a';
