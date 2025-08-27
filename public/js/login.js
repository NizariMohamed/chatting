const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.form');

tabs.forEach(btn => btn.addEventListener('click', () => {
  tabs.forEach(b => b.classList.remove('active'));
  forms.forEach(f => f.classList.remove('show'));
  btn.classList.add('active');
  const id = btn.dataset.tab;
  document.getElementById(id + '-form').classList.add('show');
}));

const apiBase = '';

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = { email: form.email.value.trim(), password: form.password.value.trim() };
  try {
    const res = await fetch(apiBase + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('token', data.token);
    localStorage.setItem('me', JSON.stringify(data.user));
    location.href = '/chat';
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = { username: form.username.value.trim(), email: form.email.value.trim(), password: form.password.value.trim() };
  try {
    const res = await fetch(apiBase + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Register failed');
    localStorage.setItem('token', data.token);
    localStorage.setItem('me', JSON.stringify(data.user));
    location.href = '/chat';
  } catch (err) {
    document.getElementById('register-error').textContent = err.message;
  }
});
