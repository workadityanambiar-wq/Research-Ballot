'use client';
import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINTS = { xs: 0, sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

function getBreakpoint(w: number): Breakpoint {
  if (w < 480) return 'xs';
  if (w < 768) return 'sm';
  if (w < 1024) return 'md';
  if (w < 1280) return 'lg';
  if (w < 1536) return 'xl';
  return '2xl';
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>('xl');
  const [width, setWidth] = useState(1280);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setWidth(w);
      setBp(getBreakpoint(w));
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    bp,
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isSmall: width < 480,
    below: (b: Breakpoint) => width < BREAKPOINTS[b],
    above: (b: Breakpoint) => width >= BREAKPOINTS[b],
    cols: (desktop: number, tablet?: number, mobile?: number): number => {
      if (width < 768) return mobile ?? 1;
      if (width < 1024) return tablet ?? Math.min(desktop, 2);
      return desktop;
    },
  };
}
