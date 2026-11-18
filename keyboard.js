/**
 * Модуль клавиатуры и визуализации рук
 * Раскладка ЙЦУКЕН (Russian Standard) с привязкой пальцев и правилом противоположного Shift
 */

const FINGER_MAP = {
  L_PINKY:  { id: 'L_PINKY',  name: 'Левый мизинец',     color: '#f43f5e', hand: 'left',  idx: 0, cssClass: 'finger-l-pinky' },
  L_RING:   { id: 'L_RING',   name: 'Левый безымянный',  color: '#a855f7', hand: 'left',  idx: 1, cssClass: 'finger-l-ring' },
  L_MIDDLE: { id: 'L_MIDDLE', name: 'Левый средний',     color: '#3b82f6', hand: 'left',  idx: 2, cssClass: 'finger-l-middle' },
  L_INDEX:  { id: 'L_INDEX',  name: 'Левый указательный',color: '#10b981', hand: 'left',  idx: 3, cssClass: 'finger-l-index' },
  L_THUMB:  { id: 'L_THUMB',  name: 'Большой палец',     color: '#64748b', hand: 'left',  idx: 4, cssClass: 'finger-thumb' },
  R_THUMB:  { id: 'R_THUMB',  name: 'Большой палец',     color: '#64748b', hand: 'right', idx: 4, cssClass: 'finger-thumb' },
  R_INDEX:  { id: 'R_INDEX',  name: 'Правый указательный',color: '#f59e0b', hand: 'right', idx: 3, cssClass: 'finger-r-index' },
  R_MIDDLE: { id: 'R_MIDDLE', name: 'Правый средний',    color: '#06b6d4', hand: 'right', idx: 2, cssClass: 'finger-r-middle' },
  R_RING:   { id: 'R_RING',   name: 'Правый безымянный', color: '#8b5cf6', hand: 'right', idx: 1, cssClass: 'finger-r-ring' },
  R_PINKY:  { id: 'R_PINKY',  name: 'Правый мизинец',    color: '#ec4899', hand: 'right', idx: 0, cssClass: 'finger-r-pinky' }
};

const KEYBOARD_ROWS = [
  // Ряд 0: цифры и спецсимволы
  [
    { code: 'Backquote', normal: 'ё', shift: 'Ё', finger: 'L_PINKY', width: 1 },
    { code: 'Digit1', normal: '1', shift: '!', finger: 'L_PINKY', width: 1 },
    { code: 'Digit2', normal: '2', shift: '"', finger: 'L_RING', width: 1 },
    { code: 'Digit3', normal: '3', shift: '№', finger: 'L_MIDDLE', width: 1 },
    { code: 'Digit4', normal: '4', shift: ';', finger: 'L_INDEX', width: 1 },
    { code: 'Digit5', normal: '5', shift: '%', finger: 'L_INDEX', width: 1 },
    { code: 'Digit6', normal: '6', shift: ':', finger: 'R_INDEX', width: 1 },
    { code: 'Digit7', normal: '7', shift: '?', finger: 'R_INDEX', width: 1 },
    { code: 'Digit8', normal: '8', shift: '*', finger: 'R_MIDDLE', width: 1 },
    { code: 'Digit9', normal: '9', shift: '(', finger: 'R_RING', width: 1 },
    { code: 'Digit0', normal: '0', shift: ')', finger: 'R_PINKY', width: 1 },
    { code: 'Minus', normal: '-', shift: '_', finger: 'R_PINKY', width: 1 },
    { code: 'Equal', normal: '=', shift: '+', finger: 'R_PINKY', width: 1 },
    { code: 'Backspace', label: 'Backspace', display: '⌫ Стереть', finger: 'R_PINKY', width: 2, isSpecial: true }
  ],
  // Ряд 1: верхний буквенный
  [
    { code: 'Tab', label: 'Tab', display: 'Tab ⇥', finger: 'L_PINKY', width: 1.5, isSpecial: true },
    { code: 'KeyQ', normal: 'й', shift: 'Й', finger: 'L_PINKY', width: 1 },
    { code: 'KeyW', normal: 'ц', shift: 'Ц', finger: 'L_RING', width: 1 },
    { code: 'KeyE', normal: 'у', shift: 'У', finger: 'L_MIDDLE', width: 1 },
    { code: 'KeyR', normal: 'к', shift: 'К', finger: 'L_INDEX', width: 1 },
    { code: 'KeyT', normal: 'е', shift: 'Е', finger: 'L_INDEX', width: 1 },
    { code: 'KeyY', normal: 'н', shift: 'Н', finger: 'R_INDEX', width: 1 },
    { code: 'KeyU', normal: 'г', shift: 'Г', finger: 'R_INDEX', width: 1 },
    { code: 'KeyI', normal: 'ш', shift: 'Ш', finger: 'R_MIDDLE', width: 1 },
    { code: 'KeyO', normal: 'щ', shift: 'Щ', finger: 'R_RING', width: 1 },
    { code: 'KeyP', normal: 'з', shift: 'З', finger: 'R_PINKY', width: 1 },
    { code: 'BracketLeft', normal: 'х', shift: 'Х', finger: 'R_PINKY', width: 1 },
    { code: 'BracketRight', normal: 'ъ', shift: 'Ъ', finger: 'R_PINKY', width: 1 },
    { code: 'Backslash', normal: '\\', shift: '/', finger: 'R_PINKY', width: 1.5 }
  ],
  // Ряд 2: домашний опорный ряд
  [
    { code: 'CapsLock', label: 'Caps Lock', display: 'Caps ⇪', finger: 'L_PINKY', width: 1.75, isSpecial: true },
    { code: 'KeyA', normal: 'ф', shift: 'Ф', finger: 'L_PINKY', width: 1 },
    { code: 'KeyS', normal: 'ы', shift: 'Ы', finger: 'L_RING', width: 1 },
    { code: 'KeyD', normal: 'в', shift: 'В', finger: 'L_MIDDLE', width: 1 },
    { code: 'KeyF', normal: 'а', shift: 'А', finger: 'L_INDEX', width: 1, marker: true },
    { code: 'KeyG', normal: 'п', shift: 'П', finger: 'L_INDEX', width: 1 },
    { code: 'KeyH', normal: 'р', shift: 'Р', finger: 'R_INDEX', width: 1 },
    { code: 'KeyJ', normal: 'о', shift: 'О', finger: 'R_INDEX', width: 1, marker: true },
    { code: 'KeyK', normal: 'л', shift: 'Л', finger: 'R_MIDDLE', width: 1 },
    { code: 'KeyL', normal: 'д', shift: 'Д', finger: 'R_RING', width: 1 },
    { code: 'Semicolon', normal: 'ж', shift: 'Ж', finger: 'R_PINKY', width: 1 },
    { code: 'Quote', normal: 'э', shift: 'Э', finger: 'R_PINKY', width: 1 },
    { code: 'Enter', label: 'Enter', display: 'Ввод ↵', finger: 'R_PINKY', width: 2.25, isSpecial: true }
  ],
  // Ряд 3: нижний буквенный
  [
    { code: 'ShiftLeft', label: 'Shift', display: '⇧ Shift', finger: 'L_PINKY', width: 2.25, isSpecial: true, isShift: true },
    { code: 'KeyZ', normal: 'я', shift: 'Я', finger: 'L_PINKY', width: 1 },
    { code: 'KeyX', normal: 'ч', shift: 'Ч', finger: 'L_RING', width: 1 },
    { code: 'KeyC', normal: 'с', shift: 'С', finger: 'L_MIDDLE', width: 1 },
    { code: 'KeyV', normal: 'м', shift: 'М', finger: 'L_INDEX', width: 1 },
    { code: 'KeyB', normal: 'и', shift: 'И', finger: 'L_INDEX', width: 1 },
    { code: 'KeyN', normal: 'т', shift: 'Т', finger: 'R_INDEX', width: 1 },
    { code: 'KeyM', normal: 'ь', shift: 'Ь', finger: 'R_INDEX', width: 1 },
    { code: 'Comma', normal: 'б', shift: 'Б', finger: 'R_MIDDLE', width: 1 },
    { code: 'Period', normal: 'ю', shift: 'Ю', finger: 'R_RING', width: 1 },
    { code: 'Slash', normal: '.', shift: ',', finger: 'R_PINKY', width: 1 },
    { code: 'ShiftRight', label: 'Shift', display: '⇧ Shift', finger: 'R_PINKY', width: 2.75, isSpecial: true, isShift: true }
  ],
  // Ряд 4: пробел и модификаторы
  [
    { code: 'ControlLeft', label: 'Ctrl', display: 'Ctrl', finger: 'L_PINKY', width: 1.5, isSpecial: true },
    { code: 'AltLeft', label: 'Alt', display: 'Alt', finger: 'L_THUMB', width: 1.25, isSpecial: true },
    { code: 'Space', label: 'Пробел', display: 'Пробел  ␣', normal: ' ', shift: ' ', finger: 'R_THUMB', width: 6.5, isSpace: true },
    { code: 'AltRight', label: 'Alt', display: 'Alt', finger: 'R_THUMB', width: 1.25, isSpecial: true },
    { code: 'ControlRight', label: 'Ctrl', display: 'Ctrl', finger: 'R_PINKY', width: 1.5, isSpecial: true }
  ]
];

// Быстрый индекс соответствия символа -> клавиша и палец
const CHAR_TO_KEY_MAP = {};

(function buildCharIndex() {
  // Пробел
  CHAR_TO_KEY_MAP[' '] = {
    code: 'Space',
    finger: FINGER_MAP.R_THUMB,
    needShift: false,
    display: '␣'
  };

  // Перенос строки
  CHAR_TO_KEY_MAP['\n'] = {
    code: 'Enter',
    finger: FINGER_MAP.R_PINKY,
    needShift: false,
    display: '↵'
  };

  KEYBOARD_ROWS.forEach(row => {
    row.forEach(k => {
      const fingerObj = FINGER_MAP[k.finger];
      if (k.normal) {
        CHAR_TO_KEY_MAP[k.normal] = {
          code: k.code,
          finger: fingerObj,
          needShift: false,
          shiftCode: null
        };
      }
      if (k.shift && k.shift !== k.normal) {
        // Противоположный Shift:
        // Если клавиша нажимается левой рукой, Shift держим правой (ShiftRight, R_PINKY)
        // Если клавиша нажимается правой рукой, Shift держим левой (ShiftLeft, L_PINKY)
        const isLeftHand = fingerObj.hand === 'left';
        const shiftCode = isLeftHand ? 'ShiftRight' : 'ShiftLeft';
        const shiftFinger = isLeftHand ? FINGER_MAP.R_PINKY : FINGER_MAP.L_PINKY;

        CHAR_TO_KEY_MAP[k.shift] = {
          code: k.code,
          finger: fingerObj,
          needShift: true,
          shiftCode: shiftCode,
          shiftFinger: shiftFinger
        };
      }
    });
  });
})();

// Подсказка при ошибочной английской раскладке
const EN_TO_RU_MAP = {
  '`': 'ё', '~': 'Ё', 'q': 'й', 'Q': 'Й', 'w': 'ц', 'W': 'Ц', 'e': 'у', 'E': 'У',
  'r': 'к', 'R': 'К', 't': 'е', 'T': 'Е', 'y': 'н', 'Y': 'Н', 'u': 'г', 'U': 'Г',
  'i': 'ш', 'I': 'Ш', 'o': 'щ', 'O': 'Щ', 'p': 'з', 'P': 'З', '[': 'х', '{': 'Х',
  ']': 'ъ', '}': 'Ъ', 'a': 'ф', 'A': 'Ф', 's': 'ы', 'S': 'Ы', 'd': 'в', 'D': 'В',
  'f': 'а', 'F': 'А', 'g': 'п', 'G': 'П', 'h': 'р', 'H': 'Р', 'j': 'о', 'J': 'О',
  'k': 'л', 'K': 'Л', 'l': 'д', 'L': 'Д', ';': 'ж', ':': 'Ж', "'": 'э', '"': 'Э',
  'z': 'я', 'Z': 'Я', 'x': 'ч', 'X': 'Ч', 'c': 'с', 'C': 'С', 'v': 'м', 'V': 'М',
  'b': 'и', 'B': 'И', 'n': 'т', 'N': 'Т', 'm': 'ь', 'M': 'Ь', ',': 'б', '<': 'Б',
  '.': 'ю', '>': 'Ю', '/': '.', '?': ','
};

class VirtualKeyboardManager {
  constructor(containerEl, handsContainerEl) {
    this.container = containerEl;
    this.handsContainer = handsContainerEl;
    this.activeChar = null;
    this.activeKeyElement = null;
    this.activeShiftElement = null;
    this.keyElements = {};
    this.render();
  }

  render() {
    this.renderKeyboard();
    this.renderHands();
  }

  renderKeyboard() {
    this.container.innerHTML = '';
    const kbWrapper = document.createElement('div');
    kbWrapper.className = 'virtual-keyboard';

    KEYBOARD_ROWS.forEach((row, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = `kb-row kb-row-${rowIdx}`;

      row.forEach(k => {
        const keyEl = document.createElement('div');
        keyEl.className = 'kb-key';
        keyEl.dataset.code = k.code;
        keyEl.dataset.finger = k.finger;

        // Применяем цветовую палитру пальца
        const fingerObj = FINGER_MAP[k.finger];
        if (fingerObj) {
          keyEl.style.setProperty('--finger-color', fingerObj.color);
          keyEl.classList.add(fingerObj.cssClass);
        }

        if (k.width && k.width > 1) {
          keyEl.style.flex = `${k.width}`;
        }
        if (k.isSpecial) keyEl.classList.add('key-special');
        if (k.isShift) keyEl.classList.add('key-shift');
        if (k.isSpace) keyEl.classList.add('key-space');
        if (k.marker) keyEl.classList.add('key-marker'); // рельефная засечка для опорного пальца

        // Текст на клавише
        if (k.display) {
          keyEl.innerHTML = `<span class="key-main">${k.display}</span>`;
        } else if (k.normal) {
          const shiftPart = k.shift && k.shift !== k.normal ? `<span class="key-shift-char">${k.shift}</span>` : '';
          keyEl.innerHTML = `${shiftPart}<span class="key-normal-char">${k.normal}</span>`;
        } else {
          keyEl.innerHTML = `<span class="key-main">${k.label || ''}</span>`;
        }

        rowEl.appendChild(keyEl);
        this.keyElements[k.code] = keyEl;
      });

      kbWrapper.appendChild(rowEl);
    });

    this.container.appendChild(kbWrapper);
  }

  renderHands() {
    if (!this.handsContainer) return;
    this.handsContainer.innerHTML = `
      <div class="hands-guide-card">
        <svg class="hands-svg" viewBox="0 0 860 215" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="center-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#4f46e5" flood-opacity="0.35" />
            </filter>
          </defs>

          <!-- ================= ЛЕВАЯ РУКА ================= -->
          <g id="hand-left" transform="translate(60, 10)">
            <text x="125" y="200" class="hand-title">ЛЕВАЯ РУКА</text>

            <!-- Ладонь и запястье -->
            <path class="hand-palm" d="
              M 55,182
              C 50,152 40,126 35,110
              C 30,95 42,88 50,88
              L 142,88
              C 152,88 165,98 160,115
              C 155,130 152,145 150,182
              Z" />

            <!-- Мизинец (L_PINKY) -->
            <g class="finger-group f-pinky-l" id="f-L_PINKY" transform="rotate(-12 36 95)">
              <rect class="finger-phalanx" x="25" y="44" width="22" height="58" rx="11" />
              <rect class="finger-nail" x="28" y="47" width="16" height="14" rx="6" />
              <circle class="finger-pad-dot" cx="36" cy="54" r="5" />
              <text class="finger-tag" x="36" y="125" transform="rotate(12 36 125)">Миз</text>
            </g>

            <!-- Безымянный (L_RING) -->
            <g class="finger-group f-ring-l" id="f-L_RING" transform="rotate(-5 65 90)">
              <rect class="finger-phalanx" x="53" y="24" width="23" height="74" rx="11.5" />
              <rect class="finger-nail" x="56.5" y="27" width="16" height="15" rx="6" />
              <circle class="finger-pad-dot" cx="64.5" cy="34" r="5.5" />
              <text class="finger-tag" x="64.5" y="125" transform="rotate(5 64.5 125)">Без</text>
            </g>

            <!-- Средний (L_MIDDLE) -->
            <g class="finger-group f-middle-l" id="f-L_MIDDLE" transform="rotate(0 95 90)">
              <rect class="finger-phalanx" x="83" y="12" width="24" height="84" rx="12" />
              <rect class="finger-nail" x="86.5" y="15" width="17" height="16" rx="6" />
              <circle class="finger-pad-dot" cx="95" cy="23" r="6" />
              <text class="finger-tag" x="95" y="125">Ср</text>
            </g>

            <!-- Указательный (L_INDEX, опорная А) -->
            <g class="finger-group f-index-l" id="f-L_INDEX" transform="rotate(5 125 90)">
              <rect class="finger-phalanx" x="113" y="22" width="24" height="76" rx="12" />
              <rect class="finger-nail" x="116.5" y="25" width="17" height="15" rx="6" />
              <circle class="finger-pad-dot" cx="125" cy="32" r="6" />
              <!-- Рельефная засечка клавиши А -->
              <line x1="120" y1="48" x2="130" y2="48" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
              <text class="finger-tag" x="125" y="125" transform="rotate(-5 125 125)">Ук [А]</text>
            </g>

            <!-- Большой палец (L_THUMB, пробел) -->
            <g class="finger-group f-thumb-l" id="f-L_THUMB" transform="rotate(-38 152 115)">
              <rect class="finger-phalanx" x="145" y="86" width="24" height="60" rx="12" />
              <rect class="finger-nail" x="148.5" y="89" width="17" height="14" rx="6" />
              <circle class="finger-pad-dot" cx="157" cy="96" r="5.5" />
              <text class="finger-tag" x="165" y="160" transform="rotate(38 165 160)">Бол</text>
            </g>
          </g>

          <!-- ================= ЦЕНТРАЛЬНЫЙ БЛОК ================= -->
          <g id="center-display" transform="translate(365, 18)">
            <rect class="center-display-card" x="0" y="0" width="130" height="156" rx="18" />
            <text x="65" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="#94a3b8" letter-spacing="1">КЛАВИША</text>
            
            <rect class="center-key-box" x="30" y="34" width="70" height="64" rx="14" filter="url(#center-glow)" />
            <text id="target-char-display" x="65" y="78" text-anchor="middle" font-size="34" font-weight="900" fill="#ffffff">-</text>
            
            <text id="target-finger-tip" x="65" y="120" text-anchor="middle" font-size="12" font-weight="800" fill="#1e293b">Нажми клавишу</text>
            <text id="target-finger-sub" x="65" y="138" text-anchor="middle" font-size="10" font-weight="700" fill="#64748b">Опорный ряд</text>
          </g>

          <!-- ================= ПРАВАЯ РУКА ================= -->
          <g id="hand-right" transform="translate(565, 10)">
            <text x="125" y="200" class="hand-title">ПРАВАЯ РУКА</text>

            <!-- Ладонь и запястье -->
            <path class="hand-palm" d="
              M 100,182
              C 98,145 95,130 90,115
              C 85,98 98,88 108,88
              L 200,88
              C 208,88 220,95 215,110
              C 210,126 200,152 195,182
              Z" />

            <!-- Большой палец (R_THUMB, пробел) -->
            <g class="finger-group f-thumb-r" id="f-R_THUMB" transform="rotate(38 98 115)">
              <rect class="finger-phalanx" x="81" y="86" width="24" height="60" rx="12" />
              <rect class="finger-nail" x="84.5" y="89" width="17" height="14" rx="6" />
              <circle class="finger-pad-dot" cx="93" cy="96" r="5.5" />
              <text class="finger-tag" x="85" y="160" transform="rotate(-38 85 160)">Бол</text>
            </g>

            <!-- Указательный (R_INDEX, опорная О) -->
            <g class="finger-group f-index-r" id="f-R_INDEX" transform="rotate(-5 125 90)">
              <rect class="finger-phalanx" x="113" y="22" width="24" height="76" rx="12" />
              <rect class="finger-nail" x="116.5" y="25" width="17" height="15" rx="6" />
              <circle class="finger-pad-dot" cx="125" cy="32" r="6" />
              <!-- Рельефная засечка клавиши О -->
              <line x1="120" y1="48" x2="130" y2="48" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" />
              <text class="finger-tag" x="125" y="125" transform="rotate(5 125 125)">Ук [О]</text>
            </g>

            <!-- Средний (R_MIDDLE) -->
            <g class="finger-group f-middle-r" id="f-R_MIDDLE" transform="rotate(0 155 90)">
              <rect class="finger-phalanx" x="143" y="12" width="24" height="84" rx="12" />
              <rect class="finger-nail" x="146.5" y="15" width="17" height="16" rx="6" />
              <circle class="finger-pad-dot" cx="155" cy="23" r="6" />
              <text class="finger-tag" x="155" y="125">Ср</text>
            </g>

            <!-- Безымянный (R_RING) -->
            <g class="finger-group f-ring-r" id="f-R_RING" transform="rotate(5 185 90)">
              <rect class="finger-phalanx" x="174" y="24" width="23" height="74" rx="11.5" />
              <rect class="finger-nail" x="177.5" y="27" width="16" height="15" rx="6" />
              <circle class="finger-pad-dot" cx="185.5" cy="34" r="5.5" />
              <text class="finger-tag" x="185.5" y="125" transform="rotate(-5 185.5 125)">Без</text>
            </g>

            <!-- Мизинец (R_PINKY) -->
            <g class="finger-group f-pinky-r" id="f-R_PINKY" transform="rotate(12 214 95)">
              <rect class="finger-phalanx" x="203" y="44" width="22" height="58" rx="11" />
              <rect class="finger-nail" x="206" y="47" width="16" height="14" rx="6" />
              <circle class="finger-pad-dot" cx="214" cy="54" r="5" />
              <text class="finger-tag" x="214" y="125" transform="rotate(-12 214 125)">Миз</text>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  /**
   * Подсветить текущий символ для ввода
   */
  highlightChar(char) {
    this.clearHighlights();
    this.activeChar = char;

    const info = CHAR_TO_KEY_MAP[char];
    const targetCharEl = document.getElementById('target-char-display');
    const targetTipEl = document.getElementById('target-finger-tip');
    const targetSubEl = document.getElementById('target-finger-sub');

    if (!info) {
      if (targetCharEl) targetCharEl.textContent = char || '';
      if (targetTipEl) targetTipEl.textContent = 'Нажми клавишу';
      if (targetSubEl) targetSubEl.textContent = '';
      return;
    }

    const keyEl = this.keyElements[info.code];
    if (keyEl) {
      keyEl.classList.add('key-target');
      this.activeKeyElement = keyEl;
    }

    // Если нужен Shift
    if (info.needShift && info.shiftCode) {
      const shiftEl = this.keyElements[info.shiftCode];
      if (shiftEl) {
        shiftEl.classList.add('key-shift-active');
        this.activeShiftElement = shiftEl;
      }
    }

    // Подсветка пальца на руках
    const fingerId = info.finger ? info.finger.id : null;
    if (fingerId && this.handsContainer) {
      const fingerEl = this.handsContainer.querySelector(`#f-${fingerId}`);
      if (fingerEl) fingerEl.classList.add('active');
    }

    // Подсветка противоположного Shift
    if (info.needShift && info.shiftFinger && this.handsContainer) {
      const shiftFingerEl = this.handsContainer.querySelector(`#f-${info.shiftFinger.id}`);
      if (shiftFingerEl) shiftFingerEl.classList.add('shift-active');
    }

    // Обновляем текстовую подсказку в центре
    if (targetCharEl) {
      targetCharEl.textContent = char === ' ' ? '␣ Пробел' : char;
    }
    if (targetTipEl) {
      targetTipEl.textContent = info.finger.name;
    }
    if (targetSubEl) {
      if (info.needShift) {
        const shiftHand = info.shiftFinger.hand === 'left' ? 'левым' : 'правым';
        targetSubEl.textContent = `Удерживай Shift (${shiftHand} мизинцем)`;
      } else if (info.code === 'KeyF' || info.code === 'KeyJ') {
        targetSubEl.textContent = 'Опорная клавиша (засечка)';
      } else if (info.code === 'Space') {
        targetSubEl.textContent = 'Большой палец';
      } else {
        targetSubEl.textContent = info.finger.hand === 'left' ? 'Левая рука' : 'Правая рука';
      }
    }
  }

  /**
   * Анимация физического нажатия клавиши пользователем
   */
  flashKeyPress(code, isCorrect) {
    const keyEl = this.keyElements[code];
    if (keyEl) {
      keyEl.classList.remove('key-pressed-ok', 'key-pressed-err');
      // trigger reflow
      void keyEl.offsetWidth;
      keyEl.classList.add(isCorrect ? 'key-pressed-ok' : 'key-pressed-err');
      setTimeout(() => {
        keyEl.classList.remove('key-pressed-ok', 'key-pressed-err');
      }, 180);
    }
  }

  clearHighlights() {
    if (this.activeKeyElement) {
      this.activeKeyElement.classList.remove('key-target');
      this.activeKeyElement = null;
    }
    if (this.activeShiftElement) {
      this.activeShiftElement.classList.remove('key-shift-active');
      this.activeShiftElement = null;
    }
    if (this.handsContainer) {
      this.handsContainer.querySelectorAll('.finger-group.active, .finger-group.shift-active').forEach(el => {
        el.classList.remove('active', 'shift-active');
      });
    }
  }
}

window.FINGER_MAP = FINGER_MAP;
window.CHAR_TO_KEY_MAP = CHAR_TO_KEY_MAP;
window.EN_TO_RU_MAP = EN_TO_RU_MAP;
window.VirtualKeyboardManager = VirtualKeyboardManager;
