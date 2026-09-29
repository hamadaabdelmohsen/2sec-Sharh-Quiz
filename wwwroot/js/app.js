// STATE MANAGEMENT
let state = {
    userName: '',
    selectedChapter: 'all',
    selectedLesson: 'all',
    questionCount: 15,
    timerEnabled: true,
    questions: [], // Shuffled with option-shuffling applied
    currentIndex: 0,
    score: 0,
    userAnswers: [], // { question, selectedOption, isCorrect, correctText }
    timerSeconds: 0,
    timerInterval: null
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('quiz_user_name_v3');
    if (savedName) {
        document.getElementById('inputUserName').value = savedName;
    }
    renderStudyContent();
    populateLessonSelectors();
});

// FISHER-YATES SHUFFLE
function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// NAVIGATION BETWEEN SCREENS
function showScreen(screenId) {
    ['screenWelcome', 'screenDashboard', 'screenQuiz', 'screenResult'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === screenId) {
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// WELCOME HANDLER
function handleWelcomeSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('inputUserName').value.trim();
    if (!name) return;

    state.userName = name;
    localStorage.setItem('quiz_user_name_v3', name);

    // Update Headers
    document.getElementById('headerUserName').textContent = name;
    document.getElementById('userBadgeHeader').classList.remove('d-none');
    document.getElementById('displayWelcomeUser').textContent = name;

    showScreen('screenDashboard');
}

// RENDER STUDY & EXPLANATION CONTENT
function renderStudyContent() {
    const container = document.getElementById('studyLessonsContainer');
    if (!container) return;

    const chFilter = document.getElementById('filterStudyChapter') ? document.getElementById('filterStudyChapter').value : 'all';
    
    let filteredLessons = LESSONS_DATA;
    if (chFilter !== 'all') {
        filteredLessons = LESSONS_DATA.filter(l => l.chapter === parseInt(chFilter));
    }

    let html = '';
    filteredLessons.forEach((lesson, index) => {
        html += `
        <div class="lesson-card p-4 mb-4 animate-scale">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 border-bottom pb-3">
                <div>
                    <span class="badge bg-coral-gradient text-white fw-bold mb-1 px-3 py-1 rounded-pill fs-7">${lesson.chapterTitle}</span>
                    <h3 class="h4 fw-bold text-dark mb-0 mt-1">${lesson.title}</h3>
                </div>
                <button onclick="startQuizForLesson('${lesson.id}')" class="btn btn-emerald-gradient btn-sm rounded-pill px-3 py-2 fw-bold shadow-sm">
                    <i class="bi bi-patch-question-fill me-1"></i> اختبار هذا الدرس
                </button>
            </div>

            <!-- KEY POINTS -->
            <div class="mb-4">
                <h5 class="fw-bold text-teal mb-3"><i class="bi bi-stars text-amber me-1"></i> أهم النقاط الرئيسية في الدرس:</h5>
                <div class="d-flex flex-column gap-2">
        `;

        lesson.keyPoints.forEach(pt => {
            html += `<div class="key-point-box"><i class="bi bi-check-circle-fill me-2 text-emerald"></i>${pt}</div>`;
        });

        html += `
                </div>
            </div>

            <!-- DETAILED EXPLANATION -->
            <div class="bg-light p-3 p-md-4 rounded-3 border">
                <h5 class="fw-bold text-dark mb-3"><i class="bi bi-book-half text-coral me-1"></i> الشرح التفصيلي للدرس:</h5>
                <div class="lh-lg text-secondary fs-6">
                    ${lesson.explanation}
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

// POPULATE LESSON SELECTORS
function populateLessonSelectors() {
    const selectLesson = document.getElementById('selectLessonQuiz');
    if (!selectLesson) return;

    let html = '<option value="all" selected>🌟 جميع دروس المنهج (اختبار شامل)</option>';
    LESSONS_DATA.forEach(l => {
        html += `<option value="${l.id}">${l.title}</option>`;
    });
    selectLesson.innerHTML = html;
}

function startQuizForLesson(lessonId) {
    // Navigate to Quiz setup with specific lesson
    state.selectedChapter = 'all';
    state.selectedLesson = lessonId;
    startQuizSession();
}

// PREPARE QUIZ WITH OPTION SHUFFLING (تضمن التبديل العشوائي للخيارات)
function startQuizSession() {
    const chVal = document.getElementById('selectChapterQuiz') ? document.getElementById('selectChapterQuiz').value : state.selectedChapter;
    const lessonVal = document.getElementById('selectLessonQuiz') ? document.getElementById('selectLessonQuiz').value : state.selectedLesson;
    const countVal = document.getElementById('selectCountQuiz') ? document.getElementById('selectCountQuiz').value : '15';
    state.timerEnabled = document.getElementById('switchTimerQuiz') ? document.getElementById('switchTimerQuiz').checked : true;

    // Filter questions
    let pool = QUESTIONS_DATA;
    if (lessonVal && lessonVal !== 'all') {
        pool = QUESTIONS_DATA.filter(q => q.lessonId === lessonVal);
    } else if (chVal && chVal !== 'all') {
        pool = QUESTIONS_DATA.filter(q => q.chapter === parseInt(chVal));
    }

    // Shuffle Questions Order
    let shuffledQuestions = shuffleArray(pool);

    if (countVal !== 'all') {
        const limit = parseInt(countVal);
        shuffledQuestions = shuffledQuestions.slice(0, limit);
    }

    // APPLY OPTION SHUFFLING TO EVERY QUESTION (حيث يغير مكان الإجابة الصحيحة عشوائياً)
    state.questions = shuffledQuestions.map(q => {
        const originalCorrectText = q.options[q.correctIndex];
        // Shuffle choices array
        const shuffledOptions = shuffleArray(q.options);
        // Find new index of the correct text string
        const newCorrectIndex = shuffledOptions.indexOf(originalCorrectText);

        return {
            ...q,
            options: shuffledOptions,
            correctIndex: newCorrectIndex,
            correctText: originalCorrectText
        };
    });

    state.currentIndex = 0;
    state.score = 0;
    state.userAnswers = [];
    state.timerSeconds = 0;

    // Start timer
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.timerEnabled) {
        document.getElementById('timerContainer').classList.remove('d-none');
        state.timerInterval = setInterval(() => {
            state.timerSeconds++;
            const mins = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
            const secs = String(state.timerSeconds % 60).padStart(2, '0');
            document.getElementById('timerText').textContent = `${mins}:${secs}`;
        }, 1000);
    } else {
        document.getElementById('timerContainer').classList.add('d-none');
    }

    showScreen('screenQuiz');
    renderCurrentQuestion();
}

// RENDER CURRENT QUIZ QUESTION
function renderCurrentQuestion() {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;

    // Update Progress Header
    document.getElementById('quizProgressText').textContent = `السؤال ${state.currentIndex + 1} من ${total}`;
    const percent = ((state.currentIndex) / total) * 100;
    document.getElementById('quizProgressBar').style.width = `${percent}%`;

    // Render Question Stem
    document.getElementById('questionLessonBadge').textContent = `الدرس ${q.lessonId} | الفصل ${q.chapter}`;
    document.getElementById('questionText').textContent = q.question;

    // Render Shuffled Options
    const letters = ['أ', 'ب', 'جـ', 'د'];
    const optionsContainer = document.getElementById('quizOptionsContainer');
    optionsContainer.innerHTML = '';

    q.options.forEach((optText, optIdx) => {
        const optionCard = document.createElement('div');
        optionCard.className = 'quiz-option-card mb-3 animate-scale';
        optionCard.onclick = () => handleOptionSelect(optIdx);

        optionCard.innerHTML = `
            <div class="option-badge">${letters[optIdx] || optIdx + 1}</div>
            <div class="fw-semibold text-dark fs-6">${optText}</div>
        `;

        optionsContainer.appendChild(optionCard);
    });

    // Hide feedback & next buttons
    document.getElementById('quizFeedbackBox').classList.add('d-none');
    document.getElementById('btnNextQuestion').classList.add('d-none');
}

// OPTION SELECT HANDLER
function handleOptionSelect(selectedIdx) {
    const q = state.questions[state.currentIndex];
    const optionCards = document.querySelectorAll('.quiz-option-card');

    // Disable further clicks
    optionCards.forEach(c => c.onclick = null);

    const isCorrect = (selectedIdx === q.correctIndex);

    if (isCorrect) {
        state.score++;
        optionCards[selectedIdx].classList.add('correct');
    } else {
        optionCards[selectedIdx].classList.add('incorrect');
        optionCards[q.correctIndex].classList.add('correct');
    }

    // Save answer
    state.userAnswers.push({
        question: q.question,
        selectedOption: q.options[selectedIdx],
        correctOption: q.options[q.correctIndex],
        isCorrect: isCorrect,
        explanation: q.explanation
    });

    // Show Feedback Box
    const feedbackBox = document.getElementById('quizFeedbackBox');
    const feedbackText = document.getElementById('feedbackText');
    const feedbackExplanation = document.getElementById('feedbackExplanation');

    if (isCorrect) {
        feedbackBox.className = 'alert alert-success border-success rounded-4 p-3 mb-3 animate-scale';
        feedbackText.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i><strong>إجابة صحيحة! أحسنت صنعاً.</strong>';
    } else {
        feedbackBox.className = 'alert alert-danger border-danger rounded-4 p-3 mb-3 animate-scale';
        feedbackText.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i><strong>إجابة خاطئة!</strong> الإجابة الصحيحة هي: <u>${q.options[q.correctIndex]}</u>`;
    }

    feedbackExplanation.textContent = q.explanation || '';
    feedbackBox.classList.remove('d-none');

    // Show Next Button
    const btnNext = document.getElementById('btnNextQuestion');
    btnNext.classList.remove('d-none');

    if (state.currentIndex === state.questions.length - 1) {
        btnNext.innerHTML = 'عرض النتيجة النهائية <i class="bi bi-trophy-fill ms-2"></i>';
    } else {
        btnNext.innerHTML = 'السؤال التالي <i class="bi bi-arrow-left-circle-fill ms-2"></i>';
    }
}

// NEXT QUESTION OR FINISH
function handleNextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        renderCurrentQuestion();
    } else {
        finishQuiz();
    }
}

// FINISH QUIZ & SHOW RESULTS
function finishQuiz() {
    if (state.timerInterval) clearInterval(state.timerInterval);

    const total = state.questions.length;
    const score = state.score;
    const percent = Math.round((score / total) * 100);

    document.getElementById('resultUserName').textContent = state.userName;
    document.getElementById('resultScoreText').textContent = `${score} / ${total}`;
    document.getElementById('resultPercentText').textContent = `${percent}%`;

    let grade = 'ممتاز';
    let badgeClass = 'bg-success';
    if (percent < 50) {
        grade = 'يحتاج إلى مراجعة';
        badgeClass = 'bg-danger';
    } else if (percent < 75) {
        grade = 'جيد جداً';
        badgeClass = 'bg-warning text-dark';
    }

    const gradeEl = document.getElementById('resultGradeText');
    gradeEl.textContent = grade;
    gradeEl.className = `fs-4 fw-bold ${badgeClass} text-white px-3 py-1 rounded-pill d-inline-block mt-1`;

    // Render Review Accordion
    const reviewContainer = document.getElementById('reviewQuestionsContainer');
    let reviewHtml = '';

    state.userAnswers.forEach((ans, i) => {
        const isOk = ans.isCorrect;
        reviewHtml += `
        <div class="accordion-item border rounded-3 mb-2 overflow-hidden shadow-sm">
            <h2 class="accordion-header" id="heading${i}">
                <button class="accordion-button collapsed py-3 ${isOk ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${i}">
                    <span class="badge ${isOk ? 'bg-success' : 'bg-danger'} me-2 fs-7">${i + 1}</span>
                    <strong class="text-dark">${ans.question}</strong>
                </button>
            </h2>
            <div id="collapse${i}" class="accordion-collapse collapse" data-bs-parent="#reviewQuestionsContainer">
                <div class="accordion-body bg-white text-start">
                    <p class="mb-1"><strong>إجابتك:</strong> <span class="${isOk ? 'text-success fw-bold' : 'text-danger fw-bold'}">${ans.selectedOption}</span></p>
                    ${!isOk ? `<p class="mb-1"><strong>الإجابة الصحيحة:</strong> <span class="text-success fw-bold">${ans.correctOption}</span></p>` : ''}
                    <hr class="my-2">
                    <p class="text-muted small mb-0"><i class="bi bi-info-circle me-1"></i><strong>الشرح والمصدر:</strong> ${ans.explanation}</p>
                </div>
            </div>
        </div>
        `;
    });

    reviewContainer.innerHTML = reviewHtml;
    showScreen('screenResult');
}

function restartQuizWithShuffle() {
    startQuizSession();
}

function backToDashboard() {
    showScreen('screenDashboard');
}
