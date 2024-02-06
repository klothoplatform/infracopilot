import React, { useCallback, useEffect, useState } from "react";
import {
  FileBrowser,
  FileList,
  ChonkyActions,
  type FileActionData,
  type FileData,
  type FileAction,
} from "chonky";
import JSZip from "jszip";
import exportIaC from "../../api/ExportIaC";
import useApplicationStore from "../../pages/store/ApplicationStore";
import AceEditor from "react-ace";

import "ace-builds/src-min-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/snippets/python";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-monokai";
import { useThemeMode } from "flowbite-react";

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

const IacExplorer = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<{ [key: string]: string }>({});
  const [editorTheme, setEditorTheme] = useState<string>("github");
  const [editorMode, setEditorMode] = useState<string>("text");

  const { mode } = useThemeMode();

  const { architecture, environmentVersion, currentIdToken } =
    useApplicationStore();

  useEffect(() => {
    const fetchAndUnzipFiles = async () => {
      // Replace with your API endpoint
      try {
        const response = await exportIaC(
          architecture.id,
          environmentVersion.id,
          environmentVersion.version,
          currentIdToken.idToken,
        );

        const zip = await JSZip.loadAsync(response);
        const contents: { [key: string]: string } = {};
        const filePromises = Object.values(zip.files).map(async (file) => {
          const content = await file.async("text");
          contents[file.name] = content;
          return {
            id: file.name,
            name: file.name,
            isDir: file.dir,
            modDate: new Date(),
            size: content.length,
          };
        });

        const fileData = await Promise.all(filePromises);
        setFiles(fileData);
        setFileContent(contents);
      } catch (e: any) {
        console.error(e);
      }
    };

    fetchAndUnzipFiles();
  }, [environmentVersion]);

  const handleFileAction = useCallback(
    (data: FileActionData<FileAction>) => {
      if (data.id === ChonkyActions.ChangeSelection.id) {
        if (data.payload.selection.size === 1) {
          for (let f of data.payload.selection) {
            const file = files.find((file) => {
              return file.id === f;
            });
            if (file) {
              setSelectedFile(file);
            }
          }
        }
      }
    },
    [files],
  );

  useEffect(() => {
    setEditorTheme(mode === "light" ? "tomorrow" : "monokai");
    const fileExt = selectedFile ? selectedFile?.name.split(".").pop() : "";
    const newEditorMode: string = fileExt ? aceModeMap[fileExt] : "text";
    setEditorMode(newEditorMode);
  }, [mode, selectedFile]);

  const content = selectedFile ? fileContent[selectedFile?.id] : "";
  return (
    <div className="flex w-full overflow-auto p-2">
      <div className="w-1/8 grow pr-4">
        {files.length > 0 && (
          <FileBrowser
            files={files}
            onFileAction={handleFileAction}
            darkMode={mode == "dark"}
          >
            <FileList />
          </FileBrowser>
        )}
      </div>
      <div className="grow pl-4">
        {selectedFile && (
          <AceEditor
            width="100%"
            mode={editorMode}
            setOptions={{ useWorker: false }}
            theme={editorTheme}
            readOnly={true}
            onChange={console.log}
            defaultValue={content}
            value={content}
            name="editor"
            editorProps={{ $blockScrolling: true }}
          />
        )}
      </div>
    </div>
  );
};

export default IacExplorer;
