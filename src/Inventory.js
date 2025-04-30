import React, { useState, useEffect } from "react";
import { formatRupiah } from "./components/utils/format";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Inventory = () => {
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPriceSell, setNewProductPriceSell] = useState("");
  const [newProductPriceBuy, setNewProductPriceBuy] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/items');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Gagal memuat inventaris.', { position: 'top-right', autoClose: 3000 });
    }
  };

  const openAddProductModal = () => {
    setIsAddProductModalOpen(true);
    setNewProductName("");
    setNewProductPriceSell("");
    setNewProductPriceBuy("");
    setNewProductStock("");
  };

  const closeAddProductModal = () => {
    setIsAddProductModalOpen(false);
  };

  const addProduct = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProductName,
          price_sell: parseFloat(newProductPriceSell),
          price_buy: parseFloat(newProductPriceSell),
          stock: parseInt(newProductStock),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newItem = await response.json();
      setInventory([...inventory, newItem]);
      closeAddProductModal();
      toast.success('Produk berhasil ditambahkan!', { position: 'top-right', autoClose: 2000 });
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Gagal menambahkan produk.', { position: 'top-right', autoClose: 3000 });
    }
  };

  const handleStockChange = async (id, newStockValue) => {
    const newStock = parseInt(newStockValue, 10);

    if (isNaN(newStock)) {
      toast.error('Stok harus berupa angka yang valid.', { position: 'top-right', autoClose: 3000 });
      return;
    }

    const productToUpdate = inventory.find(item => item.id === id);
    if (!productToUpdate) {
      console.error(`Produk dengan ID ${id} tidak ditemukan.`);
      toast.error(`Gagal memperbarui stok. Produk tidak ditemukan.`, { position: 'top-right', autoClose: 3000 });
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gagal memperbarui stok:', response.status, errorData);
        toast.error(`Gagal memperbarui stok: ${response.statusText}`, { position: 'top-right', autoClose: 3000 });
        return;
      }
      const updatedItem = await response.json();
      setInventory(inventory.map(item => (item.id === id ? { ...item, stock: updatedItem.stock } : item))); // Ensure stock is updated
      toast.success(`Stok untuk ${productToUpdate.name} berhasil diperbarui!`, { position: 'top-right', autoClose: 2000 });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(`Gagal memperbarui stok untuk ${productToUpdate.name}.`, { position: 'top-right', autoClose: 3000 });
    }
  };

  const filteredProducts = inventory.filter(product =>
    product?.name?.toLowerCase().includes(search.toLowerCase())  // added null check
  );

  return (
    <div style={styles.container}>
      <h2>Manage Inventory</h2>

      <button style={styles.addButton} onClick={openAddProductModal}>
        Tambah Produk
      </button>

      {isAddProductModalOpen && (
        <div style={styles.modal}>
          <h3>Tambah Produk Baru</h3>
          <div style={styles.formRow}>
            <label style={styles.label}>Nama Barang</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Nama Barang"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Harga Beli</label>
            <input
              type="number"
              style={styles.input}
              placeholder="Harga Beli"
              value={newProductPriceBuy}
              onChange={(e) => setNewProductPriceSell(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Harga Jual</label>
            <input
              type="number"
              style={styles.input}
              placeholder="Harga Jual"
              value={newProductPriceSell}
              onChange={(e) => setNewProductPriceBuy(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Stok</label>
            <input
              type="number"
              style={styles.input}
              placeholder="Stok"
              value={newProductStock}
              onChange={(e) => setNewProductStock(e.target.value)}
            />
          </div>
          <div style={styles.modalButtons}>
            <button style={styles.confirmButton} onClick={addProduct}>
              Simpan
            </button>
            <button style={styles.cancelButton} onClick={closeAddProductModal}>
              Batal
            </button>
          </div>
        </div>
      )}

      <div style={styles.searchContainer}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="Cari Produk"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <h3>Daftar Produk</h3>
      {filteredProducts.length > 0 ? (
        <ul style={styles.productList}>
          <li style={{ ...styles.listItem, fontWeight: 'bold' }}>
            <span style={{ flex: 0.5 }}>ID</span>
            <span style={{ flex: 2 }}>Nama Barang</span>
            <span style={{ flex: 1, textAlign: "right" }}>Harga Beli</span>
            <span style={{ flex: 1, textAlign: "right" }}>Harga Jual</span>
            <span style={{ flex: 1, textAlign: "right" }}>Stok</span>
          </li>
          {filteredProducts.map((product) => (
            <li key={product.id} style={styles.listItem}>
              <span style={{ flex: 0.5 }}>{product.id}</span>
              <span style={{ flex: 2 }}>{product.name}</span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {formatRupiah(product.price_buy)}
              </span>
              <span style={{ flex: 1.5, textAlign: "right" }}>
                {formatRupiah(product.price_sell)}
              </span>
              <span style={{ flex: 1, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <input
                  type="number"
                  style={styles.stockInput}
                  defaultValue={product.stock}
                  onBlur={(e) => handleStockChange(product.id, e.target.value)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Produk tidak ditemukan.</p>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  addButton: {
    padding: "10px 15px",
    backgroundColor: "green",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "15px",
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    width: '300px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '10px',
  },
  label: {
    marginRight: '10px',
    width: '100px',
    textAlign: 'left',
    display: 'inline-block'
  },
  input: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '200px',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '15px',
    gap: '10px',
  },
  confirmButton: {
    backgroundColor: 'green',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  input: {
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    marginBottom: "10px",
    width: "250px",
  },
  searchContainer: {
    marginBottom: "20px",
  },
  searchInput: {
    width: "300px",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  productList: {
    listStyle: "none",
    padding: 0,
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #eee",
  },
  'listItem > span:nth-child(1)': {
    flex: 0.5,
    fontSize: '0.8em',
    color: '#777',
  },
  'listItem > span:nth-child(2)': {
    flex: 2,
  },
  'listItem > span:nth-child(3)': {
    flex: 1,
    textAlign: "right",
  },
  'listItem > span:nth-child(4)': {
    flex: 1,
    textAlign: "right",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end", // Align the input to the right
  },
  stockInput: {
    width: "60px",
    padding: "5px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    textAlign: "right",
  },
};

export default Inventory;

