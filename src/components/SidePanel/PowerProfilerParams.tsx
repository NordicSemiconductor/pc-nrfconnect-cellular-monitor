/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { useSelector } from 'react-redux';
import { remote } from 'electron';
import { writeFile } from 'fs';
import { join } from 'path';
import { CollapsibleGroup, getAppDataDir, openUrl } from 'pc-nrfconnect-shared';

import { getOppData } from '../../features/tracing/traceSlice';
import { TraceFileDetails } from './Tracing/TraceFileInformation';

export default () => {
    const oppData = useSelector(getOppData);
    const [oppFile, setOppFile] = React.useState<string | undefined>();
    const onSave = async () => {
        const { filePath, canceled } = await remote.dialog.showSaveDialog({
            defaultPath: join(getAppDataDir(), 'power-profiler-data.json'),
        });
        if (canceled || !filePath) return;
        writeFile(filePath, JSON.stringify(oppData), () => {
            console.log('finished writing file');
            setOppFile(filePath);
        });
    };

    return (
        <CollapsibleGroup heading="Power Profiler Data" defaultCollapsed>
            {oppData == null ? (
                <Button variant="secondary" disabled className="w-100">
                    Waiting for power data...
                </Button>
            ) : (
                <Button variant="secondary" className="w-100" onClick={onSave}>
                    Save power profiler data
                </Button>
            )}
            {oppFile != null && (
                <>
                    <TraceFileDetails
                        progress={{
                            format: 'opp',
                            size: 100,
                            path: oppFile,
                        }}
                    />
                    <Button
                        variant="secondary"
                        className="w-100"
                        onClick={() =>
                            openUrl(
                                'https://devzone.nordicsemi.com/power/w/opp/3/online-power-profiler-for-lte'
                            )
                        }
                    >
                        Open Online Power Profiler
                    </Button>
                </>
            )}
        </CollapsibleGroup>
    );
};
