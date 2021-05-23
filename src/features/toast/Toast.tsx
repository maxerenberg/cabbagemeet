import React, { createContext, useEffect, useState } from 'react';
import './Toast.css';

export type ToastMessageType = 'success' | 'failure';
export type ToastMessageProps = {
  msg: string,
  msgType: ToastMessageType,
};
type ToastProps = ToastMessageProps & {
  visible: boolean,
  setVisible: (visible: boolean) => void,
  // This is an ugly hack we use for the Toast to determine if it
  // showToast() was called explicitly.
  counter: number,
};

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [msgProps, setMsgProps] = useState<ToastMessageProps>({
    msg: '',
    msgType: 'failure',
  });
  const [counter, setCounter] = useState(0);
  const toast = (
    <Toast
      {...msgProps}
      visible={visible} setVisible={setVisible}
      counter={counter}
    />
  );
  const showToast = ({msg, msgType}: {msg: string, msgType: ToastMessageType}) => {
    setMsgProps({msg, msgType});
    setVisible(true);
    setCounter(counter + 1);
  };
  const hideToast = () => setVisible(false);
  return { toast, showToast, hideToast };
}

const Toast: React.FC<ToastProps> = ({ msg, msgType, visible, setVisible, counter }) => {
  const [counterCopy, setCounterCopy] = useState(-1);
  const [wasVisibleOnce, setWasVisibleOnce] = useState(false);
  const [timerID, setTimerID] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only create a new timer if showToast() was explicitly called -
    // otherwise, we have infinite recursion because we update timerID
    if (counterCopy === counter) return;
    setCounterCopy(counter);
    if (!visible) return;
    if (timerID !== null) clearTimeout(timerID);
    const newTimerID = setTimeout(() => {
      setVisible(false);
      setTimerID(null);
    }, 2000);
    setTimerID(newTimerID);
    return () => {
      if (timerID !== null) clearTimeout(timerID);
    };
  }, [visible, setVisible, counter, timerID, counterCopy]);
  
  const color = msgType === 'success' ? 'forestgreen' : 'red';
  let className = "toast";
  if (visible) {
    className += " show";
    if (!wasVisibleOnce) {
      setWasVisibleOnce(true);
    }
  } else if (wasVisibleOnce) {
    // We only want to show the "hide" animation if the toast was
    // previously visible at least once
    className += " hide";
  }
  
  return (
    <div
      className={className}
      style={{border: "1px solid " + color}}
    >
      {msg}
    </div>
  );
};

type toastAPIType = ReturnType<typeof useToast>;

export const toastContext = createContext<toastAPIType>({
  toast: <div style={{display: 'none'}}>toast is unitialized</div>,
  showToast: () => { console.error('toast is uninitialized'); },
  hideToast: () => { console.error('toast is uninitialized'); },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastAPI = useToast();
  return (
    <toastContext.Provider value={toastAPI}>
      {children}
    </toastContext.Provider>
  );
}
