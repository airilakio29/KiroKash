import React from 'react';
import {
  Star,
  ChevronUp,
  MessageSquare,
  MapPin,
  Flag,
  Bookmark,
  Navigation,
  GraduationCap
} from 'lucide-react';
import { COMMUNITY_TAGS, CAMPUS_OPTIONS } from '../../services/communityService';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';
import StudentAvatar from './StudentAvatar';

export function formatRelativeTime(isoString) {
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

  return date.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'short'
  });
}

export default function ThreadCard({
  thread,
  isUpvoted = false,
  isSaved = false,
  onToggleUpvote,
  onToggleSave,
  onClick,
  onSelectThread,
  onOpenAuthorProfile,
  onReport
}) {
  if (!thread) return null;

  const {
    id,
    placeName: rawPlaceName,
    stallName,
    title,
    body,
    shortTip,
    pricePerMeal,
    priceRM,
    price,
    rating = 5,
    campus,
    campusArea,
    category = 'makan',
    budgetTag,
    studentPrice = false,
    photoUrl = null,
    tags = [],
    authorId,
    authorName = 'Pelajar',
    authorUsername,
    authorHandle,
    authorUniversity,
    createdAt,
    upvoteCount,
    upvotes,
    replyCount: rawReplyCount,
    replies,
    address,
    locationAddress,
    distanceKm,
    isCuratedStarter = false
  } = thread;

  const placeName = rawPlaceName || stallName || 'Spot Kampus';
  const resolvedPrice = Number(pricePerMeal ?? priceRM ?? price ?? 0);
  const resolvedUpvotes = Number(upvoteCount ?? upvotes ?? 0);
  const resolvedReplies = Array.isArray(replies)
    ? replies.length
    : Number(rawReplyCount || 0);
  const resolvedAddress = address || locationAddress || null;
  const resolvedHandle = authorUsername || authorHandle || '';

  const campusObj = CAMPUS_OPTIONS.find((c) => c.id === campus);
  const campusLabel = campusObj
    ? campusObj.label.split('(')[0].trim()
    : campus === 'all'
    ? 'Umum'
    : campusArea || campus || 'Kampus';

  const categoryMeta =
    SPOT_CATEGORIES.find((c) => c.id === (category || 'makan')) || SPOT_CATEGORIES[0];
  const budgetMeta = SPOT_BUDGET_TAGS.find((b) => b.id === budgetTag);

  const handleCardOpen = () => {
    if (onClick) onClick(thread);
    else if (onSelectThread) onSelectThread(thread);
  };

  const handleUpvoteClick = (e) => {
    e.stopPropagation();
    if (onToggleUpvote) onToggleUpvote(id);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(id);
  };

  const handleReportClick = (e) => {
    e.stopPropagation();
    if (onReport) onReport(thread);
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (onOpenAuthorProfile) {
      onOpenAuthorProfile(authorId || resolvedHandle || authorName, thread);
    }
  };

  return (
    <article
      className="community-thread-card"
      onClick={handleCardOpen}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardOpen();
        }
      }}
    >
      {/* Top Header: Place Name + Price Badge (Exact 6c4f2e9 structure) */}
      <div className="thread-card-header">
        <div className="thread-place-meta">
          <div className="thread-place-title-row">
            <h3 className="thread-place-name">{placeName}</h3>
            <span className="thread-category-badge" title={categoryMeta.description}>
              <TagIcon tagId={categoryMeta.id} iconName={categoryMeta.iconName} size={10} />
              <span>{categoryMeta.label}</span>
            </span>
            {isCuratedStarter && (
              <span className="thread-curated-badge" title="Cadangan Spot Siswa">
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
            {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm < 9000 && (
              <span className="thread-campus-badge" title="Anggaran jarak dari lokasi anda">
                <Navigation size={10} className="flex-shrink-0" />
                <span>{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`}</span>
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

        <div className="thread-price-pill" title={budgetMeta ? budgetMeta.label : 'Anggaran harga'}>
          <span className="price-currency">RM</span>
          <span className="price-amount">{resolvedPrice.toFixed(2)}</span>
          <span className="price-sub">/pax</span>
        </div>
      </div>

      {/* Review Content */}
      <div className="thread-card-body">
        <h4 className="thread-post-title">{title}</h4>
        <p className="thread-post-snippet">{body || shortTip}</p>
        {photoUrl && (
          <img
            src={photoUrl}
            alt={title}
            className="thread-photo-thumb"
            loading="lazy"
          />
        )}
      </div>

      {/* Micro-Icon Tags + Budget Tag + Student Price */}
      <div className="thread-tags-list">
        {budgetMeta && (
          <span className="thread-tag-pill">
            <TagIcon tagId="bawah-rm10" iconName="Banknote" size={11} className="tag-icon" />
            <span className="tag-label">{budgetMeta.label}</span>
          </span>
        )}
        {studentPrice && !tags.includes('student-deal') && (
          <span className="thread-tag-pill">
            <GraduationCap size={11} className="tag-icon" />
            <span className="tag-label">Harga Pelajar</span>
          </span>
        )}
        {tags.map((tagId) => {
          const meta = COMMUNITY_TAGS.find((t) => t.id === tagId);
          if (!meta) return null;
          return (
            <span key={tagId} className="thread-tag-pill">
              <TagIcon tagId={tagId} iconName={meta.iconName} size={11} className="tag-icon" />
              <span className="tag-label">{meta.label}</span>
            </span>
          );
        })}
      </div>

      {/* Optional Address */}
      {resolvedAddress && (
        <div className="thread-address-row">
          <MapPin size={11} className="text-muted flex-shrink-0" />
          <span className="thread-address-text">{resolvedAddress}</span>
        </div>
      )}

      {/* Card Footer: Reddit-style Vote Pill, Comment Count, Save Button, and Student Monogram */}
      <div className="thread-card-footer">
        <div
          className="thread-author-info"
          onClick={handleAuthorClick}
          role={onOpenAuthorProfile ? 'button' : undefined}
          tabIndex={onOpenAuthorProfile ? 0 : undefined}
          style={{ cursor: onOpenAuthorProfile ? 'pointer' : 'default' }}
          title={onOpenAuthorProfile ? `Lihat profil awam ${authorName}` : undefined}
        >
          <StudentAvatar name={authorName} size={26} />
          <div className="thread-author-text">
            <span className="author-name">
              {authorName}
              {resolvedHandle ? ` (@${String(resolvedHandle).replace(/^@/, '')})` : ''}
            </span>
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
            aria-label={isUpvoted ? 'Batalkan sukaan' : 'Upvote spot ini'}
          >
            <ChevronUp size={15} className="upvote-chevron" />
            <span className="upvote-count">{resolvedUpvotes}</span>
          </button>

          {/* Reply Count Button */}
          <button
            type="button"
            className="thread-action-btn comment-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCardOpen();
            }}
            aria-label={`${resolvedReplies} komen`}
          >
            <MessageSquare size={13} />
            <span className="action-count">{resolvedReplies}</span>
          </button>

          {/* Save / Bookmark Button */}
          {onToggleSave && (
            <button
              type="button"
              className={`thread-action-btn save-btn ${isSaved ? 'active' : ''}`}
              onClick={handleSaveClick}
              title={isSaved ? 'Disimpan ke penanda buku' : 'Simpan spot'}
              aria-label={isSaved ? 'Buang dari simpanan' : 'Simpan spot'}
            >
              <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}

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
