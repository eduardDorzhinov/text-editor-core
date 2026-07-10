import { StyleHTMLAttributes } from "react";
import { IconType } from "react-icons";

import { ColorPicker } from "@/ui/components/color-picker";
import { DropDown } from "@/ui/components/dropdown";

type Props = {
  disabled?: boolean,
  buttonAriaLabel?: string,
  buttonClassName: string,
  buttonStyles?: StyleHTMLAttributes<HTMLButtonElement>,
  ButtonIcon?: IconType,
  buttonLabel?: string,
  title?: string,
  stopCloseOnClickSelf?: boolean,
  color: string,
  onChange?: (
    color: string,
    skipHistoryStack: boolean,
    skipRefocus: boolean,
  ) => void,
  closeOnChange?: boolean,
  defaultColor?: string,
  useColorPicker?: boolean,
};

export function DropdownColorPicker({
  disabled = false,
  stopCloseOnClickSelf = true,
  color,
  onChange,
  closeOnChange = false,
  defaultColor,
  useColorPicker = false,
  ...rest
}: Props) {
  return (
    <DropDown
      {...rest}
      hideShowMore
      disabled={disabled}
      stopCloseOnClickSelf={stopCloseOnClickSelf}
    >
      {
        (onClose) => (
          <ColorPicker
            color={color}
            defaultColor={defaultColor}
            useColorPicker={useColorPicker}
            onChange={
              (...args) => {
                onChange?.(...args);
                if (closeOnChange) onClose();
              }
            }
          />
        )
      }
    </DropDown>
  );
}
