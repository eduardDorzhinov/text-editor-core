import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { $getNodeByKey, NodeKey } from "lexical";

import { useDecoratorSelection } from "@/lib/hooks/use-decorator-selection";

import {
  $isAuthorQuoteAuthorNode,
  AuthorQuoteAuthorNode,
} from "./AuthorQuoteAuthorNode";

import styles from "./AuthorQuote.module.scss";

interface Props {
  name: string,
  title: string,
  avatarSrc: string,
  nodeKey: NodeKey,
}

export function AuthorQuoteAuthorComponent({
  name,
  title,
  avatarSrc,
  nodeKey,
}: Props) {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);

  const [ localName, setLocalName ] = useState(name);
  const [ localTitle, setLocalTitle ] = useState(title);

  useEffect(() => {
    if (!editingRef.current) setLocalName(name);
  }, [ name ]);

  useEffect(() => {
    if (!editingRef.current) setLocalTitle(title);
  }, [ title ]);

  const update = useCallback((fn: (node: AuthorQuoteAuthorNode) => void) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAuthorQuoteAuthorNode(node)) fn(node);
    });
  }, [ editor, nodeKey ]);

  const onNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalName(val);
    update((n) => n.setName(val));
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ update ]);

  const onTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalTitle(val);
    update((n) => n.setAuthorTitle(val));
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ update ]);

  const onAvatarClick = useCallback(() => {
    if (isEditable) fileInputRef.current?.click();
  }, [ isEditable ]);

  const onAvatarFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[ 0 ];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update((n) => n.setAvatarSrc(reader.result as string));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [ update ]);

  const onRemoveAvatar = useCallback(() => {
    update((n) => n.setAvatarSrc(""));
  }, [ update ]);

  const onRemoveAuthor = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAuthorQuoteAuthorNode(node)) node.remove();
    });
  }, [ editor, nodeKey ]);

  return (
    <div
      ref={rootRef}
      className={
        `${styles.author} ${isFocused ?
          "tc-decorator-focused" :
          ""}`
      }
    >
      <div
        className={styles.avatarWrap}
        onClick={onAvatarClick}
      >
        {
          avatarSrc ?
            (
              <img
                alt={name}
                className={styles.avatar}
                src={avatarSrc}
              />
            ) :
            <div className={styles.avatarPlaceholder} />
        }
        {
          isEditable && avatarSrc && (
            <button
              className={styles.avatarRemove}
              title="Удалить аватар"
              type="button"
              onClick={
                (e) => {
                  e.stopPropagation();
                  onRemoveAvatar();
                }
              }
            >
              &times;
            </button>
          )
        }
        {
          isEditable && (
            <input
              ref={fileInputRef}
              hidden
              accept="image/*"
              type="file"
              onChange={onAvatarFileChange}
            />
          )
        }
      </div>

      <div className={styles.authorInfo}>
        {
          isEditable ?
            (
              <>
                <input
                  className={styles.nameInput}
                  placeholder="Имя автора"
                  value={localName}
                  onChange={onNameChange}
                />
                <input
                  className={styles.titleInput}
                  placeholder="Должность / профессия"
                  value={localTitle}
                  onChange={onTitleChange}
                />
              </>
            ) :
            (
              <>
                {name && <span className={styles.name}>{name}</span>}
                {title && <span className={styles.title}>{title}</span>}
              </>
            )
        }
      </div>

      {
        isEditable && (
          <button
            className={styles.removeAuthor}
            title="Убрать автора"
            type="button"
            onClick={onRemoveAuthor}
          >
            &times;
          </button>
        )
      }
    </div>
  );
}
