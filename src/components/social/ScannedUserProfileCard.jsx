import React, { useState } from 'react';
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Users,
  MapPin,
  GraduationCap,
  Award,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  MessageSquare,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocialWallet } from '../../context/SocialWalletContext';
import { useToast } from '../../context/ToastContext';
import UserAvatar from '../UserAvatar';
import { PROFILE_ACHIEVEMENTS } from '../../config/appConstants';

export default function ScannedUserProfileCard({
  resolution,
  onScanAnother,
  onViewFullProfile,
  onMessageFriend
}) {
  const { user } = useAuth();
  const toast = useToast();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriendshipStatus,
    getMutualFriends,
    getPublicProfileForViewer,
    setSelectedPublicProfileId
  } = useSocialWallet();

  const [busyAction, setBusyAction] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState('');

  if (!resolution) return null;

  const rawProfile = resolution.profile;
  const profile = rawProfile?.id
    ? getPublicProfileForViewer(rawProfile.id) || rawProfile
    : null;

  // Live relationship state so actions immediately update UI without requiring a re-scan
  const liveRelationship =
    profile?.id && user?.id
      ? getFriendshipStatus(profile.id)
      : resolution.relationship || { status: 'none', canSendRequest: true };

  const liveMutualFriends =
    profile?.id && user?.id && profile.id !== user.id
      ? getMutualFriends(profile.id)
      : resolution.mutualFriends || [];

  const isSelfScan =
    resolution.code === 'self_scan' || (user?.id && profile?.id && user.id === profile.id);

  // Determine effective state code based on live relationship
  let stateCode = resolution.code;
  if (resolution.ok && profile && !isSelfScan) {
    if (liveRelationship?.status === 'friends') {
      stateCode = 'already_friends';
    } else if (liveRelationship?.status === 'outgoing_pending') {
      stateCode = 'request_already_sent';
    } else if (liveRelationship?.status === 'incoming_pending') {
      stateCode = 'incoming_request_exists';
    } else if (liveRelationship?.isBlocked) {
      stateCode = 'account_unavailable';
    } else {
      stateCode = 'can_connect';
    }
  }

  // Case: Invalid QR or Account Unavailable
  if (!resolution.ok || stateCode === 'invalid_qr' || stateCode === 'account_unavailable' || !profile) {
    return (
      <div
        className="kk-scanned-profile-card kk-scanned-profile-card--error"
        style={{
          background: 'linear-gradient(155deg, rgba(30, 22, 56, 0.96), rgba(18, 13, 36, 0.98))',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 20,
          padding: '22px 18px',
          color: '#F8FAFC',
          boxShadow: '0 16px 38px rgba(0, 0, 0, 0.45)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F87171',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#FCA5A5' }}>
              {stateCode === 'account_unavailable'
                ? 'KampusKash Account Unavailable'
                : 'Unrecognised QR Code'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              {resolution.qrCodeId ? `QR ID: ${resolution.qrCodeId}` : 'KampusKash Friend Discovery'}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.55, margin: '0 0 16px' }}>
          {resolution.message ||
            'This QR code could not be matched to an active KampusKash student profile.'}
        </p>

        {onScanAnother && (
          <button
            type="button"
            onClick={onScanAnother}
            style={{
              width: '100%',
              minHeight: 44,
              borderRadius: 12,
              border: '1px solid rgba(167, 139, 250, 0.4)',
              background: 'rgba(139, 92, 246, 0.18)',
              color: '#E9D5FF',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} /> Scan Another QR
          </button>
        )}
      </div>
    );
  }

  const handleAddFriend = async () => {
    if (!user?.id) {
      toast?.error?.('Please sign in to send a friend request.');
      return;
    }
    setBusyAction('add');
    setFeedbackBanner('');
    try {
      await sendFriendRequest(profile.id);
      const msg = `Friend request sent to ${profile.displayName} (@${profile.handle})!`;
      setFeedbackBanner(msg);
      toast?.success?.(msg);
    } catch (err) {
      toast?.error?.(err?.message || 'Could not send friend request.');
    } finally {
      setBusyAction('');
    }
  };

  const handleCancelRequest = async () => {
    setBusyAction('cancel');
    setFeedbackBanner('');
    try {
      await cancelFriendRequest(liveRelationship?.requestId || profile.id);
      const msg = `Cancelled friend request to @${profile.handle}.`;
      setFeedbackBanner(msg);
      toast?.info?.(msg);
    } catch (err) {
      toast?.error?.(err?.message || 'Could not cancel friend request.');
    } finally {
      setBusyAction('');
    }
  };

  const handleAcceptRequest = async () => {
    setBusyAction('accept');
    setFeedbackBanner('');
    try {
      await acceptFriendRequest(liveRelationship?.requestId || profile.id);
      const msg = `You and ${profile.displayName} (@${profile.handle}) are now friends!`;
      setFeedbackBanner(msg);
      toast?.success?.(msg);
    } catch (err) {
      toast?.error?.(err?.message || 'Could not accept friend request.');
    } finally {
      setBusyAction('');
    }
  };

  const handleDeclineRequest = async () => {
    setBusyAction('decline');
    setFeedbackBanner('');
    try {
      await rejectFriendRequest(liveRelationship?.requestId || profile.id);
      const msg = `Declined friend request from @${profile.handle}.`;
      setFeedbackBanner(msg);
      toast?.info?.(msg);
    } catch (err) {
      toast?.error?.(err?.message || 'Could not decline friend request.');
    } finally {
      setBusyAction('');
    }
  };

  const handleOpenProfileModal = () => {
    if (onViewFullProfile) {
      onViewFullProfile(profile.id);
    } else if (setSelectedPublicProfileId) {
      setSelectedPublicProfileId(profile.id);
    }
  };

  const achievementBadges = (profile.achievements || [])
    .map((id) => PROFILE_ACHIEVEMENTS?.find((a) => a.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      className="kk-scanned-profile-card"
      style={{
        background: 'linear-gradient(155deg, rgba(35, 25, 66, 0.97), rgba(18, 13, 38, 0.99))',
        border: '1px solid rgba(167, 139, 250, 0.35)',
        borderRadius: 22,
        padding: '20px 18px',
        color: '#F8FAFC',
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Top Verified Identity Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            background: 'rgba(139, 92, 246, 0.18)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            color: '#DDD6FE',
            fontSize: 11,
            fontWeight: 700
          }}
        >
          <QrCode size={13} /> KampusKash Personal Identity
        </span>

        {profile.qrCodeId && (
          <span
            style={{
              fontSize: 11,
              color: '#94A3B8',
              fontFamily: 'monospace',
              background: 'rgba(15, 23, 42, 0.55)',
              padding: '3px 8px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.16)'
            }}
          >
            {profile.qrCodeId}
          </span>
        )}
      </div>

      {/* Main Profile Identity Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 14
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            padding: 3,
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#1E1B4B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserAvatar
              user={{
                username: profile.displayName,
                avatarId: profile.avatarId || 'cat',
                photoURL: profile.photoURL
              }}
              size={58}
            />
          </div>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap'
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.25,
                overflowWrap: 'anywhere'
              }}
            >
              {profile.displayName}
            </h3>
            <ShieldCheck size={16} style={{ color: '#A78BFA', flexShrink: 0 }} />
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#C4B5FD',
              marginTop: 2,
              overflowWrap: 'anywhere'
            }}
          >
            @{profile.handle}
          </div>

          {profile.university && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: '#CBD5E1',
                marginTop: 5
              }}
            >
              <MapPin size={12} style={{ color: '#A78BFA', flexShrink: 0 }} />
              <span style={{ overflowWrap: 'anywhere' }}>{profile.university}</span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Course, Bio & Achievements */}
      {profile.course && !profile.isRestrictedView && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#E2E8F0',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '7px 11px',
            borderRadius: 10,
            marginBottom: 10
          }}
        >
          <GraduationCap size={14} style={{ color: '#A78BFA', flexShrink: 0 }} />
          <span style={{ overflowWrap: 'anywhere' }}>{profile.course}</span>
        </div>
      )}

      {profile.bio && !profile.isRestrictedView && (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: '#E2E8F0',
            lineHeight: 1.5,
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            borderRadius: 12,
            padding: '10px 12px',
            fontStyle: 'italic',
            overflowWrap: 'anywhere'
          }}
        >
          “{profile.bio}”
        </p>
      )}

      {/* Stats & Mutual Friends Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: '#CBD5E1',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '5px 10px',
            borderRadius: 999
          }}
        >
          <Users size={12} style={{ color: '#A78BFA' }} />
          <strong>{profile.friendsCount || 0}</strong> Friends
        </span>

        {!isSelfScan && liveMutualFriends.length > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: '#DDD6FE',
              background: 'rgba(139, 92, 246, 0.18)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              padding: '5px 10px',
              borderRadius: 999,
              fontWeight: 600
            }}
          >
            {liveMutualFriends.length} Mutual Friend{liveMutualFriends.length === 1 ? '' : 's'}
          </span>
        )}

        {achievementBadges.map((badge) => (
          <span
            key={badge.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: '#FDE68A',
              background: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              padding: '4px 9px',
              borderRadius: 999,
              fontWeight: 600
            }}
          >
            <Award size={11} /> {badge.label}
          </span>
        ))}
      </div>

      {/* Contextual Relationship Status Banner */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          marginBottom: 14,
          fontSize: 12.5,
          lineHeight: 1.45,
          background:
            stateCode === 'already_friends'
              ? 'rgba(16, 185, 129, 0.14)'
              : stateCode === 'incoming_request_exists'
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(139, 92, 246, 0.14)',
          border:
            stateCode === 'already_friends'
              ? '1px solid rgba(16, 185, 129, 0.35)'
              : stateCode === 'incoming_request_exists'
              ? '1px solid rgba(245, 158, 11, 0.35)'
              : '1px solid rgba(167, 139, 250, 0.3)',
          color:
            stateCode === 'already_friends'
              ? '#A7F3D0'
              : stateCode === 'incoming_request_exists'
              ? '#FDE68A'
              : '#E9D5FF'
        }}
      >
        {feedbackBanner ||
          (isSelfScan
            ? 'This is your own KampusKash Personal QR code. Share it with friends so they can scan and connect with you!'
            : stateCode === 'already_friends'
            ? `You and ${profile.displayName} (@${profile.handle}) are connected as friends on KampusKash.`
            : stateCode === 'request_already_sent'
            ? `Friend request sent to @${profile.handle}. Waiting for them to accept.`
            : stateCode === 'incoming_request_exists'
            ? `${profile.displayName} (@${profile.handle}) sent you a friend request! Accept below to connect.`
            : `Scan complete! Send a friend request to connect with ${profile.displayName} on KampusKash Connect.`)}
      </div>

      {/* Primary Relationship Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {isSelfScan && (
          <button
            type="button"
            onClick={handleOpenProfileModal}
            style={{
              width: '100%',
              minHeight: 44,
              borderRadius: 12,
              border: '1px solid rgba(167, 139, 250, 0.45)',
              background: 'rgba(139, 92, 246, 0.22)',
              color: '#F3E8FF',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Eye size={16} /> Preview My Public Profile
          </button>
        )}

        {!isSelfScan && stateCode === 'can_connect' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busyAction === 'add' || liveRelationship?.canSendRequest === false}
              onClick={handleAddFriend}
              style={{
                flex: '1 1 180px',
                minHeight: 46,
                borderRadius: 12,
                border: 'none',
                background:
                  liveRelationship?.canSendRequest === false
                    ? 'rgba(100, 116, 139, 0.35)'
                    : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: liveRelationship?.canSendRequest === false ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 22px rgba(139, 92, 246, 0.35)'
              }}
            >
              <UserPlus size={17} />
              {busyAction === 'add'
                ? 'Sending Request...'
                : liveRelationship?.canSendRequest === false
                ? 'Requests Restricted'
                : 'Add Friend'}
            </button>

            <button
              type="button"
              onClick={handleOpenProfileModal}
              style={{
                flex: '1 1 130px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.28)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#E2E8F0',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Eye size={15} /> View Profile
            </button>
          </div>
        )}

        {!isSelfScan && stateCode === 'request_already_sent' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled
              style={{
                flex: '1 1 160px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(167, 139, 250, 0.45)',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#DDD6FE',
                fontSize: 13.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                cursor: 'default'
              }}
            >
              <Clock size={16} /> Request Sent
            </button>

            <button
              type="button"
              disabled={busyAction === 'cancel'}
              onClick={handleCancelRequest}
              style={{
                flex: '1 1 130px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#FCA5A5',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <X size={15} /> {busyAction === 'cancel' ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {!isSelfScan && stateCode === 'incoming_request_exists' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busyAction === 'accept'}
              onClick={handleAcceptRequest}
              style={{
                flex: '1 1 160px',
                minHeight: 46,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Check size={16} /> {busyAction === 'accept' ? 'Accepting...' : 'Accept Request'}
            </button>

            <button
              type="button"
              disabled={busyAction === 'decline'}
              onClick={handleDeclineRequest}
              style={{
                flex: '1 1 120px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#FCA5A5',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <X size={15} /> {busyAction === 'decline' ? 'Declining...' : 'Decline'}
            </button>
          </div>
        )}

        {!isSelfScan && stateCode === 'already_friends' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled
              style={{
                flex: '1 1 120px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.45)',
                background: 'rgba(16, 185, 129, 0.16)',
                color: '#6EE7B7',
                fontSize: 13.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'default'
              }}
            >
              <UserCheck size={16} /> Friends
            </button>

            <button
              type="button"
              onClick={handleOpenProfileModal}
              style={{
                flex: '1 1 130px',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(167, 139, 250, 0.4)',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#EDE9FE',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Eye size={15} /> View Profile
            </button>

            {onMessageFriend && (
              <button
                type="button"
                onClick={() => onMessageFriend(profile.id)}
                style={{
                  flex: '1 1 120px',
                  minHeight: 46,
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#F8FAFC',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={15} /> Message
              </button>
            )}
          </div>
        )}

        {onScanAnother && (
          <button
            type="button"
            onClick={onScanAnother}
            style={{
              width: '100%',
              minHeight: 40,
              borderRadius: 11,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              marginTop: 2
            }}
          >
            <RotateCcw size={13} /> Scan Another QR Code
          </button>
        )}
      </div>
    </div>
  );
}
