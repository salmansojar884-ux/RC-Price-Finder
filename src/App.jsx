import React, { useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");

  const API_BASE_URL = "https://rc-price-backend.onrender.com";

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError("Unable to connect to backend or backend timed out.");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results
    .filter((item) => (hideOutOfStock ? item.inStock !== false : true))
    .sort((a, b) => {
      if (a.price === null || a.price === undefined) return 1;
      if (b.price === null || b.price === undefined) return -1;
      return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
    });

  return (
    <div className="container">
      <header className="header">
        <h1>RC Component Price Finder & Build Calculator</h1>
        <p>Compare prices across Indian hobby shops instantly</p>
      </header>

      <div className="search-box-container">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components (e.g. Skywalker, ESC, Motor)..."
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      <div className="meta-bar">
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(e) => setHideOutOfStock(e.target.checked)}
          />{" "}
          Hide Out-of-Stock
        </label>
        <select
          className="sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {error && (
        <p style={{ color: "#ef4444", textAlign: "center", fontWeight: "600" }}>
          {error}
        </p>
      )}

      <div className="results-grid">
        {filteredResults.map((item, index) => {
          const displayTitle = item.title || item.name || "Unnamed Product";
          return (
            <div className="card" key={index}>
              <div>
                <span className="store-badge">{item.store || "Store"}</span>
                <h3 className="product-title">{displayTitle}</h3>
              </div>
              <div>
                <div className="price-section">
                  <span className="price-amount">
                    {item.price ? `₹${item.price}` : "N/A"}
                  </span>
                  <span className="currency">INR</span>
                  {item.inStock === false && (
                    <span style={{ color: "#ef4444", fontSize: "0.8rem", marginLeft: "auto" }}>
                      Out of Stock
                    </span>
                  )}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buy-link"
                >
                  View Product
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && results.length === 0 && query && !error && (
        <p style={{ textAlign: "center", color: "#64748b", marginTop: "40px" }}>
          No matching products found.
        </p>
      )}
    </div>
  );
}

export default App;