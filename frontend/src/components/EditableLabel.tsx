import type { FC } from "react";
import React, { useEffect, useReducer, useRef, useState } from "react";
import reducer from "../helpers/reducer";
import classNames from "classnames";
import { UIError } from "../shared/errors";

export interface RegexRule {
  pattern: RegExp;
  message: string;
}

type EditableLabelProps = {
  label?: string;
  disabled?: boolean;
  initialValue: string;
  onSubmit?: (newValue: string) => void | Promise<void>;
  onError?: (error: any) => void;
  regexRule?: RegexRule;
  textAlign?: "left" | "center" | "right";
  maxWidth?: string;
};

export const EditableLabel: FC<EditableLabelProps> = ({
  initialValue,
  label,
  disabled,
  onSubmit,
  onError,
  regexRule,
  textAlign,
  maxWidth,
}) => {
  label = label ?? initialValue;
  const [isEditing, setIsEditing] = useState(false);
  const [shouldSelectContent, setShouldSelectContent] = useState(true);
  const [state, dispatch] = useReducer(reducer, {
    label: initialValue,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = () => {
    (async () => {
      try {
        if (regexRule) {
          if (!regexRule.pattern.test(state.label)) {
            throw new UIError({ message: regexRule.message });
          }
        }
        if (state.label?.length > 0 && state.label !== initialValue) {
          await onSubmit?.(state.label);
        }
      } catch (e) {
        console.error(e);
        onError?.(e);
      } finally {
        setIsEditing(false);
      }
    })();
  };

  const onBlur = (e: any) => {
    if (e.relatedTarget !== inputRef.current) {
      handleSubmit();
    }
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      setShouldSelectContent(true);
    }
  }, [isEditing]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditing(false);
        dispatch({ field: "label", value: initialValue });
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [initialValue, isEditing, label]);

  return (
    <button
      disabled={disabled}
      onMouseUp={() => {
        console.log("clicked");
        setIsEditing(true);
      }}
      className={classNames(
        "h-fit w-fit justify-start text-start dark:text-gray-200",
      )}
    >
      <>
        {!isEditing && (
          <div
            className={classNames(
              "overflow-hidden text-ellipsis rounded-sm border-[1px] border-gray-500/[0] px-1 font-semibold",
              {
                "cursor-text hover:border-gray-500 hover:bg-gray-100/20 dark:hover:bg-gray-700/20":
                  !disabled,
                "pointer-events-none": disabled,
              },
            )}
            style={{
              maxWidth: maxWidth,
            }}
          >
            {label}
          </div>
        )}
        {isEditing && (
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <input
              ref={(e) => {
                inputRef.current = e;
                if (e && shouldSelectContent) {
                  console.log("selecting content");
                  e.select();
                  setShouldSelectContent(false);
                }
              }}
              className={classNames(
                "rounded-sm border-[1px] bg-gray-50 focus:border-gray-50 dark:bg-gray-900",
                {
                  "text-left": textAlign === "left",
                  "text-center": textAlign === "center",
                  "text-right": textAlign === "right",
                },
              )}
              style={{
                width: `${Math.max(24, state.label.length * 0.75)}ch`,
                maxWidth: maxWidth,
              }}
              id="label"
              required
              value={state.label}
              type="text"
              onChange={(e) => {
                dispatch({ field: e.target.id, value: e.target.value });
              }}
              onBlur={onBlur}
            />
          </form>
        )}
      </>
    </button>
  );
};
