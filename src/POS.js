import React, { useState, useRef, useEffect } from "react";
import { formatRupiah } from "./components/utils/format"; // Utility for formatting currency
import { toast } from 'react-toastify'; // For showing notifications
import 'react-toastify/dist/ReactToastify.css'; // Styles for toast notifications
import Receipt from './components/Receipt'; // Component to display the receipt

const POS = () => {
  const [searchQuery, setSearchQuery] = useState(""); // State for the search input
  const [cartItems, setCartItems] = useState([]); // State for items in the shopping cart
  const [filteredProducts, setFilteredProducts] = useState([]); // State for products filtered by search
  const [showCheckout, setShowCheckout] = useState(false); // State to control visibility of the checkout confirmation
  const searchInputRef = useRef(null); // Ref for the search input element
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1); // State to track the selected product in the search results
  const [showReceipt, setShowReceipt] = useState(false); // State to control visibility of the receipt
  const [receiptData, setReceiptData] = useState(null); // State to store data for the receipt
  const [allProducts, setAllProducts] = useState([]); // State to hold all products from the backend
  const [isSearchFocused, setIsSearchFocused] = useState(false); // State to track if the search input is focused

  // Fetch products from the backend when the component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

  // Function to fetch products from the backend API
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/items'); // Adjust URL if needed
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // Handle HTTP errors
      }
      const data = await response.json(); // Parse the JSON response
      setAllProducts(data); // Store all products in state
      setFilteredProducts([]); // Initially, do not show any products in the filtered list
    } catch (error) {
      console.error('Error fetching products:', error); // Log the error
      toast.error('Gagal memuat produk.', { position: 'top-right', autoClose: 3000 }); // Show error notification
    }
  };

  // Function to handle changes in the search input
  const handleSearch = (e) => {
    const query = e.target.value; // Get the current value of the input
    setSearchQuery(query); // Update the search query state

    // Filter products based on the search query
    if (query) {
      const filtered = allProducts.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase()) // Case-insensitive search
      );
      setFilteredProducts(filtered); // Update the filtered products state
      setSelectedProductIndex(filtered.length > 0 ? 0 : -1); // Select the first product if there are results
    } else {
      setFilteredProducts([]); // Clear the filtered products if the query is empty
      setSelectedProductIndex(-1); // Reset the selected product index
    }
  };

  // Function to handle focus event on search input
  const handleSearchFocus = () => {
    setIsSearchFocused(true); // Set search focus to true
    // If there's a search query, filter the products
    if (searchQuery && allProducts.length > 0) {
      const filtered = allProducts.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      setSelectedProductIndex(filtered.length > 0 ? 0 : -1);
    }
  };

  // Function to handle blur event on search input
  const handleSearchBlur = () => {
    // Optionally keep the list if there's a query, or hide if empty
    if (!searchQuery) {
      setIsSearchFocused(false); // Set search focus to false
      setFilteredProducts([]); // Clear the filtered products
      setSelectedProductIndex(-1); // Reset selected product index
    }
  };

  // Function to add a product to the shopping cart
  const addItemToCart = (product) => {
    const existingItem = cartItems.find((item) => item.id === product.id); // Check if the product is already in the cart

    // If the product is already in the cart, increase its quantity
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item // Update quantity
        )
      );
    } else {
      // If the product is not in the cart, add it with a quantity of 1
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }

    // Reset search-related state
    setSearchQuery("");
    setFilteredProducts([]);
    setSelectedProductIndex(-1);
    setIsSearchFocused(false); // Hide recommendations after adding

    // Refocus on the search input for the next item
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Function to update the quantity of an item in the cart
  const updateItemQuantity = (itemId, quantity) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId && quantity >= 0 ? { ...item, quantity: parseInt(quantity, 10) } : item // Update quantity, ensure non-negative
      )
    );
  };

  // Function to remove an item from the cart
  const removeItemFromCart = (itemId) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId)); // Filter out the item to remove
  };

  // Calculate the total price of the items in the cart
  const total = cartItems.reduce(
    (sum, item) => sum + (item.price_sell ? item.price_sell * item.quantity : 0), // Use 0 if price is undefined
    0
  );

  // Function to handle the checkout process
  const handleCheckout = () => {
    if (cartItems.length > 0) {
      setShowCheckout(true); // Show the checkout confirmation
    } else {
      toast.warn("Keranjang belanja kosong!", { position: "top-right", autoClose: 2000 }); // Show warning if the cart is empty
    }
  };

  // Function to confirm the checkout and process the transaction
  const confirmCheckout = async () => {
    if (cartItems.length > 0) {
      // Prepare data for updating stock and transaction
      const updatedItems = cartItems.map(cartItem => ({
        id: cartItem.id,
        stock: allProducts.find(p => p.id === cartItem.id).stock - cartItem.quantity, // Calculate new stock
        name: cartItem.name, // Include name for receipt
        price_sell: cartItem.price_sell, // Include price for receipt
        quantity: cartItem.quantity, // Include quantity for receipt
      }));

      try {
        // Update stock in the database for each item in the cart
        await Promise.all(
          updatedItems.map(item =>
            fetch(`http://localhost:5001/api/items/${item.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ stock: Math.max(0, item.stock) }), // Ensure stock doesn't go negative
            })
          )
        );

        // Prepare transaction data to send to the backend
        const transactionData = {
          total: total,
          items: cartItems.map(item => ({ // Simplify item structure for backend
            name: item.name,
            quantity: item.quantity,
            price_sell: item.price_sell,
          })),
        };

        // Send transaction data to the backend to save the transaction
        const transactionResponse = await fetch('http://localhost:5001/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });

        if (!transactionResponse.ok) {
          // Handle non-200 responses with text() first.  Crucial for error handling!
          const errorText = await transactionResponse.text();
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(`Failed to save transaction: ${transactionResponse.status} - ${errorJson.message || errorText}`);
          } catch (parseError) {
            // If the errorText is not JSON, just use the raw text.
            throw new Error(`Failed to save transaction: ${transactionResponse.status} - ${errorText}`);
          }
        }

        const transactionResult = await transactionResponse.json(); // Get the transaction data
        console.log("Transaction result:", transactionResult);

        // Fetch the receipt data from the backend
        const receiptResponse = await fetch(`http://localhost:5001/api/receipts/${transactionResult.id}`);
        if (!receiptResponse.ok) {
          const errorText = await receiptResponse.text();
          throw new Error(`Failed to fetch receipt: ${receiptResponse.status} - ${errorText}`);
        }
        const text = await receiptResponse.text(); // Get response as text
        let receiptData;
        try {
          receiptData = JSON.parse(text); // Try to parse as JSON
        } catch (e) {
          // If parsing fails, treat it as an error
          console.error("Error parsing receipt data:", e);
          throw new Error(`Invalid receipt data received: ${text}`);
        }
        console.log("Receipt data from backend:", receiptData);

        // Reset cart and UI state
        setCartItems([]);
        setShowCheckout(false);
        setShowReceipt(true); // Show the receipt
        setReceiptData(receiptData); // Store receipt data
        toast.success("Transaksi selesai!", { position: "top-right", autoClose: 2000 }); // Show success message
        fetchProducts(); // Refresh product list after checkout
        if (searchInputRef.current) {
          searchInputRef.current.focus(); // Refocus on search input
        }
      } catch (error) {
        console.error('Error processing transaction:', error);
        toast.error(`Gagal memproses transaksi: ${error.message}`, { position: "top-right", autoClose: 2000 }); // Show the error message
        setCartItems([]); //clear cart
        setShowCheckout(false); //hide checkout
      }
    } else {
      toast.warn("Keranjang belanja kosong!", { position: "top-right", autoClose: 2000 }); // Warn if cart is empty
    }
  };

  // Function to cancel the checkout process
  const cancelCheckout = () => {
    setShowCheckout(false); // Hide the checkout confirmation
    if (searchInputRef.current) {
      searchInputRef.current.focus(); // Refocus on the search input
    }
  };

  // Function to close the receipt view
  const closeReceipt = () => {
    setShowReceipt(false); // Hide the receipt
    setReceiptData(null); // Clear receipt data
    if (searchInputRef.current) {
      searchInputRef.current.focus(); // Refocus on search input
    }
  };

  // Function to handle keyboard input (Enter, ArrowDown, ArrowUp)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredProducts.length > 0 && selectedProductIndex >= 0) {
      addItemToCart(filteredProducts[selectedProductIndex]); // Add selected product to cart on Enter
    } else if (e.key === "ArrowDown") {
      setSelectedProductIndex((prevIndex) =>
        prevIndex < filteredProducts.length - 1 ? prevIndex + 1 : filteredProducts.length - 1 // Navigate down
      );
    } else if (e.key === "ArrowUp") {
      setSelectedProductIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : -1)); // Navigate up
    }
  };

  // Effect to focus on the search input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Basic Inline Styles (You'd likely use CSS Modules or Styled Components)
  const styles = {
    container: {
      fontFamily: "Arial, sans-serif",
      padding: "20px",
      backgroundColor: "#f4f4f4",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    topTotal: {
      backgroundColor: "#e0e0e0",
      padding: "15px",
      borderRadius: "8px",
      textAlign: "right",
    },
    totalAmount: {
      margin: 0,
      fontSize: "2em",
      color: "green",
    },
    mainContent: {
      display: "flex",
      gap: "20px",
    },
    itemArea: {
      flex: 2,
      backgroundColor: "white",
      padding: "15px",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    searchInput: {
      width: "100%",
      padding: "10px",
      marginBottom: "15px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      fontSize: "16px",
    },
    productList: {
      border: "1px solid #ddd",
      borderRadius: "4px",
      marginBottom: "15px",
      padding: "10px",
    },
    productItem: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid #eee",
      cursor: "pointer",
    },
    cartTable: {
      marginTop: "15px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      overflow: "hidden",
    },
    tableHeader: {
      backgroundColor: "#f0f0f0",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 0.5fr 1fr 0.5fr",
      padding: "10px",
      textAlign: "left",
      fontWeight: "bold",
    },
    tableRow: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 0.5fr 1fr 0.5fr",
      padding: "10px",
      borderBottom: "1px solid #eee",
      alignItems: "center",
    },
    quantityInput: {
      width: "50px",
      padding: "5px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      textAlign: "center",
    },
    removeButton: {
      backgroundColor: "#ff6347",
      color: "white",
      border: "none",
      padding: "8px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
    },
    rightArea: {
      flex: 1,
      backgroundColor: "white",
      padding: "15px",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    },
    checkoutButton: {
      backgroundColor: "green",
      color: "white",
      border: "none",
      padding: "15px 30px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "18px",
    },
    checkoutModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
      zIndex: 1000,
    },
    checkoutActions: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: "20px",
    },
    confirmButton: {
      backgroundColor: "green",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "4px",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#ccc",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "4px",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Display the total amount of the items in the cart */}
      <div style={styles.topTotal}>
        <h2 style={styles.totalAmount}>{formatRupiah(total)}</h2>
      </div>

      <div style={styles.mainContent}>
        {/* Left section: Product search and cart display */}
        <div style={styles.itemArea}>
          {/* Search input for finding products */}
          <input
            ref={searchInputRef}
            type="text"
            style={styles.searchInput}
            placeholder="Cari Produk..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleKeyDown}
          />

          {/* Display product recommendations based on the search query */}
          {isSearchFocused && filteredProducts.length > 0 && (
            <div style={styles.productList}>
              <h3>Pilih Produk</h3>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    ...styles.productItem,
                    backgroundColor: index === selectedProductIndex ? "#e0f7fa" : "transparent", // Highlight selected
                    cursor: "pointer",
                  }}
                  onClick={() => addItemToCart(product)} // Add to cart on click
                >
                  <span>{product.name}</span>
                  <span>{formatRupiah(product.price_sell)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Display the items in the shopping cart */}
          {cartItems.length > 0 && (
            <div style={styles.cartTable}>
              <h3>Keranjang Belanja</h3>
              <div style={styles.tableHeader}>
                <span>Item</span>
                <span>Harga</span>
                <span>Qty</span>
                <span>Total</span>
                <span>Aksi</span>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} style={styles.tableRow}>
                  <span>{item.name}</span>
                  <span>{formatRupiah(item.price_sell)}</span>
                  <span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                      style={styles.quantityInput}
                    />
                  </span>
                  <span>{formatRupiah(item.price_sell * item.quantity)}</span>
                  <span>
                    <button onClick={() => removeItemFromCart(item.id)} style={styles.removeButton}>
                      Hapus
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Message when the cart is empty and no search is active */}
          {cartItems.length === 0 && !isSearchFocused && !searchQuery && (
            <p>Mulai cari produk untuk ditambahkan ke keranjang.</p>
          )}
        </div>

        {/* Right section: Checkout button */}
        <div style={styles.rightArea}>
          <button onClick={handleCheckout} style={styles.checkoutButton}>
            Checkout
          </button>
        </div>
      </div>

      {/* Checkout confirmation modal */}
      {showCheckout && (
        <div style={styles.checkoutModal}>
          <h3>Konfirmasi Checkout</h3>
          <p>Apakah Anda yakin ingin menyelesaikan transaksi ini?</p>
          <div style={styles.checkoutActions}>
            <button onClick={confirmCheckout} style={styles.confirmButton}>
              Ya, Selesaikan
            </button>
            <button onClick={cancelCheckout} style={styles.cancelButton}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Receipt component to display after successful checkout */}
      {showReceipt && receiptData && (
        <Receipt receiptData={receiptData} onClose={closeReceipt} />
      )}

      {/* Optional: Toast container for notifications */}
      {/* <ToastContainer /> */}
    </div>
  );
};

export default POS;
