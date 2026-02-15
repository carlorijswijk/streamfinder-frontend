import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [currentView, setCurrentView] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [europeanContent, setEuropeanContent] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watched, setWatched] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load European content on mount
  useEffect(() => {
    fetchEuropeanContent();
  }, []);

  const fetchEuropeanContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/discover/european`);
      const data = await response.json();
      setEuropeanContent(data);
    } catch (error) {
      console.error('Error fetching European content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedMovies = searchQuery ? searchResults : europeanContent;

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
              {searchQuery ? `Zoekresultaten voor "${searchQuery}"` : 'Europese Producties voor jou'}
            </h2>

            {isLoading ? (
              <div className="loading">
                <p>Laden...</p>
              </div>
            ) : displayedMovies.length === 0 ? (
              <div className="empty-state">
                <h3>Geen resultaten gevonden</h3>
                <p>Probeer een andere zoekopdracht</p>
              </div>
            ) : (
              <div className="cards-grid">
                {displayedMovies.map(movie => (
                  <div key={movie.id} className="movie-card">
                    <div className="movie-poster">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} />
                      ) : (
                        <div className="no-poster">🎬</div>
                      )}
                    </div>
                    <div className="movie-info">
                      <div className="movie-title">{movie.title}</div>
                      <div className="movie-meta">
                        <span>{movie.year}</span>
                        <div className="rating">⭐ {movie.rating}</div>
                      </div>
                      {movie.isEuropean && (
                        <div className="european-badge">🇪🇺 Europees</div>
                      )}
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
            )}
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
                    <div className="movie-poster">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} />
                      ) : (
                        <div className="no-poster">🎬</div>
                      )}
                    </div>
                    <div className="movie-info">
                      <div className="movie-title">{movie.title}</div>
                      <div className="movie-meta">
                        <span>{movie.year}</span>
                        <div className="rating">⭐ {movie.rating}</div>
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
      </div>
    </div>
  );
}

export default App;
