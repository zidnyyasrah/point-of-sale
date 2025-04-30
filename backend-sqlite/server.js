// C:\Users\zidny\pos-app\backend-sqlite\server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database('./pos_app.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

// Create items table (if it doesn't exist)
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price_sell REAL NOT NULL,
    price_buy REAL NOT NULL,
    stock INTEGER NOT NULL
  )
`, (err) => {
    if (err) {
        console.error("Error creating items table:", err);
    } else {
        //check if table is empty
        db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
            if (err) {
                console.error("Error checking item table", err);
            } else {
                const count = row.count;
                if (count === 0) {
                    // Insert initial data
                    const initialItems = [
                        { name: 'Mie Goreng', price_sell: 10000, price_buy: 5000, stock: 100 },
                        { name: 'Nasi Goreng', price_sell: 12000, price_buy: 10000, stock: 50 },
                        { name: 'Teh', price_sell: 2000, price_buy: 1000, stock: 150 }
                    ];

                    const insertStmt = db.prepare(
                        "INSERT INTO items (name, price_sell, price_buy, stock) VALUES (?, ?, ?, ?)"
                    );

                    initialItems.forEach((item) => {
                        insertStmt.run(item.name, item.price_sell, item.price_buy, item.stock);
                    });
                    insertStmt.finalize();
                    console.log("Initial items inserted.");
                }
            }
        })
    }
});

// Create transactions table
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
    if (err) {
        console.error("Error creating transactions table:", err);
    }
});

// Create transaction_items table to store the items in each transaction
db.run(`
  CREATE TABLE IF NOT EXISTS transaction_items (
    transaction_id INTEGER,
    item_id INTEGER,
    quantity INTEGER,
    price_sell REAL,
    name TEXT, -- Added name here
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    PRIMARY KEY (transaction_id, item_id)
  )
`, (err) => {
    if (err) {
        console.error("Error creating transaction_items table:", err);
  }
});

// Create receipts table.  Added item names.
db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        total REAL NOT NULL,
        items TEXT NOT NULL,  -- Store item details as JSON string
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
`, (err) => {
    if (err) {
        console.error("Error creating receipts table:", err);
    }
});

// Get all items
app.get('/api/items', (req, res) => {
    db.all('SELECT * FROM items', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get a single item by ID
app.get('/api/items/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Item not found' });
            return;
        }
        res.json(row);
    });
});

// Update an item's stock
app.put('/api/items/:id', (req, res) => {
    const id = req.params.id;
    const { stock } = req.body;

    db.run('UPDATE items SET stock = ? WHERE id = ?', [stock, id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Stock updated successfully' });
    });
});

// Create a new transaction
app.post('/api/transactions', async (req, res) => {
    const { total, items } = req.body;

    // Start a database transaction to ensure atomicity
    db.serialize(async () => {
        db.run('BEGIN TRANSACTION');

        try {
            // 1. Insert into transactions table
            const transactionResult = await new Promise((resolve, reject) => {
                db.run('INSERT INTO transactions (total) VALUES (?)', [total], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID }); // Use this.lastID to get the inserted ID
                    }
                });
            });

            const transactionId = transactionResult.id;

            // 2. Insert into transaction_items table
            const insertItemStmt = db.prepare(
                'INSERT INTO transaction_items (transaction_id, item_id, quantity, price_sell, name) VALUES (?, ?, ?, ?, ?)' // Include name
            );
            items.forEach(item => {
                const itemData = item; // Capture the item
                insertItemStmt.run(transactionId, itemData.id, itemData.quantity, itemData.price_sell, itemData.name, (err) => { // use itemData.name
                    if (err) {
                        console.error("Error inserting transaction item:", err); // Log the error
                        // Don't reject here, handle it in the overall transaction
                    }
                });
            });
            insertItemStmt.finalize();

            // 3. Generate item details string for receipts table
            const itemDetails = JSON.stringify(items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price_sell: item.price_sell,
            })));

            // 4. Insert into receipts table
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO receipts (transaction_id, total, items) VALUES (?, ?, ?)',
                    [transactionId, total, itemDetails],
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ receiptId: this.lastID });
                        }
                    }
                );
            });

            // If all operations were successful, commit the transaction
            db.run('COMMIT TRANSACTION');
            res.json({ id: transactionId, message: 'Transaction completed successfully' }); // Send back the transaction ID

        } catch (error) {
            // If any error occurred, roll back the transaction
            db.run('ROLLBACK TRANSACTION');
            console.error("Transaction failed:", error);
            res.status(500).json({ error: error.message || 'Transaction failed' }); // Send the error message
        }
    });
});

// Get all transactions  --  Added this route
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get receipt data by transaction ID
app.get('/api/receipts/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;

    db.get('SELECT id, total, items, timestamp FROM receipts WHERE transaction_id = ?', [transactionId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Receipt not found for this transaction' });
            return;
        }

        // Parse the items JSON string
        try {
            row.items = JSON.parse(row.items);
        } catch (e) {
            console.error("Error parsing items JSON:", e);
            res.status(500).json({ error: "Error parsing item details: " + e.message });
            return;
        }
        res.json(row);
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
