// backend/src/api/inventory.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// ========== توابع کمکی ==========

const ensureInventoryExists = async (productId) => {
  const existing = await query('SELECT product_id FROM inventory WHERE product_id = ?', [productId]);
  if (existing.rows.length === 0) {
    await query(
      'INSERT INTO inventory (product_id, stock_quantity, reserved_stock, updated_at) VALUES (?, 0, 0, NOW())',
      [productId]
    );
  }
};

const addInventoryLog = async (productId, changeType, quantity, reason, userId = null) => {
  await query(
    `INSERT INTO inventory_logs (product_id, change_type, quantity, reason, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [productId, changeType, Math.abs(quantity), reason || 'manual', userId]
  );
  console.log(`[INVENTORY_LOG] product ${productId}: ${changeType} ${quantity} (${reason})`);
};

// ========== GET /api/inventory ==========
router.get('/', async (req, res) => {
  try {
    const { low_stock, product_ids } = req.query;
    
    let sql = `
      SELECT 
        product_id,
        stock_quantity,
        reserved_stock,
        updated_at,
        (stock_quantity - reserved_stock) as available_stock
      FROM inventory
    `;
    let params = [];
    
    if (product_ids) {
      const ids = product_ids.split(',').map(id => parseInt(id));
      sql += ' WHERE product_id IN (' + ids.map(() => '?').join(',') + ')';
      params = ids;
    }
    
    sql += ' ORDER BY available_stock ASC';
    let result = await query(sql, params);
    let results = result.rows;
    
    // اگر product_ids مشخص شده بود و برخی محصولات در inventory نبودند
    if (product_ids) {
      const existingIds = new Set(results.map(r => r.product_id));
      const missingIds = product_ids.split(',').map(id => parseInt(id)).filter(id => !existingIds.has(id));
      for (const id of missingIds) {
        results.push({
          product_id: id,
          stock_quantity: 0,
          reserved_stock: 0,
          available_stock: 0,
          updated_at: new Date().toISOString()
        });
      }
    }
    
    if (low_stock === 'true') {
      results = results.filter(r => r.available_stock < 50);
    }
    
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        SUM(reserved_stock) as total_reserved,
        SUM(stock_quantity - reserved_stock) as total_available,
        SUM(CASE WHEN (stock_quantity - reserved_stock) < 50 THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory
    `);
    const stats = statsResult.rows[0];
    
    res.json({ 
      success: true, 
      data: results,
      stats: {
        total_products: stats.total_products || 0,
        total_stock: stats.total_stock || 0,
        total_reserved: stats.total_reserved || 0,
        total_available: stats.total_available || 0,
        low_stock_count: stats.low_stock_count || 0
      }
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/:productId ==========
router.get('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const result = await query(
      `SELECT product_id, stock_quantity, reserved_stock, updated_at,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: {
          product_id: productId,
          stock_quantity: 0,
          reserved_stock: 0,
          available_stock: 0,
          updated_at: new Date().toISOString()
        }
      });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET /api/inventory/:productId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PATCH /api/inventory/:productId ==========
router.patch('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { quantity, reason } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
    
    if (quantity === undefined) {
      return res.status(400).json({ success: false, error: 'مقدار تغییر موجودی الزامی است' });
    }
    
    await ensureInventoryExists(productId);
    
    const invResult = await query('SELECT stock_quantity, reserved_stock FROM inventory WHERE product_id = ?', [productId]);
    const inv = invResult.rows[0];
    const newStockQuantity = inv.stock_quantity + quantity;
    
    if (newStockQuantity < 0) {
      return res.status(400).json({ 
        success: false, 
        error: `موجودی کافی نیست. موجودی فعلی: ${inv.stock_quantity}` 
      });
    }
    
    const changeType = quantity > 0 ? 'increase' : 'decrease';
    await query('UPDATE inventory SET stock_quantity = ?, updated_at = NOW() WHERE product_id = ?', [newStockQuantity, productId]);
    await addInventoryLog(productId, changeType, quantity, reason || 'manual', userId);
    
    const updated = await query(
      `SELECT product_id, stock_quantity, reserved_stock, updated_at,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('PATCH /api/inventory/:productId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/inventory/bulk ==========
router.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'آرایه‌ای از آیتم‌ها با productId و stock_quantity ارسال کنید' 
      });
    }
    
    const results = { success: [], failed: [], warnings: [] };
    
    for (const item of items) {
      try {
        const productId = parseInt(item.productId);
        const newStock = parseInt(item.stock_quantity);
        
        if (isNaN(productId) || isNaN(newStock)) {
          results.failed.push({ productId: item.productId, error: 'productId یا stock_quantity نامعتبر' });
          continue;
        }
        
        await ensureInventoryExists(productId);
        const invResult = await query('SELECT stock_quantity, reserved_stock FROM inventory WHERE product_id = ?', [productId]);
        const inv = invResult.rows[0];
        
        if (newStock < inv.reserved_stock) {
          results.warnings.push({
            product_id: productId,
            message: `موجودی جدید (${newStock}) کمتر از موجودی رزرو شده (${inv.reserved_stock}) است.`
          });
        }
        
        const quantityChange = newStock - inv.stock_quantity;
        if (quantityChange !== 0) {
          const changeType = quantityChange > 0 ? 'increase' : 'decrease';
          await query('UPDATE inventory SET stock_quantity = ?, updated_at = NOW() WHERE product_id = ?', [newStock, productId]);
          await addInventoryLog(productId, changeType, quantityChange, 'bulk_upload', userId);
          results.success.push({
            product_id: productId,
            old_stock: inv.stock_quantity,
            new_stock: newStock
          });
        }
      } catch (err) {
        results.failed.push({ productId: item.productId, error: err.message });
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('POST /api/inventory/bulk error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/inventory/reserve ==========
router.post('/reserve', async (req, res) => {
  try {
    const { productId, quantity, quoteId } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
    
    if (!productId || !quantity) {
      return res.status(400).json({ success: false, error: 'productId و quantity الزامی است' });
    }
    
    await ensureInventoryExists(productId);
    
    const invResult = await query('SELECT stock_quantity, reserved_stock FROM inventory WHERE product_id = ?', [productId]);
    const inv = invResult.rows[0];
    const available = inv.stock_quantity - inv.reserved_stock;
    
    if (available < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `موجودی قابل فروش کافی نیست. موجودی: ${inv.stock_quantity}, رزرو شده: ${inv.reserved_stock}, قابل فروش: ${available}` 
      });
    }
    
    const newReserved = inv.reserved_stock + quantity;
    await query('UPDATE inventory SET reserved_stock = ?, updated_at = NOW() WHERE product_id = ?', [newReserved, productId]);
    await addInventoryLog(productId, 'reserve', quantity, `quote_${quoteId || 'manual'}`, userId);
    
    const updated = await query(
      `SELECT product_id, stock_quantity, reserved_stock, updated_at,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('POST /api/inventory/reserve error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/inventory/release ==========
router.post('/release', async (req, res) => {
  try {
    const { productId, quantity, quoteId } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
    
    if (!productId || !quantity) {
      return res.status(400).json({ success: false, error: 'productId و quantity الزامی است' });
    }
    
    await ensureInventoryExists(productId);
    
    const invResult = await query('SELECT reserved_stock FROM inventory WHERE product_id = ?', [productId]);
    const inv = invResult.rows[0];
    const newReserved = Math.max(0, inv.reserved_stock - quantity);
    
    await query('UPDATE inventory SET reserved_stock = ?, updated_at = NOW() WHERE product_id = ?', [newReserved, productId]);
    await addInventoryLog(productId, 'release', quantity, `quote_${quoteId || 'manual'}_released`, userId);
    
    const updated = await query(
      `SELECT product_id, stock_quantity, reserved_stock, updated_at,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('POST /api/inventory/release error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/check/:productId ==========
router.get('/check/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { quantity } = req.query;
    
    await ensureInventoryExists(productId);
    const invResult = await query(
      `SELECT product_id, stock_quantity, reserved_stock,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    const inv = invResult.rows[0];
    const requested = quantity ? parseInt(quantity) : null;
    
    res.json({
      success: true,
      data: {
        product_id: productId,
        stock_quantity: inv.stock_quantity,
        reserved_stock: inv.reserved_stock,
        available_stock: inv.available_stock,
        requested_quantity: requested,
        is_available: requested ? inv.available_stock >= requested : null
      }
    });
  } catch (error) {
    console.error('GET /api/inventory/check/:productId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/logs/:productId ==========
router.get('/logs/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { limit = 50 } = req.query;
    const result = await query(
      'SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT ?',
      [productId, parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/inventory/logs/:productId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/logs ==========
router.get('/logs', async (req, res) => {
  try {
    const { change_type, from_date, to_date, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT * FROM inventory_logs WHERE 1=1';
    let params = [];
    
    if (change_type) {
      sql += ' AND change_type = ?';
      params.push(change_type);
    }
    if (from_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }
    if (to_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);
    
    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('GET /api/inventory/logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/logs/recent/changes ==========
router.get('/logs/recent/changes', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await query(
      'SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT ?',
      [parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/inventory/logs/recent/changes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/inventory/stats/summary ==========
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);
    
    const invStats = await query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        SUM(reserved_stock) as total_reserved,
        SUM(stock_quantity - reserved_stock) as total_available,
        SUM(CASE WHEN (stock_quantity - reserved_stock) < 50 THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory
    `);
    
    const logStats = await query(`
      SELECT 
        SUM(CASE WHEN change_type = 'increase' THEN 1 ELSE 0 END) as increase,
        SUM(CASE WHEN change_type = 'decrease' THEN 1 ELSE 0 END) as decrease,
        SUM(CASE WHEN change_type = 'reserve' THEN 1 ELSE 0 END) as reserve,
        SUM(CASE WHEN change_type = 'release' THEN 1 ELSE 0 END) as release,
        COUNT(*) as total
      FROM inventory_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [daysNum]);
    
    const summary = {
      ...invStats.rows[0],
      recent_changes: logStats.rows[0] || { increase: 0, decrease: 0, reserve: 0, release: 0, total: 0 }
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('GET /api/inventory/stats/summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/inventory/init/:productId ==========
router.post('/init/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { stock_quantity = 0 } = req.body;
    
    const existing = await query('SELECT product_id FROM inventory WHERE product_id = ?', [productId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'این محصول قبلاً موجودی دارد. برای تغییر از PATCH استفاده کنید.' 
      });
    }
    
    await query(
      'INSERT INTO inventory (product_id, stock_quantity, reserved_stock, updated_at) VALUES (?, ?, 0, NOW())',
      [productId, stock_quantity]
    );
    await addInventoryLog(productId, 'increase', stock_quantity, 'initial_creation', null);
    
    const inv = await query(
      `SELECT product_id, stock_quantity, reserved_stock, updated_at,
              (stock_quantity - reserved_stock) as available_stock
       FROM inventory WHERE product_id = ?`,
      [productId]
    );
    
    res.status(201).json({ success: true, data: inv.rows[0] });
  } catch (error) {
    console.error('POST /api/inventory/init/:productId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;