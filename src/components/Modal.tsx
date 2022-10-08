import React, { useEffect } from 'react';
import styles from './Modal.module.css';

export default function Modal(props: React.PropsWithChildren<React.HTMLProps<HTMLDivElement>>) {
  // Set overflow:hidden on the body to prevent scrolling (defined in common.css)
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  // Allow caller to add custom classes
  const newProps = {...props};
  delete newProps.children;
  newProps.className = styles.modal;
  if (props.hasOwnProperty('className')) {
    newProps.className += ' ' + props.className;
  }

  return (
    <div className={styles.modal_backdrop}>
      <div {...newProps}>
        {props.children}
      </div>
    </div>
  );
};
