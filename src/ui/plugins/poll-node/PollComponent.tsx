import {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  BaseSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  NodeKey,
} from "lexical";

import joinClasses from "@/lib/utils/joinClasses";
import { Button, ButtonSize } from "@/vendor/ui-kit";

import {
  type Option,
  type Options,
  type PollNode,
  $isPollNode,
  createPollOption,
} from "./PollNode";

import "./PollNode.scss";

function getTotalVotes(options: Options): number {
  return options.reduce((totalVotes, next) => {
    return totalVotes + next.votes.length;
  }, 0);
}

function PollOptionComponent({
  option,
  index,
  options,
  totalVotes,
  withPollNode,
}: {
  index: number,
  option: Option,
  options: Options,
  totalVotes: number,
  withPollNode: (
    cb: (pollNode: PollNode) => void,
    onSelect?: () => void,
  ) => void,
}) {
  // const {name: username} = useCollaborationContext();
  // const checkboxRef = useRef(null);
  const votesArray = option.votes;
  // const checkedIndex = votesArray.indexOf(username);
  // const checked = checkedIndex !== -1;
  const votes = votesArray.length;
  const text = option.text;

  return (
    <div className="PollNode__optionContainer">
      <div
        className={joinClasses("PollNode__optionCheckboxWrapper")}
      >
        {/*<input*/}
        {/*  ref={checkboxRef}*/}
        {/*  className="PollNode__optionCheckbox"*/}
        {/*  type="checkbox"*/}
        {/*  onChange={(e) => {*/}
        {/*    withPollNode((node) => {*/}
        {/*      node.toggleVote(option, username);*/}
        {/*    });*/}
        {/*  }}*/}
        {/*  checked={checked}*/}
        {/*/>*/}
      </div>
      <div className="PollNode__optionInputWrapper">
        <div
          className="PollNode__optionInputVotes"
          style={
            { width: `${votes === 0 ?
              0 :
              (votes / totalVotes) * 100}%` }
          }
        />
        <span className="PollNode__optionInputVotesCount">
          {
            votes > 0 && (votes === 1 ?
              "1 vote" :
              `${votes} votes`)
          }
        </span>
        <input
          className="PollNode__optionInput"
          placeholder={`Option ${index + 1}`}
          type="text"
          value={text}
          onChange={
            (e) => {
              const target = e.target;
              const value = target.value;
              const selectionStart = target.selectionStart;
              const selectionEnd = target.selectionEnd;
              withPollNode((node) => {
                node.setOptionText(option, value);
              },
              () => {
                target.selectionStart = selectionStart;
                target.selectionEnd = selectionEnd;
              });
            }
          }
        />
      </div>
      <button
        aria-label="Remove"
        className={
          joinClasses("PollNode__optionDelete",
            options.length < 3 && "PollNode__optionDeleteDisabled")
        }
        disabled={options.length < 3}
        onClick={
          () => {
            withPollNode((node) => {
              node.deleteOption(option);
            });
          }
        }
      />
    </div>
  );
}

export default function PollComponent({
  question,
  options,
  nodeKey,
}: {
  nodeKey: NodeKey,
  options: Options,
  question: string,
}): ReactElement {
  const [ editor ] = useLexicalComposerContext();
  const totalVotes = useMemo(() => getTotalVotes(options), [ options ]);
  const [
    isSelected,
    setSelected,
    clearSelection,
  ] =
    useLexicalNodeSelection(nodeKey);
  const [ selection, setSelection ] = useState<BaseSelection | null>(null);
  const ref = useRef(null);

  useEffect(() => {
    return mergeRegister(editor.registerUpdateListener(({ editorState }) => {
      setSelection(editorState.read(() => $getSelection()));
    }),
    editor.registerCommand<MouseEvent>(
      CLICK_COMMAND,
      (payload) => {
        const event = payload;

        if (event.target === ref.current) {
          if (!event.shiftKey) {
            clearSelection();
          }
          setSelected(!isSelected);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ));
  }, [
    clearSelection,
    editor,
    isSelected,
    nodeKey,
    setSelected,
  ]);

  const withPollNode = (cb: (node: PollNode) => void,
    onUpdate?: () => void): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isPollNode(node)) {
        cb(node);
      }
    },
    { onUpdate });
  };

  const addOption = () => {
    withPollNode((node) => {
      node.addOption(createPollOption());
    });
  };

  const isFocused = $isNodeSelection(selection) && isSelected;

  return (
    <div
      ref={ref}
      className={
        `PollNode__container ${isFocused ?
          "focused" :
          ""}`
      }
    >
      <div className="PollNode__inner">
        <h2 className="PollNode__heading">{question}</h2>
        {
          options.map((option, index) => {
            const key = option.uid;
            return (
              <PollOptionComponent
                key={key}
                index={index}
                option={option}
                options={options}
                totalVotes={totalVotes}
                withPollNode={withPollNode}
              />
            );
          })
        }
        <div className="PollNode__footer">
          <Button
            size={ButtonSize.Small}
            onClick={addOption}
          >
            Add Option
          </Button>
        </div>
      </div>
    </div>
  );
}
