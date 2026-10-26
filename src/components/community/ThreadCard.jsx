import React from 'react';
import { Star, ChevronUp, MessageSquare, MapPin, Flag } from 'lucide-react';
import { COMMUNITY_TAGS, CAMPUS_OPTIONS } from '../../services/communityService';
import StudentAvatar from './StudentAvatar';
import TagIcon from './TagIcon';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Baru tadi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;
  return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
}

export default function ThreadCard({
  thread,
  isUpvoted = false,
  onToggleUpvote,
  onClick,
  onReport
}) {
  const {
    id,
    placeName,
    title,
    body,
    pricePerMeal,
    rating = 5,
    campus,
    tags = [],
    authorName = 'Pelajar',
    authorUniversity,
    createdAt,
    upvoteCount = 0,
    replyCount = 0,
    address,
    isCuratedStarter = false
  } = thread;

  const campusObj = CAMPUS_OPTIONS.find(c => c.id === campus);
  const campusLabel = campusObj ? campusObj.label.split('(')[0].trim() : (campus === 'all' ? 'Umum' : campus);

  const handleUpvoteClick = (e) => {
    e.stopPropagation();
    if (onToggleUpvote) onToggleUpvote(id);
  };

  const handleReportClick = (e) => {
    e.stopPropagation();
    if (onReport) onReport(thread);
  };

  return (
    <article
      className="community-thread-card"
      onClick={() => onClick && onClick(thread)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick(thread);
        }
      }}
    >
      {/* Top Header: Place Name + Price Badge */}
      <div className="thread-card-header">
        <div className="thread-place-meta">
          <div className="thread-place-title-row">
            <h3 className="thread-place-name">{placeName}</h3>
            {isCuratedStarter && (
              <span className="thread-curated-badge" title="Cadangan Makanan Siswa">
                Pilihan Pelajar
              </span>
            )}
          </div>

          <div className="thread-meta-subrow">
            {campusLabel && (
              <span className="thread-campus-badge">
                <MapPin size={11} className="flex-shrink-0" />
                <span>{campusLabel}</span>
              </span>
            )}
            <div className="thread-stars-row" aria-label={`Rating: ${rating} daripada 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  className={`thread-star ${star <= rating ? 'filled' : 'empty'}`}
                />
              ))}
              <span className="thread-rating-num">{Number(rating).toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="thread-price-pill" title="Anggaran harga sepinggan">
          <span className="price-currency">RM</span>
          <span className="price-amount">{Number(pricePerMeal).toFixed(2)}</span>
          <span className="price-sub">/pax</span>
        </div>
      </div>

      {/* Review Content */}
      <div className="thread-card-body">
        <h4 className="thread-post-title">{title}</h4>
        <p className="thread-post-snippet">{body}</p>
      </div>

      {/* Micro-Icon Tags */}
      {tags.length > 0 && (
        <div className="thread-tags-list">
          {tags.map(tagId => {
            const meta = COMMUNITY_TAGS.find(t => t.id === tagId);
            if (!meta) return null;
            return (
              <span key={tagId} className="thread-tag-pill">
                <TagIcon tagId={tagId} iconName={meta.iconName} size={11} className="tag-icon" />
                <span className="tag-label">{meta.label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Optional Address */}
      {address && (
        <div className="thread-address-row">
          <MapPin size={11} className="text-muted flex-shrink-0" />
          <span className="thread-address-text">{address}</span>
        </div>
      )}

      {/* Card Footer: Reddit-style Vote Pill, Comment Count, and Student Monogram */}
      <div className="thread-card-footer">
        <div className="thread-author-info">
          <StudentAvatar name={authorName} size={26} />
          <div className="thread-author-text">
            <span className="author-name">{authorName}</span>
            <span className="author-sub">
              {authorUniversity ? `${authorUniversity} • ` : ''}
              {formatRelativeTime(createdAt)}
            </span>
          </div>
        </div>

        <div className="thread-actions-group">
          {/* Reddit-style Upvote Pill */}
          <button
            type="button"
            className={`reddit-upvote-pill ${isUpvoted ? 'active' : ''}`}
            onClick={handleUpvoteClick}
            aria-label={isUpvoted ? 'Batalkan sukaan' : 'Upvote port ini'}
          >
            <ChevronUp size={15} className="upvote-chevron" />
            <span className="upvote-count">{upvoteCount}</span>
          </button>

          {/* Reply Count Button */}
          <button
            type="button"
            className="thread-action-btn comment-btn"
            onClick={() => onClick && onClick(thread)}
            aria-label={`${replyCount} komen`}
          >
            <MessageSquare size={13} />
            <span className="action-count">{replyCount}</span>
          </button>

          {/* Report Button */}
          <button
            type="button"
            className="thread-report-btn"
            onClick={handleReportClick}
            title="Lapor ulasan"
            aria-label="Lapor ulasan"
          >
            <Flag size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}
