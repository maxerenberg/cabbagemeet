import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer } from 'react';
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

function CloseButton(props: React.HTMLAttributes<SVGElement>) {
  // Copied from https://icons.getbootstrap.com/icons/x-lg/
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className={`bi bi-x-lg ${styles.toastCloseBtn}`} viewBox="0 0 16 16" {...props}>
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
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
  
  let className = styles.toast;
  if (toastData.msgType === 'failure') {
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

  useEffect(() => {
    if (toastData.autoClose && !autoCloseTimeoutIDRef.current) {
      const timeoutID = setTimeout(onClose, 2000) as unknown as number;
      autoCloseTimeoutIDRef.current = timeoutID;
    }
  }, [toastData.autoClose, onClose]);

  return (
    <div className={className}>
      <div className="me-auto">{toastData.msg}</div>
      <CloseButton onClick={onClose} />
    </div>
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
