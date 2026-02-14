import React, { useState } from 'react';
import './App.css';

// API URL - change this to your Render backend URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [currentView, setCurrentView] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [watched, setWatched] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [userRating, setUserRating] = useState(0);
  
  // Manual add states
  const [manualTitle, setManualTitle] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualType, setManualType] = useState('series');
  const [manualPlatform, setManualPlatform] = useState('Netflix');
  const [lookupResults, setLookupResults] = useState([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Mock data for now (later replace with API calls)
  const mockMovies = [
    { id: 1, title: "The Twelve", year: 2022, rating: 8.1, poster: "🎬", platforms: ["Netflix"], genre: "Drama", country: "BE", type: "series" },
    { id: 2, title: "Lupin", year: 2021, rating: 7.5, poster: "🎭", platforms: ["Netflix"], genre: "Thriller", country: "FR", type: "series" },
    { id: 3, title: "Dark", year: 2017, rating: 8.8, poster: "⚡", platforms: ["Netflix"], genre: "Sci-Fi", country: "DE", type: "series" },
    { id: 4, title: "Money Heist", year: 2017, rating: 8.2, poster: "💰", platforms: ["Netflix"], genre: "Action", country: "ES", type: "series" },
  ];

  const filteredMovies = mockMovies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToWatchlist = (movie) => {
    if (!watchlist.find(m => m.id === movie.id) && !watched.find(m => m.id === movie.id)) {
      setWatchlist([...watchlist, movie]);
    }
  };

  const removeFromWatchlist = (movieId) => {
    setWatchlist(watchlist.filter(m => m.id !== movieId));
  };

  const openRatingModal = (movie) => {
    setSelectedMovie(movie);
    setUserRating(0);
    setModalMode('rate');
    setShowModal(true);
  };

  const markAsWatched = () => {
    if (selectedMovie && userRating > 0) {
      const watchedItem = {
        ...selectedMovie,
        userRating,
        watchedDate: new Date().toISOString()
      };
      setWatched([watchedItem, ...watched]);
      setWatchlist(watchlist.filter(m => m.id !== selectedMovie.id));
      setShowModal(false);
      setSelectedMovie(null);
      setUserRating(0);
    }
  };

  const removeFromWatched = (movieId) => {
    setWatched(watched.filter(m => m.id !== movieId));
  };

  const openAddManualModal = () => {
    setModalMode('add');
    setManualTitle('');
    setManualYear('');
    setManualType('series');
    setManualPlatform('Netflix');
    setLookupResults([]);
    setShowModal(true);
  };

  const handleLookup = () => {
    if (!manualTitle.trim()) return;
    
    setIsLookingUp(true);
    
    // Mock lookup - replace with API call later
    setTimeout(() => {
      const results = mockMovies.filter(movie => 
        movie.title.toLowerCase().includes(manualTitle.toLowerCase())
      ).map(movie => ({
        ...movie,
        id: `lookup_${movie.id}`
      }));
      
      setLookupResults(results);
      setIsLookingUp(false);
    }, 500);
  };

  const selectLookupResult = (movie) => {
    setManualTitle(movie.title);
    setManualYear(movie.year.toString());
    setManualType(movie.type);
    setLookupResults([]);
  };

  const addManualTitle = () => {
    if (!manualTitle.trim() || !manualYear) {
      alert('Vul minimaal titel en jaar in');
      return;
    }

    const newMovie = {
      id: `manual_${Date.now()}`,
      title: manualTitle,
      year: parseInt(manualYear),
      type: manualType,
      platforms: [manualPlatform],
      rating: 0,
      poster: '📝',
      genre: 'Handmatig',
      country: 'Manual'
    };

    setWatchlist([...watchlist, newMovie]);
    setShowModal(false);
    setManualTitle('');
    setManualYear('');
  };

  return (
    <div className="App">
      <header>
        <div className="header-content">
          <h1>🎬 StreamFinder</h1>
          <div className="header-subtitle">
            Jouw persoonlijke streaming gids
          </div>
        </div>
      </header>

      <div className="app-container">
        <nav>
          <button 
            className={`nav-button ${currentView === 'discover' ? 'active' : ''}`}
            onClick={() => setCurrentView('discover')}
          >
            🔍 Ontdekken
          </button>
          <button 
            className={`nav-button ${currentView === 'watchlist' ? 'active' : ''}`}
            onClick={() => setCurrentView('watchlist')}
          >
            📌 Watchlist ({watchlist.length})
          </button>
          <button 
            className={`nav-button ${currentView === 'watched' ? 'active' : ''}`}
            onClick={() => setCurrentView('watched')}
          >
            ✅ Bekeken ({watched.length})
          </button>
          <button 
            className="nav-button"
            onClick={openAddManualModal}
          >
            ➕ Handmatig toevoegen
          </button>
        </nav>

        {currentView === 'discover' && (
          <div>
            <div className="search-section">
              <input
                type="text"
                className="search-bar"
                placeholder="Zoek films en series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>
              {searchQuery ? 'Zoekresultaten' : 'Europese Producties voor jou'}
            </h2>

            <div className="cards-grid">
              {filteredMovies.map(movie => (
                <div key={movie.id} className="movie-card">
                  <div className="movie-poster">{movie.poster}</div>
                  <div className="movie-info">
                    <div className="movie-title">{movie.title}</div>
                    <div className="movie-meta">
                      <span>{movie.year}</span>
                      <div className="rating">⭐ {movie.rating}</div>
                    </div>
                    <div className="platforms">
                      {movie.platforms.map(platform => (
                        <span key={platform} className="platform-badge">
                          {platform}
                        </span>
                      ))}
                    </div>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-primary"
                        onClick={() => addToWatchlist(movie)}
                        disabled={watchlist.find(m => m.id === movie.id) || watched.find(m => m.id === movie.id)}
                      >
                        {watchlist.find(m => m.id === movie.id) ? '✓ Op lijst' : 
                         watched.find(m => m.id === movie.id) ? '✓ Gezien' : '+ Watchlist'}
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => openRatingModal(movie)}
                      >
                        ⭐ Beoordelen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'watchlist' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Mijn Watchlist</h2>
            {watchlist.length === 0 ? (
              <div className="empty-state">
                <h3>Je watchlist is leeg</h3>
                <p>Voeg films en series toe die je nog wilt zien</p>
              </div>
            ) : (
              <div className="cards-grid">
                {watchlist.map(movie => (
                  <div key={movie.id} className="movie-card">
                    <div className="movie-poster">{movie.poster}</div>
                    <div className="movie-info">
                      <div className="movie-title">{movie.title}</div>
                      <div className="movie-meta">
                        <span>{movie.year}</span>
                        <div className="rating">⭐ {movie.rating}</div>
                      </div>
                      <div className="platforms">
                        {movie.platforms.map(platform => (
                          <span key={platform} className="platform-badge">
                            {platform}
                          </span>
                        ))}
                      </div>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-primary"
                          onClick={() => openRatingModal(movie)}
                        >
                          ✓ Gezien
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => removeFromWatchlist(movie.id)}
                        >
                          × Verwijder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'watched' && (
          <div>
            <div className="stats-bar">
              <div className="stat">
                <div className="stat-value">{watched.length}</div>
                <div className="stat-label">Bekeken</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {watched.length > 0 ? (watched.reduce((acc, m) => acc + m.userRating, 0) / watched.length).toFixed(1) : '0'}
                </div>
                <div className="stat-label">Gemiddelde Rating</div>
              </div>
              <div className="stat">
                <div className="stat-value">{watchlist.length}</div>
                <div className="stat-label">Nog te zien</div>
              </div>
            </div>

            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Bekeken Titels</h2>
            {watched.length === 0 ? (
              <div className="empty-state">
                <h3>Nog geen bekeken titels</h3>
                <p>Beoordeel films en series die je hebt gezien</p>
              </div>
            ) : (
              <div>
                {watched.map(movie => (
                  <div key={movie.id} className="watched-item">
                    <div className="watched-info">
                      <h3>{movie.title} ({movie.year})</h3>
                      <p>
                        Jouw rating: <span style={{ color: '#f5c518', fontWeight: 'bold' }}>
                          {'⭐'.repeat(movie.userRating)}
                        </span>
                      </p>
                      <p style={{ fontSize: '11px', marginTop: '5px' }}>
                        Bekeken op {new Date(movie.watchedDate).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <button 
                      className="btn btn-danger"
                      onClick={() => removeFromWatched(movie.id)}
                    >
                      × Verwijder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showModal && modalMode === 'rate' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              <h2>Beoordeel: {selectedMovie?.title}</h2>
              
              <div className="form-group">
                <label>Jouw Rating</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${star <= userRating ? 'filled' : ''}`}
                      onClick={() => setUserRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '20px' }}
                onClick={markAsWatched}
                disabled={userRating === 0}
              >
                ✓ Markeer als Gezien
              </button>
            </div>
          </div>
        )}

        {showModal && modalMode === 'add' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              <h2>Handmatig Titel Toevoegen</h2>
              
              <div className="form-group">
                <label>Titel</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Bijv. The Crown" 
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary"
                    onClick={handleLookup}
                    disabled={isLookingUp || !manualTitle.trim()}
                    style={{ minWidth: '100px' }}
                  >
                    {isLookingUp ? '🔍 Zoeken...' : '🔍 Lookup'}
                  </button>
                </div>
              </div>

              {lookupResults.length > 0 && (
                <div className="form-group">
                  <label>Gevonden Resultaten</label>
                  <div className="lookup-results">
                    {lookupResults.map(result => (
                      <div 
                        key={result.id}
                        onClick={() => selectLookupResult(result)}
                        className="lookup-result-item"
                      >
                        <div style={{ fontWeight: '600' }}>{result.title}</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          {result.year} • {result.type} • ⭐ {result.rating}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    💡 Klik op een resultaat om de gegevens over te nemen
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Jaar</label>
                <input 
                  type="number" 
                  placeholder="2020" 
                  value={manualYear}
                  onChange={(e) => setManualYear(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <select 
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                >
                  <option value="series">Serie</option>
                  <option value="movie">Film</option>
                </select>
              </div>

              <div className="form-group">
                <label>Platform</label>
                <select
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value)}
                >
                  <option>Netflix</option>
                  <option>HBO Max</option>
                  <option>Disney+</option>
                  <option>Amazon Prime</option>
                  <option>Videoland</option>
                  <option>NPO Start</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '20px' }}
                onClick={addManualTitle}
              >
                ➕ Toevoegen aan Watchlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
