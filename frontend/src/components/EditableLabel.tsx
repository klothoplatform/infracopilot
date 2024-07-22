import type { FC } from "react";
import React, { useEffect, useReducer, useRef, useState } from "react";
import reducer from "../helpers/reducer";
import classNames from "classnames";
import { UIError } from "../shared/errors";
import { TextInput } from "flowbite-react";

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
  maxEditWidth?: string;
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
  maxEditWidth,
}) => {
  label = label ?? initialValue;
  const [isEditing, setIsEditing] = useState(false);
  const [shouldSelectContent, setShouldSelectContent] = useState(true);
  const [state, dispatch] = useReducer(reducer, {
    label: initialValue,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    dispatch({ field: "label", value: initialValue });
  }, [initialValue]);

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
        inputRef.current?.blur();
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
        inputRef.current?.blur();
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
        "h-fit w-fit justify-start text-start dark:text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis",
      )}
    >
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {!isEditing && (
          <div className="p-px">
            <div
              className={classNames(
                "overflow-hidden text-ellipsis rounded-lg border-[1px] border-gray-200/[0] px-1 py-0.5 font-medium",
                "hover:border-gray-200 text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:hover:border-gray-600",
                "dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500",
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
          </div>
        )}
        {isEditing && (
          <TextInput
            theme={{
              field: {
                base: "relative w-full p-[1px]",
                input: {
                  base: "block px-1 py-0.5 w-full font-medium bg-gray-50/0 border-gray-50/0 hover:border focus:border disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden text-ellipsis",
                  colors: {
                    gray: "hover:border-gray-300 text-gray-900 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:hover:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500",
                  },
                  sizes: {
                    sm: "text-sm",
                    md: "text-md",
                  },
                },
              },
            }}
            ref={(e) => {
              inputRef.current = e;
              if (e && shouldSelectContent) {
                console.log("selecting content");
                e.select();
                setShouldSelectContent(false);
              }
            }}
            className={classNames({
              "text-left": textAlign === "left",
              "text-center": textAlign === "center",
              "text-right": textAlign === "right",
            })}
            sizing="md"
            color="gray"
            style={{
              width: `${(state.label?.length ?? 0) + 3}ch`,
              maxWidth: isEditing ? maxEditWidth || maxWidth : maxWidth,
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
        )}
      </form>
    </button>
  );
};
