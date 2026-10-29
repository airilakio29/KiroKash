import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ThumbsUp,
  MessageCircle,
  MapPin,
  Send,
  Flag,
  AlertCircle,
  Share2,
  Check,
  Bookmark,
  Pencil,
  Trash2,
  ExternalLink
} from 'lucide-react';
import {
  COMMUNITY_TAGS,
  CAMPUS_OPTIONS,
  validateReplyInput
} from '../../services/communityService';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';
import StudentAvatar from './StudentAvatar';
import { formatRelativeTime } from './ThreadCard';

function formatDetailTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ThreadDetailModal({
  thread,
  isOpen,
  onClose,
  isUpvoted = false,
  isSaved = false,
  currentUserId = null,
  onToggleUpvote,
  onToggleSave,
  onAddReply,
  onReport,
  onReportThread,
  onEditSpot,
  onDeleteSpot,
  onOpenAuthorProfile,
  replies = [],
  user
}) {
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const modalOpen = isOpen !== undefined ? isOpen : Boolean(thread);

  useEffect(() => {
    if (modalOpen) {
      setReplyText('');
      setReplyError(null);
      setIsSubmittingReply(false);
      setCopiedLink(false);
    }
  }, [modalOpen, thread?.id]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, onClose]);

  if (!modalOpen || !thread) return null;

  const {
    id,
    placeName: rawPlaceName,
    stallName,
    category = 'makan',
    budgetTag,
    title,
    body,
    shortTip,
    pricePerMeal,
    priceRM,
    price,
    rating = 5,
    campus,
    campusArea,
    tags = [],
    authorId,
    authorName = 'Pelajar',
    authorUsername,
    authorHandle,
    authorUniversity,
    createdAt,
    upvoteCount,
    upvotes,
    address,
    locationAddress,
    mapLink,
    locationMapUrl,
    photoUrl
  } = thread;

  const placeName = rawPlaceName || stallName || 'Spot Kampus';
  const resolvedPrice = Number(pricePerMeal ?? priceRM ?? price ?? 0);
  const resolvedUpvotes = Number(upvoteCount ?? upvotes ?? 0);
  const resolvedAddress = address || locationAddress || null;
  const resolvedMapUrl = mapLink || locationMapUrl || null;
  const resolvedHandle = authorUsername || authorHandle || '';
  const activeUserId = currentUserId || user?.id || user?.uid || null;
  const isOwner = Boolean(activeUserId && authorId === activeUserId);

  const campusObj = CAMPUS_OPTIONS.find((c) => c.id === campus);
  const campusLabel = campusObj ? campusObj.label : campusArea || campus || 'Malaysia';
  const categoryMeta =
    SPOT_CATEGORIES.find((c) => c.id === (category || 'makan')) || SPOT_CATEGORIES[0];
  const budgetMeta = SPOT_BUDGET_TAGS.find((b) => b.id === budgetTag);

  const handleCopyShare = () => {
    try {
      const shareText = `Tengok spot jimat ni kat KampusKash: ${placeName} (RM${resolvedPrice.toFixed(2)}) - ${title}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    setReplyError(null);

    const validation = validateReplyInput(replyText);
    if (!validation.valid) {
      setReplyError(validation.errors.join(' '));
      return;
    }

    try {
      setIsSubmittingReply(true);
      await onAddReply(id, replyText);
      setReplyText('');
    } catch (err) {
      setReplyError(err.message || 'Gagal menghantar komen.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReportClick = () => {
    if (onReport) {
      onReport(thread);
    } else if (onReportThread) {
      onReportThread(id, 'Inappropriate or inaccurate information');
    }
  };

  const currentReplies =
    Array.isArray(replies) && replies.length > 0
      ? replies
      : Array.isArray(thread.replies)
      ? thread.replies
      : [];

  return (
    <div className="community-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="community-modal-box detail-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header (Exact 6c4f2e9 structure) */}
        <div className="community-modal-header">
          <div className="detail-place-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span className="detail-campus-pill">
                <MapPin size={12} /> {campusLabel}
              </span>
              <span className="thread-category-badge">
                <TagIcon tagId={categoryMeta.id} iconName={categoryMeta.iconName} size={11} />
                <span>{categoryMeta.label}</span>
              </span>
            </div>
            <h2 className="detail-place-name">{placeName}</h2>
          </div>
          <button
            type="button"
            className="community-modal-close-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="detail-modal-content">
          {/* Main Info Strip */}
          <div className="detail-info-strip">
            <div className="detail-price-box">
              <span className="price-tag-label">
                {budgetMeta ? budgetMeta.label : 'Bajet Pelajar'}
              </span>
              <div className="price-tag-value">
                <span className="currency">RM</span>
                <span className="num">{resolvedPrice.toFixed(2)}</span>
                <span className="sub">/pax</span>
              </div>
            </div>

            <div className="detail-rating-box">
              <span className="rating-tag-label">Rating</span>
              <div className="detail-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={`detail-star ${star <= rating ? 'filled' : 'empty'}`}
                  />
                ))}
                <span className="rating-text">{Number(rating).toFixed(1)}/5</span>
              </div>
            </div>

            <div className="detail-actions-strip">
              <button
                type="button"
                className={`detail-upvote-btn ${isUpvoted ? 'active' : ''}`}
                onClick={() => onToggleUpvote && onToggleUpvote(id)}
              >
                <ThumbsUp size={15} />
                <span>{isUpvoted ? 'Disukai' : 'Suka'} ({resolvedUpvotes})</span>
              </button>

              {onToggleSave && (
                <button
                  type="button"
                  className={`detail-share-btn ${isSaved ? 'active' : ''}`}
                  onClick={() => onToggleSave(id)}
                  title={isSaved ? 'Disimpan' : 'Simpan spot'}
                >
                  <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                  <span>{isSaved ? 'Disimpan' : 'Simpan'}</span>
                </button>
              )}

              <button
                type="button"
                className="detail-share-btn"
                onClick={handleCopyShare}
                title="Salin ulasan"
              >
                {copiedLink ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
                <span>{copiedLink ? 'Disalin!' : 'Kongsi'}</span>
              </button>

              {isOwner && onEditSpot && (
                <button
                  type="button"
                  className="detail-share-btn"
                  onClick={() => onEditSpot(thread)}
                  title="Kemaskini spot anda"
                >
                  <Pencil size={14} />
                </button>
              )}

              {isOwner && onDeleteSpot && (
                <button
                  type="button"
                  className="detail-report-btn"
                  onClick={() => onDeleteSpot(thread)}
                  title="Padam spot anda"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                type="button"
                className="detail-report-btn"
                onClick={handleReportClick}
                title="Lapor ulasan tidak wajar"
              >
                <Flag size={14} />
              </button>
            </div>
          </div>

          {/* Post Content */}
          <div className="detail-post-body-card">
            <h3 className="detail-thread-title">{title}</h3>
            <p className="detail-thread-body">{body || shortTip}</p>

            {photoUrl && (
              <img
                src={photoUrl}
                alt={title}
                className="thread-photo-thumb"
                style={{ maxHeight: '260px', marginBottom: '1rem' }}
              />
            )}

            {(resolvedAddress || resolvedMapUrl) && (
              <div className="detail-address-box" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} className="text-primary flex-shrink-0" />
                  <span className="address-text">{resolvedAddress || placeName}</span>
                </div>
                {resolvedMapUrl && (
                  <a
                    href={resolvedMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={13} /> Buka Peta
                  </a>
                )}
              </div>
            )}

            {tags.length > 0 && (
              <div className="detail-tags-wrap">
                {tags.map((tagId) => {
                  const meta = COMMUNITY_TAGS.find((t) => t.id === tagId);
                  if (!meta) return null;
                  return (
                    <span key={tagId} className="detail-tag-chip">
                      <TagIcon tagId={tagId} iconName={meta.iconName} size={12} className="tag-icon" />
                      <span className="tag-name">{meta.label}</span>
                    </span>
                  );
                })}
              </div>
            )}

            <div
              className="detail-author-meta"
              onClick={() =>
                onOpenAuthorProfile &&
                onOpenAuthorProfile(authorId || resolvedHandle || authorName, thread)
              }
              style={{ cursor: onOpenAuthorProfile ? 'pointer' : 'default' }}
              title={onOpenAuthorProfile ? `Lihat profil awam ${authorName}` : undefined}
            >
              <StudentAvatar name={authorName} size={36} />
              <div className="author-details">
                <div className="author-name">
                  {authorName}
                  {resolvedHandle ? ` (@${String(resolvedHandle).replace(/^@/, '')})` : ''}
                </div>
                <div className="author-university">
                  {authorUniversity || 'Pelajar Kampus'} • {formatDetailTime(createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <section className="detail-replies-section">
            <div className="replies-header">
              <MessageCircle size={18} className="text-primary" />
              <h4>Komen &amp; Tips Tambahan ({currentReplies.length})</h4>
            </div>

            {/* Replies List */}
            {currentReplies.length === 0 ? (
              <div className="empty-replies-card">
                <p>Belum ada komen lagi. Kongsi ulasan atau tips jimat anda di sini!</p>
              </div>
            ) : (
              <div className="replies-list">
                {currentReplies.map((reply) => (
                  <div key={reply.id} className="reply-card">
                    <div
                      className="reply-header"
                      onClick={() =>
                        onOpenAuthorProfile &&
                        onOpenAuthorProfile(
                          reply.authorId || reply.authorUsername || reply.authorHandle || reply.authorName,
                          reply
                        )
                      }
                      style={{ cursor: onOpenAuthorProfile ? 'pointer' : 'default' }}
                    >
                      <StudentAvatar name={reply.authorName || 'Pelajar'} size={28} />
                      <div className="reply-author-info">
                        <span className="reply-name">
                          {reply.authorName || 'Pelajar'}
                          {(reply.authorUsername || reply.authorHandle) &&
                            ` (@${String(reply.authorUsername || reply.authorHandle).replace(/^@/, '')})`}
                        </span>
                        <span className="reply-sub">
                          {reply.authorUniversity ? `${reply.authorUniversity} • ` : ''}
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="reply-body-text">{reply.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Compose Form */}
            <form onSubmit={handleReplySubmit} className="reply-compose-form">
              {replyError && (
                <div className="reply-error-alert">
                  <AlertCircle size={15} />
                  <span>{replyError}</span>
                </div>
              )}
              <div className="reply-input-wrapper">
                <div className="current-user-avatar">
                  <StudentAvatar name={user?.username || 'Saya'} size={28} />
                </div>
                <input
                  type="text"
                  className="reply-input"
                  placeholder="Tulis tips atau respon anda (cth: kuah banjir percuma!)..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={600}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-send-reply"
                  disabled={isSubmittingReply || replyText.trim().length < 2}
                  aria-label="Hantar komen"
                >
                  <Send size={15} />
                  <span>Hantar</span>
                </button>
              </div>
              <div className="reply-char-hint">
                <span>{replyText.length}/600 aksara</span>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
