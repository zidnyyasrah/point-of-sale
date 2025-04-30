// src/components/Receipt.js
import React from 'react';
import { formatRupiah } from './utils/format';

const Receipt = ({ receiptData, onClose }) => {
  const styles = {
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
      zIndex: 1001,
      minWidth: '300px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '15px',
    },
    item: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '5px',
    },
    total: {
      marginTop: '15px',
      paddingTop: '10px',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      fontWeight: 'bold',
    },
    date: {
      marginTop: '10px',
      textAlign: 'right',
      color: 'grey',
      fontSize: '0.9em',
    },
    closeButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '20px',
      width: '100%',
    },
  };

  if (!receiptData) {
    return null;
  }
// Calculate the total price of the items in the cart
// const total = cartItems.reduce(
//   (sum, item) => sum + (item.price_sell ? item.price_sell * item.quantity : 0), // Use 0 if price is undefined
//   0
// );
  return (
    <div style={styles.modal}>
      <h3 style={styles.header}>Struk Pembelian</h3>
      {receiptData.items.map((item, index) => (
        <div key={index} style={styles.item}>
          <span>{item.name} ({item.quantity} x {formatRupiah(item.price_sell)})</span>
          <span>{formatRupiah(item.price_sell * item.quantity)}</span>
        </div>
      ))}
      <div style={styles.total}>
        <span>Total</span>
        <span>{formatRupiah(receiptData.total)}</span>
      </div>
      <p style={styles.date}>{receiptData.date}</p>
      <button onClick={onClose} style={styles.closeButton}>
        Tutup Struk
      </button>
    </div>
  );
};

export default Receipt;