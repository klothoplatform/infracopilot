export function downloadFile(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.setAttribute("download", filename);
  a.setAttribute("href", dataUrl);
  a.click();
}
