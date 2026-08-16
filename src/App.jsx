// Change this:
fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`)

// To this:
fetch(`https://rc-price-backend.onrender.com/api/search?q=${encodeURIComponent(query)}`)