import React, { useState } from "react";

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
      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
      } else {
        setError(data.error || "Failed to fetch results from backend.");
      }
    } catch (err) {
      setError("Unable to connect to backend service.");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results
    .filter((item) => (hideOutOfStock ? item.inStock !== false : true))
    .sort((a, b) => {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
    });

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        RC Component Price Finder & Build Calculator
      </h1>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components (e.g. Skywalker, ESC, Motor)..."
          style={{ flex: 1, padding: "12px", fontSize: "16px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 24px", fontSize: "16px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "25px" }}>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(e) => setHideOutOfStock(e.target.checked)}
          />{" "}
          Hide Out-of-Stock
        </label>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{ padding: "6px", borderRadius: "4px" }}
        >
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <div style={{ display: "grid", gap: "15px" }}>
        {filteredResults.map((item, index) => {
          const displayTitle = item.title || item.name || "Unnamed Product";
          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "15px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                backgroundColor: "#fff",
              }}
            >
              <div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "#1d4ed8", fontWeight: "bold", fontSize: "17px" }}
                >
                  {displayTitle}
                </a>
                <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                  Store: <strong>{item.store}</strong> {item.inStock === false && <span style={{ color: "red", marginLeft: "8px" }}>(Out of Stock)</span>}
                </div>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#059669" }}>
                {item.price ? `₹${item.price}` : "N/A"}
              </div>
            </div>
          );
        })}

        {!loading && results.length === 0 && query && !error && (
          <p style={{ textAlign: "center", color: "#6b7280" }}>No matching products found.</p>
        )}
      </div>
    </div>
  );
}

export default App;