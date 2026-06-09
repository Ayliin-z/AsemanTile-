// frontend/src/utils/brands.js
const API_BASE = '';

export const getBrands = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/brands`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (error) {
    console.error('getBrands error:', error);
    return [];
  }
};

export const addBrand = async (brandData) => {
  try {
    const res = await fetch(`${API_BASE}/api/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData)
    });
    const data = await res.json();
    if (data.success || data.id) {
      const brands = await getBrands();
      return { success: true, brands };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateBrand = async (id, brandData) => {
  try {
    const res = await fetch(`${API_BASE}/api/brands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData)
    });
    const data = await res.json();
    if (data.success || data.id) {
      const brands = await getBrands();
      return { success: true, brands };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteBrand = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/brands/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const brands = await getBrands();
      return { success: true, brands };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleBrandEnabled = async (id, enabled) => {
  try {
    const res = await fetch(`${API_BASE}/api/brands/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      const brands = await getBrands();
      return { success: true, brands };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const ensureBrandExists = async (brandName) => {
  // این تابع فعلاً ساده برگردان
  return null;
};

export const getEnabledBrands = async () => {
  const brands = await getBrands();
  return brands.filter(b => b.enabled === 1).map(b => b.name);
};