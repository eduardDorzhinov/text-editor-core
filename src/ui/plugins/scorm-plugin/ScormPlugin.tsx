import {
  ReactElement,
  useEffect,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalEditor } from "lexical";

import { Button } from "@/ui/components/button";
import { TextInput } from "@/ui/components/input";

import { insertScorm } from "./insertScorm";
import { ScormNode } from "./ScormNode";

export const InsertScormDialog = ({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) => {
  const [ scormId, setScormId ] = useState("");
  const [ file, setFile ] = useState("");

  const isDisabled = !scormId;

  const onClick = () => {
    activeEditor.update(() => {
      insertScorm(scormId, file);
    });
    onClose();
  };

  return (
    <>
      <TextInput
        label="ID скорма"
        placeholder=""
        type="text"
        value={scormId}
        onChange={setScormId}
      />
      <TextInput
        label="Src файла"
        placeholder=""
        type="text"
        value={file}
        onChange={setFile}
      />
      <Button
        disabled={isDisabled}
        onClick={onClick}
      >
        Добавить
      </Button>
    </>
  );
};

export const ScormPlugin = (): ReactElement | null => {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ ScormNode ])) {
      throw new Error("ScormPlugin: ScormNode is not registered on editor");
    }
  }, [ editor ]);

  return null;
};
