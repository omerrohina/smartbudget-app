const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all transactions for user
router.get('/', authenticateToken, (req, res) => {
  const { startDate, endDate, category, type } = req.query;
  
  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color 
    FROM transactions t 
    LEFT JOIN categories c ON t.category_id = c.id 
    WHERE t.user_id = ?
  `;
  let params = [req.user.userId];

  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }
  
  if (category) {
    query += ' AND t.category_id = ?';
    params.push(category);
  }
  
  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }

  query += ' ORDER BY t.date DESC, t.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add transaction
router.post('/', authenticateToken, (req, res) => {
  const { type, amount, category_id, description, date } = req.body;

  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'Type, amount, and date are required' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  db.run(
    'INSERT INTO transactions (user_id, type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.userId, type, amount, category_id || null, description || '', date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add transaction' });
      }

      // Get the created transaction with category info
      db.get(`
        SELECT t.*, c.name as category_name, c.color as category_color 
        FROM transactions t 
        LEFT JOIN categories c ON t.category_id = c.id 
        WHERE t.id = ?
      `, [this.lastID], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(row);
      });
    }
  );
});

// Delete transaction
router.delete('/:id', authenticateToken, (req, res) => {
  const transactionId = req.params.id;

  db.run(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [transactionId, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({ message: 'Transaction deleted successfully' });
    }
  );
});

// Get financial summary
router.get('/summary', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  
  let query = 'SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ?';
  let params = [req.user.userId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY type';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const summary = {
      income: 0,
      expense: 0,
      balance: 0
    };

    rows.forEach(row => {
      summary[row.type] = parseFloat(row.total) || 0;
    });

    summary.balance = summary.income - summary.expense;

    res.json(summary);
  });
});

// Get category analytics
router.get('/analytics/categories', authenticateToken, (req, res) => {
  const { startDate, endDate, type = 'expense' } = req.query;
  
  let query = `
    SELECT c.name, c.color, SUM(t.amount) as total 
    FROM transactions t 
    LEFT JOIN categories c ON t.category_id = c.id 
    WHERE t.user_id = ? AND t.type = ?
  `;
  let params = [req.user.userId, type];

  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY t.category_id, c.name, c.color HAVING total > 0 ORDER BY total DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

module.exports = router;