import { useEffect, useRef } from "react";

import katex from "katex";

export function KatexRenderer({
  equation,
  inline,
  onDoubleClick,
}: Readonly<{
  equation: string,
  inline: boolean,
  onDoubleClick: () => void,
}>) {
  const katexElementRef = useRef(null);

  useEffect(() => {
    const katexElement = katexElementRef.current;

    if (katexElement !== null) {
      katex.render(
        equation, katexElement, {
          // true === block display
          displayMode: !inline,
          errorColor: "#cc0000",
          output: "html",
          strict: "warn",
          throwOnError: false,
          trust: false,
        },
      );
    }
  }, [ equation, inline ]);

  return (
    // We use an empty image tag either side to ensure Android doesn't try and compose from the
    // inner text from Katex. There didn't seem to be any other way of making this work,
    // without having a physical space.
    <>
      <img
        alt=""
        height="0"
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        width="0"
      />
      <span
        ref={katexElementRef}
        role="button"
        tabIndex={-1}
        onDoubleClick={onDoubleClick}
      />
      <img
        alt=""
        height="0"
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        width="0"
      />
    </>
  );
}
