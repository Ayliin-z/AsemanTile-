// frontend/src/utils/customerAuth.js
const CUSTOMER_AUTH_KEY = 'aseman_customer_auth';
const OTP_STORAGE_KEY = 'aseman_otp_codes';
const API_BASE = 'https://api.asemantile.com';
// ========== OTP Helpers (بدون تغییر) ==========
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOtpCode = (mobile, code) => {
  const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
  otps[mobile] = { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
};

const getOtpCode = (mobile) => {
  const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
  const record = otps[mobile];
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    delete otps[mobile];
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
    return null;
  }
  return record;
};

const deleteOtpCode = (mobile) => {
  const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
  delete otps[mobile];
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
};

export const sendOtp = async (mobile) => {
  if (!mobile || mobile.length < 10) return { success: false, error: 'شماره موبایل معتبر نیست.' };
  let normalizedMobile = mobile;
  if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);
  const code = generateOtpCode();
  saveOtpCode(normalizedMobile, code);
  console.log(`📱 OTP برای ${normalizedMobile}: ${code}`);
  alert(`کد تایید شما: ${code}\n(در نسخه نهایی از طریق پیامک ارسال می‌شود)`);
  return { success: true, message: 'کد تایید ارسال شد.' };
};

export const verifyOtpAndLogin = async (mobile, code, name = null) => {
  if (!mobile || !code) return { success: false, error: 'شماره موبایل و کد تایید الزامی است.' };
  let normalizedMobile = mobile;
  if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);
  const otpRecord = getOtpCode(normalizedMobile);
  if (!otpRecord) return { success: false, error: 'کد تایید منقضی شده است.' };
  if (otpRecord.attempts >= 3) {
    deleteOtpCode(normalizedMobile);
    return { success: false, error: 'تعداد دفعات اشتباه بیش از حد مجاز.' };
  }
  if (otpRecord.code !== code) {
    otpRecord.attempts++;
    const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
    otps[normalizedMobile] = otpRecord;
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
    return { success: false, error: `کد تایید اشتباه است. ${3 - otpRecord.attempts} تلاش باقی مانده.` };
  }
  deleteOtpCode(normalizedMobile);

  try {
    // بررسی وجود کاربر با fetch
    let user = null;
    try {
      const checkRes = await fetch(`${API_BASE}/api/users/mobile/${normalizedMobile}`);
      if (checkRes.ok) user = await checkRes.json();
    } catch (err) {}
    if (!user) {
      const createRes = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || '',
          mobile: normalizedMobile,
          email: null,
          password: null,
          type: 'customer',
        }),
      });
      if (createRes.ok) user = await createRes.json();
      else throw new Error('خطا در ایجاد کاربر');
    }
    if (user.is_active === 0) return { success: false, error: 'حساب کاربری شما مسدود یا در انتظار تأیید است.' };
    localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message || 'خطا در ورود' };
  }
};

export const loginCustomer = async (mobile, password) => {
  try {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(data.user));
      return { success: true, customer: data.user };
    }
    return { success: false, error: data.error || 'ورود ناموفق' };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در ورود' };
  }
};

export const logoutCustomer = () => localStorage.removeItem(CUSTOMER_AUTH_KEY);
export const isCustomerAuthenticated = () => !!localStorage.getItem(CUSTOMER_AUTH_KEY);
export const getCurrentCustomer = () => {
  const stored = localStorage.getItem(CUSTOMER_AUTH_KEY);
  return stored ? JSON.parse(stored) : null;
};
export const getCurrentUserRole = () => {
  const user = getCurrentCustomer();
  return user ? (user.type || 'customer') : 'guest';
};

// ========== ثبت درخواست همکاری (با fetch مستقیم) ==========
export const registerPartner = async (data) => {
  const { mobile, name, email } = data;
  if (!mobile) return { success: false, error: 'شماره موبایل الزامی است.' };
  let normalizedMobile = mobile;
  if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);
  try {
    const createRes = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || '',
        mobile: normalizedMobile,
        email: email || null,
        password: null,
        type: 'partner',
      }),
    });
    if (!createRes.ok) {
      const errData = await createRes.json();
      throw new Error(errData.error || 'خطا در ثبت درخواست');
    }
    return { success: true, message: 'درخواست همکاری ثبت شد. پس از تأیید مدیریت می‌توانید وارد شوید.' };
  } catch (error) {
    console.error('registerPartner error:', error);
    return { success: false, error: error.message };
  }
};

// ========== مدیریت درخواست‌های همکاری برای ادمین ==========
export const getPendingPartners = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/users?type=partner`);
    const data = await response.json();
    console.log('داده خام از سرور:', data);
    let users = [];
    if (Array.isArray(data)) users = data;
    else if (data.data && Array.isArray(data.data)) users = data.data;
    else users = [];
    const pending = users.filter(u => u && u.type === 'partner' && u.is_active === 0);
    console.log('در انتظار تأیید:', pending);
    return pending;
  } catch (error) {
    console.error('getPendingPartners error:', error);
    return [];
  }
};

export const approvePartner = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: 1 }),
    });
    if (!res.ok) throw new Error('خطا در تأیید');
    return { success: true };
  } catch (error) {
    console.error('approvePartner error:', error);
    return { success: false, error: error.message };
  }
};

export const rejectPartner = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در رد');
    return { success: true };
  } catch (error) {
    console.error('rejectPartner error:', error);
    return { success: false, error: error.message };
  }
};

// ========== سایر توابع ==========
export const getCustomers = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json();
    let users = [];
    if (Array.isArray(data)) users = data;
    else if (data.data && Array.isArray(data.data)) users = data.data;
    return users.filter(u => u && u.type === 'customer');
  } catch (error) {
    console.error('getCustomers error:', error);
    return [];
  }
};

export const updateCustomer = async (id, updates) => {
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی');
    const data = await res.json();
    const current = getCurrentCustomer();
    if (current && current.id === id) localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(data));
    return { success: true, customer: data };
  } catch (error) {
    console.error('updateCustomer error:', error);
    return { success: false, error: error.message };
  }
};