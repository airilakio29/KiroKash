import React, { useState, useEffect } from 'react';
import { X, Star, ThumbsUp, MessageCircle, MapPin, Send, Flag, AlertCircle, Share2, Check } from 'lucide-react';
import { COMMUNITY_TAGS, CAMPUS_OPTIONS, validateReplyInput } from '../../services/communityService';
import TagIcon from './TagIcon';
import StudentAvatar from './StudentAvatar';

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

export default function ThreadDetailModal({
  thread,
  isOpen,
  onClose,
  isUpvoted = false,
  onToggleUpvote,
  onAddReply,
  onReport,
  replies = [],
  user
}) {
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReplyText('');
      setReplyError(null);
      setIsSubmittingReply(false);
      setCopiedLink(false);
    }
  }, [isOpen, thread?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !thread) return null;

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
    authorAvatar = '🎓',
    authorUniversity,
    createdAt,
    upvoteCount = 0,
    replyCount = 0,
    address
  } = thread;

  const campusObj = CAMPUS_OPTIONS.find(c => c.id === campus);
  const campusLabel = campusObj ? campusObj.label : campus;

  const handleCopyShare = () => {
    try {
      const shareText = `Tengok port makan murah ni kat KampusKash: ${placeName} (RM${Number(pricePerMeal).toFixed(2)}) - ${title}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
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

  const currentReplies = Array.isArray(replies) && replies.length > 0 
    ? replies 
    : (Array.isArray(thread.replies) ? thread.replies : []);

  return (
    <div className="community-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="community-modal-box detail-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="community-modal-header">
          <div className="detail-place-header">
            <span className="detail-campus-pill">
              <MapPin size={12} /> {campusLabel}
            </span>
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
              <span className="price-tag-label">Bajet Pelajar</span>
              <div className="price-tag-value">
                <span className="currency">RM</span>
                <span className="num">{Number(pricePerMeal).toFixed(2)}</span>
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
                onClick={() => onToggleUpvote(id)}
              >
                <ThumbsUp size={15} />
                <span>{isUpvoted ? 'Disukai' : 'Suka'} ({upvoteCount})</span>
              </button>

              <button
                type="button"
                className="detail-share-btn"
                onClick={handleCopyShare}
                title="Salin ulasan"
              >
                {copiedLink ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
                <span>{copiedLink ? 'Disalin!' : 'Kongsi'}</span>
              </button>

              <button
                type="button"
                className="detail-report-btn"
                onClick={() => onReport && onReport(thread)}
                title="Lapor ulasan tidak wajar"
              >
                <Flag size={14} />
              </button>
            </div>
          </div>

          {/* Post Content */}
          <div className="detail-post-body-card">
            <h3 className="detail-thread-title">{title}</h3>
            <p className="detail-thread-body">{body}</p>

            {address && (
              <div className="detail-address-box">
                <MapPin size={15} className="text-primary flex-shrink-0" />
                <span className="address-text">{address}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="detail-tags-wrap">
                {tags.map(tagId => {
                  const meta = COMMUNITY_TAGS.find(t => t.id === tagId);
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

            <div className="detail-author-meta">
              <StudentAvatar name={authorName} size={36} />
              <div className="author-details">
                <div className="author-name">{authorName}</div>
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
              <h4>Komen & Tips Tambahan ({currentReplies.length})</h4>
            </div>

            {/* Replies List */}
            {currentReplies.length === 0 ? (
              <div className="empty-replies-card">
                <p>Belum ada komen lagi. Kongsi ulasan atau tips menu murah anda di sini!</p>
              </div>
            ) : (
              <div className="replies-list">
                {currentReplies.map(reply => (
                  <div key={reply.id} className="reply-card">
                    <div className="reply-header">
                      <StudentAvatar name={reply.authorName} size={28} />
                      <div className="reply-author-info">
                        <span className="reply-name">{reply.authorName}</span>
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
                  {user?.avatar || '🎓'}
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
