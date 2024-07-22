import type { ReactNode } from "react";
import React from "react";
import { Tooltip } from "flowbite-react";
import { twMerge } from "tailwind-merge";
import { FaExternalLinkAlt } from "react-icons/fa";

interface HoverableLinkProps {
  href?: string;
  children: ReactNode;
  className?: string;
}

const HoverableLink: React.FC<HoverableLinkProps> = ({
  href,
  children,
  className,
}) => {
  const Content = () => (
    <a
      className={twMerge(
        "flex gap-2 w-fit max-w-full break-after-all !text-blue-600 !dark:text-blue-400 hover:!text-blue-800 dark:hover:!text-blue-300",
        className,
      )}
      href={href}
    >
      {href} <FaExternalLinkAlt />
    </a>
  );
  return (
    <Tooltip
      theme={{
        content: "min-w-full max-w-full break-all",
        target: "inline-block",
      }}
      content={<Content />}
      placement="bottom-start"
      trigger="hover"
      animation="duration-500"
      className="z-20 break-all rounded border bg-white text-black shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:shadow-lg"
      arrow={false}
    >
      {children}
    </Tooltip>
  );
};

export default HoverableLink;
