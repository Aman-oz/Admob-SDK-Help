import React, {useEffect, useRef, useState} from 'react';

/**
 * Fades + slides children in once they scroll into view.
 * Falls back to always-visible during SSR / when IntersectionObserver
 * isn't available yet.
 */
export default function Reveal({children, as: Tag = 'div', className = '', delay = 0}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ref.current) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {threshold: 0.15},
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`ozi-reveal ${visible ? 'ozi-reveal--visible' : ''} ${className}`}
      style={{transitionDelay: `${delay}ms`}}>
      {children}
    </Tag>
  );
}
