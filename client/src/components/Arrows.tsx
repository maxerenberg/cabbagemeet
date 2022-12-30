import React from 'react';
import styles from './Arrows.module.css';

export function LeftArrow(props: React.HTMLAttributes<SVGElement>) {
  let className = styles.arrow;
  if (props.className) {
    className += ' ' + props.className;
  }
  props = {...props, className};
  // Adapted from https://icons.getbootstrap.com/icons/chevron-left/
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"
      role="button"
      aria-label="Previous page"
      {...props}
    >
      <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
    </svg>
  );
}

export function RightArrow(props: React.HTMLAttributes<SVGElement>) {
  let className = styles.arrow;
  if (props.className) {
    className += ' ' + props.className;
  }
  props = {...props, className};
  // Adapted from https://icons.getbootstrap.com/icons/chevron-right/
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"
      role="button"
      aria-label="Next page"
      {...props}
    >
      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  );
}
