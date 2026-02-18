import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const USER_ID = '1'; // Default user tot authenticatie is gebouwd

// Beschikbare streaming platforms
const ALL_PLATFORMS = ['Netflix', 'Amazon Prime', 'Disney+', 'HBO Max', 'Videoland', 'NPO Start'];

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
  const [recommendations, setRecommendations] = useState([]);
  const [recsBasedOn, setRecsBasedOn] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  // Profiel state
  const [userPlatforms, setUserPlatforms] = useState([]);
  const [userGenres, setUserGenres] = useState([]);
  const [platformsChanged, setPlatformsChanged] = useState(false);
  // Detail tile state
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ===== DATA FETCHING =====

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

  const parsePlatforms = (platforms) => {
    if (!platforms) return [];
    if (typeof platforms === 'string') {
      try { return JSON.parse(platforms); } catch { return []; }
    }
    return platforms;
  };

  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/watchlist`);
      const data = await response.json();
      setWatchlist(data.map(item => ({
        id: Number(item.content_id),
        dbId: item.id,
        title: item.title,
        year: item.year,
        type: item.type,
        platforms: parsePlatforms(item.platforms),
        poster: item.poster_url,
        rating: item.rating || '0.0',
        addedDate: item.added_date
      })));
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const fetchWatched = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/watched`);
      const data = await response.json();
      setWatched(data.map(item => ({
        id: Number(item.content_id),
        dbId: item.id,
        title: item.title,
        year: item.year,
        type: item.type,
        platforms: parsePlatforms(item.platforms),
        poster: item.poster_url,
        userRating: item.rating,
        watchedDate: item.watched_date
      })));
    } catch (error) {
      console.error('Error fetching watched:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/preferences`);
      const data = await response.json();
      setUserPlatforms(parsePlatforms(data.platforms));
      setUserGenres(parsePlatforms(data.genres));
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const savePreferences = async (platforms) => {
    try {
      await fetch(`${API_URL}/api/user/${USER_ID}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres: userGenres, platforms })
      });
      setUserPlatforms(platforms);
      setPlatformsChanged(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const fetchRecommendations = useCallback(async () => {
    setRecsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/recommendations`);
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setRecsBasedOn(data.basedOn || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setRecsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchEuropeanContent();
    fetchWatchlist();
    fetchWatched();
    fetchPreferences();
  }, []);

  // Refresh aanbevelingen wanneer watched lijst verandert
  useEffect(() => {
    if (watched.length > 0) {
      fetchRecommendations();
    }
  }, [watched.length, fetchRecommendations]);

  // ===== ZOEKEN =====

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

  // ===== WATCHLIST ACTIES (met API) =====

  const addToWatchlist = async (movie) => {
    if (watchlist.find(m => m.id === movie.id) || watched.find(m => m.id === movie.id)) return;
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: movie.id,
          title: movie.title,
          year: movie.year,
          type: movie.type,
          platforms: movie.platforms || [],
          posterUrl: movie.poster
        })
      });
      const saved = await response.json();
      setWatchlist(prev => [...prev, { ...movie, dbId: saved.id }]);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (movie) => {
    try {
      await fetch(`${API_URL}/api/user/${USER_ID}/watchlist/${movie.dbId}`, { method: 'DELETE' });
      setWatchlist(prev => prev.filter(m => m.id !== movie.id));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  // ===== WATCHED / RATING ACTIES (met API) =====

  const openRatingModal = (movie) => {
    setSelectedMovie(movie);
    const existingWatched = watched.find(m => m.id === movie.id);
    setUserRating(existingWatched ? existingWatched.userRating : 0);
    setModalMode('rate');
    setShowModal(true);
  };

  const markAsWatched = async () => {
    if (!selectedMovie || userRating === 0) return;

    const existingWatched = watched.find(m => m.id === selectedMovie.id);

    if (existingWatched) {
      try {
        await fetch(`${API_URL}/api/user/${USER_ID}/watched/${existingWatched.dbId}/rating`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: userRating })
        });
        setWatched(prev => prev.map(m =>
          m.id === selectedMovie.id ? { ...m, userRating } : m
        ));
      } catch (error) {
        console.error('Error updating rating:', error);
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/api/user/${USER_ID}/watched`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: selectedMovie.id,
            title: selectedMovie.title,
            year: selectedMovie.year,
            type: selectedMovie.type,
            platforms: selectedMovie.platforms || [],
            posterUrl: selectedMovie.poster,
            rating: userRating
          })
        });
        const saved = await response.json();
        setWatched(prev => [{
          ...selectedMovie,
          dbId: saved.id,
          userRating,
          watchedDate: saved.watched_date || new Date().toISOString()
        }, ...prev]);
        setWatchlist(prev => prev.filter(m => m.id !== selectedMovie.id));
        // Refresh preferences na rating (genre profiel wordt auto-updated)
        setTimeout(() => fetchPreferences(), 2000);
      } catch (error) {
        console.error('Error marking as watched:', error);
      }
    }

    setShowModal(false);
    setSelectedMovie(null);
    setUserRating(0);
  };

  const removeFromWatched = async (movie) => {
    try {
      await fetch(`${API_URL}/api/user/${USER_ID}/watched/${movie.dbId}`, { method: 'DELETE' });
      setWatched(prev => prev.filter(m => m.id !== movie.id));
    } catch (error) {
      console.error('Error removing from watched:', error);
    }
  };

  // ===== DETAIL TILE =====
  const fetchDetail = async (movie) => {
    // Als dezelfde film al geselecteerd is, sluit detail
    if (selectedDetail && selectedDetail.id === movie.id) {
      setSelectedDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const mediaType = movie.type === 'tv' ? 'tv' : 'movie';
      const response = await fetch(`${API_URL}/api/content/${mediaType}/${movie.id}`);
      const data = await response.json();
      setSelectedDetail(data);
      // Scroll detail-tile in beeld
      setTimeout(() => {
        document.querySelector('.detail-tile')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (error) {
      console.error('Error fetching detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedDetail(null);

  // ===== PLATFORM TOGGLE =====
  const togglePlatform = (platform) => {
    const updated = userPlatforms.includes(platform)
      ? userPlatforms.filter(p => p !== platform)
      : [...userPlatforms, platform];
    setUserPlatforms(updated);
    setPlatformsChanged(true);
  };

  // ===== HELPERS =====
  const getWatchedRating = (movieId) => {
    const item = watched.find(m => m.id === movieId);
    return item ? item.userRating : null;
  };

  // Platform kleuren
  const getPlatformColor = (platform) => {
    const colors = {
      'Netflix': '#E50914',
      'Amazon Prime': '#00A8E1',
      'Disney+': '#113CCF',
      'HBO Max': '#B535F6',
      'Videoland': '#FF6B00',
      'NPO Start': '#FFA500',
      'Pathé Thuis': '#E6007E',
      'Apple TV Store': '#555',
      'Google Play': '#01875F',
      'Amazon Video': '#00A8E1',
      'YouTube': '#FF0000',
      'Picl': '#1A1A2E'
    };
    return colors[platform] || '#666';
  };

  // ===== HERBRUIKBARE MOVIE CARD =====
  const renderMovieCard = (movie, showRecommendedBecause = false) => {
    const existingRating = getWatchedRating(movie.id);
    const isOnWatchlist = watchlist.find(m => m.id === movie.id);
    const isWatched = watched.find(m => m.id === movie.id);

    const isSelected = selectedDetail && selectedDetail.id === movie.id;

    return (
      <div key={movie.id} className={`movie-card ${isSelected ? 'selected' : ''}`}
        onClick={() => fetchDetail(movie)}
      >
        <div className="movie-poster">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} />
          ) : (
            <div className="no-poster">🎬</div>
          )}
          {existingRating && (
            <div className="user-rating-badge">
              {'★'.repeat(existingRating)}
            </div>
          )}
          {detailLoading && isSelected && (
            <div className="detail-loading-indicator">...</div>
          )}
        </div>
        <div className="movie-info">
          <div className="movie-title">{movie.title}</div>
          <div className="movie-meta">
            <span>{movie.year}</span>
            <div className="rating">⭐ {movie.rating}</div>
          </div>
          {/* Platform badges */}
          {movie.platforms && movie.platforms.length > 0 && (
            <div className="platform-badges">
              {movie.platforms.map(p => (
                <span
                  key={p}
                  className={`platform-badge ${userPlatforms.includes(p) ? 'owned' : ''}`}
                  style={{ borderColor: getPlatformColor(p), color: getPlatformColor(p) }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          {/* PPV badges als geen streaming platforms */}
          {(!movie.platforms || movie.platforms.length === 0) && movie.rentBuyPlatforms && movie.rentBuyPlatforms.length > 0 && (
            <div className="platform-badges">
              {movie.rentBuyPlatforms.slice(0, 2).map(p => (
                <span key={p} className="platform-badge ppv">
                  🎬 {p}
                </span>
              ))}
            </div>
          )}
          {movie.isEuropean && (
            <div className="european-badge">🇪🇺 Europees</div>
          )}
          {showRecommendedBecause && movie.recommendedBecause && (
            <div className="recommended-because">
              Omdat je "{movie.recommendedBecause[0]}" leuk vond
            </div>
          )}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); addToWatchlist(movie); }}
              disabled={!!isOnWatchlist || !!isWatched}
            >
              {isOnWatchlist ? '✓ Op lijst' :
               isWatched ? '✓ Gezien' : '+ Watchlist'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={(e) => { e.stopPropagation(); openRatingModal(movie); }}
            >
              {existingRating ? `★ ${existingRating}/5` : '⭐ Beoordelen'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== DETAIL TILE RENDERER =====
  const renderDetailTile = () => {
    if (!selectedDetail) return null;
    const existingRating = getWatchedRating(selectedDetail.id);
    const isOnWatchlist = watchlist.find(m => m.id === selectedDetail.id);
    const isWatched = watched.find(m => m.id === selectedDetail.id);
    const detail = selectedDetail;

    return (
      <div className="detail-tile" onClick={closeDetail}>
        <div className="detail-tile-inner" onClick={(e) => e.stopPropagation()}>
          {/* Backdrop */}
          <div className="detail-backdrop"
            style={detail.backdrop ? { backgroundImage: `url(${detail.backdrop})` } : {}}
          >
            <div className="detail-backdrop-gradient" />
            <button className="detail-close" onClick={closeDetail}>×</button>
          </div>

          {/* Content */}
          <div className="detail-body">
            <div className="detail-header">
              {detail.poster && (
                <img src={detail.poster} alt={detail.title} className="detail-poster" />
              )}
              <div className="detail-header-info">
                <h2 className="detail-title">{detail.title}</h2>
                <div className="detail-meta">
                  <span className="detail-year">{detail.year}</span>
                  <span className="detail-rating">⭐ {typeof detail.rating === 'number' ? detail.rating.toFixed(1) : detail.rating}</span>
                  {detail.runtime && <span className="detail-runtime">{detail.runtime} min</span>}
                  <span className="detail-type">{detail.type === 'tv' ? 'Serie' : 'Film'}</span>
                </div>

                {/* Genres */}
                {detail.genres && detail.genres.length > 0 && (
                  <div className="detail-genres">
                    {detail.genres.map(g => (
                      <span key={g} className="detail-genre-tag">{g}</span>
                    ))}
                  </div>
                )}

                {/* User rating */}
                {existingRating && (
                  <div className="detail-user-rating">
                    Jouw rating: <span className="detail-stars">{'★'.repeat(existingRating)}{'☆'.repeat(5 - existingRating)}</span> {existingRating}/5
                  </div>
                )}
              </div>
            </div>

            {/* Overview */}
            {detail.overview && (
              <div className="detail-overview">
                <p>{detail.overview}</p>
              </div>
            )}

            {/* Cast */}
            {detail.cast && detail.cast.length > 0 && (
              <div className="detail-cast">
                <h4>Cast</h4>
                <p>{detail.cast.join(', ')}</p>
              </div>
            )}

            {/* Streaming Platforms */}
            {detail.streamingPlatforms && detail.streamingPlatforms.length > 0 && (
              <div className="detail-platforms">
                <h4>Beschikbaar op</h4>
                <div className="detail-platform-list">
                  {detail.streamingPlatforms.map(p => (
                    <span
                      key={p}
                      className={`detail-platform-badge ${userPlatforms.includes(p) ? 'owned' : ''}`}
                      style={{ borderColor: getPlatformColor(p), color: getPlatformColor(p) }}
                    >
                      {userPlatforms.includes(p) && '✓ '}{p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pay-per-view / Huur/Koop Platforms */}
            {detail.rentBuyPlatforms && detail.rentBuyPlatforms.length > 0 && (
              <div className="detail-platforms detail-ppv">
                <h4>Te huur / koop op</h4>
                <div className="detail-platform-list">
                  {detail.rentBuyPlatforms.map(p => (
                    <span key={p} className="detail-platform-badge ppv">
                      🎬 {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Niet beschikbaar melding */}
            {detail.streamingPlatforms && detail.streamingPlatforms.length === 0 &&
             detail.rentBuyPlatforms && detail.rentBuyPlatforms.length === 0 && (
              <div className="detail-platforms">
                <p style={{ color: '#888', fontStyle: 'italic' }}>Niet beschikbaar op Nederlandse streamingdiensten</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="detail-actions">
              <button
                className="btn btn-primary"
                onClick={() => addToWatchlist(detail)}
                disabled={!!isOnWatchlist || !!isWatched}
              >
                {isOnWatchlist ? '✓ Op watchlist' :
                 isWatched ? '✓ Gezien' : '+ Watchlist'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => openRatingModal(detail)}
              >
                {existingRating ? `★ ${existingRating}/5 - Aanpassen` : '⭐ Beoordelen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
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
            onClick={() => { setCurrentView('discover'); closeDetail(); }}
          >
            🔍 Ontdekken
          </button>
          <button
            className={`nav-button ${currentView === 'voorjou' ? 'active' : ''}`}
            onClick={() => { setCurrentView('voorjou'); closeDetail(); fetchRecommendations(); }}
          >
            💡 Voor Jou {recommendations.length > 0 ? `(${recommendations.length})` : ''}
          </button>
          <button
            className={`nav-button ${currentView === 'watchlist' ? 'active' : ''}`}
            onClick={() => { setCurrentView('watchlist'); closeDetail(); }}
          >
            📌 Watchlist ({watchlist.length})
          </button>
          <button
            className={`nav-button ${currentView === 'watched' ? 'active' : ''}`}
            onClick={() => { setCurrentView('watched'); closeDetail(); }}
          >
            ✅ Bekeken ({watched.length})
          </button>
          <button
            className={`nav-button ${currentView === 'profiel' ? 'active' : ''}`}
            onClick={() => { setCurrentView('profiel'); closeDetail(); }}
          >
            👤 Profiel
          </button>
        </nav>

        {/* ===== ONTDEKKEN TAB ===== */}
        {currentView === 'discover' && (
          <div>
            <div className="search-section">
              <input
                type="text"
                className="search-bar"
                placeholder="Zoek films en series... (bijv. 'Voor de meisjes')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>
              {searchQuery ? `Zoekresultaten voor "${searchQuery}"` : 'Europese Producties voor jou'}
            </h2>

            {isLoading ? (
              <div className="loading"><p>Laden...</p></div>
            ) : displayedMovies.length === 0 ? (
              <div className="empty-state">
                <h3>Geen resultaten gevonden</h3>
                <p>Probeer een andere zoekopdracht</p>
              </div>
            ) : (
              <div className="cards-grid">
                {displayedMovies.map(movie => renderMovieCard(movie))}
              </div>
            )}
            {renderDetailTile()}
          </div>
        )}

        {/* ===== VOOR JOU TAB ===== */}
        {currentView === 'voorjou' && (
          <div>
            <h2 style={{ marginBottom: '10px', fontSize: '20px' }}>Aanbevolen voor jou</h2>
            {recsBasedOn.length > 0 && (
              <p className="recs-based-on">
                Gebaseerd op: {recsBasedOn.join(', ')}
              </p>
            )}

            {recsLoading ? (
              <div className="loading"><p>Aanbevelingen laden...</p></div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state">
                <h3>Nog geen aanbevelingen</h3>
                <p>Beoordeel minimaal 1 film of serie met 3 sterren of meer om persoonlijke aanbevelingen te krijgen.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '15px' }}
                  onClick={() => setCurrentView('discover')}
                >
                  🔍 Ga naar Ontdekken
                </button>
              </div>
            ) : (
              <>
                {/* Content op jouw platforms */}
                {userPlatforms.length > 0 && recommendations.filter(m => m.availableOnYourPlatform).length > 0 && (
                  <>
                    <h3 style={{ fontSize: '16px', color: '#f5c518', marginBottom: '15px' }}>
                      ✓ Op jouw platforms ({userPlatforms.join(', ')})
                    </h3>
                    <div className="cards-grid">
                      {recommendations.filter(m => m.availableOnYourPlatform).map(movie => renderMovieCard(movie, true))}
                    </div>
                  </>
                )}

                {/* Content op andere platforms */}
                {recommendations.filter(m => !m.availableOnYourPlatform).length > 0 && (
                  <>
                    <h3 style={{ fontSize: '16px', color: '#888', marginBottom: '15px', marginTop: '25px' }}>
                      Op andere platforms
                    </h3>
                    <div className="cards-grid">
                      {recommendations.filter(m => !m.availableOnYourPlatform).map(movie => renderMovieCard(movie, true))}
                    </div>
                  </>
                )}
              </>
            )}
            {renderDetailTile()}
          </div>
        )}

        {/* ===== WATCHLIST TAB ===== */}
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
                  <div key={movie.id}
                    className={`movie-card ${selectedDetail && selectedDetail.id === movie.id ? 'selected' : ''}`}
                    onClick={() => fetchDetail(movie)}
                  >
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
                          onClick={(e) => { e.stopPropagation(); openRatingModal(movie); }}
                        >
                          ✓ Gezien
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(movie); }}
                        >
                          × Verwijder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {renderDetailTile()}
          </div>
        )}

        {/* ===== BEKEKEN TAB ===== */}
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
                <div className="stat-label">Gem. Rating</div>
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
                <p>Zoek een film of serie en beoordeel deze om te beginnen</p>
              </div>
            ) : (
              <div>
                {watched.map(movie => (
                  <div key={movie.id}
                    className={`watched-item ${selectedDetail && selectedDetail.id === movie.id ? 'selected' : ''}`}
                    onClick={() => fetchDetail(movie)}
                    style={{ cursor: 'pointer' }}
                  >
                    {movie.poster && (
                      <img src={movie.poster} alt={movie.title} className="watched-poster" />
                    )}
                    <div className="watched-info">
                      <h3>{movie.title} ({movie.year})</h3>
                      <p>
                        Jouw rating: <span style={{ color: '#f5c518', fontWeight: 'bold' }}>
                          {'★'.repeat(movie.userRating)}{'☆'.repeat(5 - movie.userRating)}
                        </span>
                        <span style={{ marginLeft: '8px', color: '#aaa' }}>{movie.userRating}/5</span>
                      </p>
                      <p style={{ fontSize: '11px', marginTop: '5px', color: '#888' }}>
                        Bekeken op {new Date(movie.watchedDate).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div className="watched-actions">
                      <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); openRatingModal(movie); }} title="Rating aanpassen">✏️</button>
                      <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); removeFromWatched(movie); }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {renderDetailTile()}
          </div>
        )}

        {/* ===== PROFIEL TAB ===== */}
        {currentView === 'profiel' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Mijn Profiel</h2>

            {/* Streaming Platforms */}
            <div className="profile-section">
              <h3>Mijn Streaming Abonnementen</h3>
              <p className="profile-description">Selecteer de platforms waarop je een abonnement hebt. Aanbevelingen worden hierop gefilterd.</p>
              <div className="platform-toggles">
                {ALL_PLATFORMS.map(platform => (
                  <button
                    key={platform}
                    className={`platform-toggle ${userPlatforms.includes(platform) ? 'active' : ''}`}
                    style={userPlatforms.includes(platform) ? { borderColor: getPlatformColor(platform), backgroundColor: getPlatformColor(platform) + '22' } : {}}
                    onClick={() => togglePlatform(platform)}
                  >
                    <span className="platform-toggle-indicator">
                      {userPlatforms.includes(platform) ? '✓' : '+'}
                    </span>
                    {platform}
                  </button>
                ))}
              </div>
              {platformsChanged && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '15px' }}
                  onClick={() => savePreferences(userPlatforms)}
                >
                  💾 Opslaan
                </button>
              )}
            </div>

            {/* Genre Profiel */}
            <div className="profile-section">
              <h3>Mijn Genre Profiel</h3>
              <p className="profile-description">Automatisch opgebouwd op basis van je beoordelingen. Hoe meer je beoordeelt, hoe beter het profiel.</p>
              {userGenres.length > 0 ? (
                <div className="genre-tags">
                  {userGenres.map((genre, index) => (
                    <span
                      key={genre}
                      className="genre-tag"
                      style={{ opacity: 1 - (index * 0.08) }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic' }}>
                  Beoordeel films en series om je genre profiel op te bouwen.
                </p>
              )}
            </div>

            {/* Statistieken */}
            <div className="profile-section">
              <h3>Statistieken</h3>
              <div className="stats-bar">
                <div className="stat">
                  <div className="stat-value">{watched.length}</div>
                  <div className="stat-label">Bekeken</div>
                </div>
                <div className="stat">
                  <div className="stat-value">
                    {watched.length > 0 ? (watched.reduce((acc, m) => acc + m.userRating, 0) / watched.length).toFixed(1) : '0'}
                  </div>
                  <div className="stat-label">Gem. Rating</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{watchlist.length}</div>
                  <div className="stat-label">Nog te zien</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{userPlatforms.length}</div>
                  <div className="stat-label">Platforms</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== RATING MODAL ===== */}
        {showModal && modalMode === 'rate' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              <h2>Beoordeel: {selectedMovie?.title}</h2>

              {selectedMovie?.poster && (
                <img
                  src={selectedMovie.poster}
                  alt={selectedMovie.title}
                  style={{ width: '120px', borderRadius: '8px', margin: '10px auto', display: 'block' }}
                />
              )}

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
                {userRating > 0 && (
                  <p style={{ textAlign: 'center', marginTop: '8px', color: '#aaa' }}>
                    {userRating}/5 - {
                      userRating === 1 ? 'Slecht' :
                      userRating === 2 ? 'Matig' :
                      userRating === 3 ? 'Oké' :
                      userRating === 4 ? 'Goed' :
                      'Uitstekend!'
                    }
                  </p>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={markAsWatched}
                disabled={userRating === 0}
              >
                {watched.find(m => m.id === selectedMovie?.id)
                  ? '✓ Rating Bijwerken'
                  : '✓ Markeer als Gezien'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
