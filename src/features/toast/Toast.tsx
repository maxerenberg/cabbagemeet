import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastMessageType = 'success' | 'failure';
export type ToastMessageProps = {
  msg: string,
  msgType: ToastMessageType,
};
type ToastProps = ToastMessageProps & {
  visible: boolean,
  setVisible: (visible: boolean) => void,
};

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [msgProps, setMsgProps] = useState<ToastMessageProps>({
    msg: '',
    msgType: 'failure',
  });
  const toast = <Toast {...msgProps} visible={visible} setVisible={setVisible} />;
  const showToast = ({msg, msgType}: {msg: string, msgType: ToastMessageType}) => {
    setMsgProps({msg, msgType});
    setVisible(true);
  };
  const hideToast = () => setVisible(false);
  return { toast, showToast, hideToast };
}

const Toast: React.FC<ToastProps> = ({ msg, msgType, visible, setVisible }) => {
  useEffect(() => {
    if (visible) {
      let timerID: NodeJS.Timeout | null = setTimeout(() => {
        setVisible(false);
        timerID = null;
      }, 3000);
      return () => {
        if (timerID !== null) clearTimeout(timerID);
        setVisible(false);
      };
    }
  }, [visible, setVisible]);
  const color = msgType === 'success' ? 'forestgreen' : 'red';
  return (
    <div
      className={"toast" + (visible ? " show" : "")}
      style={{border: "1px solid " + color}}
    >
      {msg}
    </div>
  );
};
