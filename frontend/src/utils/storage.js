// frontend/src/utils/storage.js
import apiClient from './apiClient';

const PRODUCTS_BASE = '/api/products';

// تبدیل فیلدهای دیتابیس به فیلدهای فرانت‌اند
const normalizeProduct = (p) => ({
  id: p.id,
  productCode: p.productcode || p.sku || p.productCode || '',
  grade: p.grade || '',
  name: p.name || 'بدون نام',
  price: Number(p.price_public) || Number(p.price) || 0,
  partnerPrice: Number(p.price_partner) || Number(p.partnerprice) || Number(p.partnerPrice) || 0,
  discount: Number(p.discount) || 0,
  stock: Number(p.stock_quantity) || Number(p.stock) || 0,
  description: p.description || '',
  manufacturer: p.brand || p.manufacturer || '',
  glazeType: p.glazetype || p.glazeType || p.glaze_type || '',
  suitableFor: p.suitablefor || p.suitableFor || p.suitable_for || '',
  category: p.category || '',
  size: p.size || '',
  glaze: p.glaze || '',
  color: p.color || '',
  images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
  fullDescription: p.fulldescription || p.fullDescription || p.full_description || '',
  tags: Array.isArray(p.tags)
    ? p.tags
    : (typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : []),
  audience: p.audience || 'all',
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt,
});

export const getProducts = async () => {
  try {
    const res = await apiClient.get(PRODUCTS_BASE);
    if (!res.ok) throw new Error('خطا در دریافت محصولات');

    const data = await res.json();

    // ممکنه API به صورت { success: true, data: [...] } باشه یا مستقیم آرایه
    if (data.success && Array.isArray(data.data)) {
      return data.data.map(normalizeProduct);
    }
    if (Array.isArray(data)) {
      return data.map(normalizeProduct);
    }
    return [];
  } catch (error) {
    console.error('getProducts error:', error);
    return [];
  }
};

export const getProductById = async (id) => {
  try {
    const res = await apiClient.get(`${PRODUCTS_BASE}/${id}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.data) {
      return normalizeProduct(data.data);
    }
    if (data.id) return normalizeProduct(data);
    return null;
  } catch (error) {
    console.error('getProductById error:', error);
    return null;
  }
};

export const getProductByCode = async (productCode) => {
  try {
    const res = await apiClient.get(`${PRODUCTS_BASE}/code/${encodeURIComponent(productCode)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.data) {
      return normalizeProduct(data.data);
    }
    return null;
  } catch (error) {
    console.error('getProductByCode error:', error);
    return null;
  }
};

export const addProduct = async (product) => {
  try {
    const apiProduct = {
      productcode: product.productCode,
      grade: product.grade || '',
      name: product.name,
      price: Number(product.price) || 0,
      partnerprice: Number(product.partnerPrice) || 0,
      discount: Number(product.discount) || 0,
      stock: Number(product.stock) || 0,
      description: product.description || '',
      manufacturer: product.manufacturer || '',
      glazetype: product.glazeType || '',
      suitablefor: product.suitableFor || '',
      category: product.category || '',
      size: product.size || '',
      glaze: product.glaze || '',
      color: product.color || '',
      images: product.images || [],
      fulldescription: product.fullDescription || '',
      tags: product.tags || [],
      audience: product.audience || 'all',
    };

    const res = await apiClient.post(PRODUCTS_BASE, apiProduct);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'خطا در افزودن محصول');
    }

    const data = await res.json();
    if (data.success && data.data) {
      return normalizeProduct(data.data);
    }
    if (data.id) return normalizeProduct(data);
    throw new Error(data.error || 'خطا در افزودن محصول');
  } catch (error) {
    console.error('addProduct error:', error);
    throw error;
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const apiUpdates = {};
    if (updates.price !== undefined) apiUpdates.price = updates.price;
    if (updates.partnerPrice !== undefined) apiUpdates.partnerprice = updates.partnerPrice;
    if (updates.stock !== undefined) apiUpdates.stock = updates.stock;
    if (updates.name !== undefined) apiUpdates.name = updates.name;
    if (updates.productCode !== undefined) apiUpdates.productcode = updates.productCode;
    if (updates.manufacturer !== undefined) apiUpdates.manufacturer = updates.manufacturer;
    if (updates.description !== undefined) apiUpdates.description = updates.description;
    if (updates.category !== undefined) apiUpdates.category = updates.category;
    if (updates.size !== undefined) apiUpdates.size = updates.size;
    if (updates.color !== undefined) apiUpdates.color = updates.color;
    if (updates.discount !== undefined) apiUpdates.discount = updates.discount;
    if (updates.grade !== undefined) apiUpdates.grade = updates.grade;
    if (updates.glazeType !== undefined) apiUpdates.glazetype = updates.glazeType;
    if (updates.suitableFor !== undefined) apiUpdates.suitablefor = updates.suitableFor;
    if (updates.glaze !== undefined) apiUpdates.glaze = updates.glaze;
    if (updates.images !== undefined) apiUpdates.images = updates.images;
    if (updates.fullDescription !== undefined) apiUpdates.fulldescription = updates.fullDescription;
    if (updates.tags !== undefined) apiUpdates.tags = updates.tags;
    if (updates.audience !== undefined) apiUpdates.audience = updates.audience;

    const res = await apiClient.put(`${PRODUCTS_BASE}/${id}`, apiUpdates);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'خطا در به‌روزرسانی محصول');
    }

    const data = await res.json();
    if (data.success && data.data) {
      return normalizeProduct(data.data);
    }
    if (data.id) return normalizeProduct(data);
    throw new Error(data.error || 'خطا در به‌روزرسانی محصول');
  } catch (error) {
    console.error('updateProduct error:', error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    const res = await apiClient.delete(`${PRODUCTS_BASE}/${id}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'خطا در حذف محصول');
    }
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('deleteProduct error:', error);
    throw error;
  }
};

export const exportData = async () => {
  const products = await getProducts();
  return JSON.stringify(products, null, 2);
};

export const importData = async (jsonString) => {
  try {
    const products = JSON.parse(jsonString);
    let added = 0, updated = 0;
    for (const p of products) {
      const existing = await getProductByCode(p.productCode);
      if (existing) {
        await updateProduct(existing.id, {
          price: p.price,
          partnerPrice: p.partnerPrice,
          stock: p.stock,
          name: p.name,
          manufacturer: p.manufacturer,
          description: p.description,
        });
        updated++;
      } else {
        await addProduct(p);
        added++;
      }
    }
    return { success: true, added, updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const resetToDefault = async () => {
  console.warn('resetToDefault not implemented');
};

export const applyBulkDiscount = async (productIds, discountType, value) => {
  console.warn('applyBulkDiscount not implemented');
};

// توابع کمکی برای فیلترها
export const getAllSizes = async () => {
  const products = await getProducts();
  return [...new Set(products.map(p => p.size).filter(Boolean))].sort();
};
export const getAllGlazes = async () => {
  const products = await getProducts();
  return [...new Set(products.map(p => p.glaze).filter(Boolean))].sort();
};
export const getAllUsages = async () => {
  const products = await getProducts();
  return [...new Set(products.map(p => p.suitableFor).filter(Boolean))].sort();
};
export const getAllColors = async () => {
  const products = await getProducts();
  return [...new Set(products.map(p => p.color).filter(Boolean))].sort();
};