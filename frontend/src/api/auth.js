// frontend/src/api/auth.js (نسخه درست برای فرانت)
import API_BASE from '../config';

export const login = async (mobile, code) => {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, code })
  });
  return response.json();
};

export const sendOtp = async (mobile) => {
  const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile })
  });
  return response.json();
};