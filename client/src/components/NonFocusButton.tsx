import React from 'react';

export default function NonFocusButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const origOnClick = props.onClick;
  const onClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (origOnClick !== undefined) {
      origOnClick(ev);
    }
    (ev.target as HTMLButtonElement).blur();
  }
  const newProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {...props, onClick};
  return <button {...newProps} />;
}
