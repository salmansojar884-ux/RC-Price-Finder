import React, { useState } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('price-asc');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [buildCart, setBuildCart] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    setBuildCart([...buildCart, item]);
  };

  const removeFromCart = (index) => {
    setBuildCart(buildCart.filter((_, i) => i !== index));
  };

  const totalBuildCost = buildCart.reduce((sum, item) => sum + Number(item.price), 0);

  const filteredResults = results
    .filter((item) => (inStockOnly ? item.inStock !== false : true))
    .sort((a, b) => (sortBy === 'price-asc' ? a.price - b.price : b.price - a.price));

  return (
    <div className="container">
      <header className="header">
        <h1>RC Component Price Finder & Build Calculator</h1>
      </header>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search motors, ESCs, frames..."
          className="search-input"
        />
        <button type="submit" className="search-button">{loading ? 'Searching...' : 'Search'}</button>
      </form>

      <div className="controls-bar">
        <label>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          /> Hide Out-of-Stock
        </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div className="main-layout">
        <div className="results-grid">
          {filteredResults.map((item, index) => (
            <div className="card" key={index}>
              <span className="store-badge">{item.store}</span>
              <h3 className="product-title">{item.name}</h3>
              <div className="price-amount">₹{item.price}</div>
              <button onClick={() => addToCart(item)} className="add-cart-btn">+ Add to Build</button>
            </div>
          ))}
        </div>

        {/* Build List Sidebar */}
        <div className="build-summary">
          <h2>My Build List</h2>
          {buildCart.map((item, idx) => (
            <div key={idx} className="cart-item">
              <span>{item.name.substring(0, 20)}...</span>
              <strong>₹{item.price}</strong>
              <button onClick={() => removeFromCart(idx)}>×</button>
            </div>
          ))}
          <hr />
          <h3>Total: ₹{totalBuildCost}</h3>
        </div>
      </div>
    </div>
  );
}

export default App;