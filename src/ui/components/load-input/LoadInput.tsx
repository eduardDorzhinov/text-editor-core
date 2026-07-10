import {
  ChangeEvent,
  Dispatch,
  ReactElement,
  SetStateAction,
  useId,
  useRef,
} from "react";
import { FaInfoCircle, FaTrash } from "react-icons/fa";

import { Button } from "@/ui/components/button";

import styles from "./LoadInput.module.scss";

type Props = Readonly<{
  label: string,
  onChange: (val: File | null) => void,
  value: File | null,
  maxSize?: number,
  allowedTypes: string[],
  allowedExtensions: string[],
  setError: Dispatch<SetStateAction<string>>,
}>;

export const LoadInput = ({
  label,
  value,
  onChange,
  maxSize,
  allowedTypes,
  allowedExtensions,
  setError,
}: Props): ReactElement => {
  const connectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseFileClick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[ 0 ];
    if (!selectedFile) return;

    if (maxSize && selectedFile.size > maxSize) {
      setError(`Максимальный размер файла — ${maxSize / 1024 / 1024} MB`);
      event.target.value = "";
      return;
    }

    if (allowedTypes && !allowedTypes.includes(selectedFile.type)) {
      setError("Недопустимый тип файла");
      event.target.value = "";
      return;
    }

    const extension = "." + selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      allowedExtensions &&
      (
        !extension ||
        !allowedExtensions.includes(extension)
      )
    ) {
      setError("Недопустимое расширение файла");
      event.target.value = "";
      return;
    }

    onChange(selectedFile);
    event.target.value = "";
  };

  const handleFileRemove = () => {
    onChange(null);
  };

  return (
    <div className={styles.wrap}>
      <label
        className={styles.label}
        htmlFor={connectId}
        onClick={(e) => e.preventDefault()}
      >
        {label}
        <span className={styles.info}>
          <FaInfoCircle />
          <div className={styles.popover}>
            <div>
              <b>Расширения:</b>
              {" "}
              {allowedExtensions.join(", ")}
            </div>
            {
              maxSize && (
                <div>
                  <b>Макс. размер:</b>
                  {" "}
                  {(maxSize / 1024 / 1024).toFixed(0)}
                  {" "}
                  МБ
                </div>
              )
            }
          </div>
        </span>
      </label>
      <input
        ref={fileInputRef}
        accept={allowedExtensions.join(",")}
        className={styles.loadInput}
        id={connectId}
        type="file"
        onChange={handleFileSelect}
      />
      {
        value && (
          <div className={styles.file}>
            <span className={styles.fileName}>
              {value?.name}
            </span>
            <Button onClick={handleFileRemove}>
              <FaTrash />
            </Button>
          </div>
        )
      }
      {
        !value && (
          <>
            <Button
              className={styles.chooseBtn}
              onClick={chooseFileClick}
            >
              Выберите файл
            </Button>
          </>
        )
      }
    </div>
  );
};
