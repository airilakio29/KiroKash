import React from 'react';
import { ArrowLeft, Sun } from 'lucide-react';

/**
 * Reusable, mobile-responsive header for all Pay subpages:
 * - Row 1: Compact "Back to Pay" button on the left, optional "Brightness" control on the right.
 * - Row 2: Left-aligned page title below the controls so buttons and titles never collide or clip on mobile.
 */
export default function PayPageHeader({
  title,
  onBack,
  backLabel = 'Back to Pay',
  showBrightnessToggle = false,
  brightnessBoost = false,
  onToggleBrightness,
  rightSlot = null
}) {
  return (
    <header className="pay-subview-header">
      <div className="pay-header-top-row">
        <button
          type="button"
          className="pay-back-btn"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft size={15} className="pay-back-icon" aria-hidden="true" />
          <span className="pay-back-text">{backLabel}</span>
        </button>

        {showBrightnessToggle ? (
          <button
            type="button"
            className={`pay-brightness-btn ${brightnessBoost ? 'active' : ''}`}
            onClick={onToggleBrightness}
            title={
              brightnessBoost
                ? 'High contrast brightness boost is active'
                : 'Boost screen contrast and brightness for easier QR scanning'
            }
            aria-label={
              brightnessBoost
                ? 'Disable Brightness Boost'
                : 'Enable Brightness Boost'
            }
            aria-pressed={Boolean(brightnessBoost)}
          >
            <Sun size={15} className="pay-brightness-icon" aria-hidden="true" />
            <span className="pay-brightness-label">
              {brightnessBoost ? 'Brightness ON' : 'Brightness'}
            </span>
          </button>
        ) : rightSlot ? (
          <div className="pay-header-right-slot">{rightSlot}</div>
        ) : null}
      </div>

      <div className="pay-header-title-row">
        <h2 className="pay-subview-title">{title}</h2>
      </div>
    </header>
  );
}
