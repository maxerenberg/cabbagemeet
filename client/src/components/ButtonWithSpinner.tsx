import React from "react";
import Spinner from 'react-bootstrap/Spinner';
import NonFocusButton from "./NonFocusButton";

function Button({children, ...rest}: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button {...rest}>{children}</button>
}

function ButtonWithSpinner({
  isLoading,
  children,
  as: As = 'button',
  ...rest
}: React.PropsWithChildren<{
  as?: 'button' | 'NonFocusButton';
  isLoading: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  const spinner = isLoading && (
    <Spinner
      as="span"
      animation="border"
      size="sm"
      role="status"
      aria-hidden="true"
      className="ms-2"
    >
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );
  let style: React.CSSProperties = {};
  if (rest.style) {
    style = {...rest.style};
  }
  //style.boxSizing = 'border-box';
  if (!isLoading) {
    // FIXME: this is really fragile. We're trying to make sure that the button
    // size doesn't change when the spinner appears or disappears.
    style.paddingLeft = style.paddingRight = '1.65em';
  }
  let className = 'custom-btn-min-width';
  if (rest.className) {
    className += ' ' + rest.className;
  }
  const T = As === 'button' ? Button : NonFocusButton;
  const btnProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    ...rest,
    type: rest.type ?? 'button',
    disabled: rest.disabled ?? isLoading,
    style,
    className,
  };
  return (
    <T {...btnProps}>
      {children} {spinner}
    </T>
  );
}
export default React.memo(ButtonWithSpinner);
