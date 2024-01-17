import useApplicationStore from "../pages/store/ApplicationStore";
import { downloadFile } from "../helpers/download-file";
import { type FC, useState } from "react";
import ExportIaC from "../api/ExportIaC";
import { Button } from "flowbite-react";
import { AiOutlineLoading } from "react-icons/ai";
import { TbFileExport } from "react-icons/tb";
import { ApplicationError, UIError } from "../shared/errors";
import { Tooltip } from "./Tooltip";

interface ExportIacButtonProps {
  disabled?: boolean;
  small: boolean;
}

export const ExportIacButton: FC<ExportIacButtonProps> = (
  props: ExportIacButtonProps,
) => {
  const { getIdToken, environmentVersion, addError } = useApplicationStore();
  const [isExporting, setIsExporting] = useState(false);

  let onClickExportIac = async () => {
    setIsExporting(true);
    try {
      const iacZip = await ExportIaC(
        environmentVersion.architecture_id,
        environmentVersion.id,
        environmentVersion.version,
        await getIdToken(),
      );
      const url = URL.createObjectURL(iacZip);
      downloadFile(environmentVersion.id + ".zip", url);
    } catch (e: any) {
      if (e instanceof ApplicationError) {
        addError(e);
      } else {
        addError(
          new UIError({
            errorId: "ExportIacButton:Click",
            message: "Failed to export IaC!",
            cause: e as Error,
          }),
        );
      }
    } finally {
      setTimeout(() => {
        // reduce flickering for fast requests
        setIsExporting(false);
      }, 200);
    }
  };

  return (
    <Tooltip content="Export IaC" disabled={!props.small}>
      <Button
        color={"purple"}
        className="flex"
        onClick={onClickExportIac}
        isProcessing={isExporting}
        disabled={props.disabled || !environmentVersion?.resources?.size}
        processingSpinner={<AiOutlineLoading className="animate-spin" />}
      >
        {!isExporting && <TbFileExport className="mr-1" />}
        {!props.small && <p>{isExporting ? "Exporting..." : "Export IaC"}</p>}
      </Button>
    </Tooltip>
  );
};
