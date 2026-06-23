export default function EntryList({ entries, searchQuery, onSearchChange, activeEntryId, onSelectEntry, user, onLogout, onNewEntry }) {

  return (
    <div className="entry-list">
      <div className="entry-list-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-new" onClick={onNewEntry} title="New entry">
          +
        </button>
      </div>

      <div className="entry-items">
        {entries.length === 0 && (
          <p className="entry-list-empty">No entries yet. Click + to add one.</p>
        )}
        {entries.map(entry => (
          <button
            key={entry._id}
            className={`entry-item ${activeEntryId === entry._id ? 'active' : ''}`}
            onClick={() => onSelectEntry(entry._id)}
          >
            <div className="entry-item-info">
              <span className="entry-item-title">{entry.title}</span>
              <span className="entry-item-username">{entry.username}</span>
              {entry.tags && entry.tags.length > 0 && (
                <div className="entry-item-tags">
                  {entry.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="entry-item-tag">{tag}</span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className="entry-item-tags-more">+{entry.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <div className="entry-item-meta">
              {entry.strength !== 'strong' && (
                <span className={`strength-badge ${entry.strength}`}>
                  {entry.strength === 'medium' ? 'Medium' : 'Weak'}
                </span>
              )}
              <span className="entry-item-date">
                {entry.updatedAt ? entry.updatedAt.split('T')[0] || entry.updatedAt : ''}
              </span>
            </div>
          </button>
        ))}
      </div>

      {user && (
        <div className="user-info">
          {user.picture && (
            <img src={user.picture} alt="" className="user-avatar" />
          )}
          <span className="user-name">{user.displayName || user.email}</span>
          <button className="btn btn-secondary btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
