import type { FC, PropsWithChildren } from "react";

/**
 *  A reusable form footer component to standardize right-aligned form buttons.
 *
 *  This component ensures that the final item in a form footer is right-aligned.
 *  If the form requires grouping of buttons, this component's children should be wrapped in a `div` with the `flex` class.
 */
export const FormFooter: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex-start flex w-full [&>:last-child]:ml-auto">
      {children}
    </div>
  );
};
