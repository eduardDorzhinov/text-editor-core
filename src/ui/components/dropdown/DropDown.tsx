import {
  createContext,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject,
  StyleHTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconType } from "react-icons";
import { IoChevronDown } from "react-icons/io5";

import clsx from "clsx";
import { isDOMNode } from "lexical";

import { isKeyboardInput } from "@/lib/utils/focusUtils";
import { useMainContext } from "@/model/providers/MainContext";

import "./Dropdown.scss";

type DropDownContextType = {
  registerItem: (ref: RefObject<null | HTMLButtonElement>) => void,
};

const DropDownContext = createContext<DropDownContextType | null>(null);

const dropDownPadding = 4;

export function DropDownItem({
  children,
  className,
  isActive,
  onClick,
  title,
}: {
  children: ReactNode,
  className?: string,
  isActive?: boolean,
  onClick: (event: MouseEvent<HTMLButtonElement>) => void,
  title?: string,
}) {
  const ref = useRef<null | HTMLButtonElement>(null);

  const dropDownContext = useContext(DropDownContext);

  if (dropDownContext === null) {
    throw new Error("DropDownItem must be used within a DropDown");
  }

  const { registerItem } = dropDownContext;

  useEffect(() => {
    if (ref && ref.current) {
      registerItem(ref);
    }
  }, [ ref, registerItem ]);

  return (
    <button
      ref={ref}
      className={
        clsx(
          "edt-drp-item",
          isActive && "edt-drp-active",
          className,
        )
      }
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DropDownItems({
  children,
  dropDownRef,
  onClose,
}: {
  children: ReactNode,
  dropDownRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
}) {
  const [ items, setItems ] = useState<RefObject<null | HTMLButtonElement>[]>();
  const [ highlightedItem, setHighlightedItem ] = useState<RefObject<null | HTMLButtonElement>>();

  const registerItem = useCallback((itemRef: RefObject<null | HTMLButtonElement>) => {
    setItems((prev) => (prev ?
      [ ...prev, itemRef ] :
      [ itemRef ]));
  },
  [ setItems ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (key === "Escape") {
      onClose();
    }
    if (!items) {
      return;
    }

    if ([
      "Escape",
      "ArrowUp",
      "ArrowDown",
      "Tab",
    ].includes(key)) {
      event.preventDefault();
    }

    if (key === "Escape" || key === "Tab") {
      onClose();
    } else if (key === "ArrowUp") {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[ 0 ];
        }
        const index = items.indexOf(prev) - 1;
        return items[ index === -1 ?
          items.length - 1 :
          index ];
      });
    } else if (key === "ArrowDown") {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[ 0 ];
        }
        return items[ items.indexOf(prev) + 1 ];
      });
    }
  };

  const contextValue = useMemo(() => ({
    registerItem,
  }), [ registerItem ]);

  // При открытии фокусируем сам контейнер, а НЕ первый пункт: дропдаун
  // открывается без подсвеченного/сфокусированного пункта, но клавиатурная
  // навигация работает (стрелки ↑/↓ ловит onKeyDown контейнера).
  useEffect(() => {
    dropDownRef.current?.focus({ preventScroll: true });
  }, [ dropDownRef ]);

  // Пункт получает фокус только после выбора стрелками ↑/↓.
  useEffect(() => {
    if (highlightedItem && highlightedItem.current) {
      highlightedItem.current.focus();
    }
  }, [ highlightedItem ]);

  return (
    <DropDownContext.Provider value={contextValue}>
      <div
        ref={dropDownRef}
        className="text-creator-dropdown"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </DropDownContext.Provider>
  );
}

export const DropDown = ({
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonStyles,
  ButtonIcon,
  children,
  stopCloseOnClickSelf,
  showMoreIcon,
  hideShowMore = false,
  hideMobileButtonLabel = true,
  escapeOverflow = false,
}: {
  disabled?: boolean,
  buttonAriaLabel?: string,
  buttonClassName: string,
  buttonStyles?: StyleHTMLAttributes<HTMLButtonElement>,
  ButtonIcon?: IconType,
  buttonLabel?: string,
  children: ReactNode | ReactElement | ReactElement[] | ((onClose: (() => void)) => ReactElement),
  stopCloseOnClickSelf?: boolean,
  showMoreIcon?: () => ReactNode,
  hideShowMore?: boolean,
  hideMobileButtonLabel?: boolean,
  // Рендерить меню порталом в body с position:fixed — чтобы оно не обрезалось
  // overflow-контейнером (напр. тулбаром с горизонтальным скроллом).
  escapeOverflow?: boolean,
}) => {
  const { wrapRef } = useMainContext();
  const dropDownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ showDropDown, setShowDropDown ] = useState(false);

  const handleClose = () => {
    setShowDropDown(false);
    if (buttonRef && buttonRef.current) {
      buttonRef.current.focus();
    }
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const dropDown = dropDownRef.current;
    const wrap = buttonRef.current;

    if (showDropDown && button && dropDown && wrap) {
      const buttonRect = button.getBoundingClientRect();

      if (escapeOverflow) {
        // Портал: позиционируем по координатам вьюпорта (fixed). Плюс явная
        // колоночная раскладка и ширина по контенту — иначе из-за широкого
        // контейнера-портала пункты (обёрнутые в inline-flex Tooltip) легли бы
        // в строку, а не в вертикальный список.
        dropDown.style.position = "fixed";
        dropDown.style.top = `${buttonRect.bottom + dropDownPadding}px`;
        dropDown.style.left = `${buttonRect.left - 5}px`;
        dropDown.style.display = "flex";
        dropDown.style.flexDirection = "column";
        dropDown.style.width = "max-content";
        dropDown.style.maxWidth = "min(360px, 92vw)";
      } else {
        const wrapRect = wrap.getBoundingClientRect();
        const top =
          buttonRect.top - wrapRect.top +
          button.offsetHeight +
          dropDownPadding;
        dropDown.style.top = `${top}px`;
        dropDown.style.left = "-5px";
      }
    }
  }, [
    showDropDown,
    wrapRef,
    escapeOverflow,
  ]);

  useEffect(() => {
    const button = buttonRef.current;

    if (button !== null && showDropDown) {
      const handle = (event: globalThis.MouseEvent) => {
        const target = event.target;
        if (!isDOMNode(target)) {
          return;
        }

        const targetIsDropDownItem =
          dropDownRef.current && dropDownRef.current.contains(target as Node);
        if (stopCloseOnClickSelf && targetIsDropDownItem) {
          return;
        }

        if (!button.contains(target as Node)) {
          setShowDropDown(false);

          if (targetIsDropDownItem && isKeyboardInput(event)) {
            button.focus();
          }
        }
      };
      document.addEventListener("click", handle);

      return () => {
        document.removeEventListener("click", handle);
      };
    }
  }, [
    dropDownRef,
    buttonRef,
    showDropDown,
    stopCloseOnClickSelf,
  ]);

  useEffect(() => {
    const handleButtonPositionUpdate = () => {
      if (showDropDown) {
        const button = buttonRef.current;
        const dropDown = dropDownRef.current;
        if (button !== null && dropDown !== null) {
          const rect = button.getBoundingClientRect();
          if (escapeOverflow) {
            dropDown.style.top = `${rect.bottom + dropDownPadding}px`;
            dropDown.style.left = `${rect.left - 5}px`;
          } else {
            const newPosition = rect.top + button.offsetHeight + dropDownPadding;
            if (newPosition !== dropDown.getBoundingClientRect().top) {
              dropDown.style.top = `${newPosition}px`;
            }
          }
        }
      }
    };

    // capture:true — ловим и вложенные скроллы (напр. горизонтальный скролл
    // тулбара), чтобы порталённое меню следовало за кнопкой.
    document.addEventListener(
      "scroll", handleButtonPositionUpdate, true,
    );

    return () => {
      document.removeEventListener(
        "scroll", handleButtonPositionUpdate, true,
      );
    };
  }, [
    buttonRef,
    dropDownRef,
    showDropDown,
    escapeOverflow,
  ]);

  const handleOnClick = () => {
    setShowDropDown(!showDropDown);
  };

  const ShowMore = showMoreIcon || IoChevronDown;

  return (
    <div className="edt_dropdown_wrap">
      <button
        ref={buttonRef}
        aria-label={buttonAriaLabel || buttonLabel}
        className={clsx(buttonClassName, "edt-dropdown__trigger")}
        disabled={disabled}
        style={buttonStyles || {}}
        type="button"
        onClick={handleOnClick}
      >
        {ButtonIcon && <ButtonIcon />}
        {
          buttonLabel && (
            <span
              className={
                clsx(
                  "text",
                  "dropdown-button-text",
                  hideMobileButtonLabel && "dropdown-button-text_hide-mobile",
                )
              }
            >
              {buttonLabel}
            </span>
          )
        }
        {
          !hideShowMore && (
            <ShowMore />
          )
        }
      </button>

      {
        showDropDown && (
          escapeOverflow ?
            createPortal(<DropDownItems
              dropDownRef={dropDownRef}
              onClose={handleClose}
            >
              {
                typeof children === "function" ?
                  children(handleClose) :
                  children
              }
            </DropDownItems>,
            // Портал в #text-creator-root (а не body), чтобы сохранились
            // scoped-стили меню; position:fixed всё равно вырывает его из
            // overflow тулбара (у корня нет transform).
            wrapRef?.current ?? document.body) :
            (
              <DropDownItems
                dropDownRef={dropDownRef}
                onClose={handleClose}
              >
                {
                  typeof children === "function" ?
                    children(handleClose) :
                    children
                }
              </DropDownItems>
            )
        )
      }
    </div>
  );
};

