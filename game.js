/**
 * Модуль мини-игры «Воздушные шарики» (аналог Balloon Valley из TypingClub)
 * Буквы и слова спускаются сверху на ярких шариках, ученик печатает их и лопает!
 */

class BalloonGame {
  constructor(canvasContainer, onCompleteCallback) {
    this.container = canvasContainer;
    this.onComplete = onCompleteCallback;
    this.running = false;
    this.paused = false;
    this.balloons = [];
    this.particles = [];
    this.score = 0;
    this.combo = 0;
    this.missed = 0;
    this.maxMissed = 5;
    this.wordsQueue = [];
    this.totalWords = 0;
    this.poppedWords = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 2200; // мс
    this.speed = 1.1; // пикселей за кадр
    this.colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    this.animationFrameId = null;

    this.initCanvas();
  }

  initCanvas() {
    this.container.innerHTML = `
      <div class="game-wrapper">
        <div class="game-header">
          <div class="game-stat"><span class="stat-icon">⭐</span> Счёт: <strong id="game-score">0</strong></div>
          <div class="game-stat"><span class="stat-icon">🔥</span> Комбо: <strong id="game-combo">0</strong></div>
          <div class="game-stat"><span class="stat-icon">🎈</span> Осталось: <strong id="game-remaining">0</strong></div>
          <div class="game-stat"><span class="stat-icon">❤️</span> Жизни: <strong id="game-lives">❤️❤️❤️❤️❤️</strong></div>
          <button class="btn btn-secondary btn-sm" id="btn-game-exit">✕ Выйти из игры</button>
        </div>
        <div class="game-canvas-area" id="game-canvas-area">
          <canvas id="balloon-canvas"></canvas>
          <div class="game-input-display">
            <span class="game-input-label">Текущее слово:</span>
            <span class="game-input-active" id="game-input-active">...</span>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('balloon-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    document.getElementById('btn-game-exit').addEventListener('click', () => {
      this.stop();
      if (this.onComplete) this.onComplete({ cancelled: true });
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 450;
  }

  start(lessonText, options = {}) {
    this.running = true;
    this.paused = false;
    this.score = 0;
    this.combo = 0;
    this.missed = 0;
    this.poppedWords = 0;
    this.balloons = [];
    this.particles = [];
    this.currentTypedBuffer = '';

    // Разбиваем текст урока на слова или токены
    // Если текст сплошной без пробелов (например, "ааооааоо"), разбиваем на кусочки по 2-4 символа
    let tokens = [];
    const rawWords = lessonText.trim().split(/\s+/).filter(w => w.length > 0);
    if (rawWords.length <= 3 && lessonText.length > 15) {
      // Длинная строка без пробелов — режем на небольшие группы по 3 символа
      for (let i = 0; i < lessonText.length; i += 3) {
        tokens.push(lessonText.substring(i, i + 3));
      }
    } else {
      tokens = rawWords;
    }

    // Ограничиваем разумным числом для одного раунда мини-игры (20-30 шариков)
    if (tokens.length > 30) {
      tokens = tokens.slice(0, 30);
    }
    this.wordsQueue = [...tokens];
    this.totalWords = tokens.length;
    this.spawnInterval = Math.max(1600, 2600 - (options.goalWpm || 15) * 40);
    this.speed = 0.9 + (options.goalWpm || 15) * 0.03;

    this.updateStats();
    this.lastSpawnTime = performance.now();
    this.loop(performance.now());
  }

  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  spawnBalloon() {
    if (this.wordsQueue.length === 0) return;
    const word = this.wordsQueue.shift();
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    const pad = 80;
    const x = pad + Math.random() * (this.canvas.width - pad * 2);
    const radius = Math.max(30, 20 + word.length * 7);

    this.balloons.push({
      text: word,
      typedLen: 0,
      x: x,
      y: -radius - 10,
      vx: (Math.random() - 0.5) * 0.6,
      radius: radius,
      color: color,
      scale: 1
    });

    this.updateStats();
  }

  handleKey(char) {
    if (!this.running || this.paused) return;

    // Ищем шарик, который совпадает со следующим ожидаемым символом
    // Приоритет: шарик, который уже начали набирать, либо самый нижний на экране
    let target = this.balloons.find(b => b.typedLen > 0 && b.text[b.typedLen] === char);

    if (!target) {
      // Ищем среди тех, которые еще не начаты, ближе к низу (y максимально)
      const candidates = this.balloons
        .filter(b => b.typedLen === 0 && b.text[0] === char)
        .sort((a, b) => b.y - a.y);
      if (candidates.length > 0) {
        target = candidates[0];
      }
    }

    if (target) {
      target.typedLen++;
      if (window.sound) window.sound.playKeyClick();

      // Если слово полностью набрано
      if (target.typedLen >= target.text.length) {
        this.popBalloon(target);
      } else {
        this.updateActiveWordDisplay(target);
      }
    } else {
      // Промах
      this.combo = 0;
      if (window.sound) window.sound.playError();
      this.updateStats();
    }
  }

  popBalloon(b) {
    const idx = this.balloons.indexOf(b);
    if (idx !== -1) {
      this.balloons.splice(idx, 1);
    }
    this.poppedWords++;
    this.combo++;
    const bonus = this.combo * 10;
    this.score += 50 + bonus;

    if (window.sound) window.sound.playBalloonPop();
    this.createExplosion(b.x, b.y, b.color);
    this.updateStats();
    this.updateActiveWordDisplay(null);

    // Проверка победы
    if (this.wordsQueue.length === 0 && this.balloons.length === 0) {
      this.finish(true);
    }
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        size: 3 + Math.random() * 4
      });
    }
  }

  updateStats() {
    const scoreEl = document.getElementById('game-score');
    const comboEl = document.getElementById('game-combo');
    const remEl = document.getElementById('game-remaining');
    const livesEl = document.getElementById('game-lives');

    if (scoreEl) scoreEl.textContent = this.score;
    if (comboEl) comboEl.textContent = `${this.combo}x`;
    if (remEl) remEl.textContent = `${this.wordsQueue.length + this.balloons.length}`;
    if (livesEl) {
      const hearts = '❤️'.repeat(Math.max(0, this.maxMissed - this.missed));
      livesEl.textContent = hearts || '💀 Игра окончена';
    }
  }

  updateActiveWordDisplay(target) {
    const el = document.getElementById('game-input-active');
    if (!el) return;
    if (!target) {
      el.innerHTML = '<span class="text-muted">Печатай шарики!</span>';
    } else {
      const done = target.text.substring(0, target.typedLen);
      const rest = target.text.substring(target.typedLen);
      el.innerHTML = `<span class="typed-done">${done}</span><span class="typed-rest">${rest}</span>`;
    }
  }

  finish(success) {
    this.stop();
    if (window.sound && success) window.sound.playVictoryFanfare();
    if (this.onComplete) {
      this.onComplete({
        success: success,
        score: this.score,
        total: this.totalWords,
        popped: this.poppedWords,
        missed: this.missed
      });
    }
  }

  loop(timestamp) {
    if (!this.running) return;

    // Спавн новых шариков
    if (timestamp - this.lastSpawnTime > this.spawnInterval && this.wordsQueue.length > 0) {
      this.spawnBalloon();
      this.lastSpawnTime = timestamp;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Рисуем приятный градиентный фон неба с облаками
    this.drawSky();

    // Обновляем и рисуем частицы
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    // Обновляем и рисуем шарики
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y += this.speed;
      b.x += b.vx;

      // Ограничиваем края экрана
      if (b.x < b.radius + 10 || b.x > this.canvas.width - b.radius - 10) {
        b.vx = -b.vx;
      }

      // Если шарик улетел вниз за пределы экрана — промах!
      if (b.y - b.radius > this.canvas.height) {
        this.balloons.splice(i, 1);
        this.missed++;
        this.combo = 0;
        if (window.sound) window.sound.playError();
        this.updateStats();

        if (this.missed >= this.maxMissed) {
          this.finish(false);
          return;
        }
        continue;
      }

      this.drawBalloon(b);
    }

    // Если все шарики кончились и очередь пуста
    if (this.wordsQueue.length === 0 && this.balloons.length === 0 && this.running) {
      this.finish(true);
      return;
    }

    this.animationFrameId = requestAnimationFrame(t => this.loop(t));
  }

  drawSky() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(1, '#f8fafc');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // Легкие декоративные облака
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(100, 60, 40, 0, Math.PI * 2);
    this.ctx.arc(140, 50, 50, 0, Math.PI * 2);
    this.ctx.arc(180, 60, 40, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(w - 150, 90, 45, 0, Math.PI * 2);
    this.ctx.arc(w - 110, 80, 55, 0, Math.PI * 2);
    this.ctx.arc(w - 70, 90, 45, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawBalloon(b) {
    this.ctx.save();
    this.ctx.translate(b.x, b.y);

    // Ниточка шарика
    this.ctx.beginPath();
    this.ctx.moveTo(0, b.radius);
    this.ctx.quadraticCurveTo(-6, b.radius + 15, 0, b.radius + 30);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Тело шарика (овал со скруглением)
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, b.radius, b.radius * 1.15, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = b.color;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 4;
    this.ctx.fill();

    // Блик света на шарике
    this.ctx.beginPath();
    this.ctx.ellipse(-b.radius * 0.35, -b.radius * 0.4, b.radius * 0.2, b.radius * 0.35, -0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.shadowColor = 'transparent';
    this.ctx.fill();

    // Узелок шарика снизу
    this.ctx.beginPath();
    this.ctx.moveTo(-5, b.radius * 1.15);
    this.ctx.lineTo(5, b.radius * 1.15);
    this.ctx.lineTo(0, b.radius * 1.15 + 6);
    this.ctx.closePath();
    this.ctx.fillStyle = b.color;
    this.ctx.fill();

    // Текст внутри шарика
    const fontSize = Math.max(16, Math.min(26, Math.floor(b.radius * 0.7)));
    this.ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const fullWord = b.text;
    const typed = fullWord.substring(0, b.typedLen);
    const rest = fullWord.substring(b.typedLen);

    // Если слово частично набрано, подсвечиваем набранную часть
    if (b.typedLen > 0) {
      const fullWidth = this.ctx.measureText(fullWord).width;
      const typedWidth = this.ctx.measureText(typed).width;
      const startX = -fullWidth / 2;

      // Тень для читаемости
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillText(fullWord, 1, 1);

      // Набранные буквы - золотисто-зеленые
      this.ctx.fillStyle = '#fef08a';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(typed, startX, 0);

      // Оставшиеся буквы - чисто белые
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(rest, startX + typedWidth, 0);
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillText(fullWord, 1, 1);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(fullWord, 0, 0);
    }

    this.ctx.restore();
  }
}

window.BalloonGame = BalloonGame;
