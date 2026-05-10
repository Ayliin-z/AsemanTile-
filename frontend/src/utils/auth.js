// frontend/src/utils/auth.js
import apiClient, { setToken, removeToken } from './apiClient';

// کلید ذخیره اطلاعات ادمین در localStorage (برای نگهداری نام و نقش)
const ADMIN_INFO_KEY = 'aseman_admin_auth';

/**
 * ورود ادمین با نام کاربری (email) و رمز عبور
 * ابتدا endpoint اختصاصی admin-login را امتحان می‌کند.
 */
export const login = async (email, password) => {
  try {
    // 1. تلاش برای ورود با مسیر مخصوص ادمین (admin-login)
    const res = await apiClient.post('/api/auth/admin-login', {
      username: email,
      password,
    });

    const data = await res.json();

    if (data.success && data.data?.token) {
      // ذخیره توکن JWT در localStorage (از طریق تابع setToken)
      setToken(data.data.token);

      // ذخیره اطلاعات پایه‌ای ادمین برای نمایش در UI
      localStorage.setItem(
        ADMIN_INFO_KEY,
        JSON.stringify(data.data.user)
      );

      return { success: true, user: data.data.user };
    }

    // اگر admin-login شکست خورد (مثلاً کاربر ادمین نبود)
    return {
      success: false,
      error: data.error || 'نام کاربری یا رمز عبور اشتباه است',
    };
  } catch (error) {
    console.error('login error:', error);
    return { success: false, error: 'خطا در ارتباط با سرور' };
  }
};

/**
 * خروج از حساب کاربری
 */
export const logout = () => {
  // پاک کردن توکن
  removeToken();
  // پاک کردن اطلاعات ادمین
  localStorage.removeItem(ADMIN_INFO_KEY);
};

/**
 * بررسی وضعیت ورود
 * (با چک کردن وجود توکن)
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('aseman_token');
};

/**
 * دریافت اطلاعات ادمین جاری (در صورت لاگین بودن)
 */
export const getCurrentAdmin = () => {
  const data = localStorage.getItem(ADMIN_INFO_KEY);
  return data ? JSON.parse(data) : null;
};