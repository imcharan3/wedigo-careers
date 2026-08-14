const App = {
  activeCourseData: null,
  activeEnrollment: null,
  activeModuleIndex: 0,
  quizAnswers: {},
  activeCertificate: null,

  init() {
    Auth.updateNav();
    this.loadCourses();
    this.checkUserEnrollments();
  },

  async loadCourses() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    try {
      const res = await fetch('/api/courses');
      const data = await res.json();

      grid.innerHTML = data.courses.map(course => `
        <div class="card">
          <span class="card-tag">${course.category}</span>
          <h3 class="card-title">${course.title}</h3>
          <p class="card-desc">${course.description}</p>
          <div class="card-footer">
            <span><i class="far fa-clock"></i> ${course.duration}</span>
            <button onclick="App.openLearningWorkspace(${course.id})" class="btn btn-primary btn-sm">
              <i class="fas fa-play-circle"></i> Start Learning
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p style="color: var(--accent-rose);">Failed to load courses from database.</p>`;
    }
  },

  async checkUserEnrollments() {
    if (!Auth.isLoggedIn()) return;
    try {
      const res = await fetch('/api/certificates/my-certificates', {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      this.renderMyCertificates(data.certificates || []);
    } catch (err) {
      console.error(err);
    }
  },

  renderMyCertificates(certificates) {
    const section = document.getElementById('myCertificatesSection');
    const container = document.getElementById('myCertificatesList');
    if (!section || !container) return;

    if (certificates.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    container.innerHTML = certificates.map(cert => `
      <div class="card" style="border-color: rgba(245, 158, 11, 0.4);">
        <span class="card-tag" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-gold);">Verified Certificate</span>
        <h3 class="card-title">${cert.course_title}</h3>
        <p class="card-desc">
          Certificate ID: <strong>${cert.certificate_id}</strong><br>
          Start: ${cert.start_date || 'Aug 01, 2026'} | End: ${cert.completion_date || cert.issue_date}<br>
          Signatory: ${cert.signatory_name || 'Neethu Allampati'}
        </p>
        <div class="card-footer">
          <a href="verify.html?id=${cert.certificate_id}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-qrcode"></i> Verify QR</a>
          <button onclick="App.viewCertificate('${cert.certificate_id}')" class="btn btn-gold btn-sm"><i class="fas fa-award"></i> View Certificate</button>
        </div>
      </div>
    `).join('');
  },

  // OPEN LEARNING WORKSPACE (MODULES & VIDEO PLAYER)
  async openLearningWorkspace(courseId) {
    if (!Auth.isLoggedIn()) {
      this.openLoginModal();
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/learn`, {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      
      if (res.status === 401 || res.status === 403) {
        Auth.logout();
        alert('Your session has expired. Please sign in to access the course.');
        this.openLoginModal();
        return;
      }

      if (!res.ok) throw new Error(data.error);

      this.activeCourseData = data.course;
      this.activeEnrollment = data.enrollment;
      this.activeModuleIndex = 0;

      document.getElementById('playerCourseTitle').innerText = this.activeCourseData.title;
      document.getElementById('playerCategory').innerText = this.activeCourseData.category;
      document.getElementById('attemptsCounter').innerText = `${this.activeEnrollment.attemptsCount} / 5`;

      this.renderSidebarModules();
      this.loadActiveModule(0);

      this.openModal('playerModal');
    } catch (err) {
      alert(err.message || 'Failed to open learning workspace.');
    }
  },

  renderSidebarModules() {
    const list = document.getElementById('modulesSidebarList');
    const modules = this.activeCourseData.modulesContent || [];
    const completed = this.activeEnrollment.completedModules || [];

    list.innerHTML = modules.map((m, idx) => {
      const isDone = completed.includes(m.id);
      const isActive = idx === this.activeModuleIndex;

      return `
        <div onclick="App.loadActiveModule(${idx})" class="module-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}">
          <i class="fas ${isDone ? 'fa-check-circle check-icon' : 'fa-circle'}" style="font-size: 0.8rem;"></i>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.title}</span>
        </div>
      `;
    }).join('');

    // Update Progress Bar
    const progressBar = document.getElementById('playerProgressBar');
    progressBar.style.width = `${this.activeEnrollment.progress || 0}%`;
  },

  loadActiveModule(index) {
    this.activeModuleIndex = index;
    const modules = this.activeCourseData.modulesContent || [];
    const module = modules[index];
    if (!module) return;

    this.renderSidebarModules();

    document.getElementById('moduleVideoFrame').src = module.videoUrl || '';
    document.getElementById('moduleLessonTitle').innerText = module.title;
    document.getElementById('moduleLessonSummary').innerText = module.summary;
    document.getElementById('moduleLessonContent').innerHTML = module.content;

    const isDone = (this.activeEnrollment.completedModules || []).includes(module.id);
    document.getElementById('moduleStatusText').innerText = isDone ? '✓ Module Completed' : 'Module in progress...';
  },

  async markActiveModuleComplete() {
    const modules = this.activeCourseData.modulesContent || [];
    const module = modules[this.activeModuleIndex];
    if (!module) return;

    try {
      const res = await fetch(`/api/courses/${this.activeCourseData.id}/module/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ moduleId: module.id })
      });
      const data = await res.json();
      if (res.ok) {
        this.activeEnrollment.completedModules = data.completedModules;
        this.activeEnrollment.progress = data.progress;
        this.renderSidebarModules();
        document.getElementById('moduleStatusText').innerText = '✓ Module Completed';

        // Automatically advance to next module if available
        if (this.activeModuleIndex < modules.length - 1) {
          this.loadActiveModule(this.activeModuleIndex + 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  },

  // QUIZ ASSESSMENT HANDLERS
  openQuizModal() {
    if (!this.activeCourseData || !this.activeCourseData.quiz) return;

    if (this.activeEnrollment.attemptsCount >= 5 && !this.activeEnrollment.passed) {
      alert('You have reached the maximum attempt limit (5 attempts) for this course.');
      return;
    }

    this.quizAnswers = {};
    document.getElementById('quizCourseTitle').innerText = `${this.activeCourseData.title} - Final Assessment`;
    document.getElementById('quizAttemptsLeftVal').innerText = Math.max(0, 5 - this.activeEnrollment.attemptsCount);

    const questionsContainer = document.getElementById('quizQuestionsContainer');
    questionsContainer.innerHTML = this.activeCourseData.quiz.map((q, qIdx) => `
      <div class="quiz-card">
        <h4 style="margin-bottom: 1rem; color: #fff;">Question ${qIdx + 1}: ${q.question}</h4>
        <div>
          ${q.options.map((opt, optIdx) => `
            <label class="quiz-option" id="opt_${q.id}_${optIdx}" onclick="App.selectQuizOption(${q.id}, ${optIdx})">
              <input type="radio" name="q_${q.id}" value="${optIdx}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');

    this.openModal('quizModal');
  },

  selectQuizOption(questionId, optionIndex) {
    this.quizAnswers[questionId] = optionIndex;
    
    // Update visual styling
    document.querySelectorAll(`input[name="q_${questionId}"]`).forEach(radio => {
      const parent = radio.closest('.quiz-option');
      if (parent) parent.classList.remove('selected');
    });

    const selectedLabel = document.getElementById(`opt_${questionId}_${optionIndex}`);
    if (selectedLabel) {
      selectedLabel.classList.add('selected');
      const radio = selectedLabel.querySelector('input');
      if (radio) radio.checked = true;
    }
  },

  async submitQuiz() {
    const totalQuestions = this.activeCourseData.quiz.length;
    const answeredCount = Object.keys(this.quizAnswers).length;

    if (answeredCount < totalQuestions) {
      if (!confirm(`You have answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/courses/${this.activeCourseData.id}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ answers: this.quizAnswers })
      });

      const data = await res.json();
      this.closeModal('quizModal');
      this.closeModal('playerModal');

      const resultBadge = document.getElementById('quizResultBadge');
      const resultScore = document.getElementById('quizResultScore');
      const resultMsg = document.getElementById('quizResultMessage');
      const resultActions = document.getElementById('quizResultActions');

      resultScore.innerText = `${data.score}%`;

      if (data.passed) {
        resultBadge.className = 'status-badge status-valid mb-4';
        resultBadge.innerHTML = `<i class="fas fa-trophy"></i> ASSESSMENT PASSED! (80%+ Minimum Met)`;
        resultMsg.innerText = `Outstanding! You scored ${data.score}% and earned your official verifiable certificate signed by Neethu Allampati.`;
        
        resultActions.innerHTML = `
          <button onclick="App.closeModal('quizResultModal'); App.showCertificateModal(App.activeCertificate);" class="btn btn-gold">
            <i class="fas fa-award"></i> View & Download Certificate
          </button>
        `;

        this.activeCertificate = data.certificate;
        this.checkUserEnrollments();
      } else {
        resultBadge.className = 'status-badge status-revoked mb-4';
        resultBadge.innerHTML = `<i class="fas fa-times-circle"></i> ASSESSMENT NOT PASSED (80% Required)`;
        resultMsg.innerText = data.message || `Score: ${data.score}%. Minimum 80% is required to earn your certificate. Attempts remaining: ${data.attemptsLeft}.`;

        resultActions.innerHTML = `
          ${data.attemptsLeft > 0 
            ? `<button onclick="App.closeModal('quizResultModal'); App.openLearningWorkspace(${this.activeCourseData.id});" class="btn btn-primary"><i class="fas fa-redo"></i> Review Modules & Retry</button>` 
            : `<button onclick="App.closeModal('quizResultModal');" class="btn btn-secondary">Close</button>`}
        `;
      }

      this.openModal('quizResultModal');
    } catch (err) {
      alert('Quiz submission failed.');
    }
  },

  async viewCertificate(certId) {
    try {
      const res = await fetch(`/api/certificates/verify/${certId}`);
      const data = await res.json();
      if (data.verified) {
        this.showCertificateModal(data.certificate);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to fetch certificate details.');
    }
  },

  showCertificateModal(cert) {
    this.activeCertificate = cert;
    this.openModal('certModal');
    setTimeout(() => {
      CertificateEngine.renderCanvas(cert, 'certificateCanvas');
    }, 100);
  },

  downloadActiveCert() {
    if (this.activeCertificate) {
      CertificateEngine.downloadPNG(this.activeCertificate.certificate_id);
    }
  },

  // Auth Modal Handlers
  openLoginModal() {
    this.openModal('loginModal');
  },

  openRegisterModal() {
    this.openModal('registerModal');
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      Auth.setAuth(data.token, data.user);
      this.closeModal('loginModal');
      this.checkUserEnrollments();
      alert(`Welcome back, ${data.user.name}!`);
    } catch (err) {
      alert(err.message);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      Auth.setAuth(data.token, data.user);
      this.closeModal('registerModal');
      this.checkUserEnrollments();
      alert(`Account created! Welcome, ${data.user.name}.`);
    } catch (err) {
      alert(err.message);
    }
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
