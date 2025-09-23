const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'smartbudget.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          color TEXT DEFAULT '#3B82F6'
        )
      `);

      // Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          amount DECIMAL(10, 2) NOT NULL,
          category_id INTEGER,
          description TEXT,
          date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        )
      `);

      // Insert default categories
      // Check if categories already exist
      db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Only insert if no categories exist
        if (row.count === 0) {
          db.run(`
            INSERT INTO categories (name, type, color) VALUES
            ('Salary', 'income', '#16a34a'),
            ('Freelance', 'income', '#059669'),
            ('Investment', 'income', '#0d9488'),
            ('Other Income', 'income', '#10b981'),
            ('Food & Dining', 'expense', '#dc2626'),
            ('Transportation', 'expense', '#ea580c'),
            ('Shopping', 'expense', '#d97706'),
            ('Entertainment', 'expense', '#7c3aed'),
            ('Bills & Utilities', 'expense', '#2563eb'),
            ('Healthcare', 'expense', '#db2777'),
            ('Education', 'expense', '#0891b2'),
            ('Other Expense', 'expense', '#64748b')
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
};

module.exports = { db, initDB };