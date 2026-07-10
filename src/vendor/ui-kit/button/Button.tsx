import {
  ButtonHTMLAttributes,
  ForwardedRef,
  forwardRef,
  memo,
} from "react";

import clsx from "clsx";

import { ButtonSize, ButtonVariant } from "./types";

import st from "./Button.module.scss";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant,
  size?: ButtonSize,
  disabled?: boolean,
  className?: string,
};

export const Button = memo(forwardRef(({
  children,
  variant = ButtonVariant.Primary,
  size = ButtonSize.Small,
  type = "button",
  disabled,
  className,
  ...props
}: ButtonProps,
ref: ForwardedRef<HTMLButtonElement>) => (
  <button
    ref={ref}
    className={
      clsx(
        st.button,
        st[ variant ],
        st[ size ],
        disabled && st.disabled,
        className,
      )
    }
    disabled={disabled}
    type={type}
    {...props}
  >
    {children}
  </button>
)));

Button.displayName = "Button";
