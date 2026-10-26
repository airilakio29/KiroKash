import React, { useState, useEffect } from 'react';
import { X, Star, AlertCircle, Utensils, MapPin, Tag, Check, Sparkles } from 'lucide-react';
import { CAMPUS_OPTIONS, COMMUNITY_TAGS, validateThreadInput } from '../../services/communityService';
import TagIcon from './TagIcon';

export default function CreateThreadModal({
  isOpen,
  onClose,
  onSubmit,
  prefillData = null,
  user
}) {
  const [placeName, setPlaceName] = useState('');
  const [title, setTitle] = useState('');
  const [pricePerMeal, setPricePerMeal] = useState('');
  const [rating, setRating] = useState(5);
  const [campus, setCampus] = useState('all');
  const [selectedTags, setSelectedTags] = useState(['bawah-rm10']);
  const [body, setBody] = useState('');
  const [address, setAddress] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync prefill data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (prefillData) {
        setPlaceName(prefillData.placeName || prefillData.name || '');
        setTitle(prefillData.title || `Port Makan Padu: ${prefillData.placeName || prefillData.name || ''}`);
        setPricePerMeal(prefillData.pricePerMeal ? String(prefillData.pricePerMeal) : '');
        setRating(prefillData.rating || 5);
        setCampus(prefillData.campus || user?.university ? 'utp' : 'all');
        setAddress(prefillData.address || '');
      } else {
        setPlaceName('');
        setTitle('');
        setPricePerMeal('');
        setRating(5);
        setCampus(user?.university ? 'utp' : 'all');
        setSelectedTags(['bawah-rm10']);
        setBody('');
        setAddress('');
      }
      setErrors([]);
      setIsSubmitting(false);
    }
  }, [isOpen, prefillData, user]);

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

  const handleToggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const payload = {
      placeName: placeName.trim(),
      title: title.trim(),
      body: body.trim(),
      pricePerMeal: pricePerMeal === '' ? 0 : Number(pricePerMeal),
      rating: Number(rating),
      campus,
      tags: selectedTags,
      address: address.trim() || null,
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
      await onSubmit(payload);
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
        {/* Header */}
        <div className="community-modal-header">
          <div className="modal-header-icon-wrap">
            <Utensils size={20} className="text-primary" />
          </div>
          <div className="modal-header-text">
            <h2>Kongsi Port Makan Bajet</h2>
            <p>Bantu rakan sekampus jimat belanja makan & minum</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="community-modal-form">
          {/* Row 1: Place Name & Price */}
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="input-place-name">
                Nama Kedai / Gerai <span className="req">*</span>
              </label>
              <input
                id="input-place-name"
                type="text"
                className="form-control"
                placeholder="cth: Warung Mak Jah, Restoran Nasi Kandar"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-price">
                Bajet / Harga Sepinggan (RM) <span className="req">*</span>
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
                  onChange={(e) => setPricePerMeal(e.target.value)}
                  required
                />
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
                {CAMPUS_OPTIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Tag Checkbox Pills */}
          <div className="form-group">
            <label>Tag & Ciri-Ciri Menarik</label>
            <div className="modal-tags-grid">
              {COMMUNITY_TAGS.map(tag => {
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
              Ulasan Penuh & Tips Pelajar <span className="req">*</span>
            </label>
            <textarea
              id="input-body"
              rows={4}
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

          {/* Row 6: Address / Landmark (Optional) */}
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
                placeholder="cth: Belakang Gate 3 UTP, sebaris dengan 7-Eleven"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={150}
              />
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Kongsi Ulasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
