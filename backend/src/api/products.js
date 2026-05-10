// backend/src/api/products.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

const normalizeProduct = (row) => ({
  id: row.id,
  productcode: row.sku,
  grade: row.grade || '',
  name: row.name,
  price: Number(row.price_public) || 0,
  partnerprice: Number(row.price_partner) || 0,
  discount: row.discount || 0,
  stock: Number(row.stock_quantity) || 0,
  description: row.description || '',
  manufacturer: row.brand || '',
  glazetype: row.glaze_type || '',
  suitablefor: row.suitable_for || '',
  category: row.category || '',
  size: row.size || '',
  glaze: row.glaze || '',
  color: row.color || '',
  images: row.images ? JSON.parse(row.images) : [],
  fulldescription: row.full_description || '',
  tags: row.tags ? JSON.parse(row.tags) : [],
  audience: row.audience || 'all',
  created_at: row.created_at,
  updated_at: row.updated_at
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, manufacturer, tag, min_price, max_price, search, sort_by, sort_order, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT p.*, COALESCE(i.stock_quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE 1=1
    `;
    const params = [];
    
    if (category) {
      sql += ` AND p.category = ?`;
      params.push(category);
    }
    if (manufacturer) {
      sql += ` AND p.brand = ?`;
      params.push(manufacturer);
    }
    if (min_price) {
      sql += ` AND p.price_public >= ?`;
      params.push(min_price);
    }
    if (max_price) {
      sql += ` AND p.price_public <= ?`;
      params.push(max_price);
    }
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const sortField = sort_by === 'price' ? 'p.price_public' : (sort_by === 'name' ? 'p.name' : 'p.created_at');
    const sortOrderDir = sort_order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrderDir}`;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const result = await query(sql, params);
    
    const countResult = await query('SELECT COUNT(*) as total FROM products');
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: result.rows.map(normalizeProduct),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query(`
      SELECT p.*, COALESCE(i.stock_quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = ?
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    }
    res.json({ success: true, data: normalizeProduct(result.rows[0]) });
  } catch (error) {
    console.error('GET /api/products/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/code/:code
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await query(`
      SELECT p.*, COALESCE(i.stock_quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.sku = ?
    `, [code]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    }
    res.json({ success: true, data: normalizeProduct(result.rows[0]) });
  } catch (error) {
    console.error('GET /api/products/code/:code error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data.name || !data.price) {
      return res.status(400).json({ success: false, error: 'نام و قیمت محصول الزامی است' });
    }
    
    if (data.productcode) {
      const existing = await query('SELECT id FROM products WHERE sku = ?', [data.productcode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: `کد محصول "${data.productcode}" قبلاً وجود دارد` });
      }
    }
    
    const imagesJson = data.images ? JSON.stringify(data.images) : '[]';
    const tagsJson = data.tags ? JSON.stringify(data.tags) : '[]';
    
    const result = await query(`
      INSERT INTO products (
        sku, grade, name, price_public, price_partner, discount,
        description, brand, glaze_type, suitable_for, category,
        size, glaze, color, images, full_description, tags, audience
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.productcode || null,
      data.grade || null,
      data.name,
      data.price || 0,
      data.partnerprice || 0,
      data.discount || 0,
      data.description || null,
      data.manufacturer || null,
      data.glazetype || null,
      data.suitablefor || null,
      data.category || null,
      data.size || null,
      data.glaze || null,
      data.color || null,
      imagesJson,
      data.fulldescription || null,
      tagsJson,
      data.audience || 'all'
    ]);
    
    const productId = result.insertId;
    
    await query(`
      INSERT INTO inventory (product_id, stock_quantity, reserved_stock)
      VALUES (?, ?, 0)
    `, [productId, data.stock || 0]);
    
    const newProduct = await query(`
      SELECT p.*, COALESCE(i.stock_quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = ?
    `, [productId]);
    
    res.status(201).json({
      success: true,
      data: normalizeProduct(newProduct.rows[0]),
      message: 'محصول با موفقیت اضافه شد'
    });
  } catch (error) {
    console.error('POST /api/products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const existing = await query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    }
    
    if (updates.productcode && updates.productcode !== existing.rows[0].sku) {
      const duplicate = await query('SELECT id FROM products WHERE sku = ? AND id != ?', [updates.productcode, id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, error: `کد محصول "${updates.productcode}" قبلاً وجود دارد` });
      }
    }
    
    const fields = [];
    const params = [];
    
    if (updates.productcode !== undefined) { fields.push('sku = ?'); params.push(updates.productcode); }
    if (updates.grade !== undefined) { fields.push('grade = ?'); params.push(updates.grade); }
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.price !== undefined) { fields.push('price_public = ?'); params.push(updates.price); }
    if (updates.partnerprice !== undefined) { fields.push('price_partner = ?'); params.push(updates.partnerprice); }
    if (updates.discount !== undefined) { fields.push('discount = ?'); params.push(updates.discount); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.manufacturer !== undefined) { fields.push('brand = ?'); params.push(updates.manufacturer); }
    if (updates.glazetype !== undefined) { fields.push('glaze_type = ?'); params.push(updates.glazetype); }
    if (updates.suitablefor !== undefined) { fields.push('suitable_for = ?'); params.push(updates.suitablefor); }
    if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category); }
    if (updates.size !== undefined) { fields.push('size = ?'); params.push(updates.size); }
    if (updates.glaze !== undefined) { fields.push('glaze = ?'); params.push(updates.glaze); }
    if (updates.color !== undefined) { fields.push('color = ?'); params.push(updates.color); }
    if (updates.images !== undefined) { fields.push('images = ?'); params.push(JSON.stringify(updates.images)); }
    if (updates.fulldescription !== undefined) { fields.push('full_description = ?'); params.push(updates.fulldescription); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
    if (updates.audience !== undefined) { fields.push('audience = ?'); params.push(updates.audience); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (fields.length > 1) {
      params.push(id);
      const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      await query(sql, params);
    }
    
    if (updates.stock !== undefined) {
      await query(`UPDATE inventory SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [updates.stock, id]);
    }
    
    const result = await query(`
      SELECT p.*, COALESCE(i.stock_quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = ?
    `, [id]);
    
    res.json({
      success: true,
      data: normalizeProduct(result.rows[0]),
      message: 'محصول با موفقیت به‌روزرسانی شد'
    });
  } catch (error) {
    console.error('PUT /api/products/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM products WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    }
    res.json({ success: true, message: 'محصول حذف شد' });
  } catch (error) {
    console.error('DELETE /api/products/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;