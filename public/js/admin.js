const Admin = {
  async init() {
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
      alert('Access Denied. Admin privileges required.');
      window.location.href = 'index.html';
      return;
    }

    Auth.updateNav();
    await this.loadStats();
    await this.loadCertificates();
    await this.loadUsers();
    await this.loadCourses();
  },

  async loadStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('statUsers').innerText = data.stats.users;
        document.getElementById('statCerts').innerText = data.stats.certificates;
        document.getElementById('statCourses').innerText = data.stats.courses;
        document.getElementById('statEnrollments').innerText = data.stats.enrollments;
      }
    } catch (err) {
      console.error(err);
    }
  },

  async loadCertificates() {
    try {
      const res = await fetch('/api/admin/certificates', {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      const tbody = document.getElementById('adminCertificatesTable');
      if (!tbody) return;

      tbody.innerHTML = data.certificates.map(c => `
        <tr>
          <td><strong>${c.certificate_id}</strong></td>
          <td>${c.user_name}<br><small style="color: var(--text-muted);">${c.user_email}</small></td>
          <td>${c.course_title}</td>
          <td>${c.issue_date}</td>
          <td>
            <span class="status-badge ${c.status === 'ACTIVE' ? 'status-valid' : 'status-revoked'}" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;">
              ${c.status}
            </span>
          </td>
          <td>
            <a href="verify.html?id=${c.certificate_id}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-qrcode"></i> QR</a>
            ${c.status === 'ACTIVE' 
              ? `<button onclick="Admin.revokeCertificate('${c.certificate_id}')" class="btn btn-danger btn-sm"><i class="fas fa-ban"></i> Revoke</button>` 
              : ''}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  },

  async loadUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      const tbody = document.getElementById('adminUsersTable');
      if (!tbody) return;

      tbody.innerHTML = data.users.map(u => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td><span class="card-tag" style="font-size: 0.7rem;">${u.role}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  },

  async loadCourses() {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      const tbody = document.getElementById('adminCoursesTable');
      if (!tbody) return;

      tbody.innerHTML = data.courses.map(c => `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.title}</strong></td>
          <td>${c.category}</td>
          <td>${c.duration}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  },

  async revokeCertificate(certId) {
    if (!confirm(`Are you sure you want to revoke certificate ${certId}?`)) return;

    try {
      const res = await fetch(`/api/admin/certificates/${certId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        this.loadCertificates();
        this.loadStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to revoke certificate.');
    }
  },

  async handleAddCourse(e) {
    e.preventDefault();
    const title = document.getElementById('newCourseTitle').value;
    const category = document.getElementById('newCourseCategory').value;
    const duration = document.getElementById('newCourseDuration').value;
    const description = document.getElementById('newCourseDesc').value;

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ title, category, duration, description })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        App.closeModal('addCourseModal');
        this.loadCourses();
        this.loadStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to add course.');
    }
  },

  async handleManualIssue(e) {
    e.preventDefault();
    const userName = document.getElementById('manualName').value;
    const userEmail = document.getElementById('manualEmail').value;
    const courseTitle = document.getElementById('manualCourse').value;
    const courseDuration = document.getElementById('manualDuration').value;

    try {
      const res = await fetch('/api/admin/issue-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ userName, userEmail, courseTitle, courseDuration })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Certificate issued successfully! ID: ${data.certId}`);
        App.closeModal('manualIssueModal');
        this.loadCertificates();
        this.loadStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to issue manual certificate.');
    }
  },

  async handleAddAdmin(e) {
    e.preventDefault();
    const name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        App.closeModal('addAdminModal');
        this.loadUsers();
        this.loadStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to create admin user.');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
