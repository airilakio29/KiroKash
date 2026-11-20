import { useState, useEffect } from 'react';

const MOBILE_MAX_WIDTH = 768;

function readViewportState() {
  if (typeof window === 'undefined') {
    return {
      height: 0,
      offsetTop: 0,
      isMobileViewport: false,
      isKeyboardOpen: false
    };
  }

  const vv = window.visualViewport;
  const height = vv ? Math.round(vv.height) : window.innerHeight;
  const offsetTop = vv ? Math.round(vv.offsetTop) : 0;
  const isMobileViewport = window.innerWidth <= MOBILE_MAX_WIDTH;
  const isKeyboardOpen = isMobileViewport && height > 0 && height < window.innerHeight * 0.75;

  return {
    height,
    offsetTop,
    isMobileViewport,
    isKeyboardOpen
  };
}

/**
 * Tracks window.visualViewport height and offsetTop so fixed full-screen
 * mobile chat containers stay pinned cleanly inside the visible area when
 * the iOS/Android virtual keyboard opens.
 *
 * When `preventScrollDrift` is true, calls window.scrollTo(0, 0) on
 * visualViewport resize/scroll so iOS Safari never drifts fixed headers upward.
 */
export function useVisualViewport(options = {}) {
  const { preventScrollDrift = false } = options;
  const [viewport, setViewport] = useState(readViewportState);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      if (preventScrollDrift && window.innerWidth <= MOBILE_MAX_WIDTH) {
        window.scrollTo(0, 0);
      }
      const next = readViewportState();
      setViewport((prev) =>
        prev.height === next.height &&
        prev.offsetTop === next.offsetTop &&
        prev.isMobileViewport === next.isMobileViewport &&
        prev.isKeyboardOpen === next.isKeyboardOpen
          ? prev
          : next
      );
    };

    update();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, [preventScrollDrift]);

  return viewport;
}

/**
 * True iOS Safari body scroll lock.
 * Fixes document.body in place at -scrollY so focusing inputs inside a fixed
 * full-screen chat cannot scroll or wobble the background page.
 */
export function useIosBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

export default useVisualViewport;
