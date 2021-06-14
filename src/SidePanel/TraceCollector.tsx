/* Copyright (c) 2015 - 2021, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useSelector } from 'react-redux';
import { Group } from 'pc-nrfconnect-shared';
import prettyBytes from 'pretty-bytes';

import { NRFML_SINKS, Sink } from '../nrfml/nrfml';
import { getSerialPort, getTracePath, getTraceSize } from '../reducer';
import { getNameAndDirectory } from '../utils/fileUtils';
import DiskSpaceUsage from './DiskSpaceUsage';
import FilePathLink from './FilePathLink';
import Serialports from './Serialports';
import StartStopTrace from './StartStopTrace';

export default () => {
    const [selectedSink, setSelectedSink] = useState<Sink>(NRFML_SINKS[0]);
    const tracePath = useSelector(getTracePath);

    const selectedSerialPort = useSelector(getSerialPort);
    const [filename, directory] = getNameAndDirectory(tracePath);
    const traceSize = useSelector(getTraceSize);

    if (!selectedSerialPort) {
        return <></>;
    }

    return (
        <>
            <Serialports selectedSerialPort={selectedSerialPort} />
            <Group heading="Trace file details">
                <ButtonGroup className="trace-selector w-100">
                    {NRFML_SINKS.map((sink: Sink) => (
                        <Button
                            // @ts-ignore -- Doesn't seem to be an easy way to use custom variants with TS
                            variant={sink === selectedSink ? 'set' : 'unset'}
                            onClick={() => setSelectedSink(sink)}
                            key={sink}
                        >
                            {sink}
                        </Button>
                    ))}
                </ButtonGroup>
            </Group>
            {tracePath !== '' && (
                <FilePathLink filePath={tracePath} displayPath={directory} />
            )}
            <DiskSpaceUsage />
            <StartStopTrace sink={selectedSink} />
            {filename !== '' && (
                <div className="trace-file-name">{filename}</div>
            )}
            <div className="trace-file-size">
                {prettyBytes(traceSize)} file size
            </div>
            <hr />
        </>
    );
};
