import React from 'react';

import './DragSidebar.css';

export default () => {
    const onDragStart = (event: any, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside>
            <div className="description">You can drag these nodes to the pane on the right.</div>
            <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'aws:rds_instance')} draggable>
                RDS Instance
            </div>
            <div className="dndnode" onDragStart={(event) => onDragStart(event, 'aws:lambda_function')} draggable>
                Lambda Function
            </div>
            <div className="dndnode output" onDragStart={(event) => onDragStart(event, 'aws:s3_bucket')} draggable>
                S3 Bucket
            </div>
        </aside>
    );
};
