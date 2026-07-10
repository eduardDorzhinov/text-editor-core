import { FC } from "react";

import clsx from "clsx";

import st from "./Loader.module.scss";

type Props = {
  isFullPage?: boolean,
};

export const Loader: FC<Props> = ({ isFullPage }) => {
  return (
    <div className={clsx(st.wrap, isFullPage && st.full)}>
      <svg
        className={st.loader}
        fill="none"
        height="80"
        viewBox="0 0 80 80"
        width="80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          fill="currentcolor"
          height="28.1379"
          rx="3.31034"
          width="6.62069"
          x="36.6896"
        />
        <rect
          fill="currentcolor"
          height="27.9042"
          rx="3.18905"
          transform="rotate(45 65.7915 9.69873)"
          width="6.37811"
          x="65.7915"
          y="9.69873"
        />
        <rect
          fill="currentcolor"
          height="27.9042"
          rx="3.18905"
          transform="rotate(135 70.3018 65.7915)"
          width="6.37811"
          x="70.3018"
          y="65.7915"
        />
        <rect
          fill="currentcolor"
          height="28.1379"
          rx="3.03448"
          transform="rotate(90 79.7241 36.9653)"
          width="6.06897"
          x="79.7241"
          y="36.9653"
        />
        <rect
          fill="currentcolor"
          height="28.1379"
          rx="3.31034"
          width="6.62069"
          x="36.6896"
          y="51.8623"
        />
        <rect
          fill="currentcolor"
          height="27.9042"
          rx="3.18905"
          transform="rotate(45 29.4294 46.0605)"
          width="6.37811"
          x="29.4294"
          y="46.0605"
        />
        <rect
          fill="currentcolor"
          height="27.9042"
          rx="3.18905"
          transform="rotate(135 33.9396 29.4297)"
          width="6.37811"
          x="33.9396"
          y="29.4297"
        />
        <rect
          fill="currentcolor"
          height="28.1379"
          rx="3.03448"
          transform="rotate(90 28.4138 36.9653)"
          width="6.06897"
          x="28.4138"
          y="36.9653"
        />
      </svg>
    </div>
  );
};
