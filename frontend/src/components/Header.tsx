import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate, logout, searchEvents } from '../api';
import { useAuth } from '../context/useAuth';
import type { Event } from '../types';
import './Header.css';

export function Header() {
  const { user, setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<number | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const clearSearchDropdown = useCallback(() => {
    clearTimeout(searchTimerRef.current);
    setSearchResults([]);
    setSearching(false);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = window.setTimeout(() => {
      searchEvents(value.trim())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
  }, []);

  const showDropdown = query.trim().length > 0;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="/" className="site-header__logo">
          Bob's Plan
        </a>

        <div className="site-header__search-wrap" ref={searchWrapRef}>
          <input
            className="site-header__search"
            type="search"
            placeholder="Search events, places…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={() => window.setTimeout(clearSearchDropdown, 150)}
            aria-label="Search events"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
          {showDropdown && (
            <div className="site-header__search-dropdown" role="listbox">
              {searching && (
                <p className="site-header__search-hint">Searching…</p>
              )}
              {!searching && searchResults.length === 0 && (
                <p className="site-header__search-hint">No events found for "{query}"</p>
              )}
              {!searching &&
                searchResults.map((event) => (
                  <a
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="site-header__result-item"
                    role="option"
                    aria-selected={false}
                  >
                    <span className="site-header__result-title">{event.title}</span>
                    <span className="site-header__result-meta">
                      {event.venue?.city ?? 'Online'} ·{' '}
                      {formatEventDate(event.startAt, event.timezone)}
                    </span>
                  </a>
                ))}
            </div>
          )}
        </div>

        <div className="site-header__actions">
          <a href="/events/create" className="btn btn--primary">
            + Create Event
          </a>

          <div className="site-header__user-group" ref={menuRef}>
            <button
              className="site-header__avatar"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={user?.name ?? 'Account menu'}
              aria-expanded={menuOpen}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? 'Profile'}
                  className="site-header__avatar-img"
                />
              ) : (
                <span className="site-header__avatar-initials">{initials}</span>
              )}
            </button>

            <button
              className="site-header__hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <span className="site-header__bar" />
              <span className="site-header__bar" />
              <span className="site-header__bar" />
            </button>

            {menuOpen && (
              <nav className="site-header__menu" aria-label="Main navigation">
                <ul className="site-header__menu-list">
                  {user ? (
                    <>
                      <li>
                        <a href="/profile" className="site-header__menu-link">
                          Profile
                        </a>
                      </li>
                      <li>
                        <a href="/my-events" className="site-header__menu-link">
                          My Events
                        </a>
                      </li>
                      <li>
                        <a href="/calendar" className="site-header__menu-link">
                          Calendar
                        </a>
                      </li>
                      <li>
                        <a href="/browse" className="site-header__menu-link">
                          Browse Events
                        </a>
                      </li>
                      <li>
                        <button
                          className="site-header__menu-link site-header__menu-logout"
                          onClick={() => {
                            setMenuOpen(false);
                            logout().finally(() => setUser(null));
                          }}
                        >
                          Log out
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <a href="/login" className="site-header__menu-link">
                          Log in
                        </a>
                      </li>
                      <li>
                        <a href="/register" className="site-header__menu-link">
                          Register
                        </a>
                      </li>
                      <li>
                        <a href="/browse" className="site-header__menu-link">
                          Browse Events
                        </a>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
