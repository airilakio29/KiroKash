import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Star,
  AlertCircle,
  Utensils,
  MapPin,
  Check,
  ImagePlus,
  Trash2,
  Link2
} from 'lucide-react';
import {
  CAMPUS_OPTIONS,
  COMMUNITY_TAGS,
  validateThreadInput
} from '../../services/communityService';
import {
  SPOT_CATEGORIES,
  SPOT_BUDGET_TAGS,
  getBudgetTagForPrice,
  SPOT_FEED_NAME
} from '../../config/appConstants';
import {
  validateSpotPhotoFile,
  compressSpotPhoto
} from '../../utils/safetyUtils';
import TagIcon from './TagIcon';

export default function CreateThreadModal({
  isOpen,
  editingSpot = null,
  onClose,
  onSubmit,
  prefillData = null,
  user
}) {
  const [placeName, setPlaceName] = useState('');
  const [category, setCategory] = useState('makan');
  const [title, setTitle] = useState('');
  const [pricePerMeal, setPricePerMeal] = useState('');
  const [budgetTag, setBudgetTag] = useState('rm5-15');
  const [studentPrice, setStudentPrice] = useState(false);
  const [rating, setRating] = useState(5);
  const [campus, setCampus] = useState('all');
  const [selectedTags, setSelectedTags] = useState(['bawah-rm10']);
  const [body, setBody] = useState('');
  const [address, setAddress] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Sync prefill or editing data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingSpot) {
        setPlaceName(editingSpot.placeName || editingSpot.stallName || '');
        setCategory(editingSpot.category || 'makan');
        setTitle(editingSpot.title || '');
        const resolvedPrice = editingSpot.pricePerMeal ?? editingSpot.priceRM ?? editingSpot.price ?? '';
        setPricePerMeal(resolvedPrice !== '' ? String(resolvedPrice) : '');
        setBudgetTag(editingSpot.budgetTag || getBudgetTagForPrice(Number(resolvedPrice || 0)));
        setStudentPrice(Boolean(editingSpot.studentPrice));
        setRating(editingSpot.rating || 5);
        setCampus(editingSpot.campus || 'all');
        setSelectedTags(Array.isArray(editingSpot.tags) ? editingSpot.tags : ['bawah-rm10']);
        setBody(editingSpot.body || editingSpot.shortTip || '');
        setAddress(editingSpot.address || editingSpot.locationAddress || '');
        setMapLink(editingSpot.mapLink || editingSpot.locationMapUrl || '');
        setPhotoUrl(editingSpot.photoUrl || '');
      } else if (prefillData) {
        setPlaceName(prefillData.placeName || prefillData.name || '');
        setCategory(prefillData.category || 'makan');
        setTitle(prefillData.title || `Port Jimat Padu: ${prefillData.placeName || prefillData.name || ''}`);
        setPricePerMeal(prefillData.pricePerMeal ? String(prefillData.pricePerMeal) : '');
        setBudgetTag(getBudgetTagForPrice(Number(prefillData.pricePerMeal || 5)));
        setStudentPrice(false);
        setRating(prefillData.rating || 5);
        setCampus(prefillData.campus || (user?.university ? 'utp' : 'all'));
        setAddress(prefillData.address || '');
        setMapLink('');
        setPhotoUrl('');
      } else {
        setPlaceName('');
        setCategory('makan');
        setTitle('');
        setPricePerMeal('');
        setBudgetTag('rm5-15');
        setStudentPrice(false);
        setRating(5);
        setCampus(user?.university ? 'utp' : 'all');
        setSelectedTags(['bawah-rm10']);
        setBody('');
        setAddress('');
        setMapLink('');
        setPhotoUrl('');
      }
      setErrors([]);
      setIsSubmitting(false);
    }
  }, [isOpen, editingSpot, prefillData, user]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePriceChange = (val) => {
    setPricePerMeal(val);
    const num = Number(val);
    if (val !== '' && Number.isFinite(num) && num >= 0) {
      setBudgetTag(getBudgetTagForPrice(num));
    }
  };

  const handleToggleTag = (tagId) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId];
      if (tagId === 'student-deal') {
        setStudentPrice(next.includes('student-deal'));
      }
      return next;
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateSpotPhotoFile(file);
    if (!validation.valid) {
      setErrors([validation.error || validation.reason || 'Fail gambar tidak sah.']);
      return;
    }
    setErrors([]);
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressSpotPhoto(file);
      setPhotoUrl(compressed);
    } catch (err) {
      setErrors([err?.message || 'Gagal memampatkan gambar.']);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const numericPrice = pricePerMeal === '' ? 0 : Number(pricePerMeal);
    const finalTags = [...selectedTags];
    if (studentPrice && !finalTags.includes('student-deal')) {
      finalTags.push('student-deal');
    }

    const payload = {
      placeName: placeName.trim(),
      category,
      title: title.trim(),
      body: body.trim(),
      shortTip: body.trim().slice(0, 160),
      pricePerMeal: numericPrice,
      price: numericPrice,
      budgetTag: budgetTag || getBudgetTagForPrice(numericPrice),
      studentPrice,
      rating: Number(rating),
      campus,
      tags: finalTags,
      address: address.trim() || null,
      mapLink: mapLink.trim() || null,
      photoUrl: photoUrl || null,
      osmPlaceId: prefillData?.osmPlaceId || null,
      lat: prefillData?.lat || null,
      lng: prefillData?.lng || null
    };

    const val = validateThreadInput(payload);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload, editingSpot?.id || null);
      onClose();
    } catch (err) {
      setErrors([err.message || 'Gagal menyimpan ulasan. Sila cuba lagi.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="community-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header (Exact 6c4f2e9 structure) */}
        <div className="community-modal-header">
          <div className="modal-header-icon-wrap">
            <Utensils size={20} className="text-primary" />
          </div>
          <div className="modal-header-text">
            <h2>{editingSpot ? `Kemaskini ${SPOT_FEED_NAME}` : `Kongsi ${SPOT_FEED_NAME} Pelajar`}</h2>
            <p>Bantu rakan sekampus jimat belanja makan, aktiviti &amp; servis pelajar</p>
          </div>
          <button
            type="button"
            className="community-modal-close-btn"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Errors Alert */}
        {errors.length > 0 && (
          <div className="community-error-banner" role="alert">
            <AlertCircle size={18} className="error-icon" />
            <div className="error-messages">
              {errors.map((msg, idx) => (
                <div key={idx} className="error-msg-item">{msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* Form Body (Exact 6c4f2e9 .community-modal-form style) */}
        <form onSubmit={handleSubmit} className="community-modal-form">
          {/* Row 1: Place Name & Price */}
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="input-place-name">
                Nama Kedai / Tempat <span className="req">*</span>
              </label>
              <input
                id="input-place-name"
                type="text"
                className="form-control"
                placeholder="cth: Warung Mak Jah, Ampang Superbowl, Kedai Print"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-price">
                Bajet / Harga (RM) <span className="req">*</span>
              </label>
              <div className="input-currency-wrapper">
                <span className="currency-prefix">RM</span>
                <input
                  id="input-price"
                  type="number"
                  step="0.10"
                  min="0"
                  max="200"
                  className="form-control currency-input"
                  placeholder="5.50"
                  value={pricePerMeal}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 1b: Category & Budget Tag (Fitted into exact .form-row-2col style) */}
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="select-category">
                Kategori {SPOT_FEED_NAME} <span className="req">*</span>
              </label>
              <select
                id="select-category"
                className="form-control select-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SPOT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="select-budget-tag">Julat Bajet &amp; Harga Pelajar</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  id="select-budget-tag"
                  className="form-control select-control"
                  value={budgetTag}
                  onChange={(e) => setBudgetTag(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {SPOT_BUDGET_TAGS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`modal-tag-pill ${studentPrice ? 'selected' : ''}`}
                  onClick={() => {
                    const next = !studentPrice;
                    setStudentPrice(next);
                    if (next && !selectedTags.includes('student-deal')) {
                      setSelectedTags((prev) => [...prev, 'student-deal']);
                    }
                  }}
                  style={{ whiteSpace: 'nowrap', height: '38px' }}
                >
                  <TagIcon tagId="student-deal" size={13} className="tag-icon" />
                  <span>Harga Pelajar</span>
                  {studentPrice && <Check size={12} className="check-icon" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Title */}
          <div className="form-group">
            <label htmlFor="input-title">
              Tajuk Ulasan Ringkas <span className="req">*</span>
            </label>
            <input
              id="input-title"
              type="text"
              className="form-control"
              placeholder="cth: Nasi Ayam RM6 Porsi Kenyang + Percuma Sup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
            <div className="field-hint">
              <span>{title.length}/120 aksara</span>
            </div>
          </div>

          {/* Row 3: Rating & Campus */}
          <div className="form-row-2col">
            <div className="form-group">
              <label>Star Rating Pelajar <span className="req">*</span></label>
              <div className="star-rating-picker" role="radiogroup" aria-label="Penilaian Bintang">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} bintang`}
                  >
                    <Star
                      size={22}
                      className={star <= (hoverRating || rating) ? 'filled' : 'empty'}
                    />
                  </button>
                ))}
                <span className="rating-badge-active">
                  {(hoverRating || rating)}.0 / 5
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="select-campus">Lokasi / Kampus Berkaitan</label>
              <select
                id="select-campus"
                className="form-control select-control"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
              >
                {CAMPUS_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Tag Checkbox Pills */}
          <div className="form-group">
            <label>Tag &amp; Ciri-Ciri Menarik</label>
            <div className="modal-tags-grid">
              {COMMUNITY_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`modal-tag-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <TagIcon tagId={tag.id} iconName={tag.iconName} size={13} className="tag-icon" />
                    <span className="tag-label">{tag.label}</span>
                    {isSelected && <Check size={12} className="check-icon" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Detailed Body / Review */}
          <div className="form-group">
            <label htmlFor="input-body">
              Ulasan Penuh &amp; Tips Pelajar <span className="req">*</span>
            </label>
            <textarea
              id="input-body"
              rows={3}
              className="form-control textarea-control"
              placeholder="Ceritakan rasa makanan, kuantiti porsi, masa terbaik untuk datang, atau promo student ID..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1200}
              required
            />
            <div className="field-hint">
              <span>Sekurang-kurangnya 5 aksara ({body.length}/1200)</span>
            </div>
          </div>

          {/* Row 6: Address / Landmark & Map Link + Photo Upload in 2-col */}
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="input-address">
                Alamat atau Landmark (Pilihan)
              </label>
              <div className="input-with-icon">
                <MapPin size={16} className="input-icon text-muted" />
                <input
                  id="input-address"
                  type="text"
                  className="form-control"
                  placeholder="cth: Belakang Gate 3 UTP, sebaris 7-Eleven"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="input-map-link">
                Pautan Google Maps / Foto (Pilihan)
              </label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <div className="input-with-icon" style={{ flex: 1 }}>
                  <Link2 size={16} className="input-icon text-muted" />
                  <input
                    id="input-map-link"
                    type="url"
                    className="form-control"
                    placeholder="https://maps.google.com/..."
                    value={mapLink}
                    onChange={(e) => setMapLink(e.target.value)}
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                {photoUrl ? (
                  <button
                    type="button"
                    className="modal-tag-pill selected"
                    onClick={() => setPhotoUrl('')}
                    title="Buang foto"
                    style={{ height: '38px' }}
                  >
                    <Trash2 size={13} />
                    <span>Foto</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="modal-tag-pill"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingPhoto}
                    title="Muat naik foto spot (maks 5MB)"
                    style={{ height: '38px' }}
                  >
                    <ImagePlus size={13} />
                    <span>{isCompressingPhoto ? '...' : 'Foto'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="community-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-submit-thread"
              disabled={isSubmitting || isCompressingPhoto}
            >
              {isSubmitting
                ? 'Menyimpan...'
                : editingSpot
                ? 'Simpan Perubahan'
                : 'Kongsi Ulasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
