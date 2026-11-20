import { useState, useEffect } from 'react';

const MOBILE_MAX_WIDTH = 768;

function readViewportState() {
  if (typeof window === 'undefined') {
    return {
      height: 0,
      offsetTop: 0,
      isMobileViewport: false
    };
  }

  const vv = window.visualViewport;
  return {
    height: vv ? Math.round(vv.height) : window.innerHeight,
    offsetTop: vv ? Math.round(vv.offsetTop) : 0,
    isMobileViewport: window.innerWidth <= MOBILE_MAX_WIDTH
  };
}

/**
 * Tracks window.visualViewport height and offsetTop so fixed full-screen
 * mobile chat containers stay pinned cleanly inside the visible area when
 * the iOS/Android virtual keyboard opens.
 */
export function useVisualViewport() {
  const [viewport, setViewport] = useState(readViewportState);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      const next = readViewportState();
      setViewport((prev) =>
        prev.height === next.height &&
        prev.offsetTop === next.offsetTop &&
        prev.isMobileViewport === next.isMobileViewport
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
  }, []);

  return viewport;
}

export default useVisualViewport;
