// 정답 포맷으로 작성 (2칸 들여쓰기). 규칙:
// - 한 줄 32자 이내, 영어만 (한글은 고정폭이 깨진다)
// - 한 줄짜리 { ... } 금지 (객체·블록은 항상 여러 줄)
// - 템플릿 리터럴·정규식·삼항 연산자 금지
// - 위반을 넣을 자리가 많도록: 짧은 문장을 연달아, 본문 한 줄짜리 짧은 블록을 여럿

export interface Snippet {
  file: string;
  src: string;
}

export const SNIPPETS: Snippet[] = [
  {
    file: "feeder.ts",
    src: `function feed(cat, bowl) {
  if (bowl.empty) {
    return meow(cat);
  }
  cat.sit();
  bowl.fill(3);
  cat.eat(bowl);
  cat.lick();
  cat.purr();
  return cat;
}

function meow(cat) {
  if (cat.loud) {
    cat.yell();
  }
  cat.mood = 'grumpy';
  cat.stare();
  cat.pace();
  return cat.say('feed me');
}`,
  },
  {
    file: "nap.ts",
    src: `const NAP_LIMIT = 16;

function napTime(cat, hours) {
  let total = 0;
  let dreams = 0;
  for (let h = 0; h < hours; h++) {
    if (cat.sleepy(h)) {
      total = total + 1;
    }
  }
  if (total > NAP_LIMIT) {
    cat.loaf();
  } else {
    cat.zoom();
  }
  cat.stretch();
  cat.yawn();
  dreams = total * 2;
  return dreams;
}`,
  },
  {
    file: "review.ts",
    src: `function review(code) {
  const lines = code.split('\\n');
  let nags = 0;
  let naps = 0;
  for (const line of lines) {
    if (line.length > 40) {
      nags = nags + 1;
    }
    if (line.endsWith(' ')) {
      nags = nags + 1;
    }
    naps = naps + 1;
  }
  const score = nags * 10;
  log(score);
  hiss();
  return score - naps;
}`,
  },
  {
    file: "treats.ts",
    src: `const treats = [
  'tuna',
  'salmon',
  'chicken',
];

function pickTreat(cat) {
  const i = cat.mood % 3;
  const treat = treats[i];
  if (cat.isFull) {
    return null;
  }
  if (cat.isSad) {
    cat.hug();
  }
  cat.purr();
  cat.blink();
  cat.happy += 5;
  return treat;
}`,
  },
  {
    file: "box.ts",
    src: `class Box {
  constructor(size) {
    this.size = size;
    this.cats = [];
    this.warm = false;
  }

  fits(cat) {
    return cat.size <= this.size;
  }

  enter(cat) {
    if (!this.fits(cat)) {
      return false;
    }
    this.cats.push(cat);
    this.warm = true;
    cat.sit();
    cat.nap();
    return true;
  }
}`,
  },
  {
    file: "laser.ts",
    src: `const laser = {
  x: 0,
  y: 0,
};

function chase(cat, dot) {
  const dx = dot.x - cat.x;
  const dy = dot.y - cat.y;
  cat.x += dx / 2;
  cat.y += dy / 2;
  if (dx === 0) {
    cat.pounce(dot);
  }
  if (cat.tired) {
    return cat;
  }
  cat.wiggle();
  cat.tail = 'up';
  return cat;
}`,
  },
];
