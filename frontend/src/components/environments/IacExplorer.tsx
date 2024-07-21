import type { FC } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChonkyActions,
  type FileAction,
  type FileActionData,
  FileBrowser,
  type FileBrowserHandle,
  type FileData,
  FileList,
  FileNavbar,
} from "chonky";
import JSZip from "jszip";
import exportIaC from "../../api/ExportIaC";
import useApplicationStore from "../../pages/store/ApplicationStore";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/snippets/python";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-searchbox";
import { useThemeMode } from "flowbite-react";

import "./IacExplorer.scss";

const aceModeMap: { [key: string]: string } = {
  ts: "javascript",
  tsx: "javascript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  java: "java",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  html: "html",
  go: "golang",
};

function getChildren(
  files: Array<FileData | null>,
  parentId?: string,
): Array<FileData | null> {
  return files.filter((file) => file?.parentId === (parentId || ""));
}

// this action ensures that the files are not sorted in the file browser and the initial order is preserved
const sortNone: FileAction = {
  id: "sortNone",
  sortKeySelector: (file) => "placeholder",
};

const IacExplorer: FC<{
  architectureId: string;
  environmentId: string;
  version?: number;
}> = ({ architectureId, environmentId, version }) => {
  const [allFiles, setAllFiles] = useState<Array<FileData | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [currentDirFiles, setCurrentDirFiles] = useState<
    Array<FileData | null>
  >([]);
  const [folderChain, setFolderChain] = useState<Array<FileData | null>>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<{ [key: string]: string }>({});
  const [editorTheme, setEditorTheme] = useState<string>("github");
  const [editorMode, setEditorMode] = useState<string>("text");
  const fileBrowserRef = useRef<FileBrowserHandle | null>(null);
  const { mode } = useThemeMode();

  const { getIdToken } = useApplicationStore();

  useEffect(() => {
    const fetchAndUnzipFiles = async () => {
      // Replace with your API endpoint
      try {
        const response = await exportIaC(
          architectureId,
          environmentId,
          version ?? null,
          await getIdToken(),
        );

        const zip = await JSZip.loadAsync(response);
        const contents: { [key: string]: string } = {};

        const rootFolder = `${environmentId}`.toLowerCase();
        const filePromises = Object.values(zip.files).map(async (file) => {
          const content = await file.async("text");
          contents[file.name] = content;
          return {
            id: file.name,
            name: file.name.split("/").pop() || file.name,
            modDate: file.date,
            isDir: file.dir,
            length: content.length,
            parentId: file.name.split("/").slice(0, -1).join("/") || rootFolder,
          } as FileData;
        });

        const files: FileData[] = await Promise.all(filePromises);
        // get recursive list of directories from qualified file names (e.g. "dir1/dir2/file.ts" -> ["dir1", "dir1/dir2"])
        const directories = new Set(
          files
            .map((file) => file.id.split("/").slice(0, -1))
            .map((parts) => {
              return parts
                .map((_, i, arr) => arr.slice(0, i + 1).join("/"))
                .filter((dir) => dir !== "");
            })
            .reduce((acc, val) => acc.concat(val), []),
        );
        // add directories to the file listee
        directories.forEach((dir) => {
          files.push({
            id: dir,
            name: dir.split("/").pop() || dir,
            isDir: true,
            childrenCount: 1,
            parentId: dir.split("/").slice(0, -1).join("/") || rootFolder,
          });
        });
        files.push({
          id: rootFolder,
          name: rootFolder,
          isDir: true,
          childrenCount: 1,
          parentId: "",
        });
        const fileData = files.sort((a, b) => a.id.localeCompare(b.id));

        setFileContent(contents);
        setAllFiles(fileData);
        setCurrentDirFiles(getChildren(fileData, rootFolder));
        setFolderChain([
          {
            id: rootFolder,
            name: rootFolder,
            isDir: true,
            childrenCount: 1,
          },
        ]);
      } catch (e: any) {
        console.error(e);
      }
    };
    fetchAndUnzipFiles();
  }, [architectureId, environmentId, getIdToken, version]);

  useEffect(() => {
    if (!allFiles.length || allFiles[0] === null) {
      return;
    }
    const indexTs = allFiles.find((file) => file?.id === "index.ts");
    if (indexTs) {
      fileBrowserRef.current?.setFileSelection(new Set([indexTs.id]));
    } else {
      fileBrowserRef.current?.setFileSelection(new Set([allFiles[0].id]));
    }
  }, [allFiles]);

  const handleFileAction = useCallback(
    (data: FileActionData<FileAction>) => {
      if (data.id === ChonkyActions.ChangeSelection.id) {
        if (data.payload.selection.size === 1) {
          for (let f of data.payload.selection) {
            const file = allFiles.find((file) => {
              return file?.id === f;
            });
            if (file?.isDir) {
              setCurrentDirFiles(getChildren(allFiles, file.id));
              setFolderChain((old) => [...old, file]);
            } else if (file) setSelectedFile(file);
          }
        }
      } else if (data.id === ChonkyActions.OpenParentFolder.id) {
        const newChain = folderChain.slice(0, -1);
        const newDir = newChain[newChain.length - 1];
        setCurrentDirFiles(getChildren(allFiles, newDir?.id));
        setFolderChain(newChain);
      }
    },
    [allFiles, folderChain],
  );

  useEffect(() => {
    setEditorTheme(mode === "light" ? "tomorrow" : "tomorrow_night");
    const fileExt = selectedFile ? selectedFile?.name.split(".").pop() : "";
    const newEditorMode: string = fileExt ? aceModeMap[fileExt] : "text";
    setEditorMode(newEditorMode);
  }, [mode, selectedFile]);

  const content = selectedFile ? fileContent[selectedFile?.id] : "";

  const FB = FileBrowser as any;

  return (
    <div className={"size-full overflow-hidden"}>
      <div
        className={
          "flex size-full overflow-hidden border border-gray-300 dark:border-gray-700"
        }
      >
        {allFiles.length > 0 && (
          <div className="h-full min-w-[180px] basis-2/12 overflow-hidden">
            <FB
              files={currentDirFiles}
              folderChain={folderChain}
              ref={fileBrowserRef}
              onFileAction={handleFileAction}
              fileActions={[sortNone]}
              defaultSortActionId={sortNone.id}
              defaultFileViewActionId={ChonkyActions.EnableListView.id}
              darkMode={mode === "dark"}
              disableDragAndDrop
            >
              <FileNavbar />
              <FileList />
            </FB>
          </div>
        )}
        <div className={"min-w-100 size-full"}>
          {selectedFile && (
            <AceEditor
              width={"100%"}
              height={"100%"}
              mode={editorMode}
              setOptions={{ useWorker: false }}
              theme={editorTheme}
              readOnly
              onChange={console.log}
              defaultValue={content}
              value={content}
              name="editor"
              editorProps={{ $blockScrolling: true }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default IacExplorer;
