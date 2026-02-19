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
  // Beoordeeld maar niet gezien
  const [rated, setRated] = useState([]);
  // Zoekfilter
  const [searchFilter, setSearchFilter] = useState('all'); // 'all' | 'movie' | 'tv'
  // Sortering
  const [watchlistSort, setWatchlistSort] = useState('added'); // 'added' | 'title' | 'rating'
  const [watchedSort, setWatchedSort] = useState('date'); // 'date' | 'title' | 'rating'
  // Op jouw platforms
  const [discoverContent, setDiscoverContent] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

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

  const fetchDiscoverContent = async () => {
    setDiscoverLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/discover`);
      const data = await response.json();
      setDiscoverContent(data.results || []);
    } catch (error) {
      console.error('Error fetching discover content:', error);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const fetchRated = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/${USER_ID}/rated`);
      const data = await response.json();
      setRated(data.map(item => ({
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
      console.error('Error fetching rated:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchEuropeanContent();
    fetchWatchlist();
    fetchWatched();
    fetchRated();
    fetchPreferences();
    fetchDiscoverContent();
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
    const existingRated = rated.find(m => m.id === movie.id);
    setUserRating(existingWatched ? existingWatched.userRating : existingRated ? existingRated.userRating : 0);
    setModalMode('rate');
    setShowModal(true);
  };

  const submitRating = async (isWatched) => {
    if (!selectedMovie || userRating === 0) return;

    const existingWatched = watched.find(m => m.id === selectedMovie.id);
    const existingRated = rated.find(m => m.id === selectedMovie.id);
    const existing = existingWatched || existingRated;

    if (existing) {
      // Bestaande beoordeling bijwerken
      try {
        await fetch(`${API_URL}/api/user/${USER_ID}/watched/${existing.dbId}/rating`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: userRating })
        });
        if (existingWatched) {
          setWatched(prev => prev.map(m => m.id === selectedMovie.id ? { ...m, userRating } : m));
        } else {
          setRated(prev => prev.map(m => m.id === selectedMovie.id ? { ...m, userRating } : m));
        }
      } catch (error) {
        console.error('Error updating rating:', error);
      }
    } else {
      // Nieuwe beoordeling opslaan
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
            rating: userRating,
            isWatched
          })
        });
        const saved = await response.json();
        const newItem = {
          ...selectedMovie,
          dbId: saved.id,
          userRating,
          watchedDate: saved.watched_date || new Date().toISOString()
        };
        if (isWatched) {
          setWatched(prev => [newItem, ...prev]);
        } else {
          setRated(prev => [newItem, ...prev]);
        }
        // Verwijder uit watchlist
        setWatchlist(prev => prev.filter(m => m.id !== selectedMovie.id));
        // Refresh genre profiel
        setTimeout(() => fetchPreferences(), 2000);
      } catch (error) {
        console.error('Error submitting rating:', error);
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
    const existingRating = getWatchedRating(movie.id) || rated.find(m => m.id === movie.id)?.userRating;
    const isOnWatchlist = watchlist.find(m => m.id === movie.id);
    const isWatched = watched.find(m => m.id === movie.id);
    const isRated = rated.find(m => m.id === movie.id);

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
              disabled={!!isOnWatchlist || !!isWatched || !!isRated}
            >
              {isOnWatchlist ? '✓ Op lijst' :
               isWatched ? '✓ Gezien' :
               isRated ? '👎 Beoordeeld' : '+ Watchlist'}
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

  // ===== STATISTIEKEN BEREKENINGEN =====
  const platformStats = ALL_PLATFORMS.map(p => ({
    name: p,
    count: watched.filter(m => m.platforms && m.platforms.includes(p)).length
  })).filter(p => p.count > 0).sort((a, b) => b.count - a.count);
  const maxPlatformCount = platformStats[0]?.count || 1;

  const genreStats = userGenres.slice(0, 6).map((genre, i) => ({
    name: genre,
    score: Math.max(10 - i * 1.5, 1)
  }));
  const maxGenreScore = genreStats[0]?.score || 1;

  const favorites = watched.filter(m => m.userRating === 5);

  const decadeStats = watched.reduce((acc, m) => {
    if (!m.year) return acc;
    const decade = Math.floor(Number(m.year) / 10) * 10;
    const label = `${decade}s`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const decadeEntries = Object.entries(decadeStats).sort((a, b) => b[0].localeCompare(a[0]));
  const maxDecadeCount = Math.max(...Object.values(decadeStats), 1);

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
          <button
            className={`nav-button ${currentView === 'stats' ? 'active' : ''}`}
            onClick={() => { setCurrentView('stats'); closeDetail(); }}
          >
            📊 Statistieken
          </button>
        </nav>

        {/* ===== ONTDEKKEN TAB ===== */}
        {currentView === 'discover' && (
          <div>
            {/* Zoekbalk */}
            <div className="search-section">
              <input
                type="text"
                className="search-bar"
                placeholder="Zoek films en series... (bijv. 'Breaking Bad')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="search-filters">
                  {[['all', 'Alles'], ['movie', '🎬 Films'], ['tv', '📺 Series']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`filter-btn ${searchFilter === val ? 'active' : ''}`}
                      onClick={(e) => { e.preventDefault(); setSearchFilter(val); }}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoekresultaten (vervangt alles als er een zoekopdracht is) */}
            {searchQuery ? (
              <>
                <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>
                  Zoekresultaten voor "{searchQuery}"
                  {searchFilter !== 'all' && <span style={{ fontSize: '14px', color: '#888', marginLeft: '10px' }}>({searchFilter === 'movie' ? 'Films' : 'Series'})</span>}
                </h2>
                {isLoading ? (
                  <div className="loading"><p>Zoeken...</p></div>
                ) : searchResults.filter(m => searchFilter === 'all' || m.type === searchFilter).length === 0 ? (
                  <div className="empty-state">
                    <h3>Geen resultaten gevonden</h3>
                    <p>Probeer een andere zoekopdracht of filter</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {searchResults.filter(m => searchFilter === 'all' || m.type === searchFilter).map(movie => renderMovieCard(movie))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* === SECTIE 0: Op jouw platforms === */}
                {userPlatforms.length > 0 && (
                  <div className="discover-section">
                    <h2 className="section-title">▶️ Op jouw platforms</h2>
                    <p className="section-subtitle">Populair op {userPlatforms.join(', ')}</p>
                    {discoverLoading ? (
                      <div className="loading"><p>Laden...</p></div>
                    ) : discoverContent.length === 0 ? (
                      <div className="section-empty">
                        <p>Geen content gevonden op jouw platforms</p>
                      </div>
                    ) : (
                      <div className="cards-grid">
                        {discoverContent.map(movie => renderMovieCard(movie))}
                      </div>
                    )}
                  </div>
                )}

                {/* === SECTIE 1: Aanbevolen voor jou === */}
                <div className="discover-section">
                  <h2 className="section-title">💡 Aanbevolen voor jou</h2>
                  {recsBasedOn.length > 0 && (
                    <p className="section-subtitle">
                      Op basis van je beoordelingen van {recsBasedOn.slice(0, 3).join(', ')}{recsBasedOn.length > 3 ? ` en ${recsBasedOn.length - 3} andere` : ''}
                    </p>
                  )}

                  {recsLoading ? (
                    <div className="loading"><p>Aanbevelingen laden...</p></div>
                  ) : recommendations.length === 0 ? (
                    <div className="section-empty">
                      <p>Beoordeel films en series om persoonlijke aanbevelingen te krijgen.</p>
                    </div>
                  ) : (
                    <>
                      {/* Op jouw platforms */}
                      {userPlatforms.length > 0 && recommendations.filter(m => m.availableOnYourPlatform).length > 0 && (
                        <>
                          <h3 className="subsection-title owned">
                            ✓ Op jouw platforms
                          </h3>
                          <div className="cards-grid">
                            {recommendations.filter(m => m.availableOnYourPlatform).map(movie => renderMovieCard(movie, true))}
                          </div>
                        </>
                      )}

                      {/* Op andere platforms */}
                      {recommendations.filter(m => !m.availableOnYourPlatform).length > 0 && (
                        <>
                          <h3 className="subsection-title other">
                            Op andere platforms
                          </h3>
                          <div className="cards-grid">
                            {recommendations.filter(m => !m.availableOnYourPlatform).map(movie => renderMovieCard(movie, true))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* === SECTIE 2: Populair in Europa === */}
                <div className="discover-section">
                  <h2 className="section-title">🇪🇺 Populair in Europa</h2>
                  <p className="section-subtitle">Trending Europese films en series</p>

                  {isLoading ? (
                    <div className="loading"><p>Laden...</p></div>
                  ) : europeanContent.length === 0 ? (
                    <div className="section-empty">
                      <p>Geen Europese content beschikbaar</p>
                    </div>
                  ) : (
                    <div className="cards-grid">
                      {europeanContent.map(movie => renderMovieCard(movie))}
                    </div>
                  )}
                </div>
              </>
            )}
            {renderDetailTile()}
          </div>
        )}

        {/* ===== WATCHLIST TAB ===== */}
        {currentView === 'watchlist' && (
          <div>
            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Mijn Watchlist</h2>
            {watchlist.length > 0 && (
              <div className="sort-bar">
                <span className="sort-label">Sorteren:</span>
                {[['added', 'Toegevoegd'], ['title', 'Titel'], ['rating', 'TMDb Rating']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`filter-btn ${watchlistSort === val ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setWatchlistSort(val); }}
                  >{label}</button>
                ))}
              </div>
            )}
            {watchlist.length === 0 ? (
              <div className="empty-state">
                <h3>Je watchlist is leeg</h3>
                <p>Voeg films en series toe die je nog wilt zien</p>
              </div>
            ) : (
              <div className="cards-grid">
                {[...watchlist].sort((a, b) => {
                  if (watchlistSort === 'title') return a.title.localeCompare(b.title);
                  if (watchlistSort === 'rating') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
                  return new Date(b.addedDate) - new Date(a.addedDate);
                }).map(movie => (
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

            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Bekeken Titels</h2>
            {watched.length > 0 && (
              <div className="sort-bar">
                <span className="sort-label">Sorteren:</span>
                {[['date', 'Datum'], ['title', 'Titel'], ['rating', 'Jouw Rating']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`filter-btn ${watchedSort === val ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setWatchedSort(val); }}
                  >{label}</button>
                ))}
              </div>
            )}
            {watched.length === 0 ? (
              <div className="empty-state">
                <h3>Nog geen bekeken titels</h3>
                <p>Zoek een film of serie en beoordeel deze om te beginnen</p>
              </div>
            ) : (
              <div>
                {[...watched].sort((a, b) => {
                  if (watchedSort === 'title') return a.title.localeCompare(b.title);
                  if (watchedSort === 'rating') return (b.userRating || 0) - (a.userRating || 0);
                  return new Date(b.watchedDate) - new Date(a.watchedDate);
                }).map(movie => (
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

        {/* ===== STATISTIEKEN TAB ===== */}
        {currentView === 'stats' && (
          <div>
            <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>📊 Mijn Statistieken</h2>

            {/* SECTIE 1: Platform verdeling */}
            <div className="profile-section">
              <h3>Bekeken per platform</h3>
              <p className="profile-description">Op welk platform heb je de meeste titels bekeken?</p>
              {platformStats.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Nog geen platformdata bekend bij bekeken titels.</p>
              ) : (
                <div className="stat-bars">
                  {platformStats.map(p => (
                    <div key={p.name} className="stat-bar-row">
                      <div className="stat-bar-label" style={{ color: getPlatformColor(p.name) }}>{p.name}</div>
                      <div className="stat-bar-track">
                        <div className="stat-bar-fill"
                          style={{ width: `${(p.count / maxPlatformCount) * 100}%`, backgroundColor: getPlatformColor(p.name) }}
                        />
                      </div>
                      <div className="stat-bar-count">{p.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTIE 2: Top genres */}
            <div className="profile-section">
              <h3>Top genres</h3>
              <p className="profile-description">Jouw favoriete genres op basis van beoordelingen.</p>
              {genreStats.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Beoordeel meer titels om je genre profiel op te bouwen.</p>
              ) : (
                <div className="stat-bars">
                  {genreStats.map(g => (
                    <div key={g.name} className="stat-bar-row">
                      <div className="stat-bar-label">{g.name}</div>
                      <div className="stat-bar-track">
                        <div className="stat-bar-fill"
                          style={{ width: `${(g.score / maxGenreScore) * 100}%`, backgroundColor: '#f5c518' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTIE 3: Favorieten */}
            <div className="profile-section">
              <h3>⭐⭐⭐⭐⭐ Favorieten</h3>
              <p className="profile-description">{favorites.length} titel{favorites.length !== 1 ? 's' : ''} met 5 sterren — klik voor details.</p>
              {favorites.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Nog geen 5-sterren beoordelingen.</p>
              ) : (
                <div className="favorites-grid">
                  {favorites.map(m => (
                    <div key={m.id} className="favorite-item" onClick={() => fetchDetail(m)} title={m.title}>
                      {m.poster
                        ? <img src={m.poster} alt={m.title} />
                        : <div className="no-poster">🎬</div>
                      }
                      <div className="favorite-title">{m.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTIE 4: Uitjaar per decennium */}
            <div className="profile-section">
              <h3>Uitjaar van bekeken titels</h3>
              <p className="profile-description">Uit welk tijdperk komen jouw bekeken titels?</p>
              {decadeEntries.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Nog geen data beschikbaar.</p>
              ) : (
                <div className="stat-bars">
                  {decadeEntries.map(([label, count]) => (
                    <div key={label} className="stat-bar-row">
                      <div className="stat-bar-label">{label}</div>
                      <div className="stat-bar-track">
                        <div className="stat-bar-fill"
                          style={{ width: `${(count / maxDecadeCount) * 100}%`, backgroundColor: '#888' }}
                        />
                      </div>
                      <div className="stat-bar-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {renderDetailTile()}
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

              {(watched.find(m => m.id === selectedMovie?.id) || rated.find(m => m.id === selectedMovie?.id)) ? (
                // Al beoordeeld of gezien: rating bijwerken
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '20px' }}
                  onClick={() => submitRating(!!watched.find(m => m.id === selectedMovie?.id))}
                  disabled={userRating === 0}
                >
                  ✓ Rating Bijwerken
                </button>
              ) : (
                // Nieuw: twee opties
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => submitRating(true)}
                    disabled={userRating === 0}
                  >
                    ✓ Gezien & Beoordelen
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => submitRating(false)}
                    disabled={userRating === 0}
                  >
                    👎 Beoordelen zonder Gezien
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
