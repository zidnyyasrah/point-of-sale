// src/components/Tabs.js
import React from "react";

const Tabs = ({ selectedTab, setSelectedTab }) => {
  return (
    <div style={{ marginBottom: "20px" }}>
      <button
        onClick={() => setSelectedTab("pos")}
        style={{
          padding: "10px 20px",
          marginRight: "10px",
          cursor: "pointer",
          backgroundColor: selectedTab === "pos" ? "#28a745" : "#ccc",
          color: selectedTab === "pos" ? "white" : "black",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Point of Sale
      </button>
      <button
        onClick={() => setSelectedTab("inventory")}
        style={{
          padding: "10px 20px",
          marginRight: "10px",
          cursor: "pointer",
          backgroundColor: selectedTab === "inventory" ? "#28a745" : "#ccc",
          color: selectedTab === "inventory" ? "white" : "black",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Inventory
      </button>

      <button
        onClick={() => setSelectedTab("settings")}
        style={{
          padding: "10px 20px",
          marginRight: "10px",
          cursor: "pointer",
          backgroundColor: selectedTab === "settings" ? "#28a745" : "#ccc",
          color: selectedTab === "settings" ? "white" : "black",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Settings
      </button>

      <button
        onClick={() => setSelectedTab("transactionHistory")}
        style={{
          padding: "10px 20px",
          marginRight: "10px",
          cursor: "pointer",
          backgroundColor: selectedTab === "transactionHistory" ? "#28a745" : "#ccc",
          color: selectedTab === "transactionHistory" ? "white" : "black",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Transaction History
      </button>

      <button
        onClick={() => setSelectedTab("accounts")}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: selectedTab === "accounts" ? "#28a745" : "#ccc",
          color: selectedTab === "accounts" ? "white" : "black",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Accounts
      </button>
    </div>
  );
};

export default Tabs;
