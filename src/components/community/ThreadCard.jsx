import React from 'react';
import {
  MapPin,
  Heart,
  MessageSquare,
  Store,
  Clock,
  Bookmark,
  GraduationCap,
  Lightbulb,
  Pencil,
  Trash2,
  Navigation
} from 'lucide-react';
import { getAvatarSvg } from '../Avatars';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export default function ThreadCard({
  thread,
  isUpvoted,
  isSaved = false,
  currentUserId = null,
  onSelectThread,
  onToggleUpvote,
  onToggleSave,
  onOpenAuthorProfile,
  onEditSpot,
  onDeleteSpot
}) {
  const replyCount = Array.isArray(thread.replies)
    ? thread.replies.length
    : thread.replyCount || 0;

  const categoryMeta =
    SPOT_CATEGORIES.find((c) => c.id === (thread.category || 'makan')) ||
    SPOT_CATEGORIES[0];

  const budgetMeta =
    SPOT_BUDGET_TAGS.find((b) => b.id === thread.budgetTag) ||
    SPOT_BUDGET_TAGS[1];

  const placeName = thread.placeName || thread.stallName || 'Campus Spot';
  const priceNumber = Number(thread.priceRM || 0);
  const displayPrice =
    thread.priceRange ||
    (priceNumber === 0 ? 'FREE (RM0)' : `RM${priceNumber.toFixed(2)}`);

  const isOwner = Boolean(currentUserId && thread.authorId === currentUserId);
  const handleDisplay = thread.authorHandle
    ? `@${String(thread.authorHandle).replace(/^@/, '')}`
    : '';

  const handleUpvoteClick = (e) => {
    e.stopPropagation();
    onToggleUpvote(thread.id);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(thread.id);
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (onOpenAuthorProfile) {
      onOpenAuthorProfile(thread.authorId || thread.authorHandle || thread.authorName, thread);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEditSpot) onEditSpot(thread);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDeleteSpot) onDeleteSpot(thread);
  };

  return (
    <article
      className="community-thread-card card"
      onClick={() => onSelectThread(thread)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectThread(thread);
        }
      }}
    >
      {/* Optional Spot Photo Banner */}
      {thread.photoUrl && (
        <div className="spot-card-photo-wrap">
          <img
            src={thread.photoUrl}
            alt={thread.title}
            className="spot-card-photo"
            loading="lazy"
          />
          <div className="spot-card-photo-badges">
            <span className="spot-category-badge">
              <TagIcon iconName={categoryMeta.icon} size={12} />
              <span>{categoryMeta.label}</span>
            </span>
            {thread.studentPrice && (
              <span className="spot-student-price-badge">
                <GraduationCap size={12} />
                <span>Student Price</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Row: Category + Campus + Price & Budget Badge */}
      <div className="community-card-header">
        <div className="spot-card-top-pills">
          {!thread.photoUrl && (
            <span className="spot-category-badge inline">
              <TagIcon iconName={categoryMeta.icon} size={12} />
              <span>{categoryMeta.label}</span>
            </span>
          )}
          <div className="community-campus-badge">
            <MapPin size={13} />
            <span>{thread.campusArea || 'Malaysia Campus'}</span>
          </div>
          {typeof thread.distanceKm === 'number' && Number.isFinite(thread.distanceKm) && (
            <span className="spot-distance-badge" title="Approximate distance from your location">
              <Navigation size={11} />
              <span>{thread.distanceKm < 1 ? `${Math.round(thread.distanceKm * 1000)}m` : `${thread.distanceKm.toFixed(1)} km`}</span>
            </span>
          )}
        </div>

        <div className="spot-price-stack">
          <div className="community-price-badge">
            <span className="price-value">{displayPrice}</span>
          </div>
          <span className="spot-budget-pill">{budgetMeta.label}</span>
        </div>
      </div>

      {/* Title & Place Name */}
      <h3 className="community-thread-title">{thread.title}</h3>

      <div className="community-stall-row">
        <Store size={14} className="stall-icon" />
        <span className="stall-name">{placeName}</span>
        {thread.locationAddress && (
          <span className="stall-location">• {thread.locationAddress}</span>
        )}
      </div>

      {/* Student Price + Short Tip */}
      {(!thread.photoUrl && thread.studentPrice) && (
        <div className="spot-inline-student-row">
          <span className="spot-student-price-badge inline">
            <GraduationCap size={12} />
            <span>Student Price Available</span>
          </span>
        </div>
      )}

      {thread.shortTip && (
        <div className="spot-short-tip-box">
          <Lightbulb size={14} className="spot-tip-icon" />
          <span><strong>Tip:</strong> {thread.shortTip}</span>
        </div>
      )}

      {/* Body Preview */}
      <p className="community-thread-excerpt">{thread.body}</p>

      {/* Footer: Author, Timestamp, Likes, Comments, Save, Owner Actions */}
      <div className="community-card-footer">
        <button
          type="button"
          className="community-author-info clickable-author"
          onClick={handleAuthorClick}
          title={`View ${thread.authorName}'s public profile`}
        >
          <div className="community-author-avatar">
            {getAvatarSvg(thread.authorAvatar || 'cat')}
          </div>
          <div className="community-author-meta">
            <span className="author-name">
              {thread.authorName || 'Student'}
              {handleDisplay && <span className="author-handle-inline"> {handleDisplay}</span>}
            </span>
            <span className="post-time">
              <Clock size={11} />
              {formatRelativeTime(thread.createdAt)}
            </span>
          </div>
        </button>

        <div className="community-card-actions">
          {isOwner && (
            <>
              <button
                type="button"
                className="spot-owner-icon-btn"
                onClick={handleEditClick}
                title="Edit your spot"
                aria-label="Edit spot"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="spot-owner-icon-btn danger"
                onClick={handleDeleteClick}
                title="Delete your spot"
                aria-label="Delete spot"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}

          <button
            type="button"
            className={`community-upvote-btn ${isUpvoted ? 'upvoted' : ''}`}
            onClick={handleUpvoteClick}
            aria-label={`Like (${thread.upvotes || 0})`}
            title="Like this spot"
          >
            <Heart size={14} fill={isUpvoted ? 'currentColor' : 'none'} />
            <span>{thread.upvotes || 0}</span>
          </button>

          <div className="community-reply-count" title={`${replyCount} comments`}>
            <MessageSquare size={14} />
            <span>{replyCount}</span>
          </div>

          <button
            type="button"
            className={`spot-save-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSaveClick}
            aria-label={isSaved ? 'Remove from saved spots' : 'Save spot to bookmarks'}
            title={isSaved ? 'Saved to bookmarks' : 'Save to bookmarks'}
          >
            <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
