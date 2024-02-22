import React, { useEffect, useRef } from "react";

interface DeploymentOutputProps {
  log: string;
}

function DepoymentOutput({ log }: DeploymentOutputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever log updates
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <textarea
      ref={textAreaRef}
      className="scrollbar scrollbar-thumb-gray-500 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-400 h-64 w-full overflow-auto rounded-lg bg-gray-800 p-2 text-white"
      value={log}
      readOnly
    />
  );
  // const [log, setLog] = useState('');

  // useEffect(() => {
  //     if (!eventSource) {
  //         return;
  //     }
  //     eventSource.onmessage = (event) => {
  //         setLog((prevLog) => prevLog + '\n' + event.data);
  //     };

  //     return () => {
  //         eventSource.close();
  //     };
  // }, []);

  // return (
  //   <div className="max-h-[400px] overflow-auto">
  //     <pre>{log}</pre>
  //   </div>
  // );
}

export default DepoymentOutput;
