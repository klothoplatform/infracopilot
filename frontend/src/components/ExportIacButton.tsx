import useApplicationStore from "../pages/store/ApplicationStore";
import { downloadFile } from "../helpers/download-file";
import { type FC, useState } from "react";
import ExportIaC from "../api/ExportIaC";
import { Button } from "flowbite-react";
import { AiOutlineLoading } from "react-icons/ai";
import { TbFileExport } from "react-icons/tb";

interface ExportIacButtonProps {
  disabled?: boolean;
}

export const ExportIacButton: FC<ExportIacButtonProps> = (
  props: ExportIacButtonProps,
) => {
  const { getIdToken, architecture, addError } = useApplicationStore();
  const [isExporting, setIsExporting] = useState(false);

  let onClickExportIac = async () => {
    if (setIsExporting) {
      setIsExporting(true);
    }
    try {
      const iacZip = await ExportIaC(
        architecture.id,
        architecture.version,
        await getIdToken(),
      );
      const url = URL.createObjectURL(iacZip);
      downloadFile(architecture.name + ".zip", url);
    } catch (e: any) {
      addError(`Failed to export IaC: ${e.message}`);
    } finally {
      setTimeout(() => {
        // reduce flickering for fast requests
        if (setIsExporting) {
          setIsExporting(false);
        }
      }, 200);
    }
  };

  return (
    <Button
      color={"purple"}
      className="flex"
      onClick={onClickExportIac}
      isProcessing={isExporting}
      disabled={props.disabled}
      processingSpinner={<AiOutlineLoading className="animate-spin" />}
    >
      {!isExporting && <TbFileExport className="mr-1" />}
      <p>{isExporting ? "Exporting..." : "Export IaC"}</p>
    </Button>
  );
};
