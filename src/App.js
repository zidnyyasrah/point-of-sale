// src/App.js
import React, { useState } from "react";
import POS from "./POS";
import Inventory from "./Inventory";
import Settings from "./Settings";
import Accounts from "./Accounts";
import Tabs from "./components/Tabs";
import TransactionHistory from "./TransactionHistory";
import Analytics from "./Analytics";





function App() {
  const [selectedTab, setSelectedTab] = useState("pos");

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
  };



  return (
    <div style={{ padding: "20px" }}>
      {/* Tabs Component */}
      <Tabs selectedTab={selectedTab} setSelectedTab={handleTabChange} />

      {/* Conditional Rendering Based on Selected Tab */}
      {selectedTab === "pos" && <POS />}
      {selectedTab === "inventory" && <Inventory />}
      {selectedTab === "settings" && <Settings />}
      {selectedTab === "transactionHistory" && <TransactionHistory />}
      {selectedTab === "accounts" && <Accounts />}
      {selectedTab === "analytics" && <Analytics />}
    </div>

    
  );
}


export default App;
