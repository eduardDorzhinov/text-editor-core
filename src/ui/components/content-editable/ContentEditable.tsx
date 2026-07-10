import { ContentEditable } from "@lexical/react/LexicalContentEditable";

import "./ContentEditable.scss";

type Props = {
  className?: string,
  placeholderClassName?: string,
  placeholder: string,
};

export function LexicalContentEditable({
  className,
  placeholder,
  placeholderClassName,
}: Props) {
  return (
    <ContentEditable
      aria-placeholder={placeholder}
      className={className ?? "ContentEditable__root"}
      placeholder={
        (
          <div className={placeholderClassName ?? "ContentEditable__placeholder"}>
            {placeholder}
          </div>
        )
      }
    />
  );
}
