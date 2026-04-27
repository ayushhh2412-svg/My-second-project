// ===== CONFIG =====
const ROWS = 7, COLS = 7;
const EMOJIS = ['🍎','🍋','🍇','🫐','🍊','🍓'];
const GAME_TIME = 60;
const POINTS = { 3: 30, 4: 70, 5: 150 };

// ===== STATE =====
let grid = [], score = 0, best = 0, timer = GAME_TIME;
let selected = null, interval = null, busy = false;

// ===== ELEMENTS =====
const startScreen  = document.getElementById('startScreen');
const gameScreen   = document.getElementById('gameScreen');
const overScreen   = document.getElementById('overScreen');
const boardEl      = document.getElementById('board');
const scoreVal     = document.getElementById('scoreVal');
const timerVal     = document.getElementById('timerVal');
const bestVal      = document.getElementById('bestVal');
const overScore    = document.getElementById('overScore');
const overEmoji    = document.getElementById('overEmoji');
const overBestMsg  = document.getElementById('overBestMsg');
const comboToast   = document.getElementById('comboToast');

document.getElementById('startBtn').onclick    = startGame;
document.getElementById('playAgainBtn').onclick = startGame;
document.getElementById('menuBtn').onclick      = showMenu;

// ===== SHOW SCREENS =====
function showMenu() {
  clearInterval(interval);
  startScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
}

function showOver() {
  clearInterval(interval);
  gameScreen.classList.add('hidden');
  overScreen.classList.remove('hidden');
  overScore.textContent = score;

  if (score > best) {
    best = score;
    localStorage.setItem('emojicrush_best', best);
    overBestMsg.textContent = '🏆 New Best Score!';
    overEmoji.textContent = '🥳';
  } else {
    overBestMsg.textContent = `Best: ${best}`;
    overEmoji.textContent = score >= 300 ? '🔥' : score >= 150 ? '😄' : '😅';
  }
  bestVal.textContent = best;
}

// ===== START GAME =====
function startGame() {
  score = 0; timer = GAME_TIME; selected = null; busy = false;
  best = parseInt(localStorage.getItem('emojicrush_best') || '0');
  bestVal.textContent = best;
  scoreVal.textContent = 0;
  timerVal.textContent = GAME_TIME;
  gameScreen.classList.remove('timer-low');

  startScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  initGrid();
  renderBoard();
  resolveAll(() => {});

  clearInterval(interval);
  interval = setInterval(() => {
    timer--;
    timerVal.textContent = timer;
    if (timer <= 10) gameScreen.classList.add('timer-low');
    if (timer <= 0) showOver();
  }, 1000);
}

// ===== GRID INIT =====
function initGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = safeEmoji(r, c);
    }
  }
}

function safeEmoji(r, c) {
  let attempts = 0;
  while (attempts < 20) {
    const e = Math.floor(Math.random() * EMOJIS.length);
    if (!wouldMatch(r, c, e)) return e;
    attempts++;
  }
  return Math.floor(Math.random() * EMOJIS.length);
}

function wouldMatch(r, c, e) {
  if (c >= 2 && grid[r][c-1] === e && grid[r][c-2] === e) return true;
  if (r >= 2 && grid[r-1][c] === e && grid[r-2][c] === e) return true;
  return false;
}

// ===== RENDER =====
function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.dataset.e = grid[r][c];
      cell.textContent = EMOJIS[grid[r][c]];
      cell.onclick = () => onCellClick(r, c);
      boardEl.appendChild(cell);
    }
  }
}

function getCell(r, c) {
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

function updateCell(r, c) {
  const el = getCell(r, c);
  if (!el) return;
  el.dataset.e = grid[r][c];
  el.textContent = EMOJIS[grid[r][c]];
  el.classList.remove('selected');
}

// ===== CLICK HANDLER =====
function onCellClick(r, c) {
  if (busy || timer <= 0) return;

  if (selected === null) {
    selected = { r, c };
    getCell(r, c).classList.add('selected');
    return;
  }

  const prev = selected;
  selected = null;
  getCell(prev.r, prev.c).classList.remove('selected');

  if (prev.r === r && prev.c === c) return;

  const dr = Math.abs(r - prev.r), dc = Math.abs(c - prev.c);
  if (dr + dc !== 1) {
    // Not adjacent — select new
    selected = { r, c };
    getCell(r, c).classList.add('selected');
    return;
  }

  trySwap(prev.r, prev.c, r, c);
}

// ===== SWAP =====
function trySwap(r1, c1, r2, c2) {
  busy = true;

  // Animate swap
  const a = getCell(r1, c1), b = getCell(r2, c2);
  const animA = r1 === r2 ? (c2 > c1 ? 'swap-right' : 'swap-left') : (r2 > r1 ? 'swap-down' : 'swap-up');
  const animB = r1 === r2 ? (c2 > c1 ? 'swap-left' : 'swap-right') : (r2 > r1 ? 'swap-up' : 'swap-down');
  a.classList.add(animA);
  b.classList.add(animB);

  setTimeout(() => {
    a.classList.remove(animA);
    b.classList.remove(animB);

    // Do swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    updateCell(r1, c1);
    updateCell(r2, c2);

    const matches = findMatches();
    if (matches.length === 0) {
      // Swap back
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      updateCell(r1, c1);
      updateCell(r2, c2);
      shakeCell(r1, c1);
      shakeCell(r2, c2);
      busy = false;
    } else {
      resolveAll(() => { busy = false; });
    }
  }, 220);
}

function shakeCell(r, c) {
  const el = getCell(r, c);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'swapLeft 0.2s ease';
  setTimeout(() => el.style.animation = '', 200);
}

// ===== MATCH FINDING =====
function findMatches() {
  const matched = new Set();

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 3; c++) {
      const e = grid[r][c];
      if (e === -1) continue;
      let len = 1;
      while (c + len < COLS && grid[r][c + len] === e) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${r},${c+i}`);
        c += len - 1;
      }
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const e = grid[r][c];
      if (e === -1) continue;
      let len = 1;
      while (r + len < ROWS && grid[r + len][c] === e) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${r+i},${c}`);
        r += len - 1;
      }
    }
  }

  return [...matched].map(k => { const [r,c] = k.split(',').map(Number); return {r,c}; });
}

// ===== RESOLVE CHAIN =====
function resolveAll(cb) {
  const matches = findMatches();
  if (matches.length === 0) { cb(); return; }

  // Score
  const pts = POINTS[Math.min(matches.length, 5)] || matches.length * 30;
  score += pts;
  scoreVal.textContent = score;
  showToast(matches.length);

  // Animate crush
  matches.forEach(({r, c}) => {
    const el = getCell(r, c);
    if (el) el.classList.add('matched');
    grid[r][c] = -1;
  });

  setTimeout(() => {
    // Remove matched
    matches.forEach(({r, c}) => {
      const el = getCell(r, c);
      if (el) el.classList.remove('matched');
    });

    // Drop down
    dropCells();

    // Fill top
    fillEmpty();

    // Re-render
    renderBoard();

    // Chain
    setTimeout(() => resolveAll(cb), 200);
  }, 380);
}

function dropCells() {
  for (let c = 0; c < COLS; c++) {
    let empty = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== -1) {
        grid[empty][c] = grid[r][c];
        if (empty !== r) grid[r][c] = -1;
        empty--;
      }
    }
  }
}

function fillEmpty() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === -1) {
        grid[r][c] = Math.floor(Math.random() * EMOJIS.length);
      }
    }
  }
}

// ===== TOAST =====
function showToast(count) {
  let msg = '';
  if (count >= 5) msg = '🔥 MEGA CRUSH!';
  else if (count >= 4) msg = '⚡ SUPER MATCH!';
  else if (count >= 3) msg = '✨ Nice Match!';
  else return;

  comboToast.textContent = msg;
  comboToast.classList.remove('hidden');
  comboToast.style.animation = 'none';
  comboToast.offsetHeight;
  comboToast.style.animation = 'toastPop 0.8s ease forwards';

  setTimeout(() => comboToast.classList.add('hidden'), 850);
}
