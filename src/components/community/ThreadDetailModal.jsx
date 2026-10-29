import React, { useState } from 'react';
import {
  X,
  MapPin,
  Store,
  Heart,
  MessageSquare,
  Flag,
  Send,
  Clock,
  CheckCircle2,
  Bookmark,
  GraduationCap,
  Lightbulb,
  ExternalLink,
  Pencil,
  Trash2
} from 'lucide-react';
import { getAvatarSvg } from '../Avatars';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';
import { formatRelativeTime } from './ThreadCard';

export default function ThreadDetailModal({
  thread,
  isUpvoted,
  isSaved = false,
  currentUserId = null,
  onClose,
  onToggleUpvote,
  onToggleSave,
  onAddReply,
  onReportThread,
  onEditSpot,
  onDeleteSpot,
  onOpenAuthorProfile,
  isAuthenticated
}) {
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Price or stall info is outdated');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  if (!thread) return null;

  const replies = Array.isArray(thread.replies) ? thread.replies : [];
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
  const mapUrl =
    thread.locationMapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${placeName} ${thread.locationAddress || ''} ${thread.campusArea || ''}`.trim()
    )}`;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replyText.trim().length < 2) {
      setReplyError('Please enter at least 2 characters.');
      return;
    }
    setReplyError('');
    setIsSendingReply(true);
    try {
      await onAddReply(thread.id, replyText.trim());
      setReplyText('');
    } catch (err) {
      setReplyError(err?.message || 'Failed to post comment.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    await onReportThread(thread.id, reportReason);
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportForm(false);
    }, 1800);
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div
        className="community-modal-content community-detail-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="community-modal-header">
          <div className="spot-detail-header-badges">
            <span className="spot-category-badge inline">
              <TagIcon iconName={categoryMeta.icon} size={13} />
              <span>{categoryMeta.label}</span>
            </span>
            <div className="community-campus-badge">
              <MapPin size={14} />
              <span>{thread.campusArea}</span>
            </div>
            {thread.studentPrice && (
              <span className="spot-student-price-badge inline">
                <GraduationCap size={13} />
                <span>Student Price</span>
              </span>
            )}
          </div>
          <button
            type="button"
            className="community-modal-close"
            onClick={onClose}
            aria-label="Close spot details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="community-detail-body">
          {thread.photoUrl && (
            <div className="spot-detail-photo-banner">
              <img
                src={thread.photoUrl}
                alt={thread.title}
                className="spot-detail-photo"
              />
            </div>
          )}

          <div className="detail-top-row">
            <h2 className="detail-title">{thread.title}</h2>
            <div className="spot-price-stack">
              <div className="community-price-badge large">
                <span className="price-value">{displayPrice}</span>
              </div>
              <span className="spot-budget-pill">{budgetMeta.label}</span>
            </div>
          </div>

          <div className="detail-stall-box">
            <div className="detail-stall-item">
              <Store size={16} />
              <div>
                <span className="detail-stall-label">Place / Venue</span>
                <strong className="detail-stall-value">{placeName}</strong>
              </div>
            </div>
            {thread.locationAddress && (
              <div className="detail-stall-item">
                <MapPin size={16} />
                <div>
                  <span className="detail-stall-label">Location & Landmark</span>
                  <strong className="detail-stall-value">{thread.locationAddress}</strong>
                </div>
              </div>
            )}
            <div className="detail-stall-item">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="spot-map-link-btn"
              >
                <ExternalLink size={14} />
                <span>Open in Maps</span>
              </a>
            </div>
          </div>

          {thread.shortTip && (
            <div className="spot-short-tip-box detail">
              <Lightbulb size={16} className="spot-tip-icon" />
              <div>
                <strong>Insider Student Tip:</strong> {thread.shortTip}
              </div>
            </div>
          )}

          <p className="detail-description">{thread.body}</p>

          {/* Author & Actions Bar */}
          <div className="detail-author-bar">
            <button
              type="button"
              className="community-author-info clickable-author"
              onClick={() =>
                onOpenAuthorProfile &&
                onOpenAuthorProfile(thread.authorId || thread.authorHandle || thread.authorName, thread)
              }
            >
              <div className="community-author-avatar">
                {getAvatarSvg(thread.authorAvatar || 'cat')}
              </div>
              <div className="community-author-meta">
                <span className="author-name">
                  {thread.authorName || 'Student'}
                  {thread.authorHandle && (
                    <span className="author-handle-inline"> @{String(thread.authorHandle).replace(/^@/, '')}</span>
                  )}
                </span>
                <span className="post-time">
                  <Clock size={11} />
                  Posted {formatRelativeTime(thread.createdAt)} • View Profile
                </span>
              </div>
            </button>

            <div className="detail-action-buttons">
              <button
                type="button"
                className={`community-upvote-btn ${isUpvoted ? 'upvoted' : ''}`}
                onClick={() => onToggleUpvote(thread.id)}
              >
                <Heart size={15} fill={isUpvoted ? 'currentColor' : 'none'} />
                <span>Like ({thread.upvotes || 0})</span>
              </button>

              <button
                type="button"
                className={`spot-save-btn detail ${isSaved ? 'saved' : ''}`}
                onClick={() => onToggleSave && onToggleSave(thread.id)}
              >
                <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              {isOwner && (
                <>
                  <button
                    type="button"
                    className="community-report-btn"
                    onClick={() => onEditSpot && onEditSpot(thread)}
                    title="Edit your spot"
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="community-report-btn danger"
                    onClick={() => onDeleteSpot && onDeleteSpot(thread)}
                    title="Delete your spot"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="community-report-btn"
                onClick={() => setShowReportForm((prev) => !prev)}
                title="Report inaccurate or inappropriate spot"
              >
                <Flag size={14} />
                <span>Report</span>
              </button>
            </div>
          </div>

          {/* Report Inline Box */}
          {showReportForm && (
            <div className="community-report-panel">
              {reportSubmitted ? (
                <div className="report-success-msg">
                  <CheckCircle2 size={16} />
                  <span>Thanks! Our student moderators will review this spot.</span>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="report-form-inline">
                  <label htmlFor="report-reason">Why are you reporting this spot?</label>
                  <div className="report-controls">
                    <select
                      id="report-reason"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    >
                      <option value="Price or stall info is outdated">Price or place info is outdated</option>
                      <option value="Stall is permanently closed">Place is permanently closed</option>
                      <option value="Spam or commercial advertisement">Spam or commercial advertisement</option>
                      <option value="Inappropriate content">Inappropriate content</option>
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="detail-replies-section">
            <h3 className="replies-heading">
              <MessageSquare size={16} />
              <span>Student Comments ({replies.length})</span>
            </h3>

            {replies.length === 0 ? (
              <div className="replies-empty">
                No comments yet. Visited this spot recently? Share your tip!
              </div>
            ) : (
              <div className="replies-list">
                {replies.map((reply) => (
                  <div key={reply.id} className="reply-item">
                    <button
                      type="button"
                      className="reply-avatar clickable-avatar-btn"
                      onClick={() =>
                        onOpenAuthorProfile &&
                        onOpenAuthorProfile(reply.authorId || reply.authorHandle || reply.authorName, reply)
                      }
                      title={`View ${reply.authorName}'s profile`}
                    >
                      {getAvatarSvg(reply.authorAvatar || 'bear')}
                    </button>
                    <div className="reply-content">
                      <div className="reply-meta">
                        <button
                          type="button"
                          className="reply-author-link"
                          onClick={() =>
                            onOpenAuthorProfile &&
                            onOpenAuthorProfile(reply.authorId || reply.authorHandle || reply.authorName, reply)
                          }
                        >
                          <strong className="reply-author">{reply.authorName || 'Student'}</strong>
                          {reply.authorHandle && (
                            <span className="author-handle-inline"> @{String(reply.authorHandle).replace(/^@/, '')}</span>
                          )}
                        </button>
                        <span className="reply-time">{formatRelativeTime(reply.createdAt)}</span>
                      </div>
                      <p className="reply-text">{reply.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleReplySubmit} className="detail-reply-form">
          {replyError && <div className="reply-error-msg">{replyError}</div>}
          <div className="reply-input-row">
            <input
              type="text"
              placeholder={
                isAuthenticated
                  ? 'Add a comment, confirm price, or share a tip...'
                  : 'Sign in to post a comment'
              }
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                if (replyError) setReplyError('');
              }}
              maxLength={400}
              disabled={!isAuthenticated || isSendingReply}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isAuthenticated || isSendingReply || !replyText.trim()}
            >
              <Send size={15} />
              <span>Comment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
