// frontend/src/utils/apiClient.js
const API_BASE = 'http://localhost:5003'; // می‌تونی بعداً از متغیر محیطی استفاده کنی

// --------------- مدیریت Token ---------------
const TOKEN_KEY = 'aseman_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// --------------- هستهٔ درخواست ---------------
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  // اگر سرور 401 برگردونه (توکن نامعتبر یا منقضی)، کاربر رو به صفحه ورود هدایت کن
  if (response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('نشست شما منقضی شده است، لطفاً دوباره وارد شوید');
  }

  return response;
}

// --------------- متدهای کمکی ---------------
export const apiClient = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) =>
    request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body, options) =>
    request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (path, body, options) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
};

export default apiClient;