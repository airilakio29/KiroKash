import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  QrCode,
  Camera,
  Flashlight,
  Upload,
  Copy,
  Check,
  Share2,
  Download,
  Send,
  HandCoins,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Search,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { useSocialWallet } from '../../context/SocialWalletContext';
import {
  DEMO_WALLET,
  DEMO_WALLET_BADGE_TEXT,
  WALLET_MAX_PER_TRANSFER,
  WALLET_DAILY_LIMIT
} from '../../config/appConstants';
import { KAMPUSKASH_ACCOUNT_ID } from '../../services/accountService';
import UserAvatar from '../UserAvatar';

/**
 * Generates a deterministic 21x21 QR-like matrix from a payload string,
 * including standard QR finder patterns in the three corners so it looks authentic
 * and encodes the payload deterministically.
 */
function buildQrMatrix(payload = 'KKPAY') {
  const size = 21;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset, colOffset) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          reserved[rr][cc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            grid[rr][cc] = isBorder || isInner;
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Hash payload bytes into remaining cells
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(bitIdx % Math.max(1, payload.length)) || 65;
      const mixed = ((hash >>> (bitIdx % 24)) ^ (charCode * (r + 1) * (c + 3))) & 1;
      grid[r][c] = Boolean(mixed);
      bitIdx++;
    }
  }

  return grid;
}

export default function ScanPaySheet() {
  const { user } = useAuth();
  const { accounts = [] } = useFinance() || {};
  const {
    publicProfile,
    wallet,
    dailyTransferred,
    followingProfiles = [],
    recentRecipients = [],
    firstUseNoticeSeen,
    dismissFirstUseNotice,
    isScanPayOpen,
    scanPayInitialTab,
    closeScanPaySheet,
    prefilledWalletAction,
    setPrefilledWalletAction,
    setupPin,
    performTransfer,
    performRequestMoney,
    searchPublicProfiles,
    encodeWalletQrPayload,
    parseWalletQrPayload
  } = useSocialWallet() || {};

  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'myqr' | 'transfer'
  const [transferMode, setTransferMode] = useState('send'); // 'send' | 'request' | 'split'

  // Camera & Scan state
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'starting' | 'active' | 'denied' | 'unsupported'
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchNotice, setTorchNotice] = useState('');
  const [pasteCodeInput, setPasteCodeInput] = useState('');
  const [scanError, setScanError] = useState('');

  // My QR state
  const [qrRequestAmount, setQrRequestAmount] = useState('');
  const [qrCopied, setQrCopied] = useState(false);
  const [qrShareNotice, setQrShareNotice] = useState('');

  // Transfer & Shared Pay Flow state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [splitTotalInput, setSplitTotalInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState(KAMPUSKASH_ACCOUNT_ID);

  // Flow steps: 'form' | 'review' | 'pin' | 'success' | 'failure'
  const [flowStep, setFlowStep] = useState('form');
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flowError, setFlowError] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [completedRequest, setCompletedRequest] = useState(null);
  const [receiptCopied, setReceiptCopied] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const qrFileInputRef = useRef(null);

  // Sync initial tab and prefilled recipient when sheet opens
  useEffect(() => {
    if (!isScanPayOpen) return;
    setActiveTab(scanPayInitialTab || 'scan');
    setFlowStep('form');
    setFlowError('');
    setScanError('');
    setPinInput('');
    setCompletedReceipt(null);
    setCompletedRequest(null);
    setSelectedSourceAccountId(KAMPUSKASH_ACCOUNT_ID);

    if (prefilledWalletAction && prefilledWalletAction.recipient) {
      setActiveTab('transfer');
      setSelectedRecipient(prefilledWalletAction.recipient);
      setTransferMode(prefilledWalletAction.mode || 'send');
      if (prefilledWalletAction.amount) {
        setAmountInput(String(prefilledWalletAction.amount));
      }
      if (prefilledWalletAction.note) {
        setNoteInput(prefilledWalletAction.note);
      }
      setPrefilledWalletAction(null);
    }
  }, [isScanPayOpen, scanPayInitialTab, prefilledWalletAction, setPrefilledWalletAction]);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  // Handle decoded QR string
  const handleDecodedQrCode = useCallback(
    (rawCode) => {
      if (!parseWalletQrPayload) return;
      const parsed = parseWalletQrPayload(rawCode);
      if (!parsed.valid) {
        setScanError(parsed.error || 'Invalid KampusKash QR code.');
        return;
      }
      if (parsed.recipient?.id === user?.id) {
        setScanError('You cannot scan your own QR code to pay yourself.');
        return;
      }
      stopCamera();
      setScanError('');
      setSelectedRecipient(parsed.recipient);
      setTransferMode('send');
      if (parsed.amount && parsed.amount > 0) {
        setAmountInput(String(parsed.amount));
      }
      if (parsed.note) {
        setNoteInput(parsed.note);
      }
    },
    [parseWalletQrPayload, user?.id, stopCamera]
  );

  // Start camera when Scan tab is active
  const startCamera = useCallback(async () => {
    setScanError('');
    setCameraError('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('unsupported');
      setCameraError(
        'Camera access is not available on this device/browser. Upload a QR image or paste a code below.'
      );
      return;
    }

    setCameraStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus('active');

      // Use native BarcodeDetector if available
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDecodedQrCode(barcodes[0].rawValue);
              }
            } catch {
              // ignore frame error
            }
          }, 450);
        } catch {
          // BarcodeDetector init fallback
        }
      }
    } catch {
      setCameraStatus('denied');
      setCameraError(
        'Camera permission was denied or no camera was found. You can upload a QR image or paste a KampusKash code below.'
      );
    }
  }, [handleDecodedQrCode]);

  useEffect(() => {
    if (isScanPayOpen && activeTab === 'scan' && !selectedRecipient && flowStep === 'form') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScanPayOpen, activeTab, selectedRecipient, flowStep, startCamera, stopCamera]);

  // Toggle Flashlight / Torch
  const handleToggleTorch = async () => {
    setTorchNotice('');
    const stream = streamRef.current;
    if (!stream) {
      setTorchNotice('Start camera first to toggle flashlight.');
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') {
      setTorchNotice('Flashlight is not supported on this device camera.');
      return;
    }
    const caps = track.getCapabilities();
    if (!caps.torch) {
      setTorchNotice('Hardware flashlight is not available on this device.');
      return;
    }
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
      setTorchOn(nextTorch);
    } catch {
      setTorchNotice('Could not toggle flashlight on this device.');
    }
  };

  // Upload QR Image Fallback
  const handleQrImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');

    // 1. Try native BarcodeDetector on image bitmap
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(bitmap);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          handleDecodedQrCode(codes[0].rawValue);
          return;
        }
      } catch {
        // fallback below
      }
    }

    // 2. Check if filename encodes a @handle (e.g. KampusKash-QR-@aiman_utp.png)
    const matchHandle = file.name.match(/@?([a-z0-9_]{3,24})/i);
    if (matchHandle && matchHandle[1]) {
      const candidate = matchHandle[1].toLowerCase();
      const parsed = parseWalletQrPayload(candidate);
      if (parsed.valid && parsed.recipient?.id !== user?.id) {
        handleDecodedQrCode(`KKPAY:${parsed.recipient.id}:${parsed.recipient.handle}:${parsed.recipient.displayName}`);
        return;
      }
    }

    // 3. Fallback to first available campus student profile for demo QR image upload
    const allCandidates = searchPublicProfiles ? searchPublicProfiles('', { excludeUserId: user?.id }) : [];
    if (allCandidates.length > 0) {
      const target = allCandidates[0];
      handleDecodedQrCode(`KKPAY:${target.id}:${target.handle}:${encodeURIComponent(target.displayName)}`);
    } else {
      setScanError('Could not detect a valid KampusKash QR in that image. Try pasting the code below.');
    }
  };

  // My QR Payload & Matrix
  const myQrPayload = useMemo(() => {
    if (!encodeWalletQrPayload || !user) return '';
    return encodeWalletQrPayload(
      {
        id: user.id,
        handle: publicProfile?.handle || user.handle || 'student',
        name: publicProfile?.displayName || user.username || 'Student'
      },
      qrRequestAmount
    );
  }, [encodeWalletQrPayload, user, publicProfile, qrRequestAmount]);

  const myQrMatrix = useMemo(() => buildQrMatrix(myQrPayload), [myQrPayload]);

  // Save My QR as PNG Image
  const handleSaveQrImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 580;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background card
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header brand
    ctx.fillStyle = '#818CF8';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KAMPUSKASH SCAN & PAY (DEMO)', canvas.width / 2, 42);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(publicProfile?.displayName || user?.username || 'Student', canvas.width / 2, 76);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '15px monospace';
    ctx.fillText(`@${publicProfile?.handle || 'student'}`, canvas.width / 2, 102);

    // White QR box
    const boxSize = 315;
    const boxX = (canvas.width - boxSize) / 2;
    const boxY = 124;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    const cellSize = Math.floor((boxSize - 30) / myQrMatrix.length);
    const startX = boxX + 15;
    const startY = boxY + 15;
    ctx.fillStyle = '#0F172A';
    myQrMatrix.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (cell) {
          ctx.fillRect(startX + cIdx * cellSize, startY + rIdx * cellSize, cellSize, cellSize);
        }
      });
    });

    if (qrRequestAmount && Number(qrRequestAmount) > 0) {
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`Requested: RM ${Number(qrRequestAmount).toFixed(2)}`, canvas.width / 2, 476);
    }

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(DEMO_WALLET_BADGE_TEXT, canvas.width / 2, 515);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px monospace';
    ctx.fillText(myQrPayload, canvas.width / 2, 545);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `KampusKash-QR-@${publicProfile?.handle || 'student'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share My QR
  const handleShareQr = async () => {
    const shareText = `Pay me on KampusKash (Demo): @${publicProfile?.handle || 'student'}${
      qrRequestAmount && Number(qrRequestAmount) > 0 ? ` — RM${Number(qrRequestAmount).toFixed(2)}` : ''
    }\nCode: ${myQrPayload}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'KampusKash QR Code (Demo)',
          text: shareText
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(myQrPayload).catch(() => {});
      setQrCopied(true);
      setQrShareNotice('QR payment code copied to clipboard!');
      setTimeout(() => {
        setQrCopied(false);
        setQrShareNotice('');
      }, 2500);
    }
  };

  // Search directory for Transfer tab
  const searchResults = useMemo(() => {
    if (!searchPublicProfiles) return [];
    return searchPublicProfiles(searchQuery, { excludeUserId: user?.id });
  }, [searchPublicProfiles, searchQuery, user?.id]);

  // Selected source account object
  const selectedSourceAccount = useMemo(() => {
    const found = accounts.find((a) => a.accountId === selectedSourceAccountId);
    if (found) return found;
    return (
      accounts.find((a) => a.accountId === KAMPUSKASH_ACCOUNT_ID || a.isKampusKash) || {
        accountId: KAMPUSKASH_ACCOUNT_ID,
        accountName: 'KampusKash',
        accountType: 'kampuskash',
        balance: wallet?.balance ?? 100
      }
    );
  }, [accounts, selectedSourceAccountId, wallet?.balance]);

  // Handle Split Bill 50/50 auto-calculation
  const handleSplitTotalChange = (val) => {
    setSplitTotalInput(val);
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) {
      setAmountInput((num / 2).toFixed(2));
    } else {
      setAmountInput('');
    }
  };

  // Proceed from Form -> Review Step (or submit Request directly)
  const handleProceedToReview = async (e) => {
    e.preventDefault();
    setFlowError('');

    if (!selectedRecipient) {
      setFlowError('Please select a student recipient first.');
      return;
    }
    if (selectedRecipient.id === user?.id) {
      setFlowError('You cannot send or request money from yourself.');
      return;
    }

    const numericAmt = Number(amountInput);
    if (!Number.isFinite(numericAmt) || numericAmt <= 0) {
      setFlowError('Please enter a valid amount greater than RM0.00.');
      return;
    }
    if (numericAmt > WALLET_MAX_PER_TRANSFER) {
      setFlowError(`Maximum per transfer is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
      setFlowStep('failure');
      return;
    }

    // If Request Money or Split Bill mode, submit request directly (no PIN needed to request)
    if (transferMode === 'request' || transferMode === 'split') {
      setIsProcessing(true);
      try {
        const req = await performRequestMoney({
          payer: selectedRecipient,
          amount: numericAmt,
          note:
            noteInput ||
            (transferMode === 'split'
              ? `50/50 Split Bill (Total RM${Number(splitTotalInput || numericAmt * 2).toFixed(2)})`
              : 'Campus money request'),
          isSplitBill: transferMode === 'split',
          originalTotalAmount: transferMode === 'split' ? Number(splitTotalInput || numericAmt * 2) : null
        });
        setCompletedRequest(req);
        setFlowStep('success');
      } catch (err) {
        setFlowError(err?.message || 'Failed to send money request.');
        setFlowStep('failure');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Send money validation: check source account balance and daily limit
    const availBal = Number(selectedSourceAccount?.balance ?? wallet?.balance ?? 0);
    if (availBal < numericAmt) {
      setFlowError(
        `Insufficient balance in ${selectedSourceAccount?.accountName || 'KampusKash'} (Available: RM${availBal.toFixed(2)}, Required: RM${numericAmt.toFixed(2)}).`
      );
      setFlowStep('failure');
      return;
    }

    if (Number(dailyTransferred || 0) + numericAmt > WALLET_DAILY_LIMIT) {
      const rem = Math.max(0, WALLET_DAILY_LIMIT - Number(dailyTransferred || 0));
      setFlowError(
        `Daily transfer limit of RM${WALLET_DAILY_LIMIT.toFixed(2)} exceeded. Remaining today: RM${rem.toFixed(2)}.`
      );
      setFlowStep('failure');
      return;
    }

    setFlowStep('review');
  };

  // Authorize Transfer with 4-Digit Demo PIN
  const handleConfirmPinAndPay = async (e) => {
    e.preventDefault();
    setFlowError('');

    let activePin = pinInput;

    // First-use PIN creation if user has not set a PIN yet
    if (!wallet?.pinSet) {
      if (!/^\d{4}$/.test(newPinInput)) {
        setFlowError('Please enter a 4-digit numeric PIN.');
        return;
      }
      if (newPinInput !== confirmPinInput) {
        setFlowError('PIN confirmation does not match.');
        return;
      }
      try {
        setupPin(newPinInput);
        activePin = newPinInput;
      } catch (err) {
        setFlowError(err?.message || 'Failed to set PIN.');
        return;
      }
    } else if (!/^\d{4}$/.test(activePin)) {
      setFlowError('Please enter your 4-digit demo PIN.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await performTransfer({
        receiver: selectedRecipient,
        amount: Number(amountInput),
        note: noteInput || 'Campus transfer',
        pin: activePin,
        sourceAccount: selectedSourceAccount,
        idempotencyKey: `scanpay_${user?.id}_${selectedRecipient?.id}_${Number(amountInput).toFixed(2)}_${Math.floor(Date.now() / 4000)}`
      });
      setCompletedReceipt(res.receipt);
      setFlowStep('success');
    } catch (err) {
      setFlowError(err?.message || 'Transfer failed.');
      setFlowStep('failure');
    } finally {
      setIsProcessing(false);
    }
  };

  // Share Receipt
  const handleShareReceipt = async () => {
    if (!completedReceipt) return;
    const text = [
      `KAMPUSKASH OFFICIAL RECEIPT (${DEMO_WALLET_BADGE_TEXT})`,
      `Ref: ${completedReceipt.referenceCode}`,
      `Amount: RM ${Number(completedReceipt.amount).toFixed(2)}`,
      `From: @${completedReceipt.senderHandle} (${completedReceipt.sourceAccountName || 'KampusKash'})`,
      `To: @${completedReceipt.receiverHandle}`,
      `Note: ${completedReceipt.note}`,
      `Time: ${new Date(completedReceipt.createdAt).toLocaleString()}`
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `KampusKash Receipt ${completedReceipt.referenceCode}`, text });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
      setReceiptCopied(true);
      setTimeout(() => setReceiptCopied(false), 2500);
    }
  };

  const resetForAnotherTransfer = () => {
    setSelectedRecipient(null);
    setAmountInput('');
    setSplitTotalInput('');
    setNoteInput('');
    setPinInput('');
    setFlowError('');
    setCompletedReceipt(null);
    setCompletedRequest(null);
    setFlowStep('form');
  };

  if (!isScanPayOpen || !DEMO_WALLET) return null;

  return (
    <div
      className="scanpay-fullscreen-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="KampusKash Scan and Pay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        backgroundColor: 'rgba(10, 14, 26, 0.86)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        padding: '1rem'
      }}
    >
      <div
        className="scanpay-sheet-container card"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-modal, 0 24px 48px rgba(0,0,0,0.4))',
          overflow: 'hidden',
          margin: 'auto 0'
        }}
      >
        {/* Top Persistent Demo Banner + Header */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--bg-card-subtle)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 800,
                fontSize: '1rem',
                color: 'var(--text-main)'
              }}
            >
              <QrCode size={18} style={{ color: 'var(--primary)' }} />
              Scan / Pay
            </span>
            <span
              className="demo-wallet-persistent-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.03em',
                background: 'var(--warning-bg, rgba(245, 158, 11, 0.15))',
                color: 'var(--warning, #F59E0B)',
                border: '1px solid var(--warning, #F59E0B)'
              }}
            >
              <ShieldAlert size={12} />
              {DEMO_WALLET_BADGE_TEXT}
            </span>
          </div>

          <button
            type="button"
            onClick={closeScanPaySheet}
            aria-label="Close Scan and Pay"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm, 8px)',
              color: 'var(--text-muted)',
              padding: '0.35rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* First-Use Simulation Notice */}
        {!firstUseNoticeSeen && (
          <div
            style={{
              margin: '0.85rem 1.25rem 0',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.78rem',
              color: 'var(--text-main)'
            }}
          >
            <span>
              <strong>Simulated Student Pay:</strong> All QR scans and transfers use demo Ringgit (RM) with zero real funds.
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={dismissFirstUseNotice}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', flexShrink: 0 }}
            >
              Got it
            </button>
          </div>
        )}

        {/* 3 Prominent Mode Tabs: Scan | My QR | Transfer */}
        <div
          role="tablist"
          aria-label="Scan and Pay tabs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.4rem',
            padding: '0.85rem 1.25rem 0.5rem'
          }}
        >
          {[
            { id: 'scan', label: 'Scan', icon: Camera },
            { id: 'myqr', label: 'My QR', icon: QrCode },
            { id: 'transfer', label: 'Transfer', icon: Send }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(t.id);
                  if (flowStep !== 'form') {
                    setFlowStep('form');
                    setFlowError('');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-md, 10px)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  background: isActive ? 'var(--primary)' : 'var(--bg-card-subtle)',
                  color: isActive ? '#FFFFFF' : 'var(--text-main)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sheet Body */}
        <div style={{ padding: '0.85rem 1.25rem 1.35rem' }}>
          {/* ============================================================
              TAB 2: MY QR (Personal QR + Set Amount + Save Image + Share)
             ============================================================ */}
          {activeTab === 'myqr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg, 14px)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <UserAvatar
                    name={publicProfile?.displayName || user?.username || 'Student'}
                    avatarId={publicProfile?.avatarId || user?.avatar}
                    size={42}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {publicProfile?.displayName || user?.username || 'Campus Student'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      @{publicProfile?.handle || 'student'}
                    </div>
                  </div>
                </div>

                {/* Crisp SVG QR Matrix */}
                <div
                  style={{
                    padding: '1rem',
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                >
                  <svg
                    width="210"
                    height="210"
                    viewBox={`0 0 ${myQrMatrix.length} ${myQrMatrix.length}`}
                    aria-label="Personal KampusKash QR Code"
                  >
                    {myQrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx}
                            y={rIdx}
                            width={1}
                            height={1}
                            fill="#0F172A"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                </div>

                {qrRequestAmount && Number(qrRequestAmount) > 0 && (
                  <div
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      background: 'var(--income-bg)',
                      color: 'var(--income)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    Requested Amount: RM {Number(qrRequestAmount).toFixed(2)}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    wordBreak: 'break-all',
                    textAlign: 'center',
                    padding: '0.35rem 0.6rem',
                    background: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px dashed var(--border-light)',
                    width: '100%'
                  }}
                >
                  {myQrPayload}
                </div>
              </div>

              {/* Optional "Set amount" field that bakes an amount into the QR */}
              <div style={{ width: '100%' }}>
                <label
                  htmlFor="myqr-set-amount"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}
                >
                  Set Amount (Optional — bakes requested amount into your QR)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="myqr-set-amount"
                    type="number"
                    min="0"
                    max={WALLET_MAX_PER_TRANSFER}
                    step="0.50"
                    placeholder="e.g. 12.50 (Leave blank for open amount)"
                    value={qrRequestAmount}
                    onChange={(e) => setQrRequestAmount(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem'
                    }}
                  />
                  {qrRequestAmount && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setQrRequestAmount('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {qrShareNotice && (
                <div style={{ fontSize: '0.78rem', color: 'var(--income)', fontWeight: 700 }}>
                  {qrShareNotice}
                </div>
              )}

              {/* Save Image & Share Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveQrImage}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <Download size={16} />
                  <span>Save Image</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleShareQr}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  {qrCopied ? <Check size={16} /> : <Share2 size={16} />}
                  <span>{qrCopied ? 'Copied!' : 'Share QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SHARED PAY FLOW STEPS: REVIEW / PIN / SUCCESS / FAILURE
             ============================================================ */}
          {activeTab !== 'myqr' && flowStep === 'review' && selectedRecipient && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md, 12px)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Confirm Payment Details
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <UserAvatar
                      name={selectedRecipient.displayName}
                      avatarId={selectedRecipient.avatarId}
                      size={40}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                        {selectedRecipient.displayName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        @{selectedRecipient.handle}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    RM {Number(amountInput).toFixed(2)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.65rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Note:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{noteInput || 'Campus transfer'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Source Account:</span>
                    <select
                      aria-label="Select payment source account"
                      value={selectedSourceAccountId}
                      onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                      style={{
                        padding: '0.35rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid var(--primary)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.accountId} value={acc.accountId}>
                          {acc.accountName} (RM {Number(acc.balance || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFlowStep('form')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setFlowError('');
                    setFlowStep('pin');
                  }}
                >
                  <Lock size={15} />
                  <span>Enter Demo PIN</span>
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'myqr' && flowStep === 'pin' && selectedRecipient && (
            <form onSubmit={handleConfirmPinAndPay} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md, 12px)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  textAlign: 'center'
                }}
              >
                <Lock size={26} style={{ color: 'var(--primary)', marginBottom: '0.4rem' }} />
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {wallet?.pinSet ? 'Enter 4-Digit Demo PIN' : 'Set Your 4-Digit Demo PIN'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Authorizing <strong>RM {Number(amountInput).toFixed(2)}</strong> from{' '}
                  <strong>{selectedSourceAccount?.accountName || 'KampusKash'}</strong> to{' '}
                  <strong>@{selectedRecipient.handle}</strong>
                </p>

                {flowError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '0.65rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--expense-bg)',
                      color: 'var(--expense)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    {flowError}
                  </div>
                )}

                {!wallet?.pinSet ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.85rem' }}>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Create 4-digit PIN (e.g. 1234)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{
                        padding: '0.65rem',
                        textAlign: 'center',
                        letterSpacing: '0.35em',
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                      }}
                      required
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Confirm 4-digit PIN"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{
                        padding: '0.65rem',
                        textAlign: 'center',
                        letterSpacing: '0.35em',
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                      }}
                      required
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: '0.85rem' }}>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoFocus
                      style={{
                        width: '180px',
                        padding: '0.65rem',
                        textAlign: 'center',
                        letterSpacing: '0.45em',
                        fontSize: '1.35rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '10px',
                        border: '2px solid var(--primary)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                      }}
                      required
                    />
                    {user?.isPitchDemo && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Pitch Demo PIN: <code>1234</code>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFlowStep('review')}
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProcessing}
                >
                  <ShieldCheck size={16} />
                  <span>{isProcessing ? 'Processing...' : 'Confirm & Pay'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab !== 'myqr' && flowStep === 'success' && (completedReceipt || completedRequest) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg, 14px)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--income)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <CheckCircle2 size={42} style={{ color: 'var(--income)' }} />
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                    background: 'var(--warning-bg)',
                    color: 'var(--warning)'
                  }}
                >
                  {DEMO_WALLET_BADGE_TEXT}
                </span>

                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  {completedReceipt ? 'Payment Successful!' : 'Money Request Sent!'}
                </h3>
                <div
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: 'var(--income)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  RM {Number((completedReceipt || completedRequest).amount).toFixed(2)}
                </div>

                {completedReceipt && (
                  <div
                    style={{
                      width: '100%',
                      marginTop: '0.4rem',
                      paddingTop: '0.65rem',
                      borderTop: '1px dashed var(--border-light)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ref Code:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{completedReceipt.referenceCode}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Paid To:</span>
                      <strong>
                        {completedReceipt.receiverName} (@{completedReceipt.receiverHandle})
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Source Account:</span>
                      <strong>{completedReceipt.sourceAccountName || 'KampusKash'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Note:</span>
                      <strong>{completedReceipt.note}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: completedReceipt ? '1fr 1fr' : '1fr', gap: '0.65rem' }}>
                {completedReceipt && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleShareReceipt}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {receiptCopied ? <Check size={16} /> : <Share2 size={16} />}
                    <span>{receiptCopied ? 'Receipt Copied!' : 'Share Receipt'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={resetForAnotherTransfer}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'myqr' && flowStep === 'failure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg, 14px)',
                  background: 'var(--expense-bg)',
                  border: '1px solid var(--expense)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <XCircle size={40} style={{ color: 'var(--expense)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  Transfer Cannot Proceed
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--expense)', fontWeight: 600 }}>
                  {flowError || 'Unable to complete demo transfer.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFlowError('');
                  setFlowStep('form');
                }}
              >
                Try Again / Adjust
              </button>
            </div>
          )}

          {/* ============================================================
              TAB 1 (SCAN) & TAB 3 (TRANSFER) — FORM STEP
             ============================================================ */}
          {activeTab !== 'myqr' && flowStep === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* SCAN TAB CAMERA VIEW (when no recipient is chosen yet) */}
              {activeTab === 'scan' && !selectedRecipient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '220px',
                      borderRadius: 'var(--radius-lg, 14px)',
                      background: '#090D16',
                      border: '2px solid var(--primary)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: cameraStatus === 'active' ? 'block' : 'none'
                      }}
                    />

                    {/* Scanning reticle frame */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '150px',
                        height: '150px',
                        border: '2px dashed rgba(129, 140, 248, 0.85)',
                        borderRadius: '14px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)'
                      }}
                    />

                    {cameraStatus !== 'active' && (
                      <div style={{ zIndex: 2, padding: '1rem', textAlign: 'center', color: '#E2E8F0' }}>
                        <Camera size={28} style={{ color: '#818CF8', marginBottom: '0.35rem' }} />
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {cameraStatus === 'starting'
                            ? 'Requesting camera permission...'
                            : cameraError || 'Point camera at a KampusKash QR code'}
                        </div>
                      </div>
                    )}

                    {/* Flashlight & Upload QR Controls Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.6rem',
                        left: '0.6rem',
                        right: '0.6rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        zIndex: 3
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          background: torchOn ? '#F59E0B' : 'rgba(15, 23, 42, 0.85)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Flashlight size={14} />
                        <span>{torchOn ? 'Flash On' : 'Flashlight'}</span>
                      </button>

                      <input
                        ref={qrFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload QR Image</span>
                      </button>
                    </div>
                  </div>

                  {torchNotice && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {torchNotice}
                    </div>
                  )}

                  {scanError && (
                    <div
                      role="alert"
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: 'var(--expense-bg)',
                        color: 'var(--expense)',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {scanError}
                    </div>
                  )}

                  {/* Paste QR Code Fallback */}
                  <div>
                    <label
                      htmlFor="paste-qr-input"
                      style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}
                    >
                      Or paste a KampusKash QR code / @username:
                    </label>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <input
                        id="paste-qr-input"
                        type="text"
                        placeholder="KKPAY:demo_user_sarah:sarah_um:Sarah%20Liyana or @sarah_um"
                        value={pasteCodeInput}
                        onChange={(e) => setPasteCodeInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDecodedQrCode(pasteCodeInput)}
                      >
                        Scan Code
                      </button>
                    </div>
                  </div>

                  {/* Quick Demo QR Scan Pills */}
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Quick Demo QR Scan (Tap to simulate scanning a student QR):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {searchResults.slice(0, 4).map((prof) => (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() =>
                            handleDecodedQrCode(
                              `KKPAY:${prof.id}:${prof.handle}:${encodeURIComponent(prof.displayName)}`
                            )
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <QrCode size={12} style={{ color: 'var(--primary)' }} />
                          <span>@{prof.handle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TRANSFER TAB RECIPIENT PICKER (when no recipient is chosen yet) */}
              {activeTab === 'transfer' && !selectedRecipient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Search input */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search
                      size={16}
                      style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="Search student by @username or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                        borderRadius: 'var(--radius-md, 10px)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* People I Follow First */}
                  {followingProfiles.length > 0 && !searchQuery.trim() && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          marginBottom: '0.4rem'
                        }}
                      >
                        <Users size={13} />
                        <span>People I Follow</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                        {followingProfiles.map((prof) => (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => setSelectedRecipient(prof)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.5rem 0.65rem',
                              borderRadius: '10px',
                              border: '1px solid var(--border-light)',
                              background: 'var(--bg-card-subtle)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              minWidth: '84px'
                            }}
                          >
                            <UserAvatar name={prof.displayName} avatarId={prof.avatarId} size={32} />
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, maxWidth: '76px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {prof.displayName.split(' ')[0]}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              @{prof.handle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Recipients */}
                  {recentRecipients.length > 0 && !searchQuery.trim() && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          marginBottom: '0.4rem'
                        }}
                      >
                        <Clock size={13} />
                        <span>Recent Recipients</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {recentRecipients.map((prof) => (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => setSelectedRecipient(prof)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '999px',
                              border: '1px solid var(--border-light)',
                              background: 'var(--bg-card-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <UserAvatar name={prof.displayName} avatarId={prof.avatarId} size={20} />
                            <span>@{prof.handle}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Directory List */}
                  <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {searchResults.map((prof) => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => setSelectedRecipient(prof)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <UserAvatar name={prof.displayName} avatarId={prof.avatarId} size={34} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{prof.displayName}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              @{prof.handle} {prof.university ? `• ${prof.university}` : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={15} style={{ color: 'var(--primary)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SHARED AMOUNT + NOTE + SOURCE ACCOUNT FORM (Once a recipient is scanned or selected) */}
              {selectedRecipient && (
                <form onSubmit={handleProceedToReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Selected Recipient Card */}
                  <div
                    style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '12px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <UserAvatar
                        name={selectedRecipient.displayName}
                        avatarId={selectedRecipient.avatarId}
                        size={40}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {selectedRecipient.displayName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          @{selectedRecipient.handle}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedRecipient(null)}
                      style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Send vs Request vs Split Switch */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                    {[
                      { id: 'send', label: 'Pay / Send' },
                      { id: 'request', label: 'Request RM' },
                      { id: 'split', label: '50/50 Split' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTransferMode(m.id)}
                        style={{
                          padding: '0.4rem',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: transferMode === m.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                          background: transferMode === m.id ? 'var(--primary-light)' : 'transparent',
                          color: transferMode === m.id ? 'var(--primary)' : 'var(--text-muted)'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {transferMode === 'split' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        Total Bill Amount (RM) — auto-splits 50/50:
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0.20"
                        placeholder="e.g. 24.00"
                        value={splitTotalInput}
                        onChange={(e) => handleSplitTotalChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                    </div>
                  )}

                  {/* Amount Input */}
                  <div>
                    <label
                      htmlFor="scanpay-amount-input"
                      style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}
                    >
                      Amount (RM) * <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>(Max RM{WALLET_MAX_PER_TRANSFER}/tx)</span>
                    </label>
                    <input
                      id="scanpay-amount-input"
                      type="number"
                      step="0.10"
                      min="0.10"
                      max="500"
                      placeholder="0.00"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.15rem',
                        fontWeight: 800
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {[5, 10, 15, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmountInput(String(preset))}
                          style={{
                            padding: '0.22rem 0.55rem',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          RM{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Account Selector (for Send mode) */}
                  {transferMode === 'send' && (
                    <div>
                      <label
                        htmlFor="scanpay-source-account"
                        style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}
                      >
                        Pay From Account
                      </label>
                      <select
                        id="scanpay-source-account"
                        value={selectedSourceAccountId}
                        onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '0.84rem'
                        }}
                      >
                        {accounts.map((acc) => (
                          <option key={acc.accountId} value={acc.accountId}>
                            {acc.accountName} — RM {Number(acc.balance || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Optional Note */}
                  <div>
                    <label
                      htmlFor="scanpay-note-input"
                      style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}
                    >
                      Note (Optional)
                    </label>
                    <input
                      id="scanpay-note-input"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Nasi Ayam Gepuk lunch, Badminton court share..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>

                  {flowError && (
                    <div
                      role="alert"
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: 'var(--expense-bg)',
                        color: 'var(--expense)',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {flowError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isProcessing}
                    style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', fontWeight: 800 }}
                  >
                    {transferMode === 'send' ? (
                      <>
                        <Send size={16} />
                        <span>Review Payment</span>
                      </>
                    ) : (
                      <>
                        <HandCoins size={16} />
                        <span>{transferMode === 'split' ? 'Send 50/50 Split Request' : 'Send Money Request'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
