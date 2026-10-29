import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Store,
  MapPin,
  Banknote,
  Send,
  AlertCircle,
  Sparkles,
  ImagePlus,
  Trash2,
  GraduationCap,
  Lightbulb,
  Link2
} from 'lucide-react';
import {
  CAMPUS_AREAS,
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

const selectableCampuses = CAMPUS_AREAS.filter((c) => c !== 'All Campuses');

export default function CreateThreadModal({
  isOpen,
  editingSpot = null,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const [category, setCategory] = useState('makan');
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [priceRM, setPriceRM] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [budgetTag, setBudgetTag] = useState('rm5_to_15');
  const [studentPrice, setStudentPrice] = useState(false);
  const [shortTip, setShortTip] = useState('');
  const [campusArea, setCampusArea] = useState(selectableCampuses[0] || 'UM / PJ / Bangsar');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationMapUrl, setLocationMapUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingSpot) {
      setCategory(editingSpot.category || 'makan');
      setTitle(editingSpot.title || '');
      setPlaceName(editingSpot.placeName || editingSpot.stallName || '');
      setPriceRM(editingSpot.priceRM !== undefined && editingSpot.priceRM !== null ? String(editingSpot.priceRM) : '');
      setPriceRange(editingSpot.priceRange || '');
      setBudgetTag(editingSpot.budgetTag || getBudgetTagForPrice(editingSpot.priceRM || 0));
      setStudentPrice(Boolean(editingSpot.studentPrice));
      setShortTip(editingSpot.shortTip || '');
      setCampusArea(editingSpot.campusArea || selectableCampuses[0]);
      setLocationAddress(editingSpot.locationAddress || '');
      setLocationMapUrl(editingSpot.locationMapUrl || '');
      setPhotoUrl(editingSpot.photoUrl || '');
      setBody(editingSpot.body || '');
      setErrors([]);
    } else if (isOpen) {
      setCategory('makan');
      setTitle('');
      setPlaceName('');
      setPriceRM('');
      setPriceRange('');
      setBudgetTag('rm5_to_15');
      setStudentPrice(false);
      setShortTip('');
      setCampusArea(selectableCampuses[0] || 'UM / PJ / Bangsar');
      setLocationAddress('');
      setLocationMapUrl('');
      setPhotoUrl('');
      setBody('');
      setErrors([]);
    }
  }, [editingSpot, isOpen]);

  if (!isOpen) return null;

  const handlePriceChange = (val) => {
    setPriceRM(val);
    const num = Number(val);
    if (val !== '' && Number.isFinite(num) && num >= 0) {
      setBudgetTag(getBudgetTagForPrice(num));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateSpotPhotoFile(file);
    if (!validation.valid) {
      setErrors([validation.reason]);
      return;
    }

    setErrors([]);
    setIsCompressingPhoto(true);
    try {
      const compressedDataUrl = await compressSpotPhoto(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.72
      });
      setPhotoUrl(compressedDataUrl);
    } catch (err) {
      setErrors([err?.message || 'Failed to compress photo.']);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const resolvedPrice =
      priceRM === '' && category === 'events' ? 0 : Number(priceRM);

    const payload = {
      category,
      title,
      placeName,
      stallName: placeName,
      priceRM: resolvedPrice,
      priceRange: priceRange.trim() || (resolvedPrice === 0 ? 'FREE (RM0)' : `RM${resolvedPrice.toFixed(2)}`),
      budgetTag: budgetTag || getBudgetTagForPrice(resolvedPrice),
      studentPrice,
      shortTip,
      campusArea,
      locationAddress,
      locationMapUrl,
      photoUrl: photoUrl || null,
      body,
      tags: studentPrice ? ['student-deal'] : []
    };

    const validation = validateThreadInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    try {
      await onSubmit(payload, editingSpot?.id || null);
      onClose();
    } catch (err) {
      setErrors([err?.message || 'Unable to save spot. Please try again.']);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div
        className="community-modal-content card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-thread-title"
      >
        <div className="community-modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">
              <Sparkles size={13} />
              {SPOT_FEED_NAME} Community
            </span>
            <h2 id="create-thread-title">
              {editingSpot ? 'Edit Student Spot' : 'Share a Student Spot'}
            </h2>
          </div>
          <button
            type="button"
            className="community-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="community-create-form">
          {errors.length > 0 && (
            <div className="community-form-errors">
              <AlertCircle size={16} />
              <ul>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Category Picker */}
          <div className="form-group">
            <label>Category *</label>
            <div className="spot-category-select-grid">
              {SPOT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`spot-category-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    <TagIcon iconName={cat.icon} size={15} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="thread-title">Headline / Spot Title *</label>
            <input
              id="thread-title"
              type="text"
              placeholder="e.g., RM6 Nasi Ayam Kunyit Porsi Padu or RM5 Student Bowling Night"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="stall-name">
                <Store size={14} /> Place / Shop Name *
              </label>
              <input
                id="stall-name"
                type="text"
                placeholder="e.g., Gerai Kak Long / Ampang Superbowl"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                maxLength={80}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price-rm">
                <Banknote size={14} /> Price (RM) * <small>(0 for Free)</small>
              </label>
              <input
                id="price-rm"
                type="number"
                step="0.10"
                min="0"
                max="500"
                placeholder="6.50"
                value={priceRM}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="price-range">Price Range Label (Optional)</label>
              <input
                id="price-range"
                type="text"
                placeholder="e.g., RM5 - RM12 or FREE Entry"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="form-group">
              <label htmlFor="budget-tag">Budget Tag *</label>
              <select
                id="budget-tag"
                value={budgetTag}
                onChange={(e) => setBudgetTag(e.target.value)}
              >
                {SPOT_BUDGET_TAGS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Price Toggle */}
          <div className="spot-student-toggle-row">
            <label className="spot-toggle-label">
              <input
                type="checkbox"
                checked={studentPrice}
                onChange={(e) => setStudentPrice(e.target.checked)}
              />
              <GraduationCap size={16} />
              <span>Has special Student Price / Matric Card discount</span>
            </label>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="campus-area">
                <MapPin size={14} /> Campus Area *
              </label>
              <select
                id="campus-area"
                value={campusArea}
                onChange={(e) => setCampusArea(e.target.value)}
              >
                {selectableCampuses.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location-address">Landmark / Directions</label>
              <input
                id="location-address"
                type="text"
                placeholder="e.g., Next toGate B, Ground Floor"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location-map-url">
              <Link2 size={14} /> Google Maps / Waze Link (Optional)
            </label>
            <input
              id="location-map-url"
              type="url"
              placeholder="https://maps.google.com/?q=..."
              value={locationMapUrl}
              onChange={(e) => setLocationMapUrl(e.target.value)}
            />
          </div>

          {/* Short Tip */}
          <div className="form-group">
            <label htmlFor="short-tip">
              <Lightbulb size={14} /> Short Student Tip (max 160 chars)
            </label>
            <input
              id="short-tip"
              type="text"
              placeholder="e.g., Flash your matric card before 5pm for free iced lemon tea!"
              value={shortTip}
              onChange={(e) => setShortTip(e.target.value)}
              maxLength={160}
            />
          </div>

          {/* Photo Upload with Client-Side Validation & Compression */}
          <div className="form-group">
            <label>
              <ImagePlus size={14} /> Spot Photo (JPG/PNG/WebP, max 5MB — auto-compressed)
            </label>
            <div className="spot-photo-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              {photoUrl ? (
                <div className="spot-photo-preview-wrap">
                  <img src={photoUrl} alt="Spot preview" className="spot-photo-preview" />
                  <button
                    type="button"
                    className="spot-photo-remove-btn"
                    onClick={() => setPhotoUrl('')}
                  >
                    <Trash2 size={14} /> Remove Photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="spot-photo-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressingPhoto}
                >
                  <ImagePlus size={18} />
                  <span>{isCompressingPhoto ? 'Compressing photo...' : 'Upload & Compress Photo'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="thread-body">Why is this spot worth visiting? *</label>
            <textarea
              id="thread-body"
              rows={3}
              placeholder="Share details: portion size, opening hours, Wi-Fi speed, or how students save money here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              required
            />
          </div>

          <div className="community-modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isCompressingPhoto}
            >
              <Send size={16} />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : editingSpot
                  ? 'Save Changes'
                  : 'Publish Spot'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
