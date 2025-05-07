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
        console.error("Database connection error:", err.message); // More specific error
        process.exit(1); // Exit if DB connection fails
    }
    console.log('Connected to the SQLite database.');
});

// --- Database Schema Setup ---
// Use db.serialize to ensure table creations happen in order
db.serialize(() => {
    // Create items table (if it doesn't exist)
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price_buy REAL NOT NULL CHECK(price_buy >= 0), -- Added non-negative check
        price_sell REAL NOT NULL CHECK(price_sell >= 0),-- Added non-negative check
        stock INTEGER NOT NULL CHECK(stock >= 0)      -- Added non-negative check
      )
    `, (err) => {
        if (err) {
            console.error("Error creating items table:", err.message);
        } else {
            // Check if table is empty and insert initial data if needed
            db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
                if (err) {
                    console.error("Error checking item table count:", err.message);
                } else if (row && row.count === 0) {
                    console.log("Items table is empty, inserting initial data...");
                    const initialItems = [
                        { name: 'Mie Goreng', price_buy: 5000, price_sell: 10000, stock: 100 },
                        { name: 'Nasi Goreng', price_buy: 10000, price_sell: 12000, stock: 50 },
                        { name: 'Teh', price_buy: 1000, price_sell: 2000, stock: 150 },
                        // Add Ayam Goreng and Air Mineral if needed from the screenshot
                        { name: 'Ayam Goreng', price_buy: 8000, price_sell: 15000, stock: 56 },
                        { name: 'Air Mineral', price_buy: 10000, price_sell: 15000, stock: 30 },
                    ];
                    const insertStmt = db.prepare(
                        "INSERT INTO items (name, price_buy, price_sell, stock) VALUES (?, ?, ?, ?)"
                    );
                    initialItems.forEach((item) => {
                        insertStmt.run(item.name, item.price_buy, item.price_sell, item.stock, function(err) {
                            if (err) console.error("Error inserting initial item:", item.name, err.message);
                        });
                    });
                    insertStmt.finalize((err) => {
                       if (err) console.error("Error finalizing initial item insert:", err.message);
                       else console.log("Initial items inserted.");
                    });
                } else {
                     console.log("Items table already exists or contains data.");
                }
            });
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
        if (err) console.error("Error creating transactions table:", err.message);
    });

    // Create transaction_items table
    db.run(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        transaction_id INTEGER,
        item_id INTEGER,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        price_sell REAL NOT NULL, -- Price at the time of sale
        name TEXT NOT NULL,       -- Name at the time of sale
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE, -- Added CASCADE
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL, -- Keep transaction history even if item deleted
        PRIMARY KEY (transaction_id, item_id)
      )
    `, (err) => {
        if (err) console.error("Error creating transaction_items table:", err.message);
    });

     // Create receipts table
    db.run(`
      CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          total REAL NOT NULL,
          items TEXT NOT NULL,  -- Store item details as JSON string
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE -- Added CASCADE
      )
    `, (err) => {
        if (err) console.error("Error creating receipts table:", err.message);
    });
});


// --- API Endpoints ---

// GET /api/items - Get all items
app.get('/api/items', (req, res) => {
    db.all('SELECT * FROM items ORDER BY name ASC', [], (err, rows) => { // Added ordering
        if (err) {
            console.error("Error fetching items:", err.message);
            res.status(500).json({ message: "Failed to retrieve items", error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET /api/items/:id - Get a single item by ID
app.get('/api/items/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
        if (err) {
             console.error(`Error fetching item ${id}:`, err.message);
            res.status(500).json({ message: "Failed to retrieve item", error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Item not found' });
            return;
        }
        res.json(row);
    });
});

// POST /api/items - Add a new item
app.post('/api/items', (req, res) => {
    const { name, price_buy, price_sell, stock } = req.body;

    // Basic Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Item name is required and cannot be empty.' });
    }
     if (price_buy === undefined || typeof price_buy !== 'number' || price_buy < 0) {
         return res.status(400).json({ message: 'Valid non-negative buy price is required.' });
     }
      if (price_sell === undefined || typeof price_sell !== 'number' || price_sell < 0) {
         return res.status(400).json({ message: 'Valid non-negative sell price is required.' });
     }
     if (stock === undefined || !Number.isInteger(stock) || stock < 0) {
         return res.status(400).json({ message: 'Valid non-negative integer stock is required.' });
     }

    const sql = 'INSERT INTO items (name, price_buy, price_sell, stock) VALUES (?, ?, ?, ?)';
    db.run(sql, [name.trim(), price_buy, price_sell, stock], function(err) { // Use function to get this.lastID
        if (err) {
            console.error("Error adding item:", err.message);
             // Check for constraint errors (like CHECK failures)
            if (err.message.includes("CHECK constraint failed")) {
                 return res.status(400).json({ message: "Input validation failed (e.g., negative price/stock)", error: err.message });
            }
            return res.status(500).json({ message: "Failed to add item to database", error: err.message });
        }
        // Fetch the newly created item to return it
        db.get('SELECT * FROM items WHERE id = ?', [this.lastID], (fetchErr, row) => {
            if (fetchErr) {
                 console.error(`Error fetching newly added item ${this.lastID}:`, fetchErr.message);
                // Even if fetching fails, the item was added, so maybe return 201 with simpler message
                return res.status(201).json({ message: 'Item added successfully, but failed to retrieve details.', id: this.lastID });
            }
            if (!row) {
                 return res.status(404).json({ message: 'Item added, but could not be found immediately after.'}); // Should not happen
            }
            res.status(201).json(row); // Respond with the newly created item data
        });
    });
});

// DELETE /api/items/:id - Delete a product
app.delete('/api/items/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM items WHERE id = ?';

    // Optional: Check if item exists in transactions before deleting?
    // For now, ON DELETE SET NULL in transaction_items handles this.

    db.run(sql, [id], function(err) { // Use function for this.changes
        if (err) {
            console.error(`Error deleting item ${id}:`, err.message);
            res.status(500).json({ message: 'Failed to delete item from database', error: err.message });
            return;
        }
        if (this.changes === 0) {
            // If no rows were changed, the item ID didn't exist
            res.status(404).json({ message: 'Item not found' });
            return;
        }
        // Successfully deleted
        res.status(200).json({ message: `Item with ID ${id} deleted successfully` });
        // Alternative: res.status(204).send(); // No content response
    });
});


// PUT /api/items/:id - Update an existing item (Partial Updates)
app.put('/api/items/:id', (req, res) => {
    const id = req.params.id;
    const body = req.body;

    const allowedFields = ['name', 'price_buy', 'price_sell', 'stock'];
    const sqlSetClauses = [];
    const sqlValues = [];

    // Build the SET clauses and values array dynamically and validate
    for (const field of allowedFields) {
        if (body.hasOwnProperty(field)) {
            const value = body[field];
             let isValid = false;
             let processedValue = value; // Value after validation/processing

             // Validate each field type and value
             if (field === 'name') {
                if (typeof value === 'string' && value.trim() !== '') {
                    isValid = true;
                    processedValue = value.trim();
                } else {
                     return res.status(400).json({ message: `Invalid value for ${field}. Must be a non-empty string.` });
                }
             } else if (field === 'price_buy' || field === 'price_sell') {
                 processedValue = parseFloat(value); // Ensure it's treated as a number
                 if (typeof processedValue === 'number' && !isNaN(processedValue) && processedValue >= 0) {
                    isValid = true;
                 } else {
                     return res.status(400).json({ message: `Invalid value for ${field}. Must be a non-negative number.` });
                 }
             } else if (field === 'stock') {
                 processedValue = parseInt(value, 10); // Ensure it's treated as an integer
                 if (Number.isInteger(processedValue) && processedValue >= 0) {
                     isValid = true;
                 } else {
                     return res.status(400).json({ message: `Invalid value for ${field}. Must be a non-negative integer.` });
                 }
             }

            // If valid, add to SQL query parts
             if (isValid) {
                 sqlSetClauses.push(`${field} = ?`);
                 sqlValues.push(processedValue);
             }
        }
    }

    // Check if any valid fields were provided for update
    if (sqlSetClauses.length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    // Add the ID to the end of the values array for the WHERE clause
    sqlValues.push(id);

    // Construct the final SQL query
    const sql = `UPDATE items SET ${sqlSetClauses.join(', ')} WHERE id = ?`;

    // Execute the update query
    db.run(sql, sqlValues, function(err) { // Use function for this.changes
        if (err) {
            console.error(`Error updating item ${id}:`, err.message);
             // Check for constraint errors (like CHECK failures)
             if (err.message.includes("CHECK constraint failed")) {
                 return res.status(400).json({ message: "Input validation failed (e.g., negative price/stock)", error: err.message });
             }
            return res.status(500).json({ message: 'Failed to update item in database', error: err.message });
        }

        // Check if any row was actually updated
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Item not found or no changes were made.' });
        }

        // Fetch the updated item data to return to the client
        db.get('SELECT * FROM items WHERE id = ?', [id], (fetchErr, updatedRow) => {
            if (fetchErr) {
                console.error(`Error fetching updated item ${id}:`, fetchErr.message);
                return res.status(200).json({ message: 'Item updated successfully, but failed to retrieve updated details.' }); // Still a success, but inform client
            }
            if (!updatedRow) {
                 return res.status(404).json({ message: 'Item updated, but could not be found immediately after.'}); // Should not happen if this.changes > 0
            }
            // Return the complete updated item
            res.status(200).json(updatedRow);
        });
    });
});


// --- Transaction and Receipt Endpoints (Mostly unchanged, added logging/minor fixes) ---

// POST /api/transactions - Create a new transaction
app.post('/api/transactions', (req, res) => { // Removed async keyword as we use callbacks/promises inside
    const { total, items } = req.body;

     // Basic validation
     if (total === undefined || typeof total !== 'number' || total < 0) {
          return res.status(400).json({ message: "Invalid transaction total provided."});
     }
     if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ message: "Transaction must include at least one item."});
     }
     // Further validation for each item in the array can be added here

    db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
            if (beginErr) {
                 console.error("Begin transaction error:", beginErr.message);
                 return res.status(500).json({ message: "Failed to start transaction", error: beginErr.message });
            }

            // 1. Insert into transactions table
            db.run('INSERT INTO transactions (total) VALUES (?)', [total], function (insertTransErr) { // Use function for lastID
                if (insertTransErr) {
                    console.error("Insert transaction error:", insertTransErr.message);
                    return db.run('ROLLBACK TRANSACTION', () => res.status(500).json({ message: "Failed to record transaction", error: insertTransErr.message }));
                }
                const transactionId = this.lastID;

                // 2. Insert items and prepare for receipt
                const insertItemStmt = db.prepare(
                    'INSERT INTO transaction_items (transaction_id, item_id, quantity, price_sell, name) VALUES (?, ?, ?, ?, ?)'
                );
                const itemDetailsForReceipt = [];
                let itemInsertError = null;

                // Use a loop that allows managing callbacks or promises correctly
                // Or use Promise.all for parallel updates if that's desired & safe
                items.forEach(item => {
                    if (itemInsertError) return; // Stop if an error occurred in previous iterations

                    // Validate item data (add more checks as needed)
                    if (!item || !item.id || !item.quantity || !item.price_sell || !item.name) {
                       itemInsertError = new Error(`Invalid item data in transaction: ${JSON.stringify(item)}`);
                       return;
                    }

                    itemDetailsForReceipt.push({ // Prepare receipt data simultaneously
                        name: item.name,
                        quantity: item.quantity,
                        price_sell: item.price_sell,
                    });

                    insertItemStmt.run(transactionId, item.id, item.quantity, item.price_sell, item.name, (insertItemErr) => {
                        if (insertItemErr) {
                             console.error(`Error inserting transaction item (TrID: ${transactionId}, ItemID: ${item.id}):`, insertItemErr.message);
                            itemInsertError = insertItemErr; // Capture the first error
                        }
                    });
                });

                insertItemStmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                         console.error("Error finalizing transaction items insert:", finalizeErr.message);
                        if (!itemInsertError) itemInsertError = finalizeErr; // Capture finalize error if no run error occurred
                    }

                    if (itemInsertError) {
                         // Rollback if any item insert failed
                        return db.run('ROLLBACK TRANSACTION', () => res.status(500).json({ message: "Failed to record transaction items", error: itemInsertError.message }));
                    }

                     // 3. Insert into receipts table
                    const itemDetailsJson = JSON.stringify(itemDetailsForReceipt);
                    db.run('INSERT INTO receipts (transaction_id, total, items) VALUES (?, ?, ?)',
                        [transactionId, total, itemDetailsJson], function (receiptErr) { // Use function for lastID
                        if (receiptErr) {
                             console.error(`Error inserting receipt (TrID: ${transactionId}):`, receiptErr.message);
                            return db.run('ROLLBACK TRANSACTION', () => res.status(500).json({ message: "Failed to generate receipt", error: receiptErr.message }));
                        }

                        // 4. If all successful, commit
                        db.run('COMMIT TRANSACTION', (commitErr) => {
                            if (commitErr) {
                                console.error(`Error committing transaction (TrID: ${transactionId}):`, commitErr.message);
                                // Rollback might not be possible/needed if commit fails, but log it.
                                return res.status(500).json({ message: "Transaction recorded but failed to commit", error: commitErr.message });
                            }
                            res.status(201).json({ id: transactionId, message: 'Transaction completed successfully' });
                        });
                    });
                });
            });
        });
    });
});


// GET /api/transactions - Get all transactions
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY timestamp DESC', [], (err, rows) => { // Ordered by newest first
    if (err) {
       console.error("Error fetching transactions:", err.message);
      res.status(500).json({ message: "Failed to retrieve transactions", error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET /api/receipts/:transactionId - Get receipt data by transaction ID
app.get('/api/receipts/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;

    const sql = 'SELECT id, transaction_id, total, items, timestamp FROM receipts WHERE transaction_id = ?';
    db.get(sql, [transactionId], (err, row) => {
        if (err) {
            console.error(`Error fetching receipt for transaction ${transactionId}:`, err.message);
            res.status(500).json({ message: 'Failed to retrieve receipt', error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Receipt not found for this transaction ID' });
            return;
        }

        // Parse the items JSON string safely
        try {
            row.items = JSON.parse(row.items);
            res.json(row);
        } catch (parseError) {
            console.error(`Error parsing items JSON for receipt (TrID: ${transactionId}):`, parseError.message);
            // Return the receipt data but indicate the items part is corrupted
            res.status(200).json({ ...row, items: "Error: Could not parse item details.", parseError: parseError.message });
            // Or return 500 if corrupted data is unacceptable
            // res.status(500).json({ message: "Failed to parse receipt item details", error: parseError.message });
        }
    });
});


// --- Server Startup ---
app.listen(port, () => {
    console.log(`Server is running successfully on http://localhost:${port}`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log('Database connection closed.');
        }
        console.log('Server shutting down.');
        process.exit(0);
    });
});