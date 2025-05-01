import React, { useEffect, useState } from 'react'
import Receipt from './components/Receipt' // Reusing your Receipt component
import { formatRupiah } from './components/utils/format'
import './styles/DatePickerStyles.css'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [endDate, setEndDate] = useState(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5001/api/transactions') // Replace with your actual API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      // Parse the date string into a Date object and format it
      const processedTransactions = data.map(transaction => {
        let transactionDate
        if (transaction.timestamp) {
          // Changed from transaction.date to transaction.timestamp
          try {
            transactionDate = new Date(transaction.timestamp) // Changed from transaction.date to transaction.timestamp
            if (isNaN(transactionDate.getTime())) {
              console.error(
                'Invalid date:',
                transaction.timestamp,
                'for transaction:',
                transaction
              ) // Changed from transaction.date to transaction.timestamp
              transactionDate = null // Or set a default date
            }
          } catch (e) {
            console.error(
              'Error parsing date:',
              transaction.timestamp,
              e,
              'for transaction:',
              transaction
            ) // Changed from transaction.date to transaction.timestamp
            transactionDate = null // Or set a default date
          }
        } else {
          console.warn('Date is missing for transaction:', transaction)
          transactionDate = null
        }

        return {
          ...transaction,
          date: transactionDate // Store the Date object
        }
      })
      setTransactions(processedTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (!transaction.date) return false
    const transactionDate = new Date(transaction.date)

    if (selectedDate && !endDate) {
      // Filter by single date
      const selectedDateOnly = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
      const transactionDateOnly = new Date(
        transactionDate.getFullYear(),
        transactionDate.getMonth(),
        transactionDate.getDate()
      )

      return transactionDateOnly.getTime() === selectedDateOnly.getTime()
    } else if (selectedDate && endDate) {
      // Filter by date range
      const startDateOnly = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
      const endDateOnly = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      )
      const transactionDateOnly = new Date(
        transactionDate.getFullYear(),
        transactionDate.getMonth(),
        transactionDate.getDate()
      )

      return (
        transactionDateOnly.getTime() >= startDateOnly.getTime() &&
        transactionDateOnly.getTime() <= endDateOnly.getTime()
      )
    } else {
      // No date filter selected, show all transactions
      return true
    }
  })

  const handleLast1Days = () => {
    const today = new Date()
    const oneDaysAgo = new Date()
    oneDaysAgo.setDate(today.getDate())
    setSelectedDate(oneDaysAgo)
    setEndDate(today)
  }
  const handleLast7Days = () => {
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)
    setSelectedDate(sevenDaysAgo)
    setEndDate(today)
  }

  const handleLast30Days = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    setSelectedDate(thirtyDaysAgo)
    setEndDate(today)
  }

  const handleLastYear = () => {
    const today = new Date()
    const lastYear = new Date()
    lastYear.setFullYear(today.getFullYear() - 1)
    setSelectedDate(lastYear)
    setEndDate(today)
  }

  const viewReceipt = async transactionId => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `http://localhost:5001/api/receipts/${transactionId}`
      ) // Replace with your actual API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setSelectedReceipt(data)
    } catch (error) {
      console.error('Error fetching receipt:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const closeReceipt = () => {
    setSelectedReceipt(null)
  }

  if (loading) {
    return <div>Loading transaction history...</div>
  }

  if (error) {
    return <div>Error loading transaction history: {error}</div>
  }

  return (
    <div style={styles.container}>
      <h2>Riwayat Transaksi</h2>

      <div style={styles.buttonGroup}>
        <button onClick={handleLast1Days} style={styles.filterButton}>
          Hari Ini
        </button>
        <button onClick={handleLast7Days} style={styles.filterButton}>
          1 Minggu Terakhir
        </button>
        <button onClick={handleLast30Days} style={styles.filterButton}>
          30 Hari Terakhir
        </button>
        <button onClick={handleLastYear} style={styles.filterButton}>
          1 Tahun Terakhir
        </button>
      </div>

      <div style={styles.filterContainer}>
        <label htmlFor='dateRangePicker' style={styles.label}>
          Filter berdasarkan tanggal:
        </label>
        <DatePicker
          id='dateRangePicker'
          selected={selectedDate}
          onChange={dates => {
            const [start, end] = dates
            setSelectedDate(start)
            setEndDate(end)
          }}
          startDate={selectedDate}
          endDate={endDate}
          selectsRange
          dateFormat='dd/MM/yyyy'
          placeholderText='Pilih tanggal atau rentang'
        />
      </div>

      {filteredTransactions.length > 0 ? (
        <ul style={styles.transactionList}>
          <li style={{ ...styles.listItem, fontWeight: 'bold' }}>
            <span>Tanggal</span>
            <span>Waktu</span>
            <span>Total</span>
            <span>Aksi</span>
          </li>
          {filteredTransactions.map(transaction => {
            //handle null dates
            const formattedDate = transaction.date
              ? transaction.date.toLocaleDateString('id-ID')
              : 'Invalid Date'
            const formattedTime = transaction.date
              ? transaction.date.toLocaleTimeString('id-ID')
              : 'Invalid Time'
            return (
              <li key={transaction.id} style={styles.listItem}>
                {/* Format the date using toLocaleDateString */}
                <span>{formattedDate}</span>
                {/* Format the time using toLocaleTimeString */}
                <span>{formattedTime}</span>
                <span>{formatRupiah(transaction.total)}</span>
                <span>
                  <button
                    style={styles.viewReceiptButton}
                    onClick={() => viewReceipt(transaction.id)}
                  >
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
      <span>
        Total Pendapatan Harian :{' '}
        {formatRupiah(
          filteredTransactions.reduce((accumulator, currentValue) => {
            // Make sure currentValue.total is treated as a number
            const totalAsNumber = Number(currentValue.total)
            return accumulator + (isNaN(totalAsNumber) ? 0 : totalAsNumber)
          }, 0)
        )}
      </span>

      {selectedReceipt && (
        <div style={styles.modal}>
          <Receipt receiptData={selectedReceipt} onClose={closeReceipt} />
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  transactionList: {
    listStyle: 'none',
    padding: 0
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    gap: '15px' /* Add some space between the date pickers */
  },
  listItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 0.5fr',
    gap: '1px',
    padding: '5px',
    borderBottom: '1px solid #eee',
    alignItems: 'left'
  },
  viewReceiptButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  },

  buttonGroup: {
    marginBottom: '10px',
    display: 'flex',
    gap: '10px'
  },
  filterButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
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
    justifyContent: 'center'
  }
}

export default TransactionHistory
