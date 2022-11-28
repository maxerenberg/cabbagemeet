import React from 'react';
import styles from './BottomOverlay.module.css';

export default function BottomOverlay(props: React.PropsWithChildren<{}>) {
  return (
    <div className={`d-block d-md-none ${styles.overlayOuter}`}>
      <div className={styles.overlay}>
        {props.children}
      </div>
    </div>
  );
};

export function BottomOverlayFiller() {
  return (
    <div className={`d-block d-md-none ${styles.overlayTopFiller}`}></div>
  );
}
