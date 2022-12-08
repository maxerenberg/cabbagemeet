import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer } from 'react';
import BootstrapToast from 'react-bootstrap/Toast';
import type { Variant } from 'react-bootstrap/esm/types';
import styles from './Toast.module.css';

interface ToastData {
  msg: string;
  msgType: 'success' | 'failure';
  autoClose?: boolean;
}

interface ToastMessages {
  [id: string]: ToastData;
}

interface ToastMessagesState {
  data: ToastMessages;
  counter: number;
}

type ToastMessagesAction = {
  type: 'add';
  toastData: ToastData;
} | {
  type: 'remove';
  toastID: string;
};

interface toastAPIType {
  showToast: (data: ToastData) => void;
}

const toastContext = createContext<toastAPIType>({
  showToast: () => {},
});

function Toasts({
  messages, removeToast,
}: {
  messages: ToastMessages,
  removeToast: (toastID: string) => void,
}) {
  return (
    <div className={`${styles.toastContainer}`}>
      {
        /* Sort in reverse order so that oldest message is at bottom of screen */
        Object.entries(messages)
          .sort(([toastID1], [toastID2]) => Number(toastID2) - Number(toastID1))
          .map(([toastID, toastData]) => (
            <Toast key={toastID} {...{toastID, toastData, removeToast}} />
          ))
      }
    </div>
  );
}

function Toast({
  toastID, toastData, removeToast,
}: {
  toastID: string, toastData: ToastData, removeToast: (toastID: string) => void,
}) {
  const [closed, setClosed] = useState(false);
  // We need to use a ref here because the useState setter is asynchronous
  // (see https://stackoverflow.com/a/54069332), which means that we might not
  // read our own write from a previous render
  const autoCloseTimeoutIDRef = useRef(0);

  let bg: Variant = 'primary';
  let className = styles.toast;
  if (toastData.msgType === 'failure') {
    bg = 'danger';
    className += ` ${styles.error}`;
  }
  if (closed) {
    className += ` ${styles.toastHidden}`;
  }
  const onClose = useCallback(() => {
    if (closed) {
      return;
    }
    setClosed(true);
    if (autoCloseTimeoutIDRef.current) {
      clearTimeout(autoCloseTimeoutIDRef.current);
    }
    // Wait for the animation to finish, then unmount this component
    // Make sure the timeout is the same value as what is used in the CSS
    setTimeout(() => removeToast(toastID), 500);
  }, [closed, removeToast, toastID]);

  if (toastData.autoClose && !autoCloseTimeoutIDRef.current) {
    const timeoutID = setTimeout(onClose, 3000) as unknown as number;
    autoCloseTimeoutIDRef.current = timeoutID;
  }

  return (
    <BootstrapToast className={className} onClose={onClose} bg={bg}>
      {/* See custom.css (couldn't use CSS module due to global Bootstrap CSS names) */}
      <BootstrapToast.Header className="toast-header-no-title"></BootstrapToast.Header>
      <BootstrapToast.Body>
        {toastData.msg}
      </BootstrapToast.Body>
    </BootstrapToast>
  );
}

function toastStateReducer(state: ToastMessagesState, action: ToastMessagesAction): ToastMessagesState {
  if (action.type === 'add') {
    return {
      data: {...state.data, [state.counter]: action.toastData},
      counter: state.counter + 1,
    };
  } else if (action.type === 'remove') {
    const newData = {...state.data};
    delete newData[action.toastID];
    return {
      data: newData,
      counter: state.counter,
    };
  } else {
    throw new Error();
  }
}

export function ToastProvider({ children }: React.PropsWithChildren<{}>) {
  const [toastState, toastDispatch] = useReducer(toastStateReducer, {
    counter: 1,
    data: {
      //'0': {msg: 'This is a test', msgType: 'success'},
    },
  });

  const showToast = useCallback(
    (toastData: ToastData) => toastDispatch({type: 'add', toastData}),
    []
  );
  const removeToast = useCallback(
    (toastID: string) => toastDispatch({type: 'remove', toastID}),
    []
  );

  return (
    <toastContext.Provider value={{showToast}}>
      {children}
      <Toasts messages={toastState.data} removeToast={removeToast} />
    </toastContext.Provider>
  );
}

export function useToast(): toastAPIType {
  const { showToast } = useContext(toastContext);
  return { showToast };
}
