import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  UserPlus,
  Heart,
  MessageSquare,
  Wallet,
  HandCoins,
  CheckCheck,
  ExternalLink
} from 'lucide-react';
import { useSocialWallet } from '../../context/SocialWalletContext';
import { formatRelativeTime } from '../community/ThreadCard';

export default function NotificationBell({ onNavigateTab }) {
  const {
    notifications,
    unreadCount,
    markNotifRead,
    markAllNotifsRead,
    setSelectedPublicProfileId,
    openWalletReceiptById
  } = useSocialWallet();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'follow':
        return <UserPlus size={15} className="notif-icon follow" />;
      case 'like':
        return <Heart size={15} className="notif-icon like" />;
      case 'comment':
        return <MessageSquare size={15} className="notif-icon comment" />;
      case 'wallet_received':
        return <Wallet size={15} className="notif-icon wallet-received" />;
      case 'wallet_request':
      case 'wallet_request_declined':
        return <HandCoins size={15} className="notif-icon wallet-request" />;
      default:
        return <Bell size={15} className="notif-icon" />;
    }
  };

  const handleNotificationClick = (notif) => {
    markNotifRead(notif.id);
    if (notif.type === 'wallet_received' && notif.receiptId) {
      setIsOpen(false);
      openWalletReceiptById(notif.receiptId);
    } else if (notif.type === 'wallet_request' || notif.type === 'wallet_request_declined') {
      setIsOpen(false);
      if (onNavigateTab) onNavigateTab('wallet');
    } else if (notif.type === 'follow' && notif.actorId) {
      setIsOpen(false);
      setSelectedPublicProfileId(notif.actorId);
    } else if ((notif.type === 'like' || notif.type === 'comment') && onNavigateTab) {
      setIsOpen(false);
      onNavigateTab('community');
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-unread-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-panel card" role="region" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={markAllNotifsRead}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <Bell size={28} />
                <p>No notifications yet. Activity from follows, Spot Jimat, and Wallet transfers will appear here.</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notif);
                    }
                  }}
                >
                  <div className="notification-item-icon">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="notification-item-content">
                    <p className="notification-item-text">{notif.message}</p>
                    <div className="notification-item-footer">
                      <span className="notification-item-time">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                      {(notif.type === 'wallet_received' || notif.type === 'wallet_request') && (
                        <span className="notification-item-cta">
                          {notif.type === 'wallet_received' ? 'View Receipt' : 'Review in Wallet'} <ExternalLink size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                  {!notif.read && <span className="notification-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

