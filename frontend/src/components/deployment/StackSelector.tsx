import { type FC } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { Dropdown } from "flowbite-react";

export const StackSelector: FC = () => {
  const { stacks, selectStack, selectedStack } = useApplicationStore();

  const options = stacks.map((stack) => ({
    value: stack.name,
    label: stack.name,
  }));

  const onClick = (value: string) => {
    const stack = stacks.find((stack) => stack.name === value);
    selectStack(stack);
  };

  return (
    <div className="mb-4 mt-8 flex flex-col gap-1">
      <Dropdown
        label={
          <div>
            <span className={"text-gray-500 dark:text-gray-300"}>stack: </span>
            {selectedStack?.name ?? "Select a stack"}
          </div>
        }
        color={"light"}
        placement={"bottom-start"}
      >
        <Dropdown.Header>Choose a Stack</Dropdown.Header>
        {options.map((option) => (
          <Dropdown.Item
            className={"flex justify-between gap-2 disabled:opacity-50"}
            key={option.value}
            onClick={() => onClick(option.value)}
          >
            {option.label}
          </Dropdown.Item>
        ))}
      </Dropdown>
    </div>
  );
};
