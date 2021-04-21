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

import nrfml from 'nrf-monitor-lib-js';
import path from 'path';
import { getAppDir } from 'pc-nrfconnect-shared';

import { setNrfmlTaskId, setTraceSize } from '../actions/traceActions';
import { getTraceSize } from '../reducer';
import { TAction } from '../thunk';

const os = require('os');

export type TaskId = number;

const appPath = getAppDir();
const pluginsDir = path.join(
    appPath,
    'node_modules',
    'nrf-monitor-lib-js',
    'Release',
    `${process.platform}-${os.arch()}`
);

const BUFFER_SIZE = 1;
const CHUNK_SIZE = 256;

export const NRFML_SINKS = {
    pcap: 'nrfml-pcap-sink',
    raw: 'nrfml-raw-file-sink',
};

const convertTraceFile = (tracePath: string): TAction => (
    dispatch,
    getState
) => {
    setTraceSize(0);
    const filename = path.basename(tracePath, '.bin');
    const directory = path.dirname(tracePath);
    const taskId = nrfml.start(
        {
            config: {
                plugins_directory: pluginsDir,
            },
            sinks: [
                {
                    name: 'nrfml-pcap-sink',
                    init_parameters: {
                        file_path: `${directory}/${filename}.pcap`,
                    },
                },
            ],
            sources: [
                {
                    name: 'nrfml-insight-source',
                    init_parameters: {
                        file_path: tracePath,
                        db_file_path: `${appPath}/traces/trace_db_fcb82d0b-2da7-4610-9107-49b0043983a8.tar.gz`,
                        chunk_size: CHUNK_SIZE,
                    },
                    config: {
                        buffer_size: BUFFER_SIZE,
                    },
                },
            ],
        },
        err => {
            if (err != null) {
                console.error('err ', err);
            }
        },
        progress => {
            console.log('progressing', progress);
            dispatch(setTraceSize(getTraceSize(getState()) + CHUNK_SIZE));
        }
    );
    dispatch(setNrfmlTaskId(taskId));
};

const getTrace = (): TAction => (dispatch, getState) => {
    setTraceSize(0);
    const taskId = nrfml.start(
        {
            config: {
                plugins_directory: pluginsDir,
            },
            sinks: [
                {
                    name: 'nrfml-pcap-sink',
                    init_parameters: {
                        file_path: path.join(
                            appPath,
                            'newtraces',
                            'example.bin'
                        ),
                    },
                },
            ],
            sources: [
                {
                    init_parameters: {
                        serialport: {
                            path: 'COM5',
                            settings: '1000000D8S1PNFN',
                        },
                        db_file_path: `${appPath}/traces/trace_db_fcb82d0b-2da7-4610-9107-49b0043983a8.tar.gz`,
                        extract_raw: true,
                        chunk_size: 16,
                    },
                    name: 'nrfml-insight-source',
                    config: {
                        buffer_size: BUFFER_SIZE,
                    },
                },
            ],
        },
        err => {
            if (err != null) {
                console.error('err ', err);
            }
        },
        progress => {
            console.log('progressing', progress);
            dispatch(setTraceSize(getTraceSize(getState()) + CHUNK_SIZE));
        }
    );
    dispatch(setNrfmlTaskId(taskId));
};

const stopTrace = (taskId: TaskId | null): TAction => dispatch => {
    if (taskId === null) return;
    nrfml.stop(taskId);
    dispatch(setNrfmlTaskId(null));
};

export { convertTraceFile, getTrace, stopTrace };
