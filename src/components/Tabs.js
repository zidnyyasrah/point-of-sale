import React from "react";
import settingsIcon from "../assets/settings.png";
import userIcon from "../assets/user.png";

const Tabs = ({ selectedTab, setSelectedTab }) => {
  return (
    <div style={styles.tabContainer}>
      {/* Left group of tabs */}
      <div>
        <button
          onClick={() => setSelectedTab("pos")}
          style={getTabStyle(selectedTab === "pos")}
        >Point of Sale
        </button>

        <button
          onClick={() => setSelectedTab("transactionHistory")}
          style={getTabStyle(selectedTab === "transactionHistory")}
        >Transaction History
        </button>

        <button
          onClick={() => setSelectedTab("inventory")}
          style={getTabStyle(selectedTab === "inventory")}
        >Inventory
        </button>

        <button
          onClick={() => setSelectedTab("analytics")}
          style={getTabStyle(selectedTab === "analytics")}
        >Analytics
        </button>

        

      </div>

      {/* Right group of tabs */}
      <div>
        <button
          onClick={() => setSelectedTab("accounts")}
          style={getTabStyleIcon(selectedTab === "accounts")}
        >
        <img src={userIcon} alt="User" style={styles.userIcon} />
        </button>

        <button
          onClick={() => setSelectedTab("settings")}
          style={getTabStyleIcon(selectedTab === "settings")}
        >
        <img src={settingsIcon} alt="User" style={styles.settingsIcon} />
        </button>

      </div>
      
    </div>
    
  );
};

const styles = {
  tabContainer: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
  },
  settingsIcon: {
    width: '25px', // Adjust the width as needed
    height: '25px', // Adjust the height as needed
  },
  userIcon: {
    width: '25px', // Adjust the width as needed
    height: '25px', // Adjust the height as needed
  },
  tabButton: {
    padding: "10px 20px",
    marginRight: "10px",
    cursor: "pointer",
    border: "none",
    borderRadius: "5px",
  },
  tabButtonIcon: {
    padding: "5px 5px",
    marginRight: "10px",
    cursor: "pointer",
    border: "none",
    borderRadius: "5px",
  },
};

const getTabStyle = (isSelected) => ({
  ...styles.tabButton,
  backgroundColor: isSelected ? "#28a745" : "#ccc",
  color: isSelected ? "white" : "black",
});

const getTabStyleIcon = (isSelected) => ({
  ...styles.tabButtonIcon,
  backgroundColor: 'transparent',
  color: isSelected ? "white" : "black",
});

export default Tabs;