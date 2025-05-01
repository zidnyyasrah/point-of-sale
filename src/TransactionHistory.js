import React, { useState, useEffect } from "react";
import Receipt from "./components/Receipt"; // Reusing your Receipt component
import { formatRupiah } from './components/utils/format';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/transactions'); // Replace with your actual API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Parse the date string into a Date object and format it
      const processedTransactions = data.map(transaction => {
        let transactionDate;
        if (transaction.timestamp) { // Changed from transaction.date to transaction.timestamp
          try {
            transactionDate = new Date(transaction.timestamp); // Changed from transaction.date to transaction.timestamp
            if (isNaN(transactionDate.getTime())) {
              console.error("Invalid date:", transaction.timestamp, "for transaction:", transaction); // Changed from transaction.date to transaction.timestamp
              transactionDate = null; // Or set a default date
            }
          } catch (e) {
            console.error("Error parsing date:", transaction.timestamp, e, "for transaction:", transaction);  // Changed from transaction.date to transaction.timestamp
            transactionDate = null; // Or set a default date
          }
        } else {
          console.warn("Date is missing for transaction:", transaction);
          transactionDate = null;
        }

        return {
          ...transaction,
          date: transactionDate, // Store the Date object
        };
      });
      setTransactions(processedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  
  const viewReceipt = async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5001/api/receipts/${transactionId}`); // Replace with your actual API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSelectedReceipt(data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const closeReceipt = () => {
    setSelectedReceipt(null);
  };

  if (loading) {
    return <div>Loading transaction history...</div>;
  }

  if (error) {
    return <div>Error loading transaction history: {error}</div>;
  }

  return (
    <div style={styles.container}>
      <h2>Riwayat Transaksi</h2>
      {transactions.length > 0 ? (
        <ul style={styles.transactionList}>
          <li style={{ ...styles.listItem, fontWeight: 'bold' }}>
            <span>Tanggal</span>
            <span>Waktu</span>
            <span>Total</span>
            <span>Aksi</span>
          </li>
          {transactions.map(transaction => {
            //handle null dates
            const formattedDate = transaction.date ? transaction.date.toLocaleDateString('id-ID') : "Invalid Date";
            const formattedTime = transaction.date ? transaction.date.toLocaleTimeString('id-ID') : "Invalid Time";
            return (
              <li key={transaction.id} style={styles.listItem}>
                {/* Format the date using toLocaleDateString */}
                <span>{formattedDate}</span>
                {/* Format the time using toLocaleTimeString */}
                <span>{formattedTime}</span>
                <span>
                {formatRupiah(transaction.total)}
                </span>
                <span>
                  <button style={styles.viewReceiptButton} onClick={() => viewReceipt(transaction.id)}>
                    Lihat Resi
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
        
      ) : (
        <p>Tidak ada riwayat transaksi.</p>
      )}
      

      <h2>Pendapatan Harian</h2>
<span>Total Pendapatan Harian :{' '}
  {formatRupiah(transactions.reduce((accumulator, currentValue) => {
    // Make sure currentValue.total is treated as a number
    const totalAsNumber = Number(currentValue.total);
    return accumulator + (isNaN(totalAsNumber) ? 0 : totalAsNumber);
  }, 0))}
</span>

      {selectedReceipt && (
        <div style={styles.modal}>
          <Receipt receiptData={selectedReceipt} onClose={closeReceipt} />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  transactionList: {
    listStyle: "none",
    padding: 0,
  },
  listItem: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 0.5fr",
    gap: "1px",
    padding: "5px",
    borderBottom: "1px solid #eee",
    alignItems: "left",
  },
  viewReceiptButton: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Add transparency
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    width: '95vw',
    height: '95vh',
    maxWidth: 'none',
    maxHeight: 'none',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default TransactionHistory;
