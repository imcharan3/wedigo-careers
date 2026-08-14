const Auth = {
  getToken() {
    return localStorage.getItem('certiverify_token');
  },

  getUser() {
    const u = localStorage.getItem('certiverify_user');
    return u ? JSON.parse(u) : null;
  },

  setAuth(token, user) {
    localStorage.setItem('certiverify_token', token);
    localStorage.setItem('certiverify_user', JSON.stringify(user));
    this.updateNav();
  },

  logout() {
    localStorage.removeItem('certiverify_token');
    localStorage.removeItem('certiverify_user');
    this.updateNav();
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'admin';
  },

  updateNav() {
    const navRight = document.getElementById('navRight');
    if (!navRight) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      const adminBtn = user.role === 'admin' 
        ? `<a href="admin.html" class="btn btn-secondary" style="margin-right: 0.5rem;"><i class="fas fa-user-shield"></i> Admin Panel</a>` 
        : '';
      
      navRight.innerHTML = `
        ${adminBtn}
        <span style="font-weight: 600; color: #a5b4fc; margin-right: 1rem;"><i class="fas fa-user-circle"></i> ${user.name}</span>
        <button onclick="Auth.logout()" class="btn btn-secondary"><i class="fas fa-sign-out-alt"></i> Logout</button>
      `;
    } else {
      navRight.innerHTML = `
        <button onclick="App.openLoginModal()" class="btn btn-secondary" style="margin-right: 0.5rem;">Sign In</button>
        <button onclick="App.openRegisterModal()" class="btn btn-primary">Get Started</button>
      `;
    }
  }
};
