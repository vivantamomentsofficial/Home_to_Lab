import React from 'react';

const AnimatedBackground = () => (
  <div className="quiet-page-background fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
);

export default React.memo(AnimatedBackground);
