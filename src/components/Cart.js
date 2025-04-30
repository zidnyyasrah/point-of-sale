// src/components/Cart.js
import React from "react";
import { formatRupiah } from "./utils/format";

const Cart = ({ cart, removeFromCart, total, checkout }) => {
  return (
    <div>
      <h2>Keranjang</h2>
      {cart.length === 0 ? (
        <p>Keranjang masih kosong.</p>
      ) : (
        <>
          <table border="1" cellPadding="10" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Subtotal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatRupiah(item.price_sell)}</td>
                  <td>{formatRupiah(item.price_sell * item.quantity)}</td>
                  <td>
                    <button onClick={() => removeFromCart(item.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <h3>Total: {formatRupiah(total)}</h3>
            <button onClick={checkout}>Checkout</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
