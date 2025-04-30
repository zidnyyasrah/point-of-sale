// src/components/SearchBar.js
import React from "react";

const SearchBar = ({ search, setSearch }) => {
  return (
    <input
      type="text"
      placeholder="Cari produk..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{
        width: "100%",
        padding: "10px",
        marginBottom: "20px",
        borderRadius: "5px",
        border: "1px solid #ccc",
      }}
    />
  );
};

export default SearchBar;
