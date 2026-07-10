import {
  ChangeEvent,
  forwardRef,
  JSX,
  Ref,
  RefObject,
} from "react";

import { isHTMLElement } from "lexical";

import styles from "./EquationEditor.module.scss";

type BaseEquationEditorProps = {
  equation: string,
  inline: boolean,
  setEquation: (equation: string) => void,
};

function EquationEditorC({
  equation,
  setEquation,
  inline,
}: BaseEquationEditorProps,
forwardedRef: Ref<HTMLInputElement | HTMLTextAreaElement>): JSX.Element {
  const onChange = (event: ChangeEvent) => {
    setEquation((event.target as HTMLInputElement).value);
  };

  return inline && isHTMLElement(forwardedRef) ?
    (
      <span className={styles.inputBackground}>
        <span className={styles.dollarSign}>$</span>
        <input
          ref={forwardedRef as RefObject<HTMLInputElement>}
          autoFocus={true}
          className={styles.inlineEditor}
          value={equation}
          onChange={onChange}
        />
        <span className={styles.dollarSign}>$</span>
      </span>
    ) :
    (
      <div className={styles.inputBackground}>
        <span className={styles.dollarSign}>{"$$\n"}</span>
        <textarea
          ref={forwardedRef as RefObject<HTMLTextAreaElement>}
          className={styles.blockEditor}
          value={equation}
          onChange={onChange}
        />
        <span className={styles.dollarSign}>{"\n$$"}</span>
      </div>
    );
}

export const EquationEditor = forwardRef(EquationEditorC);
