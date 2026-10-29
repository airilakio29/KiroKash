import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import { useToast } from '../context/ToastContext';
import {
  PAY_SECTION_NAME,
  PAY_SECTION_SUBTITLE,
  DEMO_WALLET_BADGE_TEXT,
  WALLET_MAX_PER_TRANSFER,
  WALLET_DAILY_LIMIT,
  DEMO_TOPUP_SOURCES
} from '../config/appConstants';
import { KAMPUSKASH_ACCOUNT_ID, KAMPUSKASH_ACCOUNT_TYPE } from '../services/accountService';
import UserAvatar from '../components/UserAvatar';
import {
  QrCode,
  Send,
  HandCoins,
  History,
  Camera,
  Flashlight,
  Upload,
  Copy,
  Check,
  Share2,
  Download,
  PlusCircle,
  Search,
  Star,
  Clock,
  ArrowLeft,
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Sun,
  Split,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

/**
 * Deterministic 21x21 QR-like matrix generator with standard corner finder patterns.
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

export default function PayView({ subroute = null, onNavigateSubroute, onNavigateTab }) {
  const { user } = useAuth();
  const { accounts = [] } = useFinance() || {};
  const { showSuccess, showError } = useToast();
  const {
    publicProfile,
    wallet,
    dailyTransferred = 0,
    followingProfiles = [],
    recentRecipients = [],
    walletRequests = [],
    firstUseNoticeSeen,
    dismissFirstUseNotice,
    setupPin,
    performTransfer,
    performRequestMoney,
    performRespondToRequest,
    performAddMoneyFromAccount,
    performTopUp,
    searchPublicProfiles,
    encodeWalletQrPayload,
    parseWalletQrPayload,
    openWalletReceiptById,
    pitchModeLoaded,
    pitchDemoUsers = [],
    prefilledWalletAction,
    setPrefilledWalletAction
  } = useSocialWallet() || {};

  // Current view mode: null (dashboard) | 'scan' | 'my-qr' | 'transfer' | 'request' | 'history'
  const activeSubroute = subroute;

  // Shared Pay Confirmation flow state
  // flowStep: 'none' | 'review' | 'pin' | 'success' | 'failure'
  const [flowStep, setFlowStep] = useState('none');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState(KAMPUSKASH_ACCOUNT_ID);
  const [flowError, setFlowError] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptCopied, setReceiptCopied] = useState(false);

  // Favourites state (pinned friends)
  const [favouritesMap, setFavouritesMap] = useState(() => {
    try {
      const raw = localStorage.getItem('kirokash_pay_favourites');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleFavourite = (recipient) => {
    if (!recipient?.id) return;
    setFavouritesMap((prev) => {
      const next = { ...prev };
      if (next[recipient.id]) {
        delete next[recipient.id];
        showSuccess(`Removed @${recipient.handle || 'user'} from favourites.`);
      } else {
        next[recipient.id] = {
          id: recipient.id,
          name: recipient.name || recipient.displayName,
          handle: recipient.handle,
          avatarId: recipient.avatarId || recipient.avatar || 'cat',
          university: recipient.university
        };
        showSuccess(`Added @${recipient.handle || 'user'} to favourites!`);
      }
      try {
        localStorage.setItem('kirokash_pay_favourites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Add Money Modal State
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('20');
  const [selectedOwnAccountId, setSelectedOwnAccountId] = useState('');
  const [externalSourceId, setExternalSourceId] = useState(DEMO_TOPUP_SOURCES[0]?.id || 'fpx_maybank');
  const [addMoneyError, setAddMoneyError] = useState('');
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  // Filter other non-KampusKash accounts
  const otherAccounts = useMemo(
    () =>
      (accounts || []).filter(
        (a) =>
          a.accountId !== KAMPUSKASH_ACCOUNT_ID &&
          a.accountType !== KAMPUSKASH_ACCOUNT_TYPE &&
          !a.isKampusKash
      ),
    [accounts]
  );

  const handleOpenAddMoney = () => {
    setAddMoneyError('');
    setAddMoneyAmount('20');
    if (otherAccounts.length > 0) {
      setSelectedOwnAccountId(otherAccounts[0].accountId);
    } else {
      setSelectedOwnAccountId('external_fpx');
    }
    setIsAddMoneyOpen(true);
  };

  const handleConfirmAddMoney = async (e) => {
    e.preventDefault();
    setAddMoneyError('');
    const numAmt = Number(addMoneyAmount);
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      setAddMoneyError('Please enter an amount greater than RM0.00.');
      return;
    }
    if (numAmt > WALLET_DAILY_LIMIT) {
      setAddMoneyError(`Maximum single transfer is RM${WALLET_DAILY_LIMIT.toFixed(2)}.`);
      return;
    }

    setIsAddingMoney(true);
    try {
      if (selectedOwnAccountId && selectedOwnAccountId !== 'external_fpx') {
        const sourceAcc = otherAccounts.find((a) => a.accountId === selectedOwnAccountId);
        if (!sourceAcc) {
          setAddMoneyError('Please select a valid source account.');
          setIsAddingMoney(false);
          return;
        }
        await performAddMoneyFromAccount({
          fromAccount: sourceAcc,
          amount: numAmt
        });
        showSuccess(`Added RM ${numAmt.toFixed(2)} from ${sourceAcc.accountName} into KampusKash.`);
      } else {
        await performTopUp({
          amount: numAmt,
          sourceId: externalSourceId
        });
        showSuccess(`Added RM ${numAmt.toFixed(2)} demo money into KampusKash.`);
      }
      setIsAddMoneyOpen(false);
    } catch (err) {
      setAddMoneyError(err?.message || 'Unable to add money.');
    } finally {
      setIsAddingMoney(false);
    }
  };

  // ==========================================
  // Subflow A: Scan QR state & logic
  // ==========================================
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'starting' | 'active' | 'denied' | 'unsupported'
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [scanError, setScanError] = useState('');
  const [pasteCodeInput, setPasteCodeInput] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const qrFileInputRef = useRef(null);

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
    setCameraStatus('idle');
  }, []);

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
      if (parsed.amount && parsed.amount > 0) {
        setTransferAmount(String(parsed.amount));
      }
      if (parsed.note) {
        setTransferNote(parsed.note);
      }
      // Open review directly
      setFlowStep('review');
    },
    [parseWalletQrPayload, user?.id, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setScanError('');
    setCameraError('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('unsupported');
      setCameraError('Camera access is not available on this browser. Upload a QR image or paste a code below.');
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
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraStatus('active');

      // Native BarcodeDetector if available
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
            } catch {}
          }, 400);
        } catch {}
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraError('Camera permission was denied. Please allow camera access in browser settings, or paste a pay code.');
      } else {
        setCameraStatus('unsupported');
        setCameraError(err.message || 'Unable to open camera on this device.');
      }
    }
  }, [handleDecodedQrCode]);

  useEffect(() => {
    if (activeSubroute === 'scan' && flowStep === 'none') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeSubroute, flowStep, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (!capabilities.torch) {
        showError('Flashlight is not supported on this device/camera.');
        return;
      }
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch {
      showError('Unable to toggle flashlight.');
    }
  };

  const handleUploadQrImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const img = new Image();
          img.src = dataUrl;
          await img.decode();
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleDecodedQrCode(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }
      // Fallback: check if text file with code
      if (typeof dataUrl === 'string' && dataUrl.includes('KKPAY:')) {
        handleDecodedQrCode(dataUrl);
      } else {
        setScanError('Could not detect a valid KampusKash QR code in this image. Try pasting the pay code below.');
      }
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // Subflow B: My QR state & logic
  // ==========================================
  const [myQrAmount, setMyQrAmount] = useState('');
  const [brightnessBoost, setBrightnessBoost] = useState(false);
  const [myQrCopied, setMyQrCopied] = useState(false);

  const myQrPayload = useMemo(() => {
    if (!user) return 'KKPAY:demo:student';
    const num = Number(myQrAmount);
    return encodeWalletQrPayload
      ? encodeWalletQrPayload(user, Number.isFinite(num) && num > 0 ? num : null)
      : `KKPAY:${user.id}:${user.username || 'student'}`;
  }, [user, myQrAmount, encodeWalletQrPayload]);

  const myQrMatrix = useMemo(() => buildQrMatrix(myQrPayload), [myQrPayload]);

  const handleCopyMyQr = () => {
    try {
      navigator.clipboard.writeText(myQrPayload);
      setMyQrCopied(true);
      showSuccess('Personal pay code copied to clipboard!');
      setTimeout(() => setMyQrCopied(false), 2000);
    } catch {
      showError('Unable to copy to clipboard.');
    }
  };

  const handleShareMyQr = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay @${user?.handle || 'student'} on KampusKash`,
          text: `Scan or paste code to send demo credit: ${myQrPayload}`,
          url: `${window.location.origin}/pay/transfer?to=${encodeURIComponent(user?.handle || '')}${myQrAmount ? `&amount=${myQrAmount}` : ''}`
        });
      } catch {}
    } else {
      handleCopyMyQr();
    }
  };

  const handleDownloadQrPng = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      const matrixSize = myQrMatrix.length;
      const cellSize = (size - 40) / matrixSize;
      const offset = 20;

      ctx.fillStyle = '#0F172A';
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (myQrMatrix[r][c]) {
            ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize + 0.5, cellSize + 0.5);
          }
        }
      }

      const link = document.createElement('a');
      link.download = `KampusKash_QR_${user?.handle || 'code'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showSuccess('Saved QR code image!');
    } catch {
      showError('Could not export QR image.');
    }
  };

  // ==========================================
  // Subflow C: Transfer state & logic
  // ==========================================
  const [transferSearch, setTransferSearch] = useState('');
  const searchResults = useMemo(() => {
    if (!searchPublicProfiles) return [];
    return searchPublicProfiles(transferSearch);
  }, [searchPublicProfiles, transferSearch]);

  const handleSelectTransferRecipient = (person) => {
    setSelectedRecipient(person);
    setFlowError('');
  };

  const handleContinueTransferReview = () => {
    setFlowError('');
    if (!selectedRecipient) {
      setFlowError('Please select a recipient.');
      return;
    }
    const num = Number(transferAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setFlowError('Please enter a valid amount greater than RM0.00.');
      return;
    }
    if (num > WALLET_MAX_PER_TRANSFER) {
      setFlowError(`Maximum per transfer is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
      return;
    }
    const remainingDaily = WALLET_DAILY_LIMIT - dailyTransferred;
    if (num > remainingDaily) {
      setFlowError(`Transfer exceeds today's remaining daily limit of RM${remainingDaily.toFixed(2)}.`);
      return;
    }

    // Check source account balance
    const sourceAcc = (accounts || []).find((a) => a.accountId === selectedSourceAccountId);
    const available = selectedSourceAccountId === KAMPUSKASH_ACCOUNT_ID
      ? (wallet?.balance ?? 0)
      : (sourceAcc?.balance ?? 0);
    if (available < num) {
      setFlowError(`Insufficient balance in ${sourceAcc?.accountName || 'KampusKash'} (Available: RM${Number(available).toFixed(2)}).`);
      return;
    }

    setFlowStep('review');
  };

  // ==========================================
  // Subflow D: Request & Split state & logic
  // ==========================================
  const [requestMode, setRequestMode] = useState('request'); // 'request' | 'split'
  const [requestRecipient, setRequestRecipient] = useState(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestSplitTotal, setRequestSplitTotal] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setFlowError('');
    if (!requestRecipient) {
      setFlowError('Please select a recipient.');
      return;
    }
    const amt = requestMode === 'split' ? Number(requestSplitTotal) / 2 : Number(requestAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFlowError('Please enter a valid amount greater than RM0.00.');
      return;
    }
    if (amt > WALLET_MAX_PER_TRANSFER) {
      setFlowError(`Maximum request amount is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
      return;
    }

    setIsSendingRequest(true);
    try {
      await performRequestMoney({
        payer: requestRecipient,
        amount: amt,
        originalTotalAmount: requestMode === 'split' ? Number(requestSplitTotal) : amt,
        isSplitBill: requestMode === 'split',
        note: requestNote || (requestMode === 'split' ? '50/50 Bill Split' : 'Payment request')
      });
      showSuccess(`Payment request sent to @${requestRecipient.handle}!`);
      setRequestAmount('');
      setRequestSplitTotal('');
      setRequestNote('');
      setRequestRecipient(null);
      if (onNavigateSubroute) onNavigateSubroute(null);
    } catch (err) {
      setFlowError(err?.message || 'Failed to send payment request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // ==========================================
  // Subflow E: Pending Requests Accept / Decline
  // ==========================================
  const [acceptingReq, setAcceptingReq] = useState(null);
  const [acceptReqPin, setAcceptReqPin] = useState('');
  const [acceptReqError, setAcceptReqError] = useState('');
  const [isAcceptingReq, setIsAcceptingReq] = useState(false);

  const handleConfirmAcceptPendingRequest = async (e) => {
    e.preventDefault();
    if (!acceptingReq) return;
    setAcceptReqError('');
    setIsAcceptingReq(true);
    try {
      await performRespondToRequest({
        requestId: acceptingReq.id,
        action: 'accept',
        pin: acceptReqPin
      });
      showSuccess(`Paid RM${Number(acceptingReq.amount).toFixed(2)} to @${acceptingReq.requesterHandle}.`);
      setAcceptingReq(null);
      setAcceptReqPin('');
    } catch (err) {
      setAcceptReqError(err?.message || 'Failed to settle request. Check your PIN or balance.');
    } finally {
      setIsAcceptingReq(false);
    }
  };

  const handleDeclinePendingRequest = async (reqItem) => {
    try {
      await performRespondToRequest({
        requestId: reqItem.id,
        action: 'decline'
      });
      showSuccess(`Declined request from @${reqItem.requesterHandle}.`);
    } catch (err) {
      showError(err?.message || 'Unable to decline request.');
    }
  };

  // Handle prefilled actions (e.g. from PublicProfileModal) or deep-link URL search parameters
  useEffect(() => {
    if (prefilledWalletAction && prefilledWalletAction.recipient) {
      if (prefilledWalletAction.mode === 'request' || prefilledWalletAction.mode === 'split') {
        setRequestRecipient(prefilledWalletAction.recipient);
        if (prefilledWalletAction.mode === 'split') setRequestMode('split');
        if (prefilledWalletAction.amount) {
          if (prefilledWalletAction.mode === 'split') {
            setRequestSplitTotal(String(Number(prefilledWalletAction.amount) * 2));
          } else {
            setRequestAmount(String(prefilledWalletAction.amount));
          }
        }
        if (prefilledWalletAction.note) setRequestNote(prefilledWalletAction.note);
      } else {
        setSelectedRecipient(prefilledWalletAction.recipient);
        if (prefilledWalletAction.amount) setTransferAmount(String(prefilledWalletAction.amount));
        if (prefilledWalletAction.note) setTransferNote(prefilledWalletAction.note);
      }
      if (setPrefilledWalletAction) setPrefilledWalletAction(null);
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get('code') || params.get('payload');
        if (codeParam) {
          handleDecodedQrCode(codeParam);
          return;
        }

        const toHandle = params.get('to') || params.get('user') || params.get('recipient');
        const amt = params.get('amount') || params.get('amt');
        const note = params.get('note');

        if (toHandle) {
          const cleanHandle = toHandle.replace(/^@/, '');
          const matched = (searchPublicProfiles ? searchPublicProfiles(cleanHandle) : []).find(
            (p) => p.handle?.toLowerCase() === cleanHandle.toLowerCase() || p.id === toHandle
          ) || { id: toHandle, handle: cleanHandle, displayName: cleanHandle };

          setSelectedRecipient(matched);
          if (amt) setTransferAmount(amt);
          if (note) setTransferNote(note);
        }
      }
    } catch {}
  }, [prefilledWalletAction, setPrefilledWalletAction, handleDecodedQrCode, searchPublicProfiles]);

  // ==========================================
  // Shared Confirmation Flow: Review -> PIN -> Execute
  // ==========================================
  const handleProceedToPin = () => {
    setFlowError('');
    setPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setFlowStep('pin');
  };

  const handleExecuteTransfer = async (pinToUse) => {
    setFlowError('');
    setIsProcessing(true);
    try {
      const sourceAcc = (accounts || []).find((a) => a.accountId === selectedSourceAccountId);
      const res = await performTransfer({
        receiver: selectedRecipient,
        amount: Number(transferAmount),
        note: transferNote,
        pin: pinToUse,
        sourceAccount: sourceAcc || null
      });
      setCompletedReceipt(res.receipt);
      setFlowStep('success');
      showSuccess(`Transfer of RM${Number(transferAmount).toFixed(2)} successful!`);
    } catch (err) {
      setFlowError(err?.message || 'Transfer failed.');
      setFlowStep('failure');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setFlowError('');
    if (!wallet?.hasPin) {
      // First-time setup
      if (newPinInput.length !== 4 || confirmPinInput.length !== 4) {
        setFlowError('PIN must be exactly 4 digits.');
        return;
      }
      if (newPinInput !== confirmPinInput) {
        setFlowError('PINs do not match. Please re-enter.');
        return;
      }
      try {
        await setupPin(newPinInput);
        await handleExecuteTransfer(newPinInput);
      } catch (err) {
        setFlowError(err?.message || 'Could not set PIN.');
      }
    } else {
      // Existing PIN
      if (pinInput.length !== 4) {
        setFlowError('Please enter your 4-digit PIN.');
        return;
      }
      await handleExecuteTransfer(pinInput);
    }
  };

  // Helper to return to dashboard
  const handleDone = () => {
    setFlowStep('none');
    setSelectedRecipient(null);
    setTransferAmount('');
    setTransferNote('');
    setFlowError('');
    setCompletedReceipt(null);
    if (onNavigateSubroute) {
      onNavigateSubroute(null);
    }
  };

  // ==========================================
  // Full Transaction History Filter
  // ==========================================
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'sent' | 'received' | 'topup' | 'requests'

  const allLedger = useMemo(() => {
    if (!wallet?.userId) return [];
    let items = (wallet?.history || []);
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('kk_demo_wallet_ledger_v1');
        if (raw) {
          const list = JSON.parse(raw);
          const userList = list.filter((e) => e.senderId === wallet.userId || e.receiverId === wallet.userId);
          items = userList;
        }
      } catch {}
    }
    return items;
  }, [wallet?.userId, wallet?.balance, flowStep]);

  const filteredHistory = useMemo(() => {
    return allLedger.filter((item) => {
      if (historyFilter === 'sent' && item.senderId !== wallet?.userId) return false;
      if (historyFilter === 'received' && (item.receiverId !== wallet?.userId || item.type === 'topup')) return false;
      if (historyFilter === 'topup' && item.type !== 'topup') return false;
      if (historySearch) {
        const q = historySearch.toLowerCase();
        const note = (item.note || '').toLowerCase();
        const ref = (item.referenceCode || '').toLowerCase();
        const name = (item.receiverName || item.senderName || '').toLowerCase();
        if (!note.includes(q) && !ref.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [allLedger, historyFilter, historySearch, wallet?.userId]);

  // Combined Favourites & Recent Recipients
  const combinedRecipientsList = useMemo(() => {
    const list = [];
    const seen = new Set();
    // Favourites first
    Object.values(favouritesMap).forEach((f) => {
      seen.add(f.id);
      list.push({ ...f, isFavourite: true });
    });
    // Followed users next
    (followingProfiles || []).forEach((f) => {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        list.push({ ...f, isFavourite: false });
      }
    });
    // Recent recipients
    (recentRecipients || []).forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        list.push({ ...r, isFavourite: false });
      }
    });
    return list;
  }, [favouritesMap, followingProfiles, recentRecipients]);

  const incomingRequests = useMemo(() => {
    return (walletRequests || []).filter((r) => r.payerId === user?.id && r.status === 'pending');
  }, [walletRequests, user?.id]);

  const outgoingRequests = useMemo(() => {
    return (walletRequests || []).filter((r) => r.requesterId === user?.id && r.status === 'pending');
  }, [walletRequests, user?.id]);

  return (
    <div className={`pay-view-container view-fade-in ${brightnessBoost ? 'brightness-boost-mode' : ''}`}>
      {/* ============================================================== */}
      {/* SHARED CONFIRMATION / PIN / SUCCESS / FAILURE MODAL OVERLAYS   */}
      {/* ============================================================== */}
      {flowStep !== 'none' && (
        <div className="pay-modal-backdrop" onClick={() => flowStep !== 'pin' && setFlowStep('none')}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            {/* Step: Review */}
            {flowStep === 'review' && selectedRecipient && (
              <div className="pay-review-box">
                <div className="pay-modal-header">
                  <h3>Confirm Payment</h3>
                  <button type="button" className="btn-icon" onClick={() => setFlowStep('none')}>
                    <X size={18} />
                  </button>
                </div>

                <div className="pay-demo-badge-pill">
                  <ShieldCheck size={13} />
                  <span>{DEMO_WALLET_BADGE_TEXT}</span>
                </div>

                <div className="pay-review-recipient-card">
                  <UserAvatar
                    avatar={selectedRecipient.avatarId || selectedRecipient.avatar || 'cat'}
                    name={selectedRecipient.name || selectedRecipient.displayName}
                    size={46}
                  />
                  <div>
                    <strong>{selectedRecipient.name || selectedRecipient.displayName}</strong>
                    <div className="pay-recipient-handle">@{selectedRecipient.handle}</div>
                  </div>
                </div>

                <div className="pay-review-amount-display">
                  <span className="pay-currency">RM</span>
                  <span className="pay-amount-value">{Number(transferAmount || 0).toFixed(2)}</span>
                </div>

                {transferNote && (
                  <div className="pay-review-note">
                    <strong>Note:</strong> &ldquo;{transferNote}&rdquo;
                  </div>
                )}

                <div className="pay-review-source-row">
                  <span>Source Account:</span>
                  <strong>
                    {selectedSourceAccountId === KAMPUSKASH_ACCOUNT_ID
                      ? `KampusKash Demo (RM ${Number(wallet?.balance ?? 0).toFixed(2)})`
                      : accounts.find((a) => a.accountId === selectedSourceAccountId)?.accountName || 'Selected Account'}
                  </strong>
                </div>

                {flowError && <div className="pay-error-banner">{flowError}</div>}

                <div className="pay-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setFlowStep('none')}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleProceedToPin}>
                    Confirm &amp; Enter PIN
                  </button>
                </div>
              </div>
            )}

            {/* Step: PIN Entry */}
            {flowStep === 'pin' && (
              <form onSubmit={handlePinSubmit} className="pay-pin-box">
                <div className="pay-modal-header">
                  <h3>{wallet?.hasPin ? 'Enter 4-Digit Demo PIN' : 'Set Your 4-Digit Demo PIN'}</h3>
                  <button type="button" className="btn-icon" onClick={() => setFlowStep('review')}>
                    <X size={18} />
                  </button>
                </div>

                <p className="pay-pin-desc">
                  {wallet?.hasPin
                    ? 'Enter your simulated 4-digit PIN to authenticate this demo transfer.'
                    : 'Choose a 4-digit demo PIN for simulated transfers. It will be stored hashed securely.'}
                </p>

                {!wallet?.hasPin ? (
                  <div className="pay-pin-inputs-group">
                    <div>
                      <label className="form-label">New 4-Digit PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className="form-control pay-pin-field"
                        placeholder="••••"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        autoFocus
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Confirm PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className="form-control pay-pin-field"
                        placeholder="••••"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      className="form-control pay-pin-field large"
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoFocus
                      required
                    />
                    <div className="pay-pin-hint">Pitch shortcut: test accounts default PIN is 1234</div>
                  </div>
                )}

                {flowError && <div className="pay-error-banner">{flowError}</div>}

                <div className="pay-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFlowStep('review')}
                    disabled={isProcessing}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                    {isProcessing ? 'Processing Transfer...' : 'Authorize Transfer'}
                  </button>
                </div>
              </form>
            )}

            {/* Step: Success Screen with Receipt */}
            {flowStep === 'success' && completedReceipt && (
              <div className="pay-receipt-box">
                <div className="pay-receipt-success-icon">
                  <CheckCircle2 size={48} color="var(--income)" />
                </div>
                <h3>Payment Successful</h3>
                <div className="pay-receipt-amount-hero">
                  RM {Number(completedReceipt.amount).toFixed(2)}
                </div>
                <div className="pay-demo-badge-pill">
                  <ShieldCheck size={12} />
                  <span>{DEMO_WALLET_BADGE_TEXT}</span>
                </div>

                <div className="pay-receipt-details-card">
                  <div className="pay-receipt-row">
                    <span>Reference:</span>
                    <strong>{completedReceipt.referenceCode}</strong>
                  </div>
                  <div className="pay-receipt-row">
                    <span>Recipient:</span>
                    <strong>{completedReceipt.receiverName} (@{completedReceipt.receiverHandle})</strong>
                  </div>
                  <div className="pay-receipt-row">
                    <span>Date &amp; Time:</span>
                    <span>{new Date(completedReceipt.createdAt).toLocaleString('en-MY')}</span>
                  </div>
                  {completedReceipt.note && (
                    <div className="pay-receipt-row">
                      <span>Note:</span>
                      <span>{completedReceipt.note}</span>
                    </div>
                  )}
                  <div className="pay-receipt-row">
                    <span>Category:</span>
                    <span className="badge badge-income">Transfer</span>
                  </div>
                </div>

                <div className="pay-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(
                          `KampusKash Demo Receipt:\nRef: ${completedReceipt.referenceCode}\nTo: ${completedReceipt.receiverName}\nAmount: RM ${completedReceipt.amount.toFixed(2)}\nStatus: Completed (Simulated)`
                        );
                        setReceiptCopied(true);
                        showSuccess('Receipt copied to clipboard!');
                        setTimeout(() => setReceiptCopied(false), 2000);
                      } catch {}
                    }}
                  >
                    <Share2 size={15} />
                    <span>{receiptCopied ? 'Copied!' : 'Share Receipt'}</span>
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleDone}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Step: Failure Screen */}
            {flowStep === 'failure' && (
              <div className="pay-failure-box">
                <div className="pay-failure-icon">
                  <XCircle size={48} color="var(--expense)" />
                </div>
                <h3>Transfer Incomplete</h3>
                <p className="pay-failure-reason">{flowError || 'Transfer could not be processed.'}</p>
                <div className="pay-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setFlowStep('none')}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setFlowStep('review')}>
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SIMULATED ADD MONEY MODAL (FROM OWN ACCOUNTS OR FPX)           */}
      {/* ============================================================== */}
      {isAddMoneyOpen && (
        <div className="pay-modal-backdrop" onClick={() => setIsAddMoneyOpen(false)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="pay-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={18} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>Add Demo Money to KampusKash</h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setIsAddMoneyOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.3rem 0 1rem' }}>
              Simulate moving money from one of your other linked accounts or a simulated bank into your KampusKash balance.
            </p>

            <form onSubmit={handleConfirmAddMoney}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Amount (RM)</label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={WALLET_DAILY_LIMIT}
                    className="form-control"
                    style={{ paddingLeft: '2.8rem' }}
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {['10', '20', '50', '100'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAddMoneyAmount(amt)}
                    >
                      RM {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Source Account</label>
                <select
                  className="form-control"
                  value={selectedOwnAccountId}
                  onChange={(e) => setSelectedOwnAccountId(e.target.value)}
                >
                  {otherAccounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.accountName} (Available: RM {Number(a.balance).toFixed(2)})
                    </option>
                  ))}
                  <option value="external_fpx">Simulated Online Bank / FPX</option>
                </select>
              </div>

              {selectedOwnAccountId === 'external_fpx' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Demo Bank / E-Wallet</label>
                  <select
                    className="form-control"
                    value={externalSourceId}
                    onChange={(e) => setExternalSourceId(e.target.value)}
                  >
                    {DEMO_TOPUP_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addMoneyError && <div className="pay-error-banner">{addMoneyError}</div>}

              <div className="pay-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddMoneyOpen(false)}
                  disabled={isAddingMoney}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isAddingMoney}>
                  {isAddingMoney ? 'Adding Credits...' : 'Confirm Add Money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW A: SCAN QR                                             */}
      {/* ============================================================== */}
      {activeSubroute === 'scan' && (
        <div className="pay-subview card">
          <div className="pay-subview-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateSubroute ? onNavigateSubroute(null) : null}
            >
              <ArrowLeft size={16} /> Back to Pay
            </button>
            <h2 className="pay-subview-title">Scan QR Code</h2>
            <div style={{ width: '80px' }} />
          </div>

          <div className="pay-scanner-container">
            <div className="pay-camera-viewfinder">
              <video ref={videoRef} className="pay-camera-video" />
              <div className="pay-scan-frame-guide">
                <div className="pay-scan-corner top-left" />
                <div className="pay-scan-corner top-right" />
                <div className="pay-scan-corner bottom-left" />
                <div className="pay-scan-corner bottom-right" />
                <div className="pay-scan-laser-line" />
              </div>

              {cameraStatus === 'active' && (
                <button
                  type="button"
                  className={`pay-torch-toggle-btn ${torchOn ? 'active' : ''}`}
                  onClick={toggleTorch}
                  title="Toggle flashlight"
                >
                  <Flashlight size={18} />
                </button>
              )}
            </div>

            {cameraStatus === 'starting' && (
              <p className="pay-scanner-notice">Opening camera...</p>
            )}

            {cameraError && (
              <div className="pay-camera-fallback-card">
                <Camera size={24} color="var(--primary)" />
                <p>{cameraError}</p>
              </div>
            )}

            {scanError && (
              <div className="pay-error-banner">{scanError}</div>
            )}

            {/* Fallbacks: Upload QR Image or Paste Code */}
            <div className="pay-scanner-fallbacks-row">
              <input
                type="file"
                ref={qrFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleUploadQrImage}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => qrFileInputRef.current?.click()}
              >
                <Upload size={14} /> Upload QR Image
              </button>
            </div>

            <div className="pay-paste-code-card">
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Or Paste KampusKash Pay Code:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. KKPAY:user_id:sarah_um"
                  className="form-control"
                  value={pasteCodeInput}
                  onChange={(e) => setPasteCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDecodedQrCode(pasteCodeInput)}
                >
                  Pay
                </button>
              </div>
            </div>

            {/* Pitch Mode Instant Scan Shortcut for Live Demo Video */}
            {pitchModeLoaded && (
              <div className="pay-pitch-shortcuts-panel">
                <span>⚡ Pitch Mode Quick Scans:</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const target = user?.id === 'demo_user_aiman' ? 'demo_user_sarah' : 'demo_user_aiman';
                    const targetHandle = user?.id === 'demo_user_aiman' ? 'sarah_um' : 'aiman_utp';
                    handleDecodedQrCode(`KKPAY:${target}:${targetHandle}:15.00:Lunch%20Share`);
                  }}
                >
                  Scan @{user?.id === 'demo_user_aiman' ? 'sarah_um' : 'aiman_utp'} QR (RM15.00)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW B: MY QR                                               */}
      {/* ============================================================== */}
      {activeSubroute === 'my-qr' && (
        <div className="pay-subview card">
          <div className="pay-subview-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateSubroute ? onNavigateSubroute(null) : null}
            >
              <ArrowLeft size={16} /> Back to Pay
            </button>
            <h2 className="pay-subview-title">My Personal QR</h2>
            <button
              type="button"
              className={`btn btn-secondary btn-sm ${brightnessBoost ? 'active' : ''}`}
              onClick={() => setBrightnessBoost((prev) => !prev)}
              title="Boost screen contrast and brightness for scanning"
            >
              <Sun size={15} />
              <span>{brightnessBoost ? 'High Contrast ON' : 'Brightness Boost'}</span>
            </button>
          </div>

          <div className="pay-myqr-container">
            <div className="pay-myqr-card">
              <div className="pay-myqr-card-header">
                <UserAvatar
                  avatar={publicProfile?.avatarId || user?.avatar || 'cat'}
                  name={publicProfile?.displayName || user?.username}
                  size={52}
                />
                <div>
                  <h3 className="pay-myqr-name">{publicProfile?.displayName || user?.username}</h3>
                  <div className="pay-myqr-handle">@{publicProfile?.handle || user?.handle}</div>
                  <div className="pay-myqr-campus">{publicProfile?.university || user?.university || 'Campus Student'}</div>
                </div>
              </div>

              {/* Scannable SVG Canvas QR */}
              <div className="pay-qr-display-frame">
                <svg
                  viewBox={`0 0 ${myQrMatrix.length} ${myQrMatrix.length}`}
                  className="pay-qr-svg-matrix"
                >
                  {myQrMatrix.map((row, r) =>
                    row.map((cell, c) =>
                      cell ? (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width="1"
                          height="1"
                          fill="#0F172A"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              {myQrAmount && Number(myQrAmount) > 0 && (
                <div className="pay-myqr-baked-amount">
                  Requesting <strong>RM {Number(myQrAmount).toFixed(2)}</strong>
                </div>
              )}

              <p className="pay-myqr-safe-notice">
                <Lock size={12} /> Encodes only your student ID &amp; username. No sensitive balances are shared.
              </p>
            </div>

            {/* Set Specific Amount Input */}
            <div className="pay-myqr-controls-card">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>
                Set an Amount (Optional)
              </label>
              <div className="input-prefix-wrapper" style={{ marginBottom: '1rem' }}>
                <span className="input-prefix">RM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="200"
                  placeholder="0.00 (leave empty for any amount)"
                  className="form-control"
                  style={{ paddingLeft: '2.8rem' }}
                  value={myQrAmount}
                  onChange={(e) => setMyQrAmount(e.target.value)}
                />
              </div>

              <div className="pay-myqr-actions-row">
                <button type="button" className="btn btn-secondary" onClick={handleDownloadQrPng}>
                  <Download size={15} /> Save Image
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleShareMyQr}>
                  <Share2 size={15} /> Share
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCopyMyQr}>
                  <Copy size={15} /> {myQrCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW C: TRANSFER                                            */}
      {/* ============================================================== */}
      {activeSubroute === 'transfer' && (
        <div className="pay-subview card">
          <div className="pay-subview-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateSubroute ? onNavigateSubroute(null) : null}
            >
              <ArrowLeft size={16} /> Back to Pay
            </button>
            <h2 className="pay-subview-title">Transfer Money</h2>
            <div style={{ width: '80px' }} />
          </div>

          <div className="pay-transfer-container">
            {!selectedRecipient ? (
              <div className="pay-recipient-selector-step">
                <label className="form-label">Search Recipient by @username or Name</label>
                <div className="search-input-wrapper" style={{ marginBottom: '1.25rem' }}>
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search fellow students..."
                    className="form-control search-input"
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Combined Favourites & Recent Recipients */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div className="pay-section-subtitle-bar">
                    <Star size={14} color="#FBBF24" />
                    <span>Favourites &amp; Followed Friends</span>
                  </div>
                  <div className="pay-recipients-pill-scroll">
                    {combinedRecipientsList.map((p) => (
                      <div
                        key={p.id}
                        className="pay-recipient-chip"
                        onClick={() => handleSelectTransferRecipient(p)}
                      >
                        <UserAvatar avatar={p.avatarId || p.avatar || 'cat'} name={p.name || p.displayName} size={36} />
                        <div className="pay-chip-meta">
                          <strong>{p.name || p.displayName}</strong>
                          <small>@{p.handle}</small>
                        </div>
                        <button
                          type="button"
                          className={`pay-fav-star-btn ${favouritesMap[p.id] ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(p);
                          }}
                          title={favouritesMap[p.id] ? 'Remove from favourites' : 'Star as favourite'}
                        >
                          <Star size={13} fill={favouritesMap[p.id] ? '#FBBF24' : 'none'} color="#FBBF24" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search Results List */}
                {transferSearch.trim() && (
                  <div>
                    <div className="pay-section-subtitle-bar">
                      <span>Search Results</span>
                    </div>
                    {searchResults.length === 0 ? (
                      <div className="pay-empty-note">No students found matching &ldquo;{transferSearch}&rdquo;</div>
                    ) : (
                      <div className="pay-search-results-list">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            className="pay-search-result-row"
                            onClick={() => handleSelectTransferRecipient(p)}
                          >
                            <UserAvatar avatar={p.avatarId || p.avatar || 'cat'} name={p.displayName} size={40} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong>{p.displayName}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                @{p.handle} · {p.university}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTransferRecipient(p);
                              }}
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="pay-transfer-form-step">
                {/* Selected Recipient Card */}
                <div className="pay-chosen-recipient-card">
                  <UserAvatar
                    avatar={selectedRecipient.avatarId || selectedRecipient.avatar || 'cat'}
                    name={selectedRecipient.name || selectedRecipient.displayName}
                    size={46}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {selectedRecipient.name || selectedRecipient.displayName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      @{selectedRecipient.handle}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedRecipient(null)}
                  >
                    Change
                  </button>
                </div>

                {/* Amount Field */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Transfer Amount (RM)</label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max={WALLET_MAX_PER_TRANSFER}
                      placeholder="0.00"
                      className="form-control"
                      style={{ paddingLeft: '2.8rem', fontSize: '1.25rem', fontWeight: 700 }}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {['5', '10', '20', '50', '100'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setTransferAmount(amt)}
                      >
                        RM {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note Field */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Optional Note</label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Futsal court share, textbook, lunch"
                    className="form-control"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                  />
                </div>

                {/* Source Account Selector */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Source Account</label>
                  <select
                    className="form-control"
                    value={selectedSourceAccountId}
                    onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                  >
                    <option value={KAMPUSKASH_ACCOUNT_ID}>
                      KampusKash Demo (Available: RM {Number(wallet?.balance ?? 0).toFixed(2)})
                    </option>
                    {otherAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.accountName} (Available: RM {Number(a.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pay-limits-note">
                  Max RM200.00 per transfer • Remaining today: RM {Math.max(0, WALLET_DAILY_LIMIT - dailyTransferred).toFixed(2)}
                </div>

                {flowError && <div className="pay-error-banner">{flowError}</div>}

                <div className="pay-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedRecipient(null)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleContinueTransferReview}
                  >
                    Review Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW D: REQUEST & 50/50 SPLIT                               */}
      {/* ============================================================== */}
      {activeSubroute === 'request' && (
        <div className="pay-subview card">
          <div className="pay-subview-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateSubroute ? onNavigateSubroute(null) : null}
            >
              <ArrowLeft size={16} /> Back to Pay
            </button>
            <h2 className="pay-subview-title">Request &amp; Split Bill</h2>
            <div style={{ width: '80px' }} />
          </div>

          <div className="pay-request-container">
            {/* Mode Segmented Control */}
            <div className="pay-segmented-mode-bar">
              <button
                type="button"
                className={`pay-mode-btn ${requestMode === 'request' ? 'active' : ''}`}
                onClick={() => setRequestMode('request')}
              >
                <HandCoins size={15} /> Request Money
              </button>
              <button
                type="button"
                className={`pay-mode-btn ${requestMode === 'split' ? 'active' : ''}`}
                onClick={() => setRequestMode('split')}
              >
                <Split size={15} /> Split with a Friend (50/50)
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="pay-request-form">
              {/* Recipient Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Select Friend</label>
                {requestRecipient ? (
                  <div className="pay-chosen-recipient-card">
                    <UserAvatar
                      avatar={requestRecipient.avatarId || requestRecipient.avatar || 'cat'}
                      name={requestRecipient.name || requestRecipient.displayName}
                      size={42}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{requestRecipient.name || requestRecipient.displayName}</strong>
                      <div className="pay-recipient-handle">@{requestRecipient.handle}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setRequestRecipient(null)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="pay-recipients-pill-scroll">
                    {combinedRecipientsList.map((p) => (
                      <div
                        key={p.id}
                        className="pay-recipient-chip"
                        onClick={() => setRequestRecipient(p)}
                      >
                        <UserAvatar avatar={p.avatarId || p.avatar || 'cat'} name={p.name || p.displayName} size={34} />
                        <div className="pay-chip-meta">
                          <strong>{p.name || p.displayName}</strong>
                          <small>@{p.handle}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Entry according to mode */}
              {requestMode === 'request' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Request Amount (RM)</label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={WALLET_MAX_PER_TRANSFER}
                      placeholder="0.00"
                      className="form-control"
                      style={{ paddingLeft: '2.8rem' }}
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Total Bill Amount (RM)</label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="2"
                      max={WALLET_MAX_PER_TRANSFER * 2}
                      placeholder="0.00"
                      className="form-control"
                      style={{ paddingLeft: '2.8rem' }}
                      value={requestSplitTotal}
                      onChange={(e) => setRequestSplitTotal(e.target.value)}
                      required
                    />
                  </div>
                  {Number(requestSplitTotal) > 0 && (
                    <div className="pay-split-calculation-card">
                      <div className="pay-split-col">
                        <span>You Pay</span>
                        <strong>RM {(Number(requestSplitTotal) / 2).toFixed(2)}</strong>
                      </div>
                      <div className="pay-split-divider">•</div>
                      <div className="pay-split-col">
                        <span>Friend Pays</span>
                        <strong>RM {(Number(requestSplitTotal) / 2).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note Entry */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Reason / Note</label>
                <input
                  type="text"
                  placeholder={requestMode === 'split' ? 'e.g. Dinner at Warung Kak Som' : 'e.g. Printing share, groceries'}
                  className="form-control"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                />
              </div>

              {flowError && <div className="pay-error-banner">{flowError}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '46px', fontSize: '0.92rem' }}
                disabled={isSendingRequest}
              >
                {isSendingRequest
                  ? 'Sending...'
                  : requestMode === 'split'
                  ? 'Send 50/50 Split Request'
                  : 'Send Payment Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW E: FULL TRANSACTION HISTORY                            */}
      {/* ============================================================== */}
      {activeSubroute === 'history' && (
        <div className="pay-subview card">
          <div className="pay-subview-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateSubroute ? onNavigateSubroute(null) : null}
            >
              <ArrowLeft size={16} /> Back to Pay
            </button>
            <h2 className="pay-subview-title">Transaction History</h2>
            <div style={{ width: '80px' }} />
          </div>

          <div className="pay-history-container">
            {/* Search & Filter Bar */}
            <div className="pay-history-controls-row">
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search transactions, notes, codes..."
                  className="form-control search-input"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <div className="pay-filter-chips-row">
                {['all', 'sent', 'received', 'topup'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`pay-filter-chip ${historyFilter === f ? 'active' : ''}`}
                    onClick={() => setHistoryFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'topup' ? 'Top Ups' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredHistory.length === 0 ? (
              <div className="pay-empty-note">No transactions found matching your criteria.</div>
            ) : (
              <div className="pay-history-list">
                {filteredHistory.map((item) => {
                  const isSent = item.senderId === wallet?.userId;
                  const isTopup = item.type === 'topup';
                  return (
                    <div
                      key={item.id}
                      className="pay-history-item-row"
                      onClick={() => openWalletReceiptById ? openWalletReceiptById(item.id) : null}
                    >
                      <div className="pay-history-item-icon">
                        {isTopup ? (
                          <PlusCircle size={20} color="var(--primary)" />
                        ) : isSent ? (
                          <ArrowUpRight size={20} color="var(--expense)" />
                        ) : (
                          <ArrowDownLeft size={20} color="var(--income)" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pay-history-title">
                          {isTopup
                            ? item.senderName || 'Added Demo Money'
                            : isSent
                            ? `To: ${item.receiverName || item.receiverHandle}`
                            : `From: ${item.senderName || item.senderHandle}`}
                        </div>
                        <div className="pay-history-meta">
                          {new Date(item.createdAt).toLocaleDateString('en-MY', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {item.note ? ` · "${item.note}"` : ''}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="pay-history-amount"
                          style={{
                            color: isSent && !isTopup ? 'var(--expense)' : 'var(--income)'
                          }}
                        >
                          {isSent && !isTopup ? '-' : '+'} RM {Number(item.amount).toFixed(2)}
                        </div>
                        <span className="badge badge-income" style={{ fontSize: '0.65rem' }}>
                          Completed
                        </span>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN OVERVIEW SCREEN (WHEN NO SUBROUTE ACTIVE)                 */}
      {/* ============================================================== */}
      {!activeSubroute && (
        <div className="pay-overview-content">
          {/* Balance Header Hero */}
          <div className="card pay-balance-hero-card">
            <div className="pay-hero-top-row">
              <div className="pay-brand-badge">
                <img src="/kiro-logo.png" alt="KampusKash" className="pay-brand-logo-img" />
                <span>{PAY_SECTION_NAME}</span>
              </div>
              <div className="pay-demo-badge-pill">
                <ShieldCheck size={12} />
                <span>{DEMO_WALLET_BADGE_TEXT}</span>
              </div>
            </div>

            <div className="pay-hero-balance-row">
              <div>
                <div className="pay-hero-balance-label">Available Demo Balance</div>
                <div className="pay-hero-balance-amount">
                  RM {Number(wallet?.balance ?? 100).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenAddMoney}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PlusCircle size={14} /> Add money
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigateSubroute ? onNavigateSubroute('history') : null}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <History size={14} /> History
                </button>
              </div>
            </div>

            {!firstUseNoticeSeen && (
              <div className="pay-first-use-banner">
                <Sparkles size={16} color="var(--primary)" />
                <p>
                  <strong>Welcome to KampusKash Pay:</strong> Experience instant simulated QR payments, transfers between campus students, and 50/50 bill splits without using real funds.
                </p>
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={dismissFirstUseNotice}
                  title="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Tiles (Top 4 Big Cards) */}
          <div className="pay-tiles-grid">
            <div
              className="card pay-action-tile"
              onClick={() => onNavigateSubroute ? onNavigateSubroute('scan') : null}
              role="button"
              tabIndex={0}
            >
              <div className="pay-tile-icon-box scan">
                <QrCode size={26} />
              </div>
              <div className="pay-tile-info">
                <h3>Scan QR</h3>
                <p>Pay via camera, photo, or code</p>
              </div>
              <ChevronRight size={18} className="pay-tile-chevron" />
            </div>

            <div
              className="card pay-action-tile"
              onClick={() => onNavigateSubroute ? onNavigateSubroute('my-qr') : null}
              role="button"
              tabIndex={0}
            >
              <div className="pay-tile-icon-box myqr">
                <Sun size={26} />
              </div>
              <div className="pay-tile-info">
                <h3>My QR</h3>
                <p>Receive money &amp; personal code</p>
              </div>
              <ChevronRight size={18} className="pay-tile-chevron" />
            </div>

            <div
              className="card pay-action-tile"
              onClick={() => onNavigateSubroute ? onNavigateSubroute('transfer') : null}
              role="button"
              tabIndex={0}
            >
              <div className="pay-tile-icon-box transfer">
                <Send size={26} />
              </div>
              <div className="pay-tile-info">
                <h3>Transfer</h3>
                <p>Send to students &amp; friends</p>
              </div>
              <ChevronRight size={18} className="pay-tile-chevron" />
            </div>

            <div
              className="card pay-action-tile"
              onClick={() => onNavigateSubroute ? onNavigateSubroute('request') : null}
              role="button"
              tabIndex={0}
            >
              <div className="pay-tile-icon-box request">
                <HandCoins size={26} />
              </div>
              <div className="pay-tile-info">
                <h3>Request</h3>
                <p>Request money or split bill 50/50</p>
              </div>
              <ChevronRight size={18} className="pay-tile-chevron" />
            </div>
          </div>

          {/* Favourites & Quick Send Row */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-title" style={{ marginBottom: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Star size={16} color="#FBBF24" fill="#FBBF24" /> Favourites &amp; Recent Recipients
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateSubroute ? onNavigateSubroute('transfer') : null}
              >
                Send New
              </button>
            </div>

            <div className="pay-recipients-pill-scroll">
              {combinedRecipientsList.length === 0 ? (
                <div className="pay-empty-note">
                  No recent transfers yet. Search a student above or scan a QR to get started!
                </div>
              ) : (
                combinedRecipientsList.map((p) => (
                  <div
                    key={p.id}
                    className="pay-recipient-chip"
                    onClick={() => {
                      setSelectedRecipient(p);
                      if (onNavigateSubroute) onNavigateSubroute('transfer');
                    }}
                  >
                    <UserAvatar avatar={p.avatarId || p.avatar || 'cat'} name={p.name || p.displayName} size={36} />
                    <div className="pay-chip-meta">
                      <strong>{p.name || p.displayName}</strong>
                      <small>@{p.handle}</small>
                    </div>
                    <button
                      type="button"
                      className={`pay-fav-star-btn ${favouritesMap[p.id] ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(p);
                      }}
                      title={favouritesMap[p.id] ? 'Unpin favourite' : 'Star as favourite'}
                    >
                      <Star size={13} fill={favouritesMap[p.id] ? '#FBBF24' : 'none'} color="#FBBF24" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Payment Requests Card */}
          {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={16} color="var(--primary)" /> Pending Requests
                </span>
                {incomingRequests.length > 0 && (
                  <span className="badge badge-expense">{incomingRequests.length} to pay</span>
                )}
              </div>

              {/* Incoming Requests to Settle */}
              {incomingRequests.map((reqItem) => (
                <div key={reqItem.id} className="pay-pending-req-row incoming">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      @{reqItem.requesterHandle} requested{' '}
                      <span style={{ color: 'var(--expense)' }}>RM {Number(reqItem.amount).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {reqItem.note} · {new Date(reqItem.createdAt).toLocaleDateString('en-MY')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeclinePendingRequest(reqItem)}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setAcceptingReq(reqItem);
                        setAcceptReqPin('');
                        setAcceptReqError('');
                      }}
                    >
                      Accept &amp; Pay
                    </button>
                  </div>
                </div>
              ))}

              {/* Accept Pending Request PIN Modal */}
              {acceptingReq && (
                <div className="pay-modal-backdrop" onClick={() => setAcceptingReq(null)}>
                  <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
                    <div className="pay-modal-header">
                      <h3>Pay Request to @{acceptingReq.requesterHandle}</h3>
                      <button type="button" className="btn-icon" onClick={() => setAcceptingReq(null)}>
                        <X size={18} />
                      </button>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Amount: <strong>RM {Number(acceptingReq.amount).toFixed(2)}</strong>. Enter your demo 4-digit PIN to authorize payment.
                    </p>

                    <form onSubmit={handleConfirmAcceptPendingRequest}>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className="form-control pay-pin-field"
                        placeholder="••••"
                        value={acceptReqPin}
                        onChange={(e) => setAcceptReqPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        autoFocus
                        required
                      />

                      {acceptReqError && <div className="pay-error-banner">{acceptReqError}</div>}

                      <div className="pay-modal-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setAcceptingReq(null)}
                          disabled={isAcceptingReq}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isAcceptingReq}>
                          {isAcceptingReq ? 'Paying...' : 'Authorize & Pay'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity List Card */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <History size={16} color="var(--primary)" /> Recent Activity
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateSubroute ? onNavigateSubroute('history') : null}
              >
                See all
              </button>
            </div>

            {allLedger.length === 0 ? (
              <div className="pay-empty-note">
                No transfers recorded yet. Try scanning a QR or sending demo money!
              </div>
            ) : (
              <div className="pay-history-list">
                {allLedger.slice(0, 5).map((item) => {
                  const isSent = item.senderId === wallet?.userId;
                  const isTopup = item.type === 'topup';
                  return (
                    <div
                      key={item.id}
                      className="pay-history-item-row"
                      onClick={() => openWalletReceiptById ? openWalletReceiptById(item.id) : null}
                    >
                      <div className="pay-history-item-icon">
                        {isTopup ? (
                          <PlusCircle size={18} color="var(--primary)" />
                        ) : isSent ? (
                          <ArrowUpRight size={18} color="var(--expense)" />
                        ) : (
                          <ArrowDownLeft size={18} color="var(--income)" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pay-history-title">
                          {isTopup
                            ? item.senderName || 'Added Demo Money'
                            : isSent
                            ? `To: ${item.receiverName || item.receiverHandle}`
                            : `From: ${item.senderName || item.senderHandle}`}
                        </div>
                        <div className="pay-history-meta">
                          {new Date(item.createdAt).toLocaleDateString('en-MY', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="pay-history-amount"
                          style={{
                            color: isSent && !isTopup ? 'var(--expense)' : 'var(--income)'
                          }}
                        >
                          {isSent && !isTopup ? '-' : '+'} RM {Number(item.amount).toFixed(2)}
                        </div>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styled CSS for PayView */}
      <style>{`
        .pay-view-container {
          max-width: 960px;
          margin: 0 auto;
          padding-bottom: 2rem;
        }

        .pay-balance-hero-card {
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--bg-card)), var(--bg-card));
          border: 1.5px solid color-mix(in srgb, var(--primary) 35%, var(--border-light));
          border-radius: var(--radius-lg);
          position: relative;
        }

        .pay-hero-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .pay-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 1.15rem;
          color: var(--text-main);
        }

        .pay-brand-logo-img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .pay-demo-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary) 18%, transparent);
          color: var(--primary);
          border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .pay-hero-balance-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .pay-hero-balance-label {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pay-hero-balance-amount {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.1;
          margin-top: 0.2rem;
        }

        .pay-first-use-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          margin-top: 1.1rem;
          padding: 0.75rem 0.9rem;
          background: color-mix(in srgb, var(--primary) 10%, var(--bg-card-subtle));
          border: 1px dashed color-mix(in srgb, var(--primary) 40%, transparent);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--text-main);
        }

        .pay-first-use-banner p {
          margin: 0;
          flex: 1;
        }

        .pay-tiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .pay-action-tile {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          border: 1px solid var(--border-light);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          background: var(--bg-card);
        }

        .pay-action-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(var(--shadow-rgb), 0.2);
          border-color: var(--primary);
        }

        .pay-tile-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #FFFFFF;
        }

        .pay-tile-icon-box.scan {
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
        }

        .pay-tile-icon-box.myqr {
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
        }

        .pay-tile-icon-box.transfer {
          background: linear-gradient(135deg, #10B981, #059669);
        }

        .pay-tile-icon-box.request {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        }

        .pay-tile-info {
          flex: 1;
          min-width: 0;
        }

        .pay-tile-info h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .pay-tile-info p {
          margin: 0.2rem 0 0;
          font-size: 0.76rem;
          color: var(--text-muted);
          line-height: 1.25;
        }

        .pay-tile-chevron {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .pay-recipients-pill-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          -webkit-overflow-scrolling: touch;
        }

        .pay-recipient-chip {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.45rem 0.75rem;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-light);
          border-radius: 30px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .pay-recipient-chip:hover {
          background: color-mix(in srgb, var(--primary) 12%, var(--bg-card-subtle));
          border-color: var(--primary);
        }

        .pay-chip-meta {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .pay-chip-meta strong {
          font-size: 0.82rem;
          color: var(--text-main);
        }

        .pay-chip-meta small {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .pay-fav-star-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.15rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pay-pending-req-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          margin-bottom: 0.6rem;
        }

        .pay-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .pay-history-item-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .pay-history-item-row:hover {
          background: color-mix(in srgb, var(--primary) 8%, var(--bg-card-subtle));
        }

        .pay-history-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--border-light);
        }

        .pay-history-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .pay-history-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .pay-history-amount {
          font-weight: 800;
          font-size: 0.95rem;
        }

        /* Subview Screen Styles */
        .pay-subview {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pay-subview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-light);
        }

        .pay-subview-title {
          font-size: 1.35rem;
          font-weight: 800;
          margin: 0;
          color: var(--text-main);
        }

        /* Scanner */
        .pay-scanner-container {
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .pay-camera-viewfinder {
          width: 100%;
          height: 300px;
          background: #000;
          border-radius: var(--radius-lg);
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pay-camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pay-scan-frame-guide {
          position: absolute;
          width: 200px;
          height: 200px;
          border: 1.5px dashed rgba(255, 255, 255, 0.4);
          border-radius: 12px;
          pointer-events: none;
        }

        .pay-scan-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: var(--primary);
          border-style: solid;
        }

        .pay-scan-corner.top-left {
          top: -2px; left: -2px;
          border-width: 3px 0 0 3px;
          border-top-left-radius: 6px;
        }

        .pay-scan-corner.top-right {
          top: -2px; right: -2px;
          border-width: 3px 3px 0 0;
          border-top-right-radius: 6px;
        }

        .pay-scan-corner.bottom-left {
          bottom: -2px; left: -2px;
          border-width: 0 0 3px 3px;
          border-bottom-left-radius: 6px;
        }

        .pay-scan-corner.bottom-right {
          bottom: -2px; right: -2px;
          border-width: 0 3px 3px 0;
          border-bottom-right-radius: 6px;
        }

        .pay-scan-laser-line {
          position: absolute;
          top: 10%;
          left: 5%;
          right: 5%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
          box-shadow: 0 0 8px var(--primary);
          animation: scanLaser 2.2s ease-in-out infinite alternate;
        }

        @keyframes scanLaser {
          0% { top: 10%; }
          100% { top: 90%; }
        }

        .pay-torch-toggle-btn {
          position: absolute;
          bottom: 14px;
          right: 14px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          color: #FFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .pay-torch-toggle-btn.active {
          background: var(--primary);
        }

        .pay-scanner-fallbacks-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .pay-paste-code-card {
          width: 100%;
          padding: 1rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }

        .pay-pitch-shortcuts-panel {
          width: 100%;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          background: color-mix(in srgb, var(--primary) 10%, var(--bg-card-subtle));
          border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          gap: 0.5rem;
        }

        /* My QR */
        .pay-myqr-container {
          max-width: 440px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .pay-myqr-card {
          padding: 1.75rem 1.25rem;
          background: #FFFFFF;
          color: #0F172A;
          border-radius: var(--radius-lg);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .pay-myqr-card-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          text-align: left;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #E2E8F0;
        }

        .pay-myqr-name {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0F172A;
        }

        .pay-myqr-handle {
          font-size: 0.82rem;
          color: #64748B;
          font-weight: 600;
        }

        .pay-myqr-campus {
          font-size: 0.72rem;
          color: #94A3B8;
        }

        .pay-qr-display-frame {
          width: 220px;
          height: 220px;
          margin: 0 auto;
          padding: 10px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pay-qr-svg-matrix {
          width: 100%;
          height: 100%;
        }

        .pay-myqr-baked-amount {
          margin-top: 0.85rem;
          font-size: 0.95rem;
          color: #0F172A;
        }

        .pay-myqr-safe-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1rem;
          font-size: 0.72rem;
          color: #64748B;
        }

        .pay-myqr-controls-card {
          padding: 1.25rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }

        .pay-myqr-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 0.5rem;
        }

        /* Transfer & Request */
        .pay-transfer-container,
        .pay-request-container,
        .pay-history-container {
          max-width: 580px;
          margin: 0 auto;
        }

        .pay-chosen-recipient-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          margin-bottom: 1.25rem;
        }

        .pay-segmented-mode-bar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          background: var(--bg-card-subtle);
          padding: 0.35rem;
          border-radius: var(--radius-md);
        }

        .pay-mode-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.82rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pay-mode-btn.active {
          background: var(--primary);
          color: #FFFFFF;
        }

        .pay-split-calculation-card {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0.75rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          margin-top: 0.5rem;
          border: 1px solid var(--border-light);
        }

        .pay-split-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pay-split-col span {
          font-size: 0.74rem;
          color: var(--text-muted);
        }

        .pay-split-col strong {
          font-size: 1rem;
          color: var(--text-main);
          margin-top: 0.15rem;
        }

        .pay-split-divider {
          color: var(--border-light);
          font-size: 1.2rem;
        }

        .pay-limits-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 1.25rem;
        }

        /* History */
        .pay-history-controls-row {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .pay-filter-chips-row {
          display: flex;
          gap: 0.45rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .pay-filter-chip {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          border: 1px solid var(--border-light);
          background: var(--bg-card-subtle);
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .pay-filter-chip.active {
          background: var(--primary);
          color: #FFFFFF;
          border-color: var(--primary);
        }

        /* Modals & Confirmation Overlays */
        .pay-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .pay-modal-content {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pay-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .pay-modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .pay-review-recipient-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          margin: 1rem 0;
        }

        .pay-review-amount-display {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.35rem;
          margin: 1.25rem 0;
        }

        .pay-currency {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .pay-amount-value {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 2.6rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .pay-review-source-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
          padding: 0.65rem 0;
          border-top: 1px solid var(--border-light);
          margin-top: 1rem;
        }

        .pay-review-note {
          font-size: 0.82rem;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 0.85rem;
        }

        .pay-pin-field {
          text-align: center;
          letter-spacing: 0.4em;
          font-size: 1.4rem;
          font-weight: 800;
        }

        .pay-pin-field.large {
          font-size: 1.8rem;
          height: 52px;
        }

        .pay-pin-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 0.4rem;
          text-align: center;
        }

        .pay-pin-inputs-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .pay-receipt-box,
        .pay-failure-box {
          text-align: center;
        }

        .pay-receipt-amount-hero {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0.5rem 0;
        }

        .pay-receipt-details-card {
          text-align: left;
          background: var(--bg-card-subtle);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin: 1.25rem 0;
          border: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.82rem;
        }

        .pay-receipt-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pay-receipt-row span {
          color: var(--text-muted);
        }

        .pay-error-banner {
          padding: 0.65rem 0.85rem;
          background: var(--expense-bg);
          color: var(--expense);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .pay-modal-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 1.25rem;
        }

        .pay-modal-actions .btn {
          flex: 1;
        }

        .pay-empty-note {
          text-align: center;
          padding: 1.5rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Brightness Boost Mode */
        .brightness-boost-mode {
          filter: contrast(1.15) brightness(1.08);
        }

        @media (max-width: 480px) {
          .pay-balance-hero-card {
            padding: 1.15rem;
          }
          .pay-hero-balance-amount {
            font-size: 1.75rem;
          }
          .pay-tiles-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.65rem;
          }
          .pay-action-tile {
            padding: 0.85rem 0.75rem;
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }
          .pay-tile-chevron {
            display: none;
          }
          .pay-tile-icon-box {
            width: 44px;
            height: 44px;
          }
          .pay-tile-info h3 {
            font-size: 0.92rem;
          }
          .pay-tile-info p {
            font-size: 0.68rem;
          }
          .pay-myqr-actions-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
