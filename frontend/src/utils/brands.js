import apiClient from './apiClient';

// frontend/src/utils/brands.js
export const getBrands = async () => {
  try {
    const res = await fetch('http://localhost:5003/api/brands');
    if (!res.ok) throw new Error('خطا در دریافت برندها');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('getBrands error:', error);
    return [];
  }
};

export const addBrand = async (brandData) => {
  try {
    const res = await fetch('http://localhost:5003/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: brandData.name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در افزودن برند');
    }
    // پس از افزودن، دوباره لیست برندها را بگیر
    const newBrands = await getBrands();
    return { success: true, brands: newBrands };
  } catch (error) {
    console.error('addBrand error:', error);
    return { success: false, error: error.message };
  }
};

// سایر توابع مثل updateBrand, deleteBrand, toggleBrandEnabled رو به همین شکل با fetch بازنویسی کن
export const getEnabledBrands = async () => {
  const brands = await getBrands();
  return brands.filter(b => b.enabled === 1).map(b => b.name);
};


export const updateBrand = async (id, brandData) => {
  try {
    const res = await apiClient.put(`/api/brands/${id}`, brandData);
    const data = await res.json();
    if (data.success) {
      return { success: true, brands: await getBrands() };
    }
    return { success: false, error: data.error || 'خطا در ویرایش برند' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteBrand = async (id) => {
  try {
    const res = await apiClient.delete(`/api/brands/${id}`);
    const data = await res.json();
    if (data.success) {
      return { success: true, brands: await getBrands() };
    }
    return { success: false, error: data.error || 'خطا در حذف برند' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleBrandEnabled = async (id, enabled) => {
  try {
    const res = await apiClient.patch(`/api/brands/${id}/toggle`);
    const data = await res.json();
    if (data.success) {
      return { success: true, brands: await getBrands() };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const ensureBrandExists = async (brandName) => {
  if (!brandName || brandName.trim() === '') return;
  const brands = await getBrands();
  if (!brands.find(b => b.name === brandName)) {
    await addBrand({ name: brandName, enabled: true });
  }
};