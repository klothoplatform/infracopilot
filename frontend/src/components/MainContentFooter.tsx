import { Footer } from "flowbite-react";
import type { FC } from "react";
import React from "react";
import {
  FaDiscord,
  FaEnvelope,
  FaGithub,
  FaLinkedin,
  FaTwitter,
} from "react-icons/fa";

export const MainContentFooter: FC = function () {
  return (
    <>
      <Footer
        theme={{
          root: {
            base: "bg-gray-100 dark:bg-gray-900",
          },
        }}
        container
      >
        <div className="flex w-full flex-col gap-y-6 lg:flex-row lg:justify-between lg:gap-y-0">
          <Footer.LinkGroup>
            <Footer.Link href="#" className="mb-3 mr-3 lg:mb-0">
              Terms and conditions
            </Footer.Link>
            <Footer.Link href="#" className="mb-3 mr-3 lg:mb-0">
              Privacy Policy
            </Footer.Link>
            <Footer.Link href="#" className="mr-3">
              Licensing
            </Footer.Link>
            <Footer.Link href="#" className="mr-3">
              Cookie Policy
            </Footer.Link>
            <Footer.Link href="#">Contact</Footer.Link>
          </Footer.LinkGroup>
          <Footer.LinkGroup>
            <div className="flex gap-4 md:gap-0">
              <Footer.Link
                title="Twitter"
                href="https://twitter.com/GetKlotho"
                target="_blank"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaTwitter className="text-lg" />
              </Footer.Link>
              <Footer.Link
                title="LinkedIn"
                href="https://www.linkedin.com/company/klothoplatform/"
                target="_blank"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaLinkedin className="text-lg" />
              </Footer.Link>
              <Footer.Link
                title="Github"
                href="https://github.com/klothoplatform"
                target="_blank"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaGithub className="text-lg" />
              </Footer.Link>
              <Footer.Link
                title="Discord"
                href="https://klo.dev/discordurl"
                target="_blank"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaDiscord className="text-lg" />
              </Footer.Link>
              <Footer.Link
                title="email"
                href="mailto:hello@klo.dev"
                target="_blank"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaEnvelope className="text-lg" />
              </Footer.Link>
            </div>
          </Footer.LinkGroup>
        </div>
      </Footer>
      <p className="my-8 text-center text-sm text-gray-500 dark:text-gray-300">
        &copy; 2023 CloudCompiler Inc. All rights reserved.
      </p>
    </>
  );
};
