import React, { useState, useEffect } from "react";
// Assuming formatRupiah exists and works correctly
import { formatRupiah } from "./components/utils/format";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Import icons (assuming you have them or use text/SVG)
import deleteIcon from './assets/remove.png'; // Existing delete icon
// You might want icons for edit, save, cancel
// import editIcon from './assets/edit.png';
// import saveIcon from './assets/save.png';
// import cancelIcon from './assets/cancel.png';

// --- MOCK formatRupiah if not available ---
// const formatRupiah = (number) => {
//   if (number === null || number === undefined || isNaN(Number(number))) return "Invalid";
//   return new Intl.NumberFormat('id-ID', {
//     style: 'currency',
//     currency: 'IDR',
//     minimumFractionDigits: 0
//   }).format(Number(number));
// };
// --- End Mock ---

const Inventory = () => {
  // Modal state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPriceSell, setNewProductPriceSell] = useState("");
  const [newProductPriceBuy, setNewProductPriceBuy] = useState("");
  const [newProductStock, setNewProductStock] = useState("");

  // Inventory list and search state
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // --- Edit Mode State ---
  // ID of the item currently being edited, null if none
  const [editingItemId, setEditingItemId] = useState(null);
  // Temporary storage for data of the item being edited
  const [editFormData, setEditFormData] = useState({
    name: '',
    price_buy: '',
    price_sell: '',
    stock: ''
  });
  // Store original data to compare on save or revert on cancel
  const [originalEditData, setOriginalEditData] = useState(null);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  // --- Data Fetching ---
  const fetchItems = async () => {
    setIsLoading(true); // Start loading
    try {
      const response = await fetch('http://localhost:5001/api/items');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Format data immediately after fetching
      const formattedData = data.map(item => ({
        ...item,
        // Ensure numeric fields are numbers, handle potential non-numeric values gracefully
        price_buy: !isNaN(parseFloat(item.price_buy)) ? parseFloat(item.price_buy) : 0,
        price_sell: !isNaN(parseFloat(item.price_sell)) ? parseFloat(item.price_sell) : 0,
        stock: !isNaN(parseInt(item.stock, 10)) ? parseInt(item.stock, 10) : 0,
      }));
      setInventory(formattedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Gagal memuat inventaris.', { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false); // Stop loading regardless of outcome
    }
  };

  // --- Add Product Modal Logic ---
  const openAddProductModal = () => {
    // Ensure no row is being edited when opening the add modal
    if (editingItemId) {
        handleCancelEdit();
    }
    setIsAddProductModalOpen(true);
    // Reset form fields
    setNewProductName("");
    setNewProductPriceBuy("");
    setNewProductPriceSell("");
    setNewProductStock("");
  };

  const closeAddProductModal = () => {
    setIsAddProductModalOpen(false);
  };

  const addProduct = async () => {
    // Validation
    if (!newProductName.trim() || !newProductPriceBuy || !newProductPriceSell || !newProductStock) {
        toast.error('Semua field harus diisi.', { position: 'top-right', autoClose: 3000 });
        return;
    }
    const priceBuy = parseFloat(newProductPriceBuy);
    const priceSell = parseFloat(newProductPriceSell);
    const stock = parseInt(newProductStock, 10);

    if (isNaN(priceBuy) || priceBuy < 0 || isNaN(priceSell) || priceSell < 0 || isNaN(stock) || stock < 0) {
         toast.error('Harga dan Stok harus berupa angka positif yang valid.', { position: 'top-right', autoClose: 3000 });
         return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName.trim(),
          price_buy: priceBuy,
          price_sell: priceSell,
          stock: stock,
        }),
      });

      if (!response.ok) {
         // Handle specific errors like duplicate name (409 Conflict)
         if (response.status === 409) {
             const errorData = await response.json();
             throw new Error(errorData.message || 'Item dengan nama ini sudah ada.');
         }
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const newItem = await response.json();
       // Ensure newItem has correct types before adding to state
       const formattedNewItem = {
        ...newItem,
        price_buy: parseFloat(newItem.price_buy),
        price_sell: parseFloat(newItem.price_sell),
        stock: parseInt(newItem.stock, 10)
      };
      // Add to local state
      setInventory(prevInventory => [...prevInventory, formattedNewItem].sort((a, b) => a.name.localeCompare(b.name))); // Keep sorted
      closeAddProductModal();
      toast.success('Produk berhasil ditambahkan!', { position: 'top-right', autoClose: 2000 });
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(`Gagal menambahkan produk: ${error.message}`, { position: 'top-right', autoClose: 3000 });
    } finally {
        setIsLoading(false);
    }
  };

  // --- Delete Product Logic ---
  const deleteProduct = async (id) => {
    // Confirmation dialog
    if (window.confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/items/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          let errorMsg = response.statusText;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (parseError) { /* ignore */ }
          throw new Error(errorMsg);
        }

        // Update the inventory state by removing the deleted item
        setInventory(prevInventory => prevInventory.filter(item => item.id !== id));
        toast.success('Produk berhasil dihapus!', { position: 'top-right', autoClose: 2000 });
        // If the deleted item was being edited, cancel edit mode
        if (editingItemId === id) {
            handleCancelEdit();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(`Gagal menghapus produk: ${error.message}`, { position: 'top-right', autoClose: 3000 });
      } finally {
          setIsLoading(false);
      }
    }
  };

  // --- Edit Mode Handling ---

  // Function to start editing a row
  const handleEditClick = (product) => {
    setEditingItemId(product.id);
    // Populate form data with the current product's values
    const currentData = {
        name: product.name,
        // Convert numbers back to string for input fields if needed, or handle directly
        price_buy: product.price_buy.toString(),
        price_sell: product.price_sell.toString(),
        stock: product.stock.toString()
    };
    setEditFormData(currentData);
    setOriginalEditData(currentData); // Store original for comparison/cancel
  };

  // Function to handle changes in the input fields while editing
  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: value // Update the specific field in editFormData
    }));
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null); // Exit edit mode
    setEditFormData({ name: '', price_buy: '', price_sell: '', stock: '' }); // Clear form data
    setOriginalEditData(null); // Clear original data
  };

  // Function to save the edited row
  const handleSaveEdit = async (id) => {
    // --- Validation ---
    const { name, price_buy, price_sell, stock } = editFormData;
    if (!name.trim()) {
        toast.error('Nama barang tidak boleh kosong.', { position: 'top-right', autoClose: 3000 });
        return;
    }
    const priceBuyNum = parseFloat(price_buy);
    const priceSellNum = parseFloat(price_sell);
    const stockNum = parseInt(stock, 10);

    if (isNaN(priceBuyNum) || priceBuyNum < 0 || isNaN(priceSellNum) || priceSellNum < 0 || isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
        toast.error('Harga dan Stok harus berupa angka positif yang valid.', { position: 'top-right', autoClose: 3000 });
        return;
    }
    // --- End Validation ---

    // --- Prepare Update Data (only send changed fields) ---
    const updateData = {};
    if (name.trim() !== originalEditData.name) updateData.name = name.trim();
    if (priceBuyNum !== parseFloat(originalEditData.price_buy)) updateData.price_buy = priceBuyNum;
    if (priceSellNum !== parseFloat(originalEditData.price_sell)) updateData.price_sell = priceSellNum;
    if (stockNum !== parseInt(originalEditData.stock, 10)) updateData.stock = stockNum;

    // If nothing changed, just exit edit mode
    if (Object.keys(updateData).length === 0) {
        toast.info('Tidak ada perubahan yang disimpan.', { position: 'top-right', autoClose: 1500 });
        handleCancelEdit(); // Exit edit mode
        return;
    }
    // --- End Prepare Update Data ---

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
          let errorMsg = response.statusText;
          try {
              const errorData = await response.json();
              errorMsg = errorData.message || errorMsg; // Use backend message if available
               // Handle specific errors like duplicate name (409 Conflict)
               if (response.status === 409) {
                   throw new Error(errorMsg || 'Item dengan nama ini sudah ada.');
               }
          } catch (parseError) { /* ignore */ }
          throw new Error(errorMsg);
      }

      const updatedItemFromServer = await response.json();

      // Update local state with the data confirmed by the server
      setInventory(prevInventory =>
        prevInventory.map(item =>
          item.id === id
            ? { // Format server response before updating state
                ...item,
                ...updatedItemFromServer,
                price_buy: parseFloat(updatedItemFromServer.price_buy),
                price_sell: parseFloat(updatedItemFromServer.price_sell),
                stock: parseInt(updatedItemFromServer.stock, 10),
              }
            : item
        )
      );

      handleCancelEdit(); // Exit edit mode on success
      toast.success('Produk berhasil diperbarui!', { position: 'top-right', autoClose: 2000 });

    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`Gagal memperbarui produk: ${error.message}`, { position: 'top-right', autoClose: 3000 });
      // Keep the row in edit mode on error so user can fix it or cancel
    } finally {
        setIsLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filteredProducts = inventory.filter(product =>
    product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // --- JSX Rendering ---
  return (
    <div style={styles.container}>
      <h2>Manage Inventory</h2>
      {/* Header: Search and Add Button */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Cari Produk"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading || !!editingItemId} // Disable search while loading or editing
            />
          </div>
          <button
            style={styles.addButton}
            onClick={openAddProductModal}
            disabled={isLoading || !!editingItemId} // Disable add while loading or editing
            >
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <div style={styles.modal}>
          <h3 style={styles.addProductHeading}>Tambah Produk Baru</h3>
          <hr style={styles.lineBreak}></hr>
          {/* Form fields... (same as before) */}
           <div style={styles.formRow}>
             <label style={styles.label}>Nama Barang</label>
             <input type="text" style={styles.input} placeholder="Nama Barang" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
           </div>
           <div style={styles.formRow}>
             <label style={styles.label}>Harga Beli</label>
             <input type="number" style={styles.input} placeholder="Harga Beli" value={newProductPriceBuy} onChange={(e) => setNewProductPriceBuy(e.target.value)} />
           </div>
           <div style={styles.formRow}>
             <label style={styles.label}>Harga Jual</label>
             <input type="number" style={styles.input} placeholder="Harga Jual" value={newProductPriceSell} onChange={(e) => setNewProductPriceSell(e.target.value)} />
           </div>
           <div style={styles.formRow}>
             <label style={styles.label}>Stok</label>
             <input type="number" style={styles.input} placeholder="Stok" value={newProductStock} onChange={(e) => setNewProductStock(e.target.value)} />
           </div>
          <div style={styles.modalButtons}>
            <button style={styles.confirmButton} onClick={addProduct} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button style={styles.cancelButton} onClick={closeAddProductModal} disabled={isLoading}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <hr style={{ marginTop: '20px' }} />
      {isLoading && <p>Memuat data inventaris...</p>}
      {!isLoading && filteredProducts.length === 0 && <p>Produk tidak ditemukan atau inventaris kosong.</p>}
      {!isLoading && filteredProducts.length > 0 && (
        <ul style={styles.productList}>
          {/* Table Header */}
          <li style={{ ...styles.listItem, ...styles.listHeader }}>
            <span style={{ ...styles.headerItem, flex: 1.5 }}>Nama Barang</span>
            <span style={{ ...styles.headerItem, flex: 1, textAlign: "right" }}>Harga Beli</span>
            <span style={{ ...styles.headerItem, flex: 1, textAlign: "right" }}>Harga Jual</span>
            <span style={{ ...styles.headerItem, flex: 0.5, textAlign: "right" }}>Stok</span>
            <span style={{ ...styles.headerItem, flex: 0.7, textAlign: "center" }}>Aksi</span> {/* Increased flex for more buttons */}
          </li>

          {/* Table Rows */}
          {filteredProducts.map((product) => {
            const isEditing = editingItemId === product.id; // Check if this row is the one being edited

            return (
              <li key={product.id} style={{...styles.listItem, ...(isEditing ? styles.editingRow : {})}}>
                {/* Column 1: Item Name */}
                <span style={{ flex: 1.5 }}>
                  <input
                    type="text"
                    name="name" // Name attribute matches editFormData key
                    style={{ ...styles.inlineInput, ...styles.textInput }}
                    value={isEditing ? editFormData.name : product.name}
                    onChange={handleEditFormChange} // Only needed when editing
                    readOnly={!isEditing} // Make read-only if not editing
                    aria-label={`Nama Barang ${product.name}`}
                  />
                </span>

                {/* Column 2: Price Buy */}
                <span style={{ flex: 1, textAlign: "right" }}>
                  <input
                    type="number"
                    name="price_buy" // Name attribute matches editFormData key
                    style={styles.inlineInput}
                    value={isEditing ? editFormData.price_buy : product.price_buy}
                    onChange={handleEditFormChange} // Only needed when editing
                    readOnly={!isEditing} // Make read-only if not editing
                    aria-label={`Harga Beli ${product.name}`}
                  />
                </span>

                {/* Column 3: Price Sell */}
                <span style={{ flex: 1, textAlign: "right" }}>
                  <input
                    type="number"
                    name="price_sell" // Name attribute matches editFormData key
                    style={styles.inlineInput}
                    value={isEditing ? editFormData.price_sell : product.price_sell}
                    onChange={handleEditFormChange} // Only needed when editing
                    readOnly={!isEditing} // Make read-only if not editing
                    aria-label={`Harga Jual ${product.name}`}
                  />
                </span>

                {/* Column 4: Stock */}
                <span style={{ flex: 0.5, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <input
                    type="number"
                    name="stock" // Name attribute matches editFormData key
                    style={{ ...styles.inlineInput, ...styles.stockInput }}
                    value={isEditing ? editFormData.stock : product.stock}
                    onChange={handleEditFormChange} // Only needed when editing
                    readOnly={!isEditing} // Make read-only if not editing
                    aria-label={`Stok ${product.name}`}
                  />
                </span>

                {/* Column 5: Actions */}
                <span style={{ ...styles.actionsCell, flex: 0.7 }}> {/* Adjusted flex */}
                  {isEditing ? (
                    // Show Save, Cancel, Delete buttons when editing this row
                    <>
                      <button
                        onClick={() => handleSaveEdit(product.id)}
                        style={{ ...styles.actionButton, ...styles.saveButton }}
                        disabled={isLoading}
                        title="Simpan Perubahan"
                      >
                        {/* Use icon or text */}
                        {/* <img src={saveIcon} alt="Simpan" style={styles.actionIcon} /> */}
                        Simpan
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{ ...styles.actionButton, ...styles.cancelButtonEdit }}
                        disabled={isLoading}
                        title="Batal Edit"
                      >
                         {/* <img src={cancelIcon} alt="Batal" style={styles.actionIcon} /> */}
                         Batal
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        style={{ ...styles.actionButton, ...styles.deleteButton }}
                        disabled={isLoading}
                        title="Hapus Produk"
                        >
                        <img src={deleteIcon} alt="Hapus" style={styles.actionIcon} />
                      </button>
                    </>
                  ) : (
                    // Show only Edit button when not editing this row
                    <button
                      onClick={() => handleEditClick(product)}
                      style={{ ...styles.actionButton, ...styles.editButton }}
                      disabled={isLoading || !!editingItemId} // Disable if any row is being edited or loading
                      title="Edit Produk"
                    >
                      {/* Use icon or text */}
                       {/* <img src={editIcon} alt="Edit" style={styles.actionIcon} /> */}
                       Edit
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// --- Styles ---
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif", // More common font
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  searchContainer: {
    flexGrow: 1,
    marginRight: "10px",
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    borderRadius: "5px",
  },
  searchInput: {
    padding: "10px 12px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "15px",
    width: "100%",
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease', // Add transition
    '&:focus': {
        borderColor: '#007bff', // Highlight focus
    },
     '&:disabled': { // Style for disabled state
      backgroundColor: '#e9ecef',
      cursor: 'not-allowed',
    }
  },
  addButton: {
    padding: "10px 15px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    whiteSpace: 'nowrap',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
     '&:hover': {
      backgroundColor: '#218838', // Darker green on hover
    },
     '&:disabled': { // Style for disabled state
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
      opacity: 0.7,
    }
  },
  // Add Product Modal Styles (mostly unchanged)
  modal: { /* ... previous modal styles ... */
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    backgroundColor: 'white', padding: '25px', borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)', zIndex: 1000, width: '90%', maxWidth: '500px',
  },
  addProductHeading: { /* ... */ textAlign: 'center', marginTop: '0', marginBottom: '20px', fontSize: '1.4em', color: '#333', },
  lineBreak: { /* ... */ border: 'none', borderTop: '1px solid #eee', margin: '20px 0', },
  formRow: { /* ... */ display: 'flex', alignItems: 'center', marginBottom: '15px', },
  label: { /* ... */ width: '100px', marginRight: '15px', textAlign: 'right', fontSize: '14px', color: '#555', flexShrink: 0, },
  input: { /* ... */ flexGrow: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: '14px', },
  modalButtons: { /* ... */ display: 'flex', justifyContent: 'flex-end', marginTop: '25px', gap: '10px', },
  confirmButton: { /* ... */ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', '&:hover': { backgroundColor: '#218838' }, '&:disabled': { backgroundColor: '#cccccc', cursor: 'not-allowed', opacity: 0.7 } },
  cancelButton: { /* ... */ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', '&:hover': { backgroundColor: '#5a6268' }, '&:disabled': { backgroundColor: '#cccccc', cursor: 'not-allowed', opacity: 0.7 } },

  // Product List Styles
  productList: { listStyle: "none", padding: 0, marginTop: '20px', border: '1px solid #eee', borderRadius: '5px', overflow: 'hidden', },
  listItem: { display: "flex", alignItems: "center", padding: "5px 12px", borderBottom: "1px solid #eee", fontSize: '14px', minHeight: '45px', transition: 'background-color 0.2s ease', }, // Reduced padding/height
  'listItem:last-child': { borderBottom: 'none', },
  listHeader: { fontWeight: 'bold', backgroundColor: '#f8f9fa', color: '#333', padding: "10px 12px", }, // Adjusted padding
  headerItem: { padding: '0 5px', },
  editingRow: { // Style for the row currently being edited
      backgroundColor: '#e7f3ff', // Light blue background
  },
  // Inline Input Styles
  inlineInput: {
      padding: "6px 8px",
      border: "1px solid transparent", // Transparent border initially
      borderRadius: "4px",
      fontSize: "14px",
      textAlign: "right",
      width: "95%", // Adjusted width
      boxSizing: 'border-box',
      transition: 'border-color 0.2s ease, background-color 0.2s ease',
      '&:read-only': { // Styles when NOT editing
          border: "1px solid transparent",
          backgroundColor: 'transparent',
          cursor: 'default',
          color: '#212529', // Standard text color
          outline: 'none', // Remove outline when read-only
          // Prevent selection appearance
           userSelect: 'none', /* Standard syntax */
          '-webkit-user-select': 'none', /* Safari */
          '-moz-user-select': 'none', /* Firefox */
          '-ms-user-select': 'none', /* IE/Edge */
      },
      '&:not(:read-only)': { // Styles when editing
          border: "1px solid #ccc",
          backgroundColor: 'white', // White background when editable
           '&:focus': {
             borderColor: '#80bdff',
             outline: '0',
             boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
           }
      },
       // Style number inputs to hide spinners (optional)
      '&[type=number]': {
          '-moz-appearance': 'textfield',
      },
      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
          '-webkit-appearance': 'none',
          margin: 0,
      },
  },
  textInput: {
      textAlign: "left",
      width: '98%', // Slightly wider for names
       '&:read-only': {
           fontWeight: '500', // Make read-only name slightly bolder
       }
  },
  stockInput: {
    width: "80px", // Adjusted width
  },
  // Action Buttons Styles
  actionsCell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center', // Center buttons horizontally
      gap: '5px', // Space between buttons
  },
  actionButton: {
      backgroundColor: 'transparent',
      border: '1px solid transparent', // Keep layout consistent
      padding: '4px 6px', // Smaller padding
      cursor: 'pointer',
      borderRadius: '4px',
      display: 'inline-flex', // Align icon/text if using both
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px', // Smaller font size
      lineHeight: 1.2,
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
      whiteSpace: 'nowrap', // Prevent text wrapping
      '&:disabled': {
          cursor: 'not-allowed',
          opacity: 0.5,
      }
  },
  editButton: {
     color: '#007bff', // Blue
     borderColor: '#007bff',
      '&:hover:not(:disabled)': {
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
      }
  },
  saveButton: {
      color: '#28a745', // Green
      borderColor: '#28a745',
       '&:hover:not(:disabled)': {
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
      }
  },
  cancelButtonEdit: { // Renamed to avoid conflict with modal cancel button style name
     color: '#6c757d', // Grey
     borderColor: '#6c757d',
      '&:hover:not(:disabled)': {
          backgroundColor: 'rgba(108, 117, 125, 0.1)',
      }
  },
  deleteButton: {
    color: '#dc3545', // Red
    padding: '4px', // Minimal padding for icon button
    // borderColor: '#dc3545', // Optional border
     '&:hover:not(:disabled)': {
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
      }
  },
  actionIcon: { // Style for icons within buttons
    width: '14px',
    height: '14px',
    // marginRight: '4px', // Add space if using text next to icon
  },
};

export default Inventory;
