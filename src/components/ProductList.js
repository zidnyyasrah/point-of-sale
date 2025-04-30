// src/components/ProductList.js
import React from "react";
import { formatRupiah } from "./utils/format";

const ProductList = ({ products, search, addToCart }) => {
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2>Daftar Produk</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                width: "120px",
                textAlign: "center",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: "#f9f9f9",
              }}
              onClick={() => addToCart(product)}
            >
              <h4>{product.name}</h4>
              <p>{formatRupiah(product.price_sell)}</p>
            </div>
          ))
        ) : (
          <p>Produk tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
};

export default ProductList;
