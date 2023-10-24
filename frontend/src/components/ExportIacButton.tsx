import useApplicationStore from "../views/store/ApplicationStore";
import { downloadFile } from "../helpers/download-file";
import { type FC, useState } from "react";
import ExportIaC from "../api/ExportIaC";
import { Button } from "flowbite-react";
import { AiOutlineLoading } from "react-icons/ai";
import { TbFileExport } from "react-icons/tb";

interface ExportIacButtonProps {
  disabled?: boolean;
  setIsExporting?: (isExporting: boolean) => void;
}

export const ExportIacButton: FC<ExportIacButtonProps> = (
  props: ExportIacButtonProps,
) => {
  const { idToken, architecture } = useApplicationStore();
  const [isExporting] = useState(false);

  let onClickExportIac = async () => {
    if (props.setIsExporting) {
      props.setIsExporting(true);
    }
    try {
      const iacZip = await ExportIaC(
        architecture.id,
        architecture.version,
        idToken,
      );
      const url = URL.createObjectURL(iacZip);
      downloadFile(architecture.name + ".zip", url);
    } finally {
      setTimeout(() => {
        // reduce flickering for fast requests
        if (props.setIsExporting) {
          props.setIsExporting(false);
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
