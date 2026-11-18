/**
 * Главный контроллер приложения «Локальный тренажёр слепой печати»
 * Управляет экранами, прогрессом учеников, набором текста, статистикой и режимами
 */

class TypingApp {
  constructor() {
    this.courseData = window.COURSE_DATA || { sections: [] };
    this.currentStudent = 'Ученик';
    this.allStudents = ['Ученик'];
    this.currentWindowsUser = 'Ученик';
    this.currentPcName = 'ПК';
    this.userProfiles = {}; // { username: { username, displayName, pcName, registeredAt } }
    this.leaderboardTab = 'stars'; // 'stars', 'speed', 'lessons', 'accuracy'
    this.cachedLeaderboard = [];
    this.serverOnline = false;

    this.progress = {}; // { studentName: { lessonNumber: { stars, wpm, cpm, accuracy, completed, lastDate } } }
    this.teacherMode = false; // Разблокировать все уроки
    this.currentLesson = null;
    this.currentText = '';
    this.currentIndex = 0;
    this.errorsCount = 0;
    this.totalTyped = 0;
    this.startTime = null;
    this.timerInterval = null;
    this.isLessonRunning = false;
    this.fontSize = 28; // px
    this.balloonGame = null;

    this.initStorage();
    this.initDOM();
    this.initKeyboard();
    this.initEventListeners();
    this.renderCourseMap();
    this.updateStudentHeader();
    this.initNetworkMonitoring();
    this.initPWA();

    // Фоновая проверка сети и синхронизация при запуске программы
    this.checkNetworkStatus(true);
  }

  /* ================= Хранилище (LocalStorage) и профили ПК ================= */
  initStorage() {
    try {
      // 1. Определение локальной учётной записи Windows и имени ПК
      let autoUser = '';
      let autoPc = '';

      // Проверяем параметры URL (передаются Launcher.exe и ярлыками)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('user')) autoUser = urlParams.get('user').trim();
        if (urlParams.get('pc')) autoPc = urlParams.get('pc').trim();
      } catch (e) {}

      // Проверяем глобальный объект window.WINDOWS_USER (из user_env.js)
      if (!autoUser && window.WINDOWS_USER && window.WINDOWS_USER.username) {
        autoUser = String(window.WINDOWS_USER.username).trim();
      }
      if (!autoPc && window.WINDOWS_USER && window.WINDOWS_USER.pcName) {
        autoPc = String(window.WINDOWS_USER.pcName).trim();
      }

      this.currentWindowsUser = autoUser || 'Ученик';
      this.currentPcName = autoPc || 'ПК';

      // 2. Загрузка профилей пользователей
      const savedProfiles = localStorage.getItem('typing_user_profiles');
      if (savedProfiles) {
        try { this.userProfiles = JSON.parse(savedProfiles); } catch (e) {}
      }

      // Если для текущего пользователя ПК профиля нет — регистрируем автоматически
      if (!this.userProfiles[this.currentWindowsUser]) {
        this.userProfiles[this.currentWindowsUser] = {
          username: this.currentWindowsUser,
          displayName: this.currentWindowsUser,
          pcName: this.currentPcName,
          registeredAt: new Date().toISOString()
        };
      } else {
        if (this.currentPcName) {
          this.userProfiles[this.currentWindowsUser].pcName = this.currentPcName;
        }
      }

      // 3. Загрузка списка учеников
      const savedStudentsList = localStorage.getItem('typing_students_list');
      if (savedStudentsList) {
        try { this.allStudents = JSON.parse(savedStudentsList); } catch (e) {}
      } else {
        this.allStudents = [this.currentWindowsUser];
      }

      // Автоматически добавляем пользователя ПК в список учеников
      if (this.currentWindowsUser && !this.allStudents.includes(this.currentWindowsUser)) {
        if (this.allStudents.length === 1 && (this.allStudents[0] === 'Ученик 1' || this.allStudents[0] === 'Ученик')) {
          this.allStudents = [this.currentWindowsUser];
        } else {
          this.allStudents.push(this.currentWindowsUser);
        }
      }

      // 4. Текущий активный профиль
      const savedStudent = localStorage.getItem('typing_current_student');
      if (savedStudent && this.allStudents.includes(savedStudent)) {
        this.currentStudent = savedStudent;
      } else {
        this.currentStudent = this.currentWindowsUser;
      }

      // 5. Загрузка данных прогресса
      const savedProgress = localStorage.getItem('typing_progress_data');
      if (savedProgress) {
        try { this.progress = JSON.parse(savedProgress); } catch (e) {}
      }
      if (!this.progress[this.currentStudent]) {
        this.progress[this.currentStudent] = {};
      }

      // Загрузка кэша рейтинга
      const savedLb = localStorage.getItem('typing_cached_leaderboard');
      if (savedLb) {
        try { this.cachedLeaderboard = JSON.parse(savedLb); } catch (e) {}
      }

      const savedTeacher = localStorage.getItem('typing_teacher_mode');
      if (savedTeacher !== null) this.teacherMode = savedTeacher === 'true';

      const savedFontSize = localStorage.getItem('typing_font_size');
      if (savedFontSize) this.fontSize = parseInt(savedFontSize, 10);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  saveStorage() {
    try {
      localStorage.setItem('typing_current_student', this.currentStudent);
      localStorage.setItem('typing_students_list', JSON.stringify(this.allStudents));
      localStorage.setItem('typing_user_profiles', JSON.stringify(this.userProfiles));
      localStorage.setItem('typing_progress_data', JSON.stringify(this.progress));
      localStorage.setItem('typing_teacher_mode', String(this.teacherMode));
      localStorage.setItem('typing_font_size', String(this.fontSize));
      if (this.cachedLeaderboard && this.cachedLeaderboard.length > 0) {
        localStorage.setItem('typing_cached_leaderboard', JSON.stringify(this.cachedLeaderboard));
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  getStudentProgress(student = this.currentStudent) {
    if (!this.progress[student]) this.progress[student] = {};
    return this.progress[student];
  }

  getDisplayName(student = this.currentStudent) {
    if (this.userProfiles && this.userProfiles[student] && this.userProfiles[student].displayName) {
      return this.userProfiles[student].displayName;
    }
    return student;
  }

  editDisplayName() {
    const profile = this.userProfiles[this.currentStudent] || {
      username: this.currentStudent,
      displayName: this.currentStudent,
      pcName: this.currentPcName
    };
    const currentName = profile.displayName || this.currentStudent;
    const newName = prompt(
      `Имя ученика для рейтинга класса:\n(Учётная запись Windows: "${this.currentStudent}")\n\nВведите Фамилию и Имя:`,
      currentName
    );

    if (newName !== null) {
      const clean = newName.trim();
      if (clean) {
        profile.displayName = clean;
        this.userProfiles[this.currentStudent] = profile;
        this.saveStorage();
        this.updateStudentHeader();
        this.syncProgressToServer();
        if (this.modalLeaderboard && !this.modalLeaderboard.classList.contains('hidden')) {
          this.renderLeaderboard();
        }
      }
    }
  }

  isLessonUnlocked(lessonNumber) {
    if (this.teacherMode) return true;
    if (lessonNumber === 1 || lessonNumber === 2) return true;
    const prog = this.getStudentProgress();
    // Урок открыт, если предыдущий урок пройден хотя бы на 1 звезду
    const prev = prog[lessonNumber - 1];
    return !!(prev && prev.completed);
  }

  /* ================= Инициализация DOM ================= */
  initDOM() {
    this.viewMap = document.getElementById('view-map');
    this.viewLesson = document.getElementById('view-lesson');
    this.viewGame = document.getElementById('view-game');
    this.viewCustom = document.getElementById('view-custom');

    this.textDisplayEl = document.getElementById('text-display');
    this.statWpmEl = document.getElementById('stat-wpm');
    this.statCpmEl = document.getElementById('stat-cpm');
    this.statAccEl = document.getElementById('stat-acc');
    this.statErrorsEl = document.getElementById('stat-errors');
    this.statTimeEl = document.getElementById('stat-time');

    this.lessonTitleEl = document.getElementById('lesson-header-title');
    this.lessonSectionEl = document.getElementById('lesson-header-section');
    this.langAlertEl = document.getElementById('lang-alert');

    // Модальные окна
    this.modalIntro = document.getElementById('modal-intro');
    this.modalResults = document.getElementById('modal-results');
    this.modalTheory = document.getElementById('modal-theory');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
  }

  initKeyboard() {
    const kbContainer = document.getElementById('keyboard-container');
    const handsContainer = document.getElementById('hands-container');
    this.keyboardManager = new VirtualKeyboardManager(kbContainer, handsContainer);
  }

  /* ================= Обработчики событий ================= */
  initEventListeners() {
    // Глобальный перехват клавиатуры в фазе capture для мгновенного отклика
    window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e), true);

    // Навигация
    document.getElementById('btn-nav-map').addEventListener('click', () => this.showScreen('map'));
    document.getElementById('btn-lesson-back').addEventListener('click', () => this.showScreen('map'));
    document.getElementById('btn-lesson-restart').addEventListener('click', () => this.restartLesson());

    // Переключение профиля ученика и редактирование имени
    document.getElementById('student-select').addEventListener('change', (e) => {
      this.switchStudent(e.target.value);
    });

    document.getElementById('btn-add-student').addEventListener('click', () => {
      this.promptAddStudent();
    });

    const btnEditStudent = document.getElementById('btn-edit-student');
    if (btnEditStudent) {
      btnEditStudent.addEventListener('click', () => this.editDisplayName());
    }

    // Рейтинг класса и таблица лидеров
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    if (btnLeaderboard) {
      btnLeaderboard.addEventListener('click', () => this.openLeaderboardModal());
    }

    const btnLbClose = document.getElementById('btn-lb-close');
    if (btnLbClose) {
      btnLbClose.addEventListener('click', () => this.closeModal(this.modalLeaderboard));
    }

    const btnLbCloseBottom = document.getElementById('btn-lb-close-bottom');
    if (btnLbCloseBottom) {
      btnLbCloseBottom.addEventListener('click', () => this.closeModal(this.modalLeaderboard));
    }

    const btnLbRefresh = document.getElementById('btn-lb-refresh');
    if (btnLbRefresh) {
      btnLbRefresh.addEventListener('click', () => this.fetchLeaderboard(true));
    }

    // Вкладки сортировки рейтинга
    document.querySelectorAll('.lb-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.leaderboardTab = e.currentTarget.dataset.tab || 'stars';
        this.renderLeaderboard();
      });
    });

    // Настройки и режим учителя
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.openSettingsModal();
    });

    document.getElementById('btn-custom-text').addEventListener('click', () => {
      this.showScreen('custom');
    });

    document.getElementById('btn-start-custom').addEventListener('click', () => {
      this.startCustomText();
    });

    // Звук
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = !window.sound.muted;
        window.sound.setMuted(isMuted);
        btnMute.textContent = isMuted ? '🔇' : '🔊';
        btnMute.title = isMuted ? 'Включить звук' : 'Выключить звук';
      });
    }

    // Изменение размера шрифта
    document.getElementById('btn-font-plus').addEventListener('click', () => {
      this.fontSize = Math.min(46, this.fontSize + 2);
      this.applyFontSize();
    });
    document.getElementById('btn-font-minus').addEventListener('click', () => {
      this.fontSize = Math.max(18, this.fontSize - 2);
      this.applyFontSize();
    });

    // Кнопки результатов
    document.getElementById('btn-results-next').addEventListener('click', () => {
      this.closeModal(this.modalResults);
      this.goToNextLesson();
    });
    document.getElementById('btn-results-retry').addEventListener('click', () => {
      this.closeModal(this.modalResults);
      this.restartLesson();
    });
    document.getElementById('btn-results-map').addEventListener('click', () => {
      this.closeModal(this.modalResults);
      this.showScreen('map');
    });
  }

  applyFontSize() {
    if (this.textDisplayEl) {
      this.textDisplayEl.style.fontSize = `${this.fontSize}px`;
    }
    this.saveStorage();
  }

  /* ================= Управление экранами ================= */
  showScreen(screenName) {
    if (this.balloonGame) {
      this.balloonGame.stop();
    }
    this.stopTimer();
    this.isLessonRunning = false;

    this.viewMap.classList.toggle('hidden', screenName !== 'map');
    this.viewLesson.classList.toggle('hidden', screenName !== 'lesson');
    this.viewGame.classList.toggle('hidden', screenName !== 'game');
    this.viewCustom.classList.toggle('hidden', screenName !== 'custom');

    if (screenName === 'map') {
      this.renderCourseMap();
      window.scrollTo(0, 0);
    }
  }

  /* ================= Переключение учеников и профилей ================= */
  updateStudentHeader() {
    // 1. Отображение учётной записи Windows и имени ПК
    const pcBadgeEl = document.getElementById('pc-badge-user');
    if (pcBadgeEl) {
      pcBadgeEl.textContent = `${this.currentWindowsUser} (${this.currentPcName})`;
      if (pcBadgeEl.parentElement) {
        pcBadgeEl.parentElement.title = `Локальная учётная запись Windows: ${this.currentWindowsUser} на компьютере ${this.currentPcName}`;
      }
    }

    // 2. Выпадающий список выбора профилей
    const select = document.getElementById('student-select');
    if (select) {
      select.innerHTML = '';
      this.allStudents.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        const dispName = this.getDisplayName(st);
        opt.textContent = dispName !== st ? `${dispName} (${st})` : st;
        if (st === this.currentStudent) opt.selected = true;
        select.appendChild(opt);
      });
    }

    // 3. Обновляем общую статистику в хедере
    const prog = this.getStudentProgress();
    let totalStars = 0;
    let completedCount = 0;
    Object.values(prog).forEach(p => {
      if (p.completed) {
        completedCount++;
        totalStars += p.stars || 0;
      }
    });

    const headerStarsEl = document.getElementById('header-stars-count');
    const headerProgEl = document.getElementById('header-progress-count');
    if (headerStarsEl) headerStarsEl.textContent = totalStars;
    if (headerProgEl) headerProgEl.textContent = `${completedCount} / ${this.courseData.totalLessons || 489}`;
  }

  switchStudent(newStudent) {
    this.currentStudent = newStudent;
    if (!this.progress[newStudent]) this.progress[newStudent] = {};
    if (!this.userProfiles[newStudent]) {
      this.userProfiles[newStudent] = {
        username: newStudent,
        displayName: newStudent,
        pcName: this.currentPcName,
        registeredAt: new Date().toISOString()
      };
    }
    this.saveStorage();
    this.updateStudentHeader();
    this.renderCourseMap();
    this.syncProgressToServer();
  }

  promptAddStudent() {
    const name = prompt('Введите имя или фамилию нового ученика:');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!this.allStudents.includes(clean)) {
        this.allStudents.push(clean);
      }
      this.userProfiles[clean] = {
        username: clean,
        displayName: clean,
        pcName: this.currentPcName,
        registeredAt: new Date().toISOString()
      };
      this.switchStudent(clean);
    }
  }

  /* ================= Отрисовка карты курса (Course Map) ================= */
  renderCourseMap() {
    const container = document.getElementById('course-sections-container');
    if (!container) return;
    container.innerHTML = '';

    const studentProg = this.getStudentProgress();

    this.courseData.sections.forEach((sec, secIdx) => {
      const secCard = document.createElement('div');
      secCard.className = 'section-card';

      // Заголовок раздела со статистикой
      let secStars = 0;
      let secDone = 0;
      sec.lessons.forEach(l => {
        const lp = studentProg[l.lessonNumber];
        if (lp && lp.completed) {
          secDone++;
          secStars += lp.stars || 0;
        }
      });

      const secHeader = document.createElement('div');
      secHeader.className = 'section-header';
      secHeader.innerHTML = `
        <div class="section-title-wrap">
          <span class="section-badge">${secIdx + 1}</span>
          <h2 class="section-title">${sec.title}</h2>
        </div>
        <div class="section-meta">
          <span class="meta-item">⭐ ${secStars}</span>
          <span class="meta-item">✔️ ${secDone} / ${sec.lessons.length}</span>
        </div>
      `;

      // Сетка уроков
      const grid = document.createElement('div');
      grid.className = 'lessons-grid';

      sec.lessons.forEach(les => {
        const isUnlocked = this.isLessonUnlocked(les.lessonNumber);
        const lProg = studentProg[les.lessonNumber];
        const isDone = lProg && lProg.completed;
        const stars = (lProg && lProg.stars) || 0;

        const tile = document.createElement('div');
        tile.className = `lesson-tile ${isUnlocked ? 'unlocked' : 'locked'} ${isDone ? 'completed' : ''} type-${les.type}`;
        tile.dataset.lessonNumber = les.lessonNumber;

        let icon = '⌨️';
        if (les.type === 'game') icon = '🎈';
        if (les.type === 'theory') icon = '💡';

        let starsHtml = '';
        for (let s = 1; s <= 5; s++) {
          starsHtml += `<span class="star-mini ${s <= stars ? 'active' : ''}">★</span>`;
        }

        tile.innerHTML = `
          <div class="tile-top">
            <span class="tile-num">#${les.lessonNumber}</span>
            <span class="tile-icon">${icon}</span>
          </div>
          <div class="tile-title" title="${les.title}">${les.title}</div>
          <div class="tile-stars">${starsHtml}</div>
          ${!isUnlocked ? '<div class="tile-lock">🔒</div>' : ''}
          ${isDone && lProg.wpm ? `<div class="tile-wpm">${lProg.wpm} СВМ</div>` : ''}
        `;

        if (isUnlocked) {
          tile.addEventListener('click', () => this.openLesson(les));
        }

        grid.appendChild(tile);
      });

      secCard.appendChild(secHeader);
      secCard.appendChild(grid);
      container.appendChild(secCard);
    });
  }

  /* ================= Открытие урока ================= */
  openLesson(lesson) {
    this.currentLesson = lesson;

    // 1. Если это теоретический урок (осанка, гимнастика для глаз и т.д.)
    if (lesson.type === 'theory') {
      this.openTheoryModal(lesson);
      return;
    }

    // 2. Если у урока есть вводная инструкция по новым клавишам
    if (lesson.instructions && lesson.instructions.length > 0) {
      this.openIntroModal(lesson);
      return;
    }

    // 3. Если это игровая активность
    if (lesson.type === 'game') {
      this.startLessonGame(lesson);
      return;
    }

    // 4. Обычный урок печати
    this.startTypingLesson(lesson);
  }

  startTypingLesson(lesson) {
    this.currentLesson = lesson;
    this.showScreen('lesson');

    this.lessonTitleEl.textContent = `#${lesson.lessonNumber}: ${lesson.title}`;
    this.lessonSectionEl.textContent = lesson.sectionTitle || 'В стране клавиш';

    // Выбираем текст упражнения (text1 или случайный вариант, если их несколько)
    const texts = lesson.texts && lesson.texts.length > 0 ? lesson.texts : [''];
    const rawText = texts[Math.floor(Math.random() * texts.length)] || '';
    // Нормализуем переносы строк (CRLF -> LF) и убираем пробелы/переносы только в самом конце текста
    this.currentText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[\r\n\s]+$/, '');

    this.currentIndex = 0;
    this.errorsCount = 0;
    this.totalTyped = 0;
    this.startTime = null;
    this.isLessonRunning = true;
    this.stopTimer();

    this.renderTextDisplay();
    this.applyFontSize();
    this.updateStatsDisplay();
    this.hideLangAlert();

    // Подсвечиваем первую клавишу
    if (this.currentText.length > 0) {
      this.keyboardManager.highlightChar(this.currentText[0]);
    }
  }

  restartLesson() {
    if (this.currentLesson) {
      if (this.currentLesson.type === 'game') {
        this.startLessonGame(this.currentLesson);
      } else {
        this.startTypingLesson(this.currentLesson);
      }
    }
  }

  /* ================= Отображение текста урока ================= */
  renderTextDisplay() {
    this.textDisplayEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (let i = 0; i < this.currentText.length; i++) {
      const char = this.currentText[i];
      const span = document.createElement('span');
      span.className = 'char';
      span.id = `char-${i}`;

      if (char === ' ' || char === '\u00A0') {
        span.classList.add('char-space');
        span.innerHTML = '&nbsp;';
      } else if (char === '\n') {
        span.classList.add('char-newline');
        span.innerHTML = '↵<br>';
      } else if (char === '\t') {
        span.classList.add('char-tab');
        span.innerHTML = '⇥&nbsp;&nbsp;&nbsp;&nbsp;';
      } else {
        span.textContent = char;
      }

      if (i === this.currentIndex) {
        span.classList.add('current');
      }

      frag.appendChild(span);
    }

    this.textDisplayEl.appendChild(frag);
    this.scrollCursorIntoView();
  }

  updateCharStatus(index, status) {
    const span = document.getElementById(`char-${index}`);
    if (span) {
      span.classList.remove('current', 'correct', 'error');
      if (status) span.classList.add(status);
    }
  }

  setCursor(newIndex) {
    if (this.currentIndex < this.currentText.length) {
      const prevSpan = document.getElementById(`char-${this.currentIndex}`);
      if (prevSpan) prevSpan.classList.remove('current');
    }

    this.currentIndex = newIndex;

    if (this.currentIndex < this.currentText.length) {
      const currSpan = document.getElementById(`char-${this.currentIndex}`);
      if (currSpan) currSpan.classList.add('current');
      this.keyboardManager.highlightChar(this.currentText[this.currentIndex]);
      this.scrollCursorIntoView();
    } else {
      this.keyboardManager.clearHighlights();
    }
  }

  scrollCursorIntoView() {
    const currSpan = document.getElementById(`char-${this.currentIndex}`);
    if (currSpan) {
      const container = this.textDisplayEl;
      const offsetTop = currSpan.offsetTop - container.offsetTop;
      if (offsetTop > container.clientHeight - 80 || offsetTop < container.scrollTop) {
        container.scrollTop = offsetTop - 40;
      }
    }
  }

  /* ================= Обработка ввода с клавиатуры ================= */
  handleGlobalKeyDown(e) {
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
    const isSpace = e.code === 'Space' || e.key === ' ' || e.keyCode === 32;

    // Если открыты любые модальные окна поверх интерфейса
    if (this.isAnyModalOpen()) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        this.closeAllModals();
        return;
      }

      // Нажатие Enter или Пробел нажимает активную кнопку
      if (isEnter || isSpace) {
        // 1. Если фокус уже находится на кнопке — нажимаем её
        if (document.activeElement && document.activeElement.tagName === 'BUTTON' && !document.activeElement.disabled) {
          e.preventDefault();
          e.stopPropagation();
          document.activeElement.click();
          return;
        }

        // 2. Теоретический урок: кнопка «Понятно, продолжить! 👍»
        if (this.modalTheory && !this.modalTheory.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          const btnDone = document.getElementById('btn-theory-done');
          if (btnDone) {
            btnDone.click();
            return;
          }
        }

        // 3. Вводные слайды: кнопка «Далее →» или «Начать урок! 🚀»
        if (this.modalIntro && !this.modalIntro.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          const btnStart = document.getElementById('btn-intro-start');
          const btnNext = document.getElementById('btn-intro-next');
          if (btnStart && btnStart.offsetParent !== null) {
            btnStart.click();
          } else if (btnNext && btnNext.offsetParent !== null) {
            btnNext.click();
          }
          return;
        }

        // 4. Окно результатов: кнопка «Следующий урок →»
        if (this.modalResults && !this.modalResults.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          const btnNext = document.getElementById('btn-results-next');
          if (btnNext) {
            btnNext.click();
            return;
          }
        }

        // 5. Окно рейтинга
        if (this.modalLeaderboard && !this.modalLeaderboard.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          const btnLbClose = document.getElementById('btn-lb-close-bottom');
          if (btnLbClose) {
            btnLbClose.click();
            return;
          }
        }

        // 6. Окно настроек учителя
        if (this.modalSettings && !this.modalSettings.classList.contains('hidden')) {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            e.stopPropagation();
            const btnClose = document.getElementById('btn-settings-close');
            if (btnClose) {
              btnClose.click();
              return;
            }
          }
        }

        // 7. Универсальный поиск главной активной кнопки в открытом окне
        const activeModal = document.querySelector('.modal-backdrop:not(.hidden)');
        if (activeModal) {
          const primaryBtn = activeModal.querySelector('.btn-primary, .btn-success, button.btn:not(.btn-secondary):not(.btn-outline)');
          if (primaryBtn && primaryBtn.offsetParent !== null) {
            e.preventDefault();
            e.stopPropagation();
            primaryBtn.click();
            return;
          }
        }
      }

      // Перелистывание слайдов интро стрелками клавиатуры (Вправо / Влево)
      if (this.modalIntro && !this.modalIntro.classList.contains('hidden')) {
        if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          const btnNext = document.getElementById('btn-intro-next');
          const btnStart = document.getElementById('btn-intro-start');
          if (btnStart && btnStart.offsetParent !== null) btnStart.click();
          else if (btnNext && btnNext.offsetParent !== null) btnNext.click();
          return;
        } else if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          const btnPrev = document.getElementById('btn-intro-prev');
          if (btnPrev && btnPrev.offsetParent !== null) btnPrev.click();
          return;
        }
      }

      return;
    }

    // Если открыта карта уроков и нажат Enter — запустить следующий доступный урок
    if (this.viewMap && !this.viewMap.classList.contains('hidden') && isEnter) {
      const nextTile = document.querySelector('.lesson-tile:not(.tile-locked):not(.tile-completed)');
      if (nextTile) {
        e.preventDefault();
        nextTile.click();
        return;
      }
    }

    // Если игра активна
    if (this.balloonGame && this.balloonGame.running) {
      if (e.key.length === 1) {
        this.balloonGame.handleKey(e.key);
      }
      return;
    }

    // Если урок печати активен
    if (!this.isLessonRunning || !this.currentLesson) return;

    // Игнорируем исключительно служебные модификаторы (Shift, Ctrl, Alt, Meta, CapsLock)
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return;
    }

    // Предотвращаем дефолтные действия браузера для служебных клавиш набора:
    // Tab (чтобы не уходил фокус), Space (чтобы не скроллило страницу), Enter (чтобы не скроллило/не сабмитило)
    if (e.key === 'Tab' || e.code === 'Tab' || e.key === ' ' || e.code === 'Space' || e.key === 'Enter' || e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Backspace: стереть предыдущий символ
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this.currentIndex > 0) {
        this.updateCharStatus(this.currentIndex, '');
        this.setCursor(this.currentIndex - 1);
        this.updateCharStatus(this.currentIndex, 'current');
      }
      return;
    }

    // Запуск таймера при первом нажатии
    if (!this.startTime) {
      this.startTime = performance.now();
      this.startTimer();
    }

    const expectedChar = this.currentText[this.currentIndex];
    let typedChar = e.key;

    // Преобразование специальных клавиш Enter и Tab в соответствующие символы
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      typedChar = '\n';
    } else if (e.key === 'Tab' || e.code === 'Tab') {
      typedChar = '\t';
    }

    // Проверка правильности нажатия
    let isCorrect = false;
    if (expectedChar === '\n' || expectedChar === '\r') {
      isCorrect = (typedChar === '\n');
    } else if (expectedChar === '\t') {
      isCorrect = (typedChar === '\t');
    } else if (expectedChar === ' ' || expectedChar === '\u00A0') {
      isCorrect = (typedChar === ' ' || typedChar === '\u00A0');
    } else {
      // Проверка английской раскладки
      if (window.EN_TO_RU_MAP && window.EN_TO_RU_MAP[typedChar] && expectedChar !== typedChar) {
        const mapped = window.EN_TO_RU_MAP[typedChar];
        if (mapped === expectedChar) {
          this.showLangAlert();
        }
      }
      isCorrect = (typedChar === expectedChar);
    }

    this.totalTyped++;

    // Анимация нажатия на виртуальной клавиатуре
    const flashCode = (e.key === 'Enter' || e.code === 'Enter') ? 'Enter' : ((e.key === 'Tab' || e.code === 'Tab') ? 'Tab' : e.code);
    this.keyboardManager.flashKeyPress(flashCode, isCorrect);

    if (isCorrect) {
      if (window.sound) window.sound.playKeyClick();
      this.updateCharStatus(this.currentIndex, 'correct');
      this.hideLangAlert();
      this.setCursor(this.currentIndex + 1);

      // Проверка окончания урока
      if (this.currentIndex >= this.currentText.length) {
        this.completeTypingLesson();
      }
    } else {
      if (window.sound) window.sound.playError();
      this.errorsCount++;
      this.updateCharStatus(this.currentIndex, 'error');
      // В режиме исправления ошибок требуем нажать правильную клавишу или Backspace
    }

    this.updateStatsDisplay();
  }

  showLangAlert() {
    if (this.langAlertEl) this.langAlertEl.classList.remove('hidden');
  }

  hideLangAlert() {
    if (this.langAlertEl) this.langAlertEl.classList.add('hidden');
  }

  /* ================= Статистика и Таймер ================= */
  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.updateStatsDisplay();
    }, 500);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateStatsDisplay() {
    const elapsedSecs = this.startTime ? Math.max(0.5, (performance.now() - this.startTime) / 1000) : 0;
    const mins = elapsedSecs / 60;

    // CPM (Знаков в минуту) и WPM (Слов в минуту = CPM / 5)
    const cpm = mins > 0 ? Math.round(this.currentIndex / mins) : 0;
    const wpm = Math.round(cpm / 5);

    // Точность (%)
    let acc = 100;
    if (this.totalTyped > 0) {
      acc = Math.max(0, Math.round(((this.totalTyped - this.errorsCount) / this.totalTyped) * 100));
    }

    if (this.statWpmEl) this.statWpmEl.textContent = wpm;
    if (this.statCpmEl) this.statCpmEl.textContent = cpm;
    if (this.statAccEl) this.statAccEl.textContent = `${acc}%`;
    if (this.statErrorsEl) this.statErrorsEl.textContent = this.errorsCount;

    // Таймер
    const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
    const s = Math.floor(elapsedSecs % 60).toString().padStart(2, '0');
    if (this.statTimeEl) this.statTimeEl.textContent = `${m}:${s}`;
  }

  /* ================= Завершение урока печати ================= */
  completeTypingLesson() {
    this.stopTimer();
    this.isLessonRunning = false;

    const elapsedSecs = Math.max(1, (performance.now() - this.startTime) / 1000);
    const mins = elapsedSecs / 60;
    const cpm = Math.round(this.currentText.length / mins);
    const wpm = Math.round(cpm / 5);
    const acc = this.totalTyped > 0 ? Math.max(0, Math.round(((this.totalTyped - this.errorsCount) / this.totalTyped) * 100)) : 100;

    // Расчет звёзд (от 1 до 5)
    // 5 звезд: Точность >= 98% и скорость >= goalWpm
    // 4 звезды: Точность >= 95% и скорость >= minWpm
    // 3 звезды: Точность >= 90%
    // 2 звезды: Точность >= 80%
    // 1 звезда: урок завершен
    const goalWpm = this.currentLesson.goalWpm || 15;
    const minWpm = this.currentLesson.minWpm || 10;
    const minAcc = this.currentLesson.minAccuracy || 80;

    let stars = 1;
    if (acc >= 98 && wpm >= goalWpm) stars = 5;
    else if (acc >= 95 && wpm >= minWpm) stars = 4;
    else if (acc >= 90) stars = 3;
    else if (acc >= minAcc) stars = 2;
    else stars = 1;

    // Сохраняем прогресс ученика (только лучший результат)
    const prog = this.getStudentProgress();
    const prev = prog[this.currentLesson.lessonNumber] || {};
    const bestStars = Math.max(prev.stars || 0, stars);
    const bestWpm = Math.max(prev.wpm || 0, wpm);

    prog[this.currentLesson.lessonNumber] = {
      completed: true,
      stars: bestStars,
      wpm: bestWpm,
      cpm: Math.max(prev.cpm || 0, cpm),
      accuracy: Math.max(prev.accuracy || 0, acc),
      lastDate: new Date().toISOString()
    };
    this.saveStorage();
    this.updateStudentHeader();
    this.syncProgressToServer();

    // Звуки победы
    if (window.sound) {
      window.sound.playVictoryFanfare();
      setTimeout(() => {
        for (let i = 0; i < stars; i++) {
          setTimeout(() => window.sound.playStarChime(i), i * 220);
        }
      }, 500);
    }

    // Открываем модальное окно результатов
    this.openResultsModal({
      lesson: this.currentLesson,
      wpm: wpm,
      cpm: cpm,
      acc: acc,
      errors: this.errorsCount,
      stars: stars,
      time: `${Math.floor(elapsedSecs / 60)}:${Math.floor(elapsedSecs % 60).toString().padStart(2, '0')}`
    });
  }

  /* ================= Модальные окна ================= */
  openResultsModal(data) {
    document.getElementById('res-lesson-title').textContent = `#${data.lesson.lessonNumber}: ${data.lesson.title}`;
    document.getElementById('res-wpm').textContent = data.wpm;
    document.getElementById('res-cpm').textContent = data.cpm;
    document.getElementById('res-acc').textContent = `${data.acc}%`;
    document.getElementById('res-errors').textContent = data.errors;
    document.getElementById('res-time').textContent = data.time;

    // Звезды
    const starsContainer = document.getElementById('res-stars');
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.className = `star-big ${i <= data.stars ? 'star-earned' : ''}`;
      s.textContent = '★';
      s.style.animationDelay = `${i * 0.15}s`;
      starsContainer.appendChild(s);
    }

    // Сообщение-похвала для детей
    const messageEl = document.getElementById('res-praise-message');
    const praises = [
      'Молодец! Прекрасная работа!',
      'Великолепно! Твои пальцы летают по клавишам!',
      'Отличная точность! Так держать!',
      'Ты делаешь огромные успехи в слепой печати!'
    ];
    if (messageEl) {
      messageEl.textContent = praises[Math.floor(Math.random() * praises.length)];
    }

    this.openModal(this.modalResults);
    setTimeout(() => {
      const nextBtn = document.getElementById('btn-results-next');
      if (nextBtn) nextBtn.focus();
    }, 60);
  }

  goToNextLesson() {
    if (!this.currentLesson) {
      this.showScreen('map');
      return;
    }
    const nextNum = this.currentLesson.lessonNumber + 1;
    let nextLesson = null;

    for (const sec of this.courseData.sections) {
      nextLesson = sec.lessons.find(l => l.lessonNumber === nextNum);
      if (nextLesson) break;
    }

    if (nextLesson && this.isLessonUnlocked(nextNum)) {
      this.openLesson(nextLesson);
    } else {
      this.showScreen('map');
    }
  }

  /* ================= Вводные слайды урока (Instructions) ================= */
  openIntroModal(lesson) {
    const slides = lesson.instructions || [];
    let currentSlide = 0;

    const renderSlide = () => {
      const slide = slides[currentSlide];
      document.getElementById('intro-title').textContent = slide.title || lesson.title;
      document.getElementById('intro-tag').textContent = slide.tag || `Урок #${lesson.lessonNumber}`;
      document.getElementById('intro-body').textContent = slide.body || '';

      const charBox = document.getElementById('intro-chr-box');
      if (slide.chr) {
        charBox.style.display = 'flex';
        charBox.textContent = slide.chr;
      } else {
        charBox.style.display = 'none';
      }

      document.getElementById('intro-step-counter').textContent = `Шаг ${currentSlide + 1} из ${slides.length}`;
      document.getElementById('btn-intro-prev').style.display = currentSlide > 0 ? 'inline-block' : 'none';
      
      const isLast = currentSlide === slides.length - 1;
      document.getElementById('btn-intro-next').style.display = !isLast ? 'inline-block' : 'none';
      document.getElementById('btn-intro-start').style.display = isLast ? 'inline-block' : 'none';

      setTimeout(() => {
        if (isLast) {
          const startBtn = document.getElementById('btn-intro-start');
          if (startBtn) startBtn.focus();
        } else {
          const nextBtn = document.getElementById('btn-intro-next');
          if (nextBtn) nextBtn.focus();
        }
      }, 60);
    };

    document.getElementById('btn-intro-next').onclick = () => {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        renderSlide();
      }
    };
    document.getElementById('btn-intro-prev').onclick = () => {
      if (currentSlide > 0) {
        currentSlide--;
        renderSlide();
      }
    };
    document.getElementById('btn-intro-start').onclick = () => {
      this.closeModal(this.modalIntro);
      if (lesson.type === 'game') {
        this.startLessonGame(lesson);
      } else {
        this.startTypingLesson(lesson);
      }
    };

    renderSlide();
    this.openModal(this.modalIntro);
  }

  /* ================= Теоретические уроки (Осанка, глаза, финал) ================= */
  openTheoryModal(lesson) {
    const titleEl = document.getElementById('theory-title');
    const bodyEl = document.getElementById('theory-content');

    titleEl.textContent = `#${lesson.lessonNumber}: ${lesson.title}`;

    if (lesson.lessonNumber === 1 || lesson.lessonNumber === 2) {
      bodyEl.innerHTML = `
        <div class="theory-article">
          <div class="video-container">
            <video controls autoplay class="lesson-video" src="videos/lesson_2.mp4">
              Ваш браузер не поддерживает видео.
            </video>
          </div>
          <h3>Правильная посадка и опорный ряд</h3>
          <p>Добро пожаловать в курс <strong>«В стране клавиш»</strong>! Чтобы печатать быстро и не уставать, запомни главные правила:</p>
          <ul class="theory-list">
            <li><strong>Спина:</strong> сиди прямо, опираясь на спинку стула. Не сутулься!</li>
            <li><strong>Руки:</strong> локти согнуты под углом 90 градусов, кисти свободно парят над клавиатурой.</li>
            <li><strong>Опорный ряд:</strong> указательные пальцы всегда лежат на клавишах <strong>[А]</strong> и <strong>[О]</strong>. На них есть специальные рельефные засечки — нащупай их пальцами!</li>
            <li><strong>Золотое правило:</strong> никогда не подглядывай на клавиатуру! Виртуальные подсказки на экране подскажут, каким пальцем нажимать букву.</li>
          </ul>
        </div>
      `;
    } else if (lesson.lessonNumber === 29 || lesson.lessonNumber === 31) {
      bodyEl.innerHTML = `
        <div class="theory-article">
          <div class="video-container">
            <video controls autoplay class="lesson-video" src="videos/lesson_31.mp4">
              Ваш браузер не поддерживает видео.
            </video>
          </div>
          <h3>Сиди прямо, будешь здоров!</h3>
          <p>Эргономика рабочего места помогает сохранить осанку и острое зрение на всю жизнь:</p>
          <ul class="theory-list">
            <li><strong>Расстояние до монитора:</strong> держи экран на расстоянии вытянутой руки (50–70 см).</li>
            <li><strong>Уровень глаз:</strong> верхний край экрана должен быть на уровне глаз или чуть ниже.</li>
            <li><strong>Ступни:</strong> должны полностью стоять на полу, а не висеть в воздухе.</li>
            <li><strong>Плечи:</strong> расслаблены, не поднимай плечи вверх во время набора текста.</li>
          </ul>
        </div>
      `;
    } else if (lesson.lessonNumber === 81 || lesson.lessonNumber === 84) {
      bodyEl.innerHTML = `
        <div class="theory-article">
          <div class="video-container">
            <video controls autoplay class="lesson-video" src="videos/lesson_84.mp4">
              Ваш браузер не поддерживает видео.
            </video>
          </div>
          <h3>Сделай перерыв и гимнастику!</h3>
          <p>Каждые 20-30 минут печати полезно делать маленькую разминку:</p>
          <ul class="theory-list">
            <li><strong>Правило 20-20-20:</strong> каждые 20 минут посмотри на 20 секунд вдаль в окно.</li>
            <li><strong>Гимнастика для глаз:</strong> поморгай, затем медленно опиши глазами круг и восьмёрку.</li>
            <li><strong>Встряхни кисти:</strong> расслабь руки, сжимай и разжимай кулаки 10 раз.</li>
            <li><strong>Потянись:</strong> подними руки вверх и сделай глубокий вдох!</li>
          </ul>
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div class="theory-article certificate-view">
          <div class="theory-illustration">🎓 🏆 🌟</div>
          <h3>Поздравляем с окончанием курса!</h3>
          <p>Ты прошёл все уроки программы <strong>«В стране клавиш»</strong> и освоил полноценный слепой десятипальцевый метод печати!</p>
          <p>Теперь твои пальцы знают расположение каждой русской буквы, цифры и знака препинания без необходимости смотреть на клавиатуру.</p>
          <div class="diploma-badge">Мастер слепой печати: <strong>${this.currentStudent}</strong></div>
        </div>
      `;
    }

    document.getElementById('btn-theory-done').onclick = () => {
      const vid = bodyEl.querySelector('video');
      if (vid) vid.pause();
      this.closeModal(this.modalTheory);
      // Засчитываем прохождение
      const prog = this.getStudentProgress();
      prog[lesson.lessonNumber] = {
        completed: true,
        stars: 5,
        wpm: 25,
        cpm: 125,
        accuracy: 100,
        lastDate: new Date().toISOString()
      };
      this.saveStorage();
      this.updateStudentHeader();
      this.syncProgressToServer();
      this.goToNextLesson();
    };

    this.openModal(this.modalTheory);
    setTimeout(() => {
      const doneBtn = document.getElementById('btn-theory-done');
      if (doneBtn) doneBtn.focus();
    }, 60);
  }

  /* ================= Режим игры «Воздушные шарики» ================= */
  startLessonGame(lesson) {
    this.currentLesson = lesson;
    this.showScreen('game');

    const gameContainer = document.getElementById('balloon-game-container');
    const texts = lesson.texts && lesson.texts.length > 0 ? lesson.texts : [''];
    const gameText = texts[0];

    this.balloonGame = new BalloonGame(gameContainer, (res) => {
      if (res.cancelled) {
        this.showScreen('map');
        return;
      }

      if (res.success) {
        const prog = this.getStudentProgress();
        prog[lesson.lessonNumber] = {
          completed: true,
          stars: 5,
          wpm: lesson.goalWpm || 20,
          cpm: (lesson.goalWpm || 20) * 5,
          accuracy: 95,
          lastDate: new Date().toISOString()
        };
        this.saveStorage();
        this.updateStudentHeader();
        this.syncProgressToServer();

        this.openResultsModal({
          lesson: lesson,
          wpm: lesson.goalWpm || 20,
          cpm: (lesson.goalWpm || 20) * 5,
          acc: 95,
          errors: res.missed,
          stars: 5,
          time: 'Игра'
        });
      } else {
        alert('Шарики улетели! Попробуй еще раз.');
        this.startLessonGame(lesson);
      }
    });

    this.balloonGame.start(gameText, { goalWpm: lesson.goalWpm || 15 });
  }

  /* ================= Свой текст / Конструктор урока ================= */
  startCustomText() {
    const input = document.getElementById('custom-text-input');
    const val = input ? input.value.trim() : '';
    if (!val) {
      alert('Пожалуйста, введите текст для тренировки!');
      return;
    }

    const customLesson = {
      lessonNumber: 999,
      title: 'Свой текст / Диктант учителя',
      sectionTitle: 'Пользовательский урок',
      type: 'typing',
      texts: [val],
      goalWpm: 20,
      minWpm: 12,
      minAccuracy: 85
    };

    this.startTypingLesson(customLesson);
  }

  /* ================= Синхронизация с сервером класса и Рейтинг ================= */
  async syncProgressToServer() {
    const currentProgress = this.getStudentProgress();
    const payload = {
      username: this.currentStudent,
      displayName: this.getDisplayName(this.currentStudent),
      pcName: this.currentPcName,
      lessons: currentProgress
    };

    const endpoints = [
      '/api/progress',
      'http://localhost:8080/api/progress'
    ];

    let synced = false;
    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson && resJson.leaderboard) {
            this.cachedLeaderboard = resJson.leaderboard;
            this.serverOnline = true;
            this.saveStorage();
            synced = true;
            break;
          }
        }
      } catch (e) {
        // Сервер недоступен по данному адресу
      }
    }

    this.serverOnline = synced;
    this.updateSyncStatus();
    return synced;
  }

  async fetchLeaderboard(forceRefresh = false) {
    const btnRefresh = document.getElementById('btn-lb-refresh');
    if (btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = '⏳ Загрузка...';
    }

    // Сначала отправляем свой актуальный прогресс
    await this.syncProgressToServer();

    let fetched = false;
    const endpoints = [
      '/api/leaderboard',
      'http://localhost:8080/api/leaderboard'
    ];

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson && resJson.leaderboard) {
            this.cachedLeaderboard = resJson.leaderboard;
            this.serverOnline = true;
            this.saveStorage();
            fetched = true;
            break;
          }
        }
      } catch (e) {}
    }

    // Если сервер недоступен, строим рейтинг из локальных профилей
    if (!fetched || !this.cachedLeaderboard || this.cachedLeaderboard.length === 0) {
      this.cachedLeaderboard = this.buildLocalLeaderboard();
      this.serverOnline = false;
    }

    this.renderLeaderboard();
    this.updateSyncStatus();

    if (btnRefresh) {
      btnRefresh.disabled = false;
      btnRefresh.textContent = '🔄 Обновить';
    }
  }

  buildLocalLeaderboard() {
    const list = [];
    for (const st of this.allStudents) {
      const prog = this.getStudentProgress(st);
      let completedCount = 0;
      let totalStars = 0;
      let totalWpm = 0;
      let bestWpm = 0;
      let totalAcc = 0;

      for (const l_info of Object.values(prog)) {
        if (l_info && l_info.completed) {
          completedCount++;
          totalStars += l_info.stars || 0;
          const w = l_info.wpm || 0;
          totalWpm += w;
          if (w > bestWpm) bestWpm = w;
          totalAcc += l_info.accuracy || 100;
        }
      }

      const avgWpm = completedCount > 0 ? Math.round(totalWpm / completedCount) : 0;
      const avgAcc = completedCount > 0 ? Math.round(totalAcc / completedCount) : 0;
      const prof = this.userProfiles[st] || {};

      list.push({
        username: st,
        displayName: prof.displayName || st,
        pcName: prof.pcName || this.currentPcName,
        totalStars: totalStars,
        completedLessons: completedCount,
        avgWpm: avgWpm,
        bestWpm: bestWpm,
        avgAccuracy: avgAcc,
        lastActive: new Date().toISOString()
      });
    }
    return list;
  }

  openLeaderboardModal() {
    this.openModal(this.modalLeaderboard);
    this.fetchLeaderboard();
  }

  updateSyncStatus() {
    const el = document.getElementById('lb-sync-status');
    if (!el) return;
    const count = (this.cachedLeaderboard && this.cachedLeaderboard.length) || 0;
    if (this.serverOnline) {
      el.innerHTML = `🟢 <span style="color:#059669; font-weight:700;">Сервер класса онлайн</span> · Синхронизировано (${count} ${this.pluralizeStudents(count)})`;
    } else if (this.isOnline) {
      el.innerHTML = `🌐 <span style="color:#2563eb; font-weight:700;">Онлайн-режим (PWA)</span> · Рейтинг сохранён в браузере (${count} ${this.pluralizeStudents(count)})`;
    } else {
      el.innerHTML = `🟡 <span style="color:#d97706; font-weight:700;">Офлайн-режим</span> · Работа без интернета (${count} ${this.pluralizeStudents(count)})`;
    }
  }

  pluralizeStudents(count) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return 'учеников';
    if (n1 > 1 && n1 < 5) return 'ученика';
    if (n1 === 1) return 'ученик';
    return 'учеников';
  }

  renderLeaderboard() {
    const podiumEl = document.getElementById('lb-podium');
    const tbodyEl = document.getElementById('lb-table-body');
    if (!podiumEl || !tbodyEl) return;

    if (!this.cachedLeaderboard || this.cachedLeaderboard.length === 0) {
      this.cachedLeaderboard = this.buildLocalLeaderboard();
    }

    // Сортировка по активной вкладке с корректными дополнительными критериями
    const sorted = [...this.cachedLeaderboard];
    if (this.leaderboardTab === 'speed') {
      sorted.sort((a, b) => (b.avgWpm || 0) - (a.avgWpm || 0) || (b.totalStars || 0) - (a.totalStars || 0) || (b.completedLessons || 0) - (a.completedLessons || 0));
    } else if (this.leaderboardTab === 'lessons') {
      sorted.sort((a, b) => (b.completedLessons || 0) - (a.completedLessons || 0) || (b.totalStars || 0) - (a.totalStars || 0) || (b.avgWpm || 0) - (a.avgWpm || 0));
    } else if (this.leaderboardTab === 'accuracy') {
      sorted.sort((a, b) => (b.avgAccuracy || 0) - (a.avgAccuracy || 0) || (b.completedLessons || 0) - (a.completedLessons || 0) || (b.totalStars || 0) - (a.totalStars || 0));
    } else { // 'stars'
      sorted.sort((a, b) => (b.totalStars || 0) - (a.totalStars || 0) || (b.avgWpm || 0) - (a.avgWpm || 0) || (b.completedLessons || 0) - (a.completedLessons || 0));
    }

    // 1. Отрисовка Пьедестала Топ-3 (только среди учеников с реальными результатами)
    podiumEl.innerHTML = '';
    const avatars = ['🦁', '🚀', '🦊', '🐯', '⚡', '🐼', '🦄', '🦅', '🐬', '🏆', '🌟', '🎯'];

    const getMetricText = (item) => {
      switch (this.leaderboardTab) {
        case 'speed': return `⚡ ${item.avgWpm || 0} СВМ`;
        case 'lessons': return `📚 ${item.completedLessons || 0} ур.`;
        case 'accuracy': return `🎯 ${item.completedLessons > 0 ? (item.avgAccuracy || 0) + '%' : '—'}`;
        default: return `⭐ ${item.totalStars || 0}`;
      }
    };

    const getAvatar = (name) => {
      let code = 0;
      for (let i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
      return avatars[code % avatars.length];
    };

    // Отображаем на пьедестале только тех, кто прошёл хотя бы 1 урок или заработал звёзды
    const activeForPodium = sorted.filter(s => (s.completedLessons || 0) > 0 || (s.totalStars || 0) > 0 || (s.avgWpm || 0) > 0);

    const podiumItems = [];
    if (activeForPodium.length > 1) podiumItems.push({ rank: 2, item: activeForPodium[1], stepClass: 'podium-step-2', medal: '🥈' });
    if (activeForPodium.length > 0) podiumItems.push({ rank: 1, item: activeForPodium[0], stepClass: 'podium-step-1', medal: '🥇' });
    if (activeForPodium.length > 2) podiumItems.push({ rank: 3, item: activeForPodium[2], stepClass: 'podium-step-3', medal: '🥉' });

    podiumItems.forEach(p => {
      const step = document.createElement('div');
      step.className = `podium-step ${p.stepClass}`;
      const isWinner = p.rank === 1;
      step.innerHTML = `
        ${isWinner ? '<div class="podium-crown">👑</div>' : ''}
        <div class="podium-avatar">${getAvatar(p.item.username)}</div>
        <div class="podium-name" title="${this.escapeHtml(p.item.displayName || p.item.username)}">${this.escapeHtml(p.item.displayName || p.item.username)}</div>
        <div class="podium-pc">${this.escapeHtml(p.item.pcName || 'ПК')}</div>
        <div class="podium-pillar">
          <div class="podium-rank">${p.medal}</div>
          <div class="podium-val">${getMetricText(p.item)}</div>
        </div>
      `;
      podiumEl.appendChild(step);
    });

    // 2. Отрисовка Таблицы
    tbodyEl.innerHTML = '';

    if (sorted.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px 16px; color: #64748b;">
            <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">Пока нет данных для рейтинга</div>
            <div style="font-size: 13px;">Пройдите хотя бы один урок, чтобы появиться в рейтинге класса!</div>
          </td>
        </tr>
      `;
      return;
    }

    sorted.forEach((item, idx) => {
      const rank = idx + 1;
      const isCurrent = item.username === this.currentStudent || item.username === this.currentWindowsUser;
      
      let rankBadgeHtml = '';
      if (rank === 1) rankBadgeHtml = '<span class="rank-badge rank-gold">🥇 1</span>';
      else if (rank === 2) rankBadgeHtml = '<span class="rank-badge rank-silver">🥈 2</span>';
      else if (rank === 3) rankBadgeHtml = '<span class="rank-badge rank-bronze">🥉 3</span>';
      else rankBadgeHtml = `<span class="rank-badge rank-normal">${rank}</span>`;

      const timeAgoText = this.formatActivityTime(item.lastActive);
      const dispName = item.displayName || item.username;

      const tr = document.createElement('tr');
      if (isCurrent) tr.className = 'lb-row-current';
      tr.innerHTML = `
        <td class="col-rank">${rankBadgeHtml}</td>
        <td class="col-user">
          <div class="user-cell">
            <span class="user-cell-avatar">${getAvatar(item.username)}</span>
            <div class="user-cell-names">
              <span class="user-display-name">
                ${this.escapeHtml(dispName)}
                ${isCurrent ? '<span class="you-pill">Это вы</span>' : ''}
              </span>
              <span class="user-pc-name">Компьютер: ${this.escapeHtml(item.pcName || 'ПК')} (${this.escapeHtml(item.username)})</span>
            </div>
          </div>
        </td>
        <td class="col-stars">⭐ <strong>${item.totalStars || 0}</strong></td>
        <td class="col-speed">⚡ <strong>${item.avgWpm || 0}</strong> <span style="font-size:11px; color:#64748b;">(${(item.avgWpm || 0) * 5} зн/м)</span></td>
        <td class="col-acc">🎯 <strong>${item.completedLessons > 0 ? (item.avgAccuracy || 0) + '%' : '—'}</strong></td>
        <td class="col-lessons">📚 <strong>${item.completedLessons || 0}</strong> <span style="font-size:11px; color:#64748b;">/ 489</span></td>
        <td class="col-status">${timeAgoText}</td>
      `;
      tbodyEl.appendChild(tr);
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  formatActivityTime(isoString) {
    if (!isoString) return 'Недавно';
    try {
      const dt = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - dt) / 1000);
      if (diffSecs < 60) return '<span style="color:#10b981; font-weight:700;">🟢 В сети</span>';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} мин назад`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} ч назад`;
      return dt.toLocaleDateString('ru-RU');
    } catch (e) {
      return 'Недавно';
    }
  }

  /* ================= Настройки и Экспорт/Импорт ================= */
  openSettingsModal() {
    const chkUnlock = document.getElementById('chk-teacher-unlock');
    if (chkUnlock) chkUnlock.checked = this.teacherMode;

    chkUnlock.onchange = (e) => {
      this.teacherMode = e.target.checked;
      this.saveStorage();
      this.renderCourseMap();
    };

    document.getElementById('btn-export-progress').onclick = () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        students: this.allStudents,
        userProfiles: this.userProfiles,
        progress: this.progress,
        currentWindowsUser: this.currentWindowsUser,
        currentPcName: this.currentPcName,
        exportDate: new Date().toISOString()
      }, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `прогресс_слепая_печать_${this.currentStudent}.json`);
      dlAnchor.click();
    };

    document.getElementById('input-import-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.progress) {
            this.progress = parsed.progress;
            if (parsed.students) this.allStudents = parsed.students;
            if (parsed.userProfiles) this.userProfiles = parsed.userProfiles;
            this.saveStorage();
            this.updateStudentHeader();
            this.renderCourseMap();
            this.syncProgressToServer();
            alert('Прогресс успешно загружен!');
            this.closeModal(this.modalSettings);
          }
        } catch (err) {
          alert('Ошибка при чтении файла: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    document.getElementById('btn-reset-current-progress').onclick = () => {
      if (confirm(`Вы уверены, что хотите сбросить прогресс для ученика "${this.currentStudent}"?`)) {
        this.progress[this.currentStudent] = {};
        this.saveStorage();
        this.updateStudentHeader();
        this.renderCourseMap();
        this.syncProgressToServer();
        alert('Прогресс сброшен!');
        this.closeModal(this.modalSettings);
      }
    };

    document.getElementById('btn-settings-close').onclick = () => {
      this.closeModal(this.modalSettings);
    };

    this.openModal(this.modalSettings);
  }

  /* ================= Мониторинг сети и PWA (установка на рабочий стол) ================= */
  initNetworkMonitoring() {
    this.isOnline = navigator.onLine;
    this.updateNetworkBadge(this.isOnline);

    window.addEventListener('online', () => {
      this.checkNetworkStatus(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateNetworkBadge(false);
      this.updateSyncStatus();
    });

    // Фоновая периодическая проверка подключения каждые 30 секунд
    setInterval(() => {
      this.checkNetworkStatus(false);
    }, 30000);
  }

  async checkNetworkStatus(triggerSync = false) {
    if (!navigator.onLine) {
      this.isOnline = false;
      this.updateNetworkBadge(false);
      this.updateSyncStatus();
      return false;
    }

    // Проверяем реальное интернет-соединение через быстрый HEAD-запрос
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const pingUrl = `app_icon.png?ping=${Date.now()}`;
      const resp = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.isOnline = resp.ok;
    } catch (e) {
      this.isOnline = false;
    }

    this.updateNetworkBadge(this.isOnline);
    this.updateSyncStatus();

    // Если есть связь и запрошена синхронизация — синхронизируем данные с сервером
    if (this.isOnline && triggerSync) {
      this.syncProgressToServer();
    }

    return this.isOnline;
  }

  updateNetworkBadge(isOnline) {
    const badge = document.getElementById('network-status-badge');
    const text = document.getElementById('network-status-text');
    if (!badge || !text) return;

    if (isOnline) {
      badge.classList.remove('offline');
      badge.classList.add('online');
      text.textContent = 'Онлайн';
      badge.title = 'Подключение к сети активно. Данные синхронизируются в фоне.';
    } else {
      badge.classList.remove('online');
      badge.classList.add('offline');
      text.textContent = 'Офлайн';
      badge.title = 'Нет подключения к сети. Тренажёр работает автономно.';
    }
  }

  initPWA() {
    // 1. Регистрация Service Worker для PWA и офлайн-кэширования
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker успешно зарегистрирован:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Ошибка регистрации Service Worker:', err);
          });
      });
    }

    // 2. Обработка запроса браузера на установку на Рабочий стол (beforeinstallprompt)
    const btnInstall = document.getElementById('btn-pwa-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      // Предотвращаем автоматический показ стандартной плашки браузера
      e.preventDefault();
      this.deferredPwaPrompt = e;
      if (btnInstall) {
        btnInstall.classList.remove('hidden');
        btnInstall.onclick = async () => {
          if (!this.deferredPwaPrompt) return;
          this.deferredPwaPrompt.prompt();
          const choiceResult = await this.deferredPwaPrompt.userChoice;
          if (choiceResult && choiceResult.outcome === 'accepted') {
            console.log('[PWA] Пользователь установил тренажёр на рабочий стол');
            btnInstall.classList.add('hidden');
          }
          this.deferredPwaPrompt = null;
        };
      }
    });

    // 3. Событие успешного завершения установки
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Приложение установлено на устройство');
      if (btnInstall) btnInstall.classList.add('hidden');
      this.deferredPwaPrompt = null;
    });
  }

  /* ================= Вспомогательные функции модалок ================= */
  openModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(modal) {
    if (modal) modal.classList.add('hidden');
  }

  closeAllModals() {
    [this.modalIntro, this.modalResults, this.modalTheory, this.modalSettings, this.modalLeaderboard].forEach(m => {
      if (m) m.classList.add('hidden');
    });
  }

  isAnyModalOpen() {
    return [this.modalIntro, this.modalResults, this.modalTheory, this.modalSettings, this.modalLeaderboard].some(m => m && !m.classList.contains('hidden'));
  }
}

// Запуск приложения при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  window.typingApp = new TypingApp();
});
