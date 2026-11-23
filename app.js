// app.js - Logic Web Ôn tập & Thi thử PRO192 - Lập trình Hướng đối tượng Java (7 đề chính thức + Đề Tổng hợp 349 câu + KaTeX + Xem ảnh + Tráo câu)

let currentExamIdx = 0;
let currentMode = 'study'; // 'study' | 'practice' | 'exam' | 'review'

// Trạng thái Chế độ Ôn Tập
let studyState = {
  filterExam: 'ALL',
  isShuffled: false,
  shuffledQuestions: []
};

// Trạng thái Chế độ Thi Thử Chuẩn FE (Tính giờ & Nộp bài mới chấm)
let examState = {
  selectedQuestionCount: 50,
  shuffledQuestions: [],
  userAnswers: {}, // { [questionId]: ['A'] }
  flaggedQuestions: {}, // { [questionId]: true/false }
  timerInterval: null,
  timeRemaining: 3600, // seconds
  isSubmitted: false,
  score: 0,
  filterWrongOnly: false
};

// Trạng thái Chế độ Thi Thử Luyện Tập (Chọn tới đâu báo đúng/sai ngay tới đó)
let practiceState = {
  selectedQuestionCount: 50,
  shuffledQuestions: [],
  userAnswers: {},
  confirmedQuestions: {},
  results: {},
  correctCount: 0,
  wrongCount: 0,
  isFinished: false
};

function getExams() {
  if (typeof window !== 'undefined' && window.EXAMS_DATA && window.EXAMS_DATA.length > 0) {
    return window.EXAMS_DATA;
  }
  if (typeof EXAMS_DATA !== 'undefined' && EXAMS_DATA.length > 0) {
    return EXAMS_DATA;
  }
  return [];
}

function shuffleArray(arr) {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function isImageOnlyOptions(q) {
  return q.options && q.options.length > 4 && q.options.every(o => !o.content || !o.content.trim());
}

function renderMathInContainer(el) {
  if (!el || !window.renderMathInElement) return;
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
      strict: false
    });
  } catch (err) {
    console.warn('KaTeX render warning:', err);
  }
}

window.renderCurrentMath = function () {
  const container = document.getElementById('appContent');
  renderMathInContainer(container);
};

// Khởi chạy khi load trang
function initApp() {
  renderHeaderTabs();
  loadCurrentExam();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Render danh sách các tab đề thi (6 đề + 1 đề tổng hợp)
function renderHeaderTabs() {
  const container = document.getElementById('examTabs');
  if (!container) return;
  const exams = getExams();
  if (exams.length === 0) return;

  container.innerHTML = '';

  exams.forEach((exam, idx) => {
    const btn = document.createElement('button');
    const isSpecial = exam.isAll;
    const icon = isSpecial ? '🔥' : (exam.type === 'image' ? '📸' : '📝');
    btn.className = `exam-tab-btn ${idx === currentExamIdx ? 'active' : ''} ${isSpecial ? 'special-tab' : ''}`;
    btn.innerHTML = `<span>${icon}</span> <span>${exam.shortTitle}</span> <span class="tab-badge">${exam.total} câu</span>`;
    btn.onclick = () => selectExam(idx);
    container.appendChild(btn);
  });
}

// Chuyển sang đề thi khác
function selectExam(idx) {
  if (currentMode === 'exam' && !examState.isSubmitted) {
    if (!confirm('Bạn đang làm dở bài thi thử tính giờ, chuyển đề khác sẽ hủy bài thi hiện tại. Bạn có chắc chắn không?')) {
      return;
    }
    clearInterval(examState.timerInterval);
  }

  currentExamIdx = idx;
  studyState.filterExam = 'ALL';
  studyState.isShuffled = false;
  studyState.shuffledQuestions = [];
  renderHeaderTabs();

  if (currentMode === 'practice') {
    startNewPracticeSession();
  } else if (currentMode === 'exam' || currentMode === 'review') {
    setMode('exam');
  } else {
    setMode('study');
  }
}

// Chuyển đổi giữa 3 chế độ: Ôn tập / Thi thử Luyện tập / Thi thử Chuẩn FE
function setMode(mode) {
  if (currentMode === 'exam' && !examState.isSubmitted && mode !== 'exam') {
    if (!confirm('Bạn đang làm dở bài thi thử tính giờ, chuyển chế độ sẽ hủy bài thi hiện tại. Bạn có chắc chắn không?')) {
      return;
    }
    clearInterval(examState.timerInterval);
  }

  currentMode = mode;

  const btnStudy = document.getElementById('btnModeStudy');
  const btnPractice = document.getElementById('btnModePractice');
  const btnExam = document.getElementById('btnModeExam');
  if (btnStudy) btnStudy.classList.toggle('active', mode === 'study');
  if (btnPractice) btnPractice.classList.toggle('active', mode === 'practice');
  if (btnExam) btnExam.classList.toggle('active', mode === 'exam' || mode === 'review');

  if (mode === 'study') {
    clearInterval(examState.timerInterval);
    renderStudyView();
  } else if (mode === 'practice') {
    clearInterval(examState.timerInterval);
    startNewPracticeSession();
  } else if (mode === 'exam') {
    startNewExamSession();
  } else if (mode === 'review') {
    renderReviewView();
  }
}

function loadCurrentExam() {
  setMode(currentMode);
}

/* ============================================================
   CHẾ ĐỘ 1: ÔN TẬP (HIỆN CÂU HỎI VÀ ĐÁP ÁN ĐỂ HỌC THUỘC)
============================================================ */
function getStudyFilteredQuestions(exam) {
  let list = exam.questions;
  if (exam.isAll && studyState.filterExam !== 'ALL') {
    list = exam.questions.filter(q => q.exam_code === studyState.filterExam);
  }
  return list;
}

function shuffleStudyQuestions() {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  if (!exam) return;
  const base = getStudyFilteredQuestions(exam);
  studyState.isShuffled = true;
  studyState.shuffledQuestions = shuffleArray(base);
  renderStudyView();
}

function resetStudyOrder() {
  studyState.isShuffled = false;
  studyState.shuffledQuestions = [];
  renderStudyView();
}

function renderStudyView() {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  const container = document.getElementById('appContent');
  if (!container || !exam) return;
  const isAll = !!exam.isAll;

  const baseFiltered = getStudyFilteredQuestions(exam);
  const displayQuestions = studyState.isShuffled && studyState.shuffledQuestions.length === baseFiltered.length
    ? studyState.shuffledQuestions
    : baseFiltered;

  // Thống kê phân bố đáp án theo danh sách đang hiển thị
  const counts = {};
  displayQuestions.forEach(q => {
    counts[q.correct_answer] = (counts[q.correct_answer] || 0) + 1;
  });

  const countA = counts['A'] || 0;
  const countB = counts['B'] || 0;
  const countC = counts['C'] || 0;
  const countD = counts['D'] || 0;
  const countE = counts['E'] || 0;

  container.innerHTML = `
    <!-- Thẻ chọn Đề thi nhanh -->
    <div class="exam-picker-container">
      <div class="exam-picker-header">
        <span class="exam-picker-title">📚 CHỌN ĐỀ THI PRO192 ĐỂ ÔN TẬP / THI THỬ (HIỆN CÓ ${exams.length} BỘ ĐỀ):</span>
      </div>
      <div class="exam-picker-grid">
        ${exams.map((ex, idx) => `
          <div class="exam-picker-card ${idx === currentExamIdx ? 'active' : ''} ${ex.isAll ? 'all-card' : ''}" onclick="selectExam(${idx})">
            <div class="picker-top">
              <span class="picker-icon">${ex.isAll ? '🔥' : (ex.type === 'image' ? '📸' : '📝')}</span>
              <span class="picker-badge">${ex.total} câu</span>
            </div>
            <div class="picker-title">${ex.shortTitle}</div>
            <div class="picker-status">${idx === currentExamIdx ? '👉 Đang xem đề này' : 'Bấm để chuyển đề'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="exam-summary-card">
      <div class="summary-header">
        <div>
          <div class="summary-title">📖 ĐANG XEM: ${exam.title}</div>
          <div class="summary-meta">
            Hiển thị trọn vẹn ${displayQuestions.length} câu hỏi có sẵn đáp án đúng chuẩn 100%
            ${studyState.isShuffled ? ' · <strong style="color:#fbbf24;">(Đang tráo ngẫu nhiên)</strong>' : ''}
          </div>
        </div>
        <div class="summary-actions">
          <button class="btn-shuffle ${studyState.isShuffled ? 'active' : ''}" onclick="shuffleStudyQuestions()">
            🔀 Tráo câu hỏi
          </button>
          ${studyState.isShuffled ? `
            <button class="btn-secondary" style="padding: 8px 14px; font-size: 0.85rem;" onclick="resetStudyOrder()">
              📋 Thứ tự gốc
            </button>
          ` : ''}
          ${isAll ? `
            <div class="filter-exam-select">
              <label style="font-size: 0.85rem; color: var(--text-muted); margin-right: 6px;">Lọc theo đề:</label>
              <select onchange="changeStudyFilter(this.value)" class="custom-select">
                <option value="ALL" ${studyState.filterExam === 'ALL' ? 'selected' : ''}>Tất cả ${exams.length - 1} đề (${exam.total} câu)</option>
                ${exams.filter(e => !e.isAll).map(e => `
                  <option value="${e.code}" ${studyState.filterExam === e.code ? 'selected' : ''}>${e.shortTitle} (${e.total} câu)</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-number">${displayQuestions.length}</div>
          <div class="stat-label">Tổng câu hỏi</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: #60a5fa;">${countA}</div>
          <div class="stat-label">Đáp án A</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: #34d399;">${countB}</div>
          <div class="stat-label">Đáp án B</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: #f472b6;">${countC}</div>
          <div class="stat-label">Đáp án C</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: #fbbf24;">${countD}</div>
          <div class="stat-label">Đáp án D</div>
        </div>
        ${countE > 0 ? `
          <div class="stat-box">
            <div class="stat-number" style="color: #a78bfa;">${countE}</div>
            <div class="stat-label">Đáp án E</div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="layout-with-sidebar">
      <div class="questions-column">
        ${displayQuestions.map((q, idx) => renderStudyQuestionCard(q, idx + 1)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>DANH SÁCH CÂU HỎI</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${displayQuestions.length} câu</span>
          </div>

          <div class="nav-grid ${displayQuestions.length > 50 ? 'dense-grid' : ''}">
            ${displayQuestions.map((q, idx) => `
              <button class="nav-btn is-study" onclick="scrollToQuestion('study-q-${q.id}')">
                ${idx + 1}
              </button>
            `).join('')}
          </div>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn-shuffle" onclick="shuffleStudyQuestions()">
              🔀 Tráo Ngẫu Nhiên Câu Hỏi
            </button>
            <button class="btn-submit-exam" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #fff;" onclick="setMode('practice')">
              ⚡ Thi Thử (Báo Đúng/Sai Ngay)
            </button>
            <button class="btn-submit-exam" onclick="setMode('exam')">
              ⏱️ Thi Thử Chuẩn FE (Tính Giờ)
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;

  renderMathInContainer(container);
}

function changeStudyFilter(val) {
  studyState.filterExam = val;
  studyState.isShuffled = false;
  studyState.shuffledQuestions = [];
  renderStudyView();
}

function renderStudyQuestionCard(q, displayNum) {
  const isMulti = q.is_multi;
  const correctArr = q.correct_answer.split(',').map(s => s.trim());
  const compact = isImageOnlyOptions(q);

  return `
    <div class="question-card" id="study-q-${q.id}">
      <div class="q-top-row">
        <div>
          <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
          ${isMulti ? `<span class="badge-multi">⚡ Chọn nhiều đáp án (${q.correct_count} đáp án)</span>` : ''}
        </div>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${q.chapter_name || 'PRO192'}</span>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap" onclick="openLightbox('${q.image_url}')" title="Bấm vào để phóng to hình ảnh">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
          <div class="q-image-hint">🔍 Bấm vào ảnh để phóng to toàn màn hình</div>
        </div>
      ` : ''}

      <div class="options-container ${compact ? 'options-compact-grid' : ''}">
        ${q.options.map(opt => {
          const isCorrect = opt.is_correct || correctArr.includes(opt.label);
          return `
            <div class="option-row ${isCorrect ? 'is-correct-ans' : ''}">
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
              ${isCorrect ? `<span class="answer-pill correct">${compact ? '✓ ĐÚNG' : '✓ ĐÁP ÁN ĐÚNG'}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>

      ${q.explanation ? `
        <div class="q-explanation-box">
          <div class="q-explanation-header">💡 Giải thích chi tiết:</div>
          <div class="q-explanation-content">${escapeHtml(q.explanation)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/* ============================================================
   CHẾ ĐỘ 2: THI THỬ LUYỆN TẬP (CHỌN TỚI ĐÂU BÁO ĐÚNG/SAI TỚI ĐÓ)
============================================================ */
function startNewPracticeSession(customCount) {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  const isAll = !!exam.isAll;

  let qCount = 50;
  if (isAll) {
    qCount = customCount || practiceState.selectedQuestionCount || 50;
    practiceState.selectedQuestionCount = qCount;
  } else {
    qCount = exam.questions.length;
  }

  const pool = shuffleArray(exam.questions);

  practiceState.shuffledQuestions = pool.slice(0, qCount);
  practiceState.userAnswers = {};
  practiceState.confirmedQuestions = {};
  practiceState.results = {};
  practiceState.correctCount = 0;
  practiceState.wrongCount = 0;
  practiceState.isFinished = false;

  renderPracticeView();
}

function renderPracticeView() {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  const container = document.getElementById('appContent');
  if (!container || !exam) return;
  const isAll = !!exam.isAll;
  const total = practiceState.shuffledQuestions.length;
  const doneCount = practiceState.correctCount + practiceState.wrongCount;
  const currentScore = doneCount > 0 ? ((practiceState.correctCount / total) * 10).toFixed(1) : '0.0';

  container.innerHTML = `
    <!-- Thẻ chọn Đề thi nhanh -->
    <div class="exam-picker-container" style="margin-bottom: 16px;">
      <div class="exam-picker-grid">
        ${exams.map((ex, idx) => `
          <div class="exam-picker-card ${idx === currentExamIdx ? 'active' : ''} ${ex.isAll ? 'all-card' : ''}" onclick="selectExam(${idx})">
            <div class="picker-top">
              <span class="picker-icon">${ex.isAll ? '🔥' : (ex.type === 'image' ? '📸' : '📝')}</span>
              <span class="picker-badge">${ex.total} câu</span>
            </div>
            <div class="picker-title">${ex.shortTitle}</div>
            <div class="picker-status">${idx === currentExamIdx ? '👉 Đang luyện đề này' : 'Bấm để chuyển đề'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="exam-header-sticky">
      <div class="exam-header-content">
        <div class="exam-title-group">
          <h2>⚡ ${exam.title} (Luyện Tập Báo Đúng/Sai Ngay)</h2>
          <div class="exam-sub">
            Chọn đáp án tới đâu hệ thống báo kết quả đúng/sai ngay tới đó · Đã làm: <span id="practiceDoneCount">${doneCount}</span>/${total} câu
          </div>
        </div>

        <div class="exam-meta-actions">
          ${isAll ? `
            <div class="q-count-picker">
              <label>Số câu:</label>
              <select onchange="startNewPracticeSession(parseInt(this.value))" class="custom-select">
                <option value="50" ${practiceState.selectedQuestionCount === 50 ? 'selected' : ''}>50 Câu</option>
                <option value="100" ${practiceState.selectedQuestionCount === 100 ? 'selected' : ''}>100 Câu</option>
                <option value="${exam.total}" ${practiceState.selectedQuestionCount === exam.total ? 'selected' : ''}>Toàn bộ ${exam.total} Câu</option>
              </select>
            </div>
          ` : ''}

          <div class="practice-stats-bar">
            <span class="practice-stat-tag tag-correct">🟢 Đúng: <strong id="practiceStatCorrect">${practiceState.correctCount}</strong></span>
            <span class="practice-stat-tag tag-wrong">🔴 Sai: <strong id="practiceStatWrong">${practiceState.wrongCount}</strong></span>
            <span class="practice-stat-tag tag-score">🎯 Điểm: <strong id="practiceStatScore">${currentScore}</strong>/10</span>
          </div>

          <button class="btn-shuffle" onclick="restartPractice()">
            🔀 Tráo câu mới
          </button>

          <button class="btn-submit-exam" onclick="finishPracticeSession()">
            🏆 Tổng Kết Điểm
          </button>
        </div>
      </div>
    </div>

    <div class="layout-with-sidebar">
      <div class="questions-column">
        ${practiceState.shuffledQuestions.map((q, idx) => renderPracticeQuestionCard(q, idx + 1)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>BẢNG CÂU HỎI (${total})</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              <span style="display:inline-block;width:10px;height:10px;background:var(--success);border-radius:2px;margin-right:2px;"></span>Đúng
              <span style="display:inline-block;width:10px;height:10px;background:var(--danger);border-radius:2px;margin-left:6px;margin-right:2px;"></span>Sai
            </span>
          </div>

          <div class="nav-grid ${total > 50 ? 'dense-grid' : ''}" id="practiceNavGrid">
            ${practiceState.shuffledQuestions.map((q, idx) => {
              const isConf = practiceState.confirmedQuestions[q.id];
              const isCorr = practiceState.results[q.id];
              let btnClass = 'nav-btn';
              if (isConf) {
                btnClass += isCorr ? ' nav-correct' : ' nav-wrong';
              }
              return `
                <button class="${btnClass}" id="practice-nav-btn-${q.id}" onclick="scrollToQuestion('practice-q-${q.id}')">
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn-submit-exam" onclick="finishPracticeSession()">
              🏆 Tổng Kết Kết Quả
            </button>
            <button class="btn-shuffle" onclick="restartPractice()">
              🔀 Tráo Đề & Làm Lại
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;

  renderMathInContainer(container);
}

function renderPracticeQuestionCard(q, displayNum) {
  const isMulti = q.is_multi;
  const isConfirmed = !!practiceState.confirmedQuestions[q.id];
  const isCorrect = !!practiceState.results[q.id];
  const userChoices = practiceState.userAnswers[q.id] || [];
  const correctArr = q.correct_answer.split(',').map(s => s.trim());
  const compact = isImageOnlyOptions(q);

  let cardClass = 'question-card';
  if (isConfirmed) {
    cardClass += ' confirmed ' + (isCorrect ? 'review-card-correct' : 'review-card-wrong');
  }

  return `
    <div class="${cardClass}" id="practice-q-${q.id}">
      <div class="q-top-row">
        <div>
          <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
          ${isMulti ? `<span class="badge-multi">⚡ Chọn nhiều (${q.correct_count} đáp án)</span>` : '<span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">(Chọn 1 đáp án - Báo kết quả ngay)</span>'}
          ${isConfirmed ? `
            <span class="review-status-pill ${isCorrect ? 'correct' : 'wrong'}">
              ${isCorrect ? '✓ CHÍNH XÁC (+1đ)' : '✗ CHƯA CHÍNH XÁC (0đ)'}
            </span>
          ` : ''}
        </div>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${q.chapter_name || 'PRO192'}</span>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap" onclick="openLightbox('${q.image_url}')" title="Bấm vào để phóng to hình ảnh">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
          <div class="q-image-hint">🔍 Bấm vào ảnh để phóng to toàn màn hình</div>
        </div>
      ` : ''}

      <div class="options-container ${compact ? 'options-compact-grid' : ''}">
        ${q.options.map(opt => {
          const isRealCorrect = opt.is_correct || correctArr.includes(opt.label);
          const isUserPick = userChoices.includes(opt.label);

          let rowClass = 'option-row';
          let pill = '';

          if (isConfirmed) {
            if (isRealCorrect && isUserPick) {
              rowClass += ' review-correct-pick';
              pill = `<span class="answer-pill correct">${compact ? '✓ Đúng' : '✓ Bạn đã chọn đúng'}</span>`;
            } else if (isRealCorrect && !isUserPick) {
              rowClass += ' review-missed-pick';
              pill = `<span class="answer-pill correct">${compact ? '★ Đáp án' : '★ Đáp án chuẩn'}</span>`;
            } else if (!isRealCorrect && isUserPick) {
              rowClass += ' review-wrong-pick';
              pill = `<span class="answer-pill wrong">${compact ? '✗ Sai' : '✗ Bạn đã chọn sai'}</span>`;
            }
          } else {
            if (isUserPick) {
              rowClass += ' selected';
            }
          }

          const clickHandler = isConfirmed ? '' : `onclick="handlePracticeOptionClick('${q.id}', '${opt.label}', ${isMulti})"`;

          return `
            <div class="${rowClass}" ${clickHandler} id="practice-opt-${q.id}-${opt.label}">
              ${isMulti ? `<span class="option-checkbox-indicator">${isUserPick ? '✓' : ''}</span>` : ''}
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
              ${pill}
            </div>
          `;
        }).join('')}
      </div>

      <div id="practice-action-${q.id}">
        ${!isConfirmed && isMulti ? `
          <button class="btn-check-answer" onclick="confirmPracticeMultiAnswer('${q.id}')">
            🔍 Kiểm tra đáp án câu này
          </button>
        ` : ''}

        ${isConfirmed ? renderPracticeFeedbackBox(q, isCorrect) : ''}
      </div>
    </div>
  `;
}

function renderPracticeFeedbackBox(q, isCorrect) {
  return `
    <div class="instant-feedback-box ${isCorrect ? 'correct' : 'wrong'}">
      <div>
        ${isCorrect
          ? `<strong>🎉 Xuất sắc! Bạn đã chọn chính xác!</strong>`
          : `<strong>❌ Chưa chính xác!</strong> Đáp án đúng là: <span style="text-decoration: underline; font-weight: 700;">${q.correct_answer}</span>`}
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">
        ${isCorrect ? '✅ +1 Điểm' : '⚠️ Ghi nhớ đáp án này nhé!'}
      </div>
    </div>
    ${q.explanation ? `
      <div class="q-explanation-box">
        <div class="q-explanation-header">💡 Giải thích chi tiết:</div>
        <div class="q-explanation-content">${escapeHtml(q.explanation)}</div>
      </div>
    ` : ''}
  `;
}

function handlePracticeOptionClick(questionId, optionLabel, isMulti) {
  if (practiceState.confirmedQuestions[questionId]) return;

  const q = practiceState.shuffledQuestions.find(item => item.id === questionId);
  if (!q) return;

  if (isMulti) {
    let currentChoices = practiceState.userAnswers[questionId] || [];
    if (currentChoices.includes(optionLabel)) {
      currentChoices = currentChoices.filter(item => item !== optionLabel);
    } else {
      currentChoices.push(optionLabel);
    }
    currentChoices.sort();
    practiceState.userAnswers[questionId] = currentChoices;

    const card = document.getElementById(`practice-q-${questionId}`);
    if (card) {
      card.querySelectorAll('.option-row').forEach(row => {
        const label = row.querySelector('.option-letter').textContent.trim();
        const isSelected = currentChoices.includes(label);
        row.classList.toggle('selected', isSelected);
        const indicator = row.querySelector('.option-checkbox-indicator');
        if (indicator) {
          indicator.textContent = isSelected ? '✓' : '';
        }
      });
    }
  } else {
    practiceState.userAnswers[questionId] = [optionLabel];
    const isCorrect = (optionLabel === q.correct_answer.trim());
    practiceState.results[questionId] = isCorrect;
    practiceState.confirmedQuestions[questionId] = true;

    if (isCorrect) {
      practiceState.correctCount++;
    } else {
      practiceState.wrongCount++;
    }

    const card = document.getElementById(`practice-q-${questionId}`);
    if (card) {
      const idx = practiceState.shuffledQuestions.findIndex(item => item.id === questionId);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = renderPracticeQuestionCard(q, idx + 1);
      const newCard = tempDiv.firstElementChild;
      card.replaceWith(newCard);
      renderMathInContainer(newCard);
    }

    updatePracticeStats();
  }
}

function confirmPracticeMultiAnswer(questionId) {
  if (practiceState.confirmedQuestions[questionId]) return;

  const q = practiceState.shuffledQuestions.find(item => item.id === questionId);
  if (!q) return;

  const userChoices = practiceState.userAnswers[questionId] || [];
  if (userChoices.length === 0) {
    alert('Vui lòng chọn ít nhất 1 đáp án trước khi bấm kiểm tra!');
    return;
  }

  const userChoiceStr = [...userChoices].sort().join(', ');
  const isCorrect = (userChoiceStr === q.correct_answer);
  practiceState.results[questionId] = isCorrect;
  practiceState.confirmedQuestions[questionId] = true;

  if (isCorrect) {
    practiceState.correctCount++;
  } else {
    practiceState.wrongCount++;
  }

  const card = document.getElementById(`practice-q-${questionId}`);
  if (card) {
    const idx = practiceState.shuffledQuestions.findIndex(item => item.id === questionId);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderPracticeQuestionCard(q, idx + 1);
    const newCard = tempDiv.firstElementChild;
    card.replaceWith(newCard);
    renderMathInContainer(newCard);
  }

  updatePracticeStats();
}

function updatePracticeStats() {
  const total = practiceState.shuffledQuestions.length;
  const correct = practiceState.correctCount;
  const wrong = practiceState.wrongCount;
  const done = correct + wrong;

  const elCorrect = document.getElementById('practiceStatCorrect');
  const elWrong = document.getElementById('practiceStatWrong');
  const elScore = document.getElementById('practiceStatScore');
  const elDone = document.getElementById('practiceDoneCount');

  if (elCorrect) elCorrect.textContent = correct;
  if (elWrong) elWrong.textContent = wrong;
  if (elDone) elDone.textContent = done;
  if (elScore) {
    const score10 = done > 0 ? ((correct / total) * 10).toFixed(1) : '0.0';
    elScore.textContent = score10;
  }

  practiceState.shuffledQuestions.forEach(q => {
    const btn = document.getElementById(`practice-nav-btn-${q.id}`);
    if (!btn) return;
    const isConf = practiceState.confirmedQuestions[q.id];
    const isCorr = practiceState.results[q.id];
    btn.className = 'nav-btn';
    if (isConf) {
      btn.classList.add(isCorr ? 'nav-correct' : 'nav-wrong');
    }
  });

  if (done === total && total > 0 && !practiceState.isFinished) {
    practiceState.isFinished = true;
    setTimeout(() => {
      finishPracticeSession();
    }, 600);
  }
}

function finishPracticeSession() {
  const total = practiceState.shuffledQuestions.length;
  const correct = practiceState.correctCount;
  const done = correct + practiceState.wrongCount;
  const score10 = ((correct / total) * 10).toFixed(1);
  const percent = Math.round((correct / total) * 100);

  const unanswered = total - done;
  if (unanswered > 0) {
    if (!confirm(`Bạn đã làm ${done}/${total} câu hỏi (còn ${unanswered} câu chưa làm).\nBạn có muốn xem bảng tổng kết điểm ngay không?`)) {
      return;
    }
  }

  showResultModal(correct, total, score10, percent);
}

function restartPractice() {
  document.getElementById('resultModal').classList.remove('active');
  startNewPracticeSession();
}

/* ============================================================
   CHẾ ĐỘ 3: THI THỬ CHUẨN FE (TRÁO CÂU, TÍNH GIỜ, NỘP BÀI CHẤM ĐIỂM)
============================================================ */
function startNewExamSession(customCount) {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  const isAll = !!exam.isAll;

  let qCount = 50;
  let timeInSeconds = 3600; // 60 phút

  if (isAll) {
    qCount = customCount || examState.selectedQuestionCount || 50;
    examState.selectedQuestionCount = qCount;
    if (qCount >= 200) {
      timeInSeconds = 9000; // 150 phút cho 300 câu
    } else if (qCount === 100) {
      timeInSeconds = 5400; // 90 phút cho 100 câu
    } else {
      timeInSeconds = 3600; // 60 phút cho 50 câu
    }
  } else {
    qCount = exam.questions.length;
    timeInSeconds = 3600;
  }

  const pool = shuffleArray(exam.questions);

  examState.shuffledQuestions = pool.slice(0, qCount);
  examState.userAnswers = {};
  examState.flaggedQuestions = {};
  examState.isSubmitted = false;
  examState.score = 0;
  examState.timeRemaining = timeInSeconds;
  examState.filterWrongOnly = false;

  clearInterval(examState.timerInterval);
  examState.timerInterval = setInterval(() => {
    examState.timeRemaining--;
    updateTimerDisplay();
    if (examState.timeRemaining <= 0) {
      clearInterval(examState.timerInterval);
      alert('⏰ Đã hết thời gian làm bài! Hệ thống sẽ tự động thu bài và chấm điểm.');
      submitExam();
    }
  }, 1000);

  renderExamView();
}

function updateTimerDisplay() {
  const el = document.getElementById('examTimer');
  if (!el) return;
  const m = Math.floor(examState.timeRemaining / 60);
  const s = examState.timeRemaining % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (examState.timeRemaining <= 300) {
    el.style.color = 'var(--danger)';
    el.classList.add('urgent-pulse');
  } else {
    el.style.color = 'var(--primary)';
    el.classList.remove('urgent-pulse');
  }
}

function renderExamView() {
  const exams = getExams();
  const exam = exams[currentExamIdx] || exams[0];
  const container = document.getElementById('appContent');
  if (!container || !exam) return;
  const isAll = !!exam.isAll;
  const total = examState.shuffledQuestions.length;

  container.innerHTML = `
    <!-- Thẻ chọn Đề thi nhanh trong chế độ Thi thử -->
    <div class="exam-picker-container" style="margin-bottom: 16px;">
      <div class="exam-picker-grid">
        ${exams.map((ex, idx) => `
          <div class="exam-picker-card ${idx === currentExamIdx ? 'active' : ''} ${ex.isAll ? 'all-card' : ''}" onclick="selectExam(${idx})">
            <div class="picker-top">
              <span class="picker-icon">${ex.isAll ? '🔥' : (ex.type === 'image' ? '📸' : '📝')}</span>
              <span class="picker-badge">${ex.total} câu</span>
            </div>
            <div class="picker-title">${ex.shortTitle}</div>
            <div class="picker-status">${idx === currentExamIdx ? '👉 Đang thi đề này' : 'Bấm để thi đề này'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="exam-header-sticky">
      <div class="exam-header-content">
        <div class="exam-title-group">
          <h2>⏱️ ${exam.title}</h2>
          <div class="exam-sub">
            Thi thử ngẫu nhiên <strong>${total}</strong> câu hỏi · Đã làm: <span id="answeredCount">0</span>/${total} câu
          </div>
        </div>

        <div class="exam-meta-actions">
          ${isAll ? `
            <div class="q-count-picker">
              <label>Số câu thi:</label>
              <select onchange="startNewExamSession(parseInt(this.value))" class="custom-select">
                <option value="50" ${examState.selectedQuestionCount === 50 ? 'selected' : ''}>50 Câu (60 phút)</option>
                <option value="100" ${examState.selectedQuestionCount === 100 ? 'selected' : ''}>100 Câu (90 phút)</option>
                <option value="${exam.total}" ${examState.selectedQuestionCount === exam.total ? 'selected' : ''}>Toàn bộ ${exam.total} Câu (150 phút)</option>
              </select>
            </div>
          ` : ''}

          <div class="timer-box">
            <span>⏱️ Còn lại:</span>
            <strong id="examTimer" class="timer-text">--:--</strong>
          </div>

          <button class="btn-shuffle" onclick="confirmShuffleExam()">
            🔀 Tráo đề mới
          </button>

          <button class="btn-submit-exam" onclick="confirmSubmitExam()">
            ✅ Nộp Bài Thi
          </button>
        </div>
      </div>
    </div>

    <div class="layout-with-sidebar">
      <div class="questions-column">
        ${examState.shuffledQuestions.map((q, idx) => renderExamQuestionCard(q, idx + 1)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>BẢNG CÂU HỎI (${total})</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              <span style="display:inline-block;width:10px;height:10px;background:var(--primary);border-radius:2px;margin-right:2px;"></span>Đã làm
              <span style="display:inline-block;width:10px;height:10px;background:var(--warning);border-radius:2px;margin-left:6px;margin-right:2px;"></span>Cờ
            </span>
          </div>

          <div class="nav-grid ${total > 50 ? 'dense-grid' : ''}" id="examNavGrid">
            ${examState.shuffledQuestions.map((q, idx) => `
              <button class="nav-btn" id="nav-btn-${q.id}" onclick="scrollToQuestion('exam-q-${q.id}')">
                ${idx + 1}
              </button>
            `).join('')}
          </div>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn-submit-exam" onclick="confirmSubmitExam()">
              🚀 Nộp Bài Thi Ngay
            </button>
            <button class="btn-shuffle" onclick="confirmShuffleExam()">
              🔀 Tráo Đề Mới & Thi Lại
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;

  updateTimerDisplay();
  updateNavGridState();
  renderMathInContainer(container);
}

function confirmShuffleExam() {
  const answeredCount = Object.keys(examState.userAnswers).length;
  if (answeredCount > 0 && !examState.isSubmitted) {
    if (!confirm('Tráo đề mới sẽ xóa các đáp án bạn đang chọn và bắt đầu lại thời gian. Bạn có chắc không?')) {
      return;
    }
  }
  startNewExamSession();
}

function renderExamQuestionCard(q, displayNum) {
  const isMulti = q.is_multi;
  const userChoices = examState.userAnswers[q.id] || [];
  const compact = isImageOnlyOptions(q);

  return `
    <div class="question-card" id="exam-q-${q.id}">
      <div class="q-top-row">
        <div>
          <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
          ${isMulti ? `<span class="badge-multi">⚡ Chọn nhiều đáp án (${q.correct_count} đáp án)</span>` : '<span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">(Chọn 1 đáp án)</span>'}
        </div>
        <button class="btn-flag ${examState.flaggedQuestions[q.id] ? 'active' : ''}" onclick="toggleFlag('${q.id}')" title="Cắm cờ câu này để xem lại sau">
          🚩 Đặt cờ
        </button>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap" onclick="openLightbox('${q.image_url}')" title="Bấm vào để phóng to hình ảnh">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
          <div class="q-image-hint">🔍 Bấm vào ảnh để phóng to toàn màn hình</div>
        </div>
      ` : ''}

      <div class="options-container ${compact ? 'options-compact-grid' : ''}">
        ${q.options.map(opt => {
          const isSelected = userChoices.includes(opt.label);
          return `
            <div class="option-row ${isSelected ? 'selected' : ''}" onclick="selectAnswer('${q.id}', '${opt.label}', ${isMulti})">
              ${isMulti ? `<span class="option-checkbox-indicator">${isSelected ? '✓' : ''}</span>` : ''}
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectAnswer(questionId, optionLabel, isMulti) {
  if (examState.isSubmitted) return;

  if (isMulti) {
    let currentChoices = examState.userAnswers[questionId] || [];
    if (currentChoices.includes(optionLabel)) {
      currentChoices = currentChoices.filter(item => item !== optionLabel);
    } else {
      currentChoices.push(optionLabel);
    }
    currentChoices.sort();

    if (currentChoices.length > 0) {
      examState.userAnswers[questionId] = currentChoices;
    } else {
      delete examState.userAnswers[questionId];
    }
  } else {
    examState.userAnswers[questionId] = [optionLabel];
  }

  const card = document.getElementById(`exam-q-${questionId}`);
  if (card) {
    const userChoices = examState.userAnswers[questionId] || [];
    card.classList.toggle('answered', userChoices.length > 0);
    card.querySelectorAll('.option-row').forEach(row => {
      const label = row.querySelector('.option-letter').textContent.trim();
      const isSelected = userChoices.includes(label);
      row.classList.toggle('selected', isSelected);
      const indicator = row.querySelector('.option-checkbox-indicator');
      if (indicator) {
        indicator.textContent = isSelected ? '✓' : '';
      }
    });
  }

  updateNavGridState();
}

function toggleFlag(questionId) {
  examState.flaggedQuestions[questionId] = !examState.flaggedQuestions[questionId];
  const card = document.getElementById(`exam-q-${questionId}`);
  if (card) {
    card.classList.toggle('flagged', examState.flaggedQuestions[questionId]);
    const flagBtn = card.querySelector('.btn-flag');
    if (flagBtn) {
      flagBtn.classList.toggle('active', examState.flaggedQuestions[questionId]);
    }
  }
  updateNavGridState();
}

function updateNavGridState() {
  const answeredCountEl = document.getElementById('answeredCount');
  let answeredNum = 0;

  examState.shuffledQuestions.forEach(q => {
    const btn = document.getElementById(`nav-btn-${q.id}`);
    if (!btn) return;

    const userAns = examState.userAnswers[q.id];
    const isAnswered = Array.isArray(userAns) ? userAns.length > 0 : !!userAns;
    const isFlagged = !!examState.flaggedQuestions[q.id];

    if (isAnswered) answeredNum++;

    btn.className = 'nav-btn';
    if (isAnswered) btn.classList.add('answered');
    if (isFlagged) btn.classList.add('flagged');
  });

  if (answeredCountEl) {
    answeredCountEl.textContent = answeredNum;
  }
}

function confirmSubmitExam() {
  const total = examState.shuffledQuestions.length;
  let answeredNum = 0;
  examState.shuffledQuestions.forEach(q => {
    const ans = examState.userAnswers[q.id];
    if (Array.isArray(ans) ? ans.length > 0 : !!ans) answeredNum++;
  });
  const unanswered = total - answeredNum;

  let msg = `Bạn đã hoàn thành ${answeredNum}/${total} câu hỏi.`;
  if (unanswered > 0) {
    msg += `\n⚠️ CẢNH BÁO: Còn ${unanswered} câu chưa trả lời!\nBạn có chắc chắn muốn nộp bài ngay bây giờ?`;
  } else {
    msg += `\nBạn có muốn nộp bài và xem điểm số ngay?`;
  }

  if (confirm(msg)) {
    submitExam();
  }
}

function submitExam() {
  clearInterval(examState.timerInterval);
  examState.isSubmitted = true;

  let correctCount = 0;
  examState.shuffledQuestions.forEach(q => {
    const userChoices = examState.userAnswers[q.id] || [];
    const userChoiceStr = [...userChoices].sort().join(', ');
    if (userChoiceStr === q.correct_answer) {
      correctCount++;
    }
  });

  examState.score = correctCount;
  const total = examState.shuffledQuestions.length;
  const score10 = ((correctCount / total) * 10).toFixed(1);
  const percent = Math.round((correctCount / total) * 100);

  showResultModal(correctCount, total, score10, percent);
}

function showResultModal(correct, total, score10, percent) {
  const modal = document.getElementById('resultModal');
  const icon = document.getElementById('resIcon');
  const title = document.getElementById('resTitle');
  const scoreEl = document.getElementById('resScore');
  const subEl = document.getElementById('resSub');
  const countCorrect = document.getElementById('resCountCorrect');
  const countWrong = document.getElementById('resCountWrong');
  const countPercent = document.getElementById('resPercent');

  scoreEl.textContent = `${score10} / 10`;
  subEl.textContent = `Làm đúng ${correct} / ${total} câu hỏi`;
  countCorrect.textContent = correct;
  countWrong.textContent = total - correct;
  countPercent.textContent = `${percent}%`;

  const modePrefix = currentMode === 'practice' ? 'LUYỆN TẬP: ' : 'THI THỬ: ';

  if (percent >= 80) {
    icon.textContent = '🌟';
    title.textContent = modePrefix + 'XUẤT SẮC! BẠN ĐÃ NẮM RẤT VỮNG KIẾN THỨC';
  } else if (percent >= 60) {
    icon.textContent = '🎉';
    title.textContent = modePrefix + 'CHÚC MỪNG! BẠN ĐÃ QUA MÔN (ĐẠT CHUẨN)';
  } else if (percent >= 40) {
    icon.textContent = '⚠️';
    title.textContent = modePrefix + 'CẦN CỐ GẮNG HƠN! HÃY ÔN TẬP THÊM';
  } else {
    icon.textContent = '📚';
    title.textContent = modePrefix + 'CHƯA ĐẠT! NÊN DÀNH THỜI GIAN ÔN TẬP LẠI';
  }

  modal.classList.add('active');
}

function closeModalAndReview() {
  document.getElementById('resultModal').classList.remove('active');
  if (currentMode === 'practice') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    setMode('review');
  }
}

function restartExam() {
  document.getElementById('resultModal').classList.remove('active');
  if (currentMode === 'practice') {
    startNewPracticeSession();
  } else {
    startNewExamSession();
  }
}

/* ============================================================
   CHẾ ĐỘ 4: XEM LẠI BÀI THI & CHỈ RA CÂU SAI
============================================================ */
function renderReviewView() {
  const container = document.getElementById('appContent');
  if (!container) return;
  const total = examState.shuffledQuestions.length;
  const correct = examState.score;
  const score10 = ((correct / total) * 10).toFixed(1);

  let displayQuestions = examState.shuffledQuestions.map((q, idx) => ({ q, origIdx: idx + 1 }));
  if (examState.filterWrongOnly) {
    displayQuestions = displayQuestions.filter(({ q }) => {
      const userChoices = examState.userAnswers[q.id] || [];
      const userChoiceStr = [...userChoices].sort().join(', ');
      return userChoiceStr !== q.correct_answer;
    });
  }

  container.innerHTML = `
    <div class="exam-header-sticky">
      <div class="exam-header-content">
        <div class="exam-title-group">
          <h2>📊 BẢNG XEM LẠI BÀI THI THỬ PRO192</h2>
          <div class="exam-sub">
            Kết quả: <strong style="color:var(--success);">${score10} / 10 điểm</strong> (${correct}/${total} câu đúng)
          </div>
        </div>

        <div class="exam-meta-actions">
          <button class="btn-filter-wrong ${examState.filterWrongOnly ? 'active' : ''}" onclick="toggleFilterWrong()">
            ${examState.filterWrongOnly ? '👁️ Xem toàn bộ bài thi' : '❌ Chỉ xem các câu làm SAI'}
          </button>
          <button class="btn-shuffle" onclick="restartExam()">
            🔀 Tráo đề & Thi lại
          </button>
        </div>
      </div>
    </div>

    <div class="layout-with-sidebar">
      <div class="questions-column">
        ${displayQuestions.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; background: var(--card-bg); border-radius: var(--radius-lg); border: 1px solid var(--card-border);">
            <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
            <h3 style="color: var(--success); font-size: 1.3rem;">Tuyệt vời! Bạn không làm sai câu nào!</h3>
            <p style="color: var(--text-muted); margin-top: 8px;">Tất cả câu hỏi đều đã được trả lời chính xác.</p>
          </div>
        ` : displayQuestions.map(({ q, origIdx }) => renderReviewQuestionCard(q, origIdx)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>DANH SÁCH (${total} CÂU)</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Xanh: Đúng · Đỏ: Sai</span>
          </div>

          <div class="nav-grid ${total > 50 ? 'dense-grid' : ''}">
            ${examState.shuffledQuestions.map((q, idx) => {
              const userChoices = examState.userAnswers[q.id] || [];
              const userChoiceStr = [...userChoices].sort().join(', ');
              const isCorrect = userChoiceStr === q.correct_answer;
              return `
                <button class="nav-btn ${isCorrect ? 'nav-correct' : 'nav-wrong'}" onclick="scrollToQuestion('review-q-${q.id}')">
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn-shuffle" onclick="restartExam()">
              🔀 Tráo Đề & Thi Lại
            </button>
            <button class="btn-secondary" onclick="setMode('study')">
              📖 Quay lại chế độ Ôn tập
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;

  renderMathInContainer(container);
}

function renderReviewQuestionCard(q, displayNum) {
  const userChoices = examState.userAnswers[q.id] || [];
  const userChoiceStr = [...userChoices].sort().join(', ');
  const isCorrect = userChoiceStr === q.correct_answer;
  const isMulti = q.is_multi;
  const correctArr = q.correct_answer.split(',').map(s => s.trim());
  const compact = isImageOnlyOptions(q);

  return `
    <div class="question-card ${isCorrect ? 'review-card-correct' : 'review-card-wrong'}" id="review-q-${q.id}">
      <div class="q-top-row">
        <div>
          <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
          ${isMulti ? `<span class="badge-multi">⚡ Chọn nhiều (${q.correct_count} đáp án)</span>` : ''}
          <span class="review-status-pill ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? '✓ CHÍNH XÁC (+1đ)' : '✗ LÀM SAI (0đ)'}
          </span>
        </div>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${q.chapter_name || 'PRO192'}</span>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap" onclick="openLightbox('${q.image_url}')" title="Bấm vào để phóng to hình ảnh">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
          <div class="q-image-hint">🔍 Bấm vào ảnh để phóng to toàn màn hình</div>
        </div>
      ` : ''}

      <div class="options-container ${compact ? 'options-compact-grid' : ''}">
        ${q.options.map(opt => {
          const isRealCorrect = opt.is_correct || correctArr.includes(opt.label);
          const isUserPick = userChoices.includes(opt.label);

          let rowClass = '';
          let pill = '';

          if (isRealCorrect && isUserPick) {
            rowClass = 'review-correct-pick';
            pill = `<span class="answer-pill correct">${compact ? '✓ Đúng' : '✓ Bạn đã chọn đúng'}</span>`;
          } else if (isRealCorrect && !isUserPick) {
            rowClass = 'review-missed-pick';
            pill = `<span class="answer-pill correct">${compact ? '★ Đáp án' : '★ Đáp án chuẩn (Bị bỏ sót)'}</span>`;
          } else if (!isRealCorrect && isUserPick) {
            rowClass = 'review-wrong-pick';
            pill = `<span class="answer-pill wrong">${compact ? '✗ Sai' : '✗ Bạn đã chọn sai'}</span>`;
          }

          return `
            <div class="option-row ${rowClass}">
              ${isMulti ? `<span class="option-checkbox-indicator" style="${isUserPick ? 'background:var(--primary);color:#0b1329;border-color:var(--primary);' : ''}">${isUserPick ? '✓' : ''}</span>` : ''}
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
              ${pill}
            </div>
          `;
        }).join('')}
      </div>

      <div class="review-footer-summary">
        <div>Bạn đã chọn: <strong>${userChoiceStr || 'Chưa chọn'}</strong></div>
        <div>Đáp án đúng: <strong style="color: var(--success);">${q.correct_answer}</strong></div>
      </div>

      ${q.explanation ? `
        <div class="q-explanation-box">
          <div class="q-explanation-header">💡 Giải thích chi tiết:</div>
          <div class="q-explanation-content">${escapeHtml(q.explanation)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

function toggleFilterWrong() {
  examState.filterWrongOnly = !examState.filterWrongOnly;
  renderReviewView();
}

function scrollToQuestion(id) {
  const el = document.getElementById(id);
  if (el) {
    const yOffset = -155;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

function openLightbox(src) {
  const lightbox = document.getElementById('imageLightbox');
  const img = document.getElementById('lightboxImg');
  if (lightbox && img) {
    img.src = src;
    lightbox.classList.add('active');
  }
}

function closeLightbox(event) {
  if (event && event.target && event.target.id === 'lightboxImg') {
    return;
  }
  const lightbox = document.getElementById('imageLightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
