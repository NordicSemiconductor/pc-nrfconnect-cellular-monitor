/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useEffect, useState } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useDispatch, useSelector } from 'react-redux';
import {
    Alert,
    Button,
    clearWaitForDevice,
    deviceInfo,
    Dialog,
    DialogButton,
    getWaitingForDeviceTimeout,
    logger,
    selectedDevice,
    setWaitForDevice,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { shell } from 'electron';
import { basename, dirname } from 'path';

import { setTerminalSerialPort } from '../terminal/serialPortSlice';
import { autoSetUartSerialPort } from '../terminal/uartSerialPort';
import { resetTraceEvents } from '../tracing/tracePacketEvents';
import { getIsTracing, resetTraceInfo } from '../tracing/traceSlice';
import { resetDashboardState } from '../tracingEvents/dashboardSlice';
import {
    is9151DK,
    is9160DK,
    is9161DK,
    isThingy91,
    programDevice,
    programModemFirmware,
    SampleProgress,
} from './programSample';
import {
    downloadedFilePath,
    downloadModemFirmware,
    downloadSample,
    downloadSampleIndex,
    Firmware,
    initialSamples,
    ModemFirmware,
    readBundledIndex,
    Sample,
} from './samples';
// @ts-expect-error We can import svgs
import thingySvg from './thingy91_sw1_sw3.svg';

import './ProgramSampleModal.scss';

type ProgrammingStage = 'unstarted' | 'programming' | 'success' | 'failed';
type ModalStage = 'programSelection' | 'modemSelection' | 'programming';
export default () => {
    const [selectedSample, setSelectedSample] = useState<Sample>();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalStage, setModalStage] =
        useState<ModalStage>('programSelection');
    const device = useSelector(selectedDevice);
    const isTracing = useSelector(getIsTracing);
    const compatible =
        device &&
        (isThingy91(device) ||
            is9160DK(device) ||
            is9161DK(device) ||
            is9151DK(device));

    const [samples, setSamples] = useState(initialSamples);
    useEffect(() => {
        readBundledIndex()
            .then(setSamples)
            .then(downloadSampleIndex)
            .then(setSamples);
    }, []);

    const close = useCallback(() => {
        setModalVisible(false);
        setSelectedSample(undefined);
    }, []);

    if (!compatible) {
        return null;
    }

    const getRelevantSamples = () => {
        if (isThingy91(device)) {
            return samples.thingy91;
        }
        if (is9160DK(device)) {
            return samples.dk9160;
        }
        if (is9161DK(device)) {
            return samples.dk9161;
        }
        if (is9151DK(device)) {
            return samples.dk9151;
        }
        return [];
    };

    return (
        <>
            <Button
                className="w-100"
                variant="secondary"
                onClick={() => {
                    setModalVisible(!modalVisible);
                    setModalStage('programSelection');
                }}
                disabled={isTracing}
            >
                Program device
            </Button>
            <Dialog isVisible={modalVisible} onHide={close}>
                {modalStage === 'programming' && selectedSample && (
                    <ProgramSample
                        setModalStage={setModalStage}
                        sample={selectedSample}
                        selectSample={setSelectedSample}
                        close={close}
                    />
                )}
                {modalStage === 'modemSelection' && selectedSample && (
                    <ProgramModem
                        setModalStage={setModalStage}
                        sample={selectedSample}
                        selectSample={setSelectedSample}
                        modemFirmwares={samples.mfw}
                        close={close}
                    />
                )}
                {modalStage === 'programSelection' && (
                    <SelectSample
                        setModalStage={setModalStage}
                        selectSample={setSelectedSample}
                        samples={getRelevantSamples()}
                        close={close}
                    />
                )}
            </Dialog>
        </>
    );
};

const SelectSample = ({
    setModalStage,
    selectSample,
    samples,
    close,
}: {
    setModalStage: (stage: ModalStage) => void;
    selectSample: (sample: Sample) => void;
    samples: Sample[];
    close: () => void;
}) => {
    const device = useSelector(selectedDevice);

    const deviceName = device
        ? device.nickname || deviceInfo(device).name
        : 'No device selected';

    return (
        <>
            <Dialog.Header title="Program sample app" />
            <Dialog.Body>
                <p>
                    Make a selection to program the {deviceName} with a
                    pre-compiled application and modem firmware.
                </p>
                <div className="installable-app-grid">
                    {samples.map(sample => (
                        <div
                            key={sample.title}
                            className="card-in-card d-flex flex-column p-3"
                        >
                            <strong className="d-block">{sample.title}</strong>
                            <p className="flex-grow-1 py-2">
                                {sample.description}
                            </p>
                            <Button
                                className="w-100"
                                variant="secondary"
                                onClick={() => {
                                    if (isThingy91(device)) {
                                        setModalStage('modemSelection');
                                    } else {
                                        setModalStage('programming');
                                    }
                                    selectSample(sample);
                                }}
                            >
                                Select
                            </Button>
                        </div>
                    ))}
                </div>
            </Dialog.Body>

            <Dialog.Footer>
                <DialogButton onClick={close}>Close</DialogButton>
            </Dialog.Footer>
        </>
    );
};

const ProgramSample = ({
    setModalStage,
    sample,
    selectSample,
    close,
}: {
    setModalStage: (stage: ModalStage) => void;
    sample: Sample;
    selectSample: (sample?: Sample) => void;
    close: () => void;
}) => {
    const dispatch = useDispatch();

    const device = useSelector(selectedDevice);
    const waitingForReconnect = useSelector(getWaitingForDeviceTimeout);

    const [selectedFirmware, setSelectedFirmware] = useState(
        sample.fw.map(fw => ({ ...fw, selected: true }))
    );
    const [progressMap, setProgressMap] = useState(
        new Map(sample.fw.map(fw => [fw, 0]))
    );

    const [errorMessage, setErrorMessage] = useState<string>();
    const [stage, setStage] = useState<ProgrammingStage>('unstarted');

    const isProgramming = stage === 'programming';

    useEffect(() => {
        dispatch(
            setWaitForDevice({
                once: false,
                timeout: 60_000,
                when: 'always',
                onFail: setErrorMessage,
            })
        );

        return () => {
            dispatch(clearWaitForDevice());
        };
    }, [dispatch]);

    const progressCb = useCallback(
        ({ firmware, progress }: SampleProgress) => {
            progressMap.set(
                firmware as Firmware,
                progress.totalProgressPercentage
            );
            setProgressMap(new Map(progressMap.entries()));
        },
        [progressMap]
    );

    const toggleFirmwareChecked =
        (fw: Firmware & { selected: boolean }) => () => {
            setSelectedFirmware(previous => {
                const selectedFw = previous.find(f => f.file === fw.file);
                if (selectedFw) {
                    selectedFw.selected = !selectedFw?.selected;
                }
                return [...previous];
            });
        };

    const isMcuBoot = isThingy91(device);

    return (
        <>
            <Dialog.Header
                title={`Program ${sample.title}`}
                showSpinner={isProgramming || waitingForReconnect}
            />
            <Dialog.Body>
                {isMcuBoot && <MCUBootModeInstructions />}
                {selectedFirmware.map(fw => (
                    <div key={fw.file} className="mb-4">
                        <div className="d-flex align-items-center">
                            {selectedFirmware.length > 1 && (
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={fw.selected}
                                    onChange={toggleFirmwareChecked(fw)}
                                    id={fw.file}
                                />
                            )}

                            <label htmlFor={fw.file} className="mb-0">
                                <strong>{fw.type}</strong>
                            </label>
                            <button
                                type="button"
                                className="btn btn-link"
                                onClick={() =>
                                    shell.openPath(
                                        dirname(downloadedFilePath(fw.file))
                                    )
                                }
                            >
                                {basename(fw.file)}
                            </button>
                        </div>
                        <ProgressBar
                            now={progressMap.get(fw)}
                            style={{ height: '4px' }}
                        />
                    </div>
                ))}

                <p
                    className="text-muted mb-4"
                    style={{ wordBreak: 'break-all' }}
                >
                    Documentation: <br />
                    <a
                        href={sample.documentation}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {sample.documentation}
                    </a>
                </p>
                {stage === 'success' && (
                    <Alert variant="success">
                        Successfully programmed device
                    </Alert>
                )}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            </Dialog.Body>
            <Dialog.Footer>
                {waitingForReconnect && device && (
                    <span className="text-muted">
                        Waiting for device to reconnect
                    </span>
                )}

                <DialogButton
                    variant="primary"
                    disabled={isProgramming || waitingForReconnect || !device}
                    onClick={async () => {
                        if (!device) {
                            throw new Error(
                                'Device must be selected in order to program firmware'
                            );
                        }

                        setStage('programming');
                        setErrorMessage(undefined);

                        resetProgressMap(progressMap);

                        try {
                            await downloadSample(sample);
                            dispatch(setTerminalSerialPort(null));

                            await programDevice(
                                device,
                                selectedFirmware.filter(fw => fw.selected),
                                progressCb
                            );

                            setTimeout(() => {
                                // Test if new fw uses shell mode
                                dispatch(autoSetUartSerialPort(device));
                                dispatch(resetDashboardState());
                                dispatch(resetTraceInfo());
                                resetTraceEvents();
                                setStage('success');
                            }, 3000);
                        } catch (error) {
                            logger.error(error);
                            setErrorMessage(
                                'Unable to program device, please check the log.'
                            );
                            setStage('failed');
                        }
                    }}
                >
                    Program
                </DialogButton>
                <DialogButton
                    onClick={() => {
                        selectSample(undefined);
                        setModalStage('programSelection');
                    }}
                    disabled={isProgramming || !device}
                >
                    Back
                </DialogButton>
                <DialogButton onClick={close} disabled={isProgramming}>
                    Close
                </DialogButton>
            </Dialog.Footer>
        </>
    );
};

const ProgramModem = ({
    setModalStage,
    sample,
    selectSample,
    modemFirmwares,
    close,
}: {
    setModalStage: (stage: ModalStage) => void;
    sample: Sample;
    selectSample: (sample?: Sample) => void;
    modemFirmwares: ModemFirmware[];
    close: () => void;
}) => {
    const dispatch = useDispatch();
    const device = useSelector(selectedDevice);
    const [selectedMfw, setSelectedMfw] = useState<ModemFirmware>();

    const waitingForReconnect = useSelector(getWaitingForDeviceTimeout);

    const [progressState, setProgressState] = useState(0);

    const [errorMessage, setErrorMessage] = useState<string>();
    const [stage, setStage] = useState<ProgrammingStage>('unstarted');

    const isProgramming = stage === 'programming';

    useEffect(() => {
        dispatch(
            setWaitForDevice({
                once: false,
                timeout: 60_000,
                when: 'always',
                onFail: setErrorMessage,
            })
        );

        return () => {
            dispatch(clearWaitForDevice());
        };
    }, [dispatch]);

    const newProgressCb = () => {
        let memoizedProgress = 0;

        return ({ progress }: SampleProgress) => {
            memoizedProgress = progress.totalProgressPercentage;
            setProgressState(memoizedProgress);
        };
    };

    const isMcuBoot = isThingy91(device);

    return (
        <>
            <Dialog.Header
                title="Program Modem Firmware (Optional)"
                showSpinner={isProgramming || waitingForReconnect}
            />
            <Dialog.Body>
                <p>
                    Do you want to program a modem firmware before programming{' '}
                    {sample?.title ?? 'the selected application'}?
                </p>
                <div className="installable-app-grid mb-5">
                    {modemFirmwares.map(mfw => (
                        <div
                            key={mfw.title}
                            className="card-in-card d-flex flex-column p-3"
                        >
                            <strong className="d-block">{mfw.title}</strong>
                            <p className="flex-grow-1 py-2">
                                {mfw.description}
                            </p>
                            <Button
                                className="w-100"
                                variant="secondary"
                                disabled={isProgramming}
                                onClick={() => {
                                    if (selectedMfw === mfw) {
                                        setSelectedMfw(undefined);
                                    } else {
                                        setSelectedMfw(mfw);
                                    }
                                }}
                            >
                                {selectedMfw === mfw ? 'Deselect' : 'Select'}
                            </Button>
                        </div>
                    ))}
                </div>
                {selectedMfw != null && isMcuBoot ? (
                    <MCUBootModeInstructions />
                ) : null}

                {selectedMfw != null ? (
                    <div key={selectedMfw.file} className="my-4">
                        <div className="d-flex align-items-center">
                            <label htmlFor={selectedMfw.file} className="mb-0">
                                <strong>{selectedMfw.title}</strong>
                            </label>
                            <button
                                type="button"
                                className="btn btn-link"
                                onClick={() =>
                                    shell.openPath(
                                        dirname(
                                            downloadedFilePath(selectedMfw.file)
                                        )
                                    )
                                }
                            >
                                {basename(selectedMfw.file)}
                            </button>
                        </div>
                        <ProgressBar
                            now={progressState}
                            style={{ height: '4px' }}
                        />
                    </div>
                ) : null}
                {stage === 'success' && (
                    <Alert variant="success">
                        Successfully programmed device
                    </Alert>
                )}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            </Dialog.Body>

            <Dialog.Footer>
                {stage === 'success' ? (
                    <DialogButton
                        variant="primary"
                        onClick={() => setModalStage('programming')}
                    >
                        Continue
                    </DialogButton>
                ) : (
                    <DialogButton
                        variant="primary"
                        disabled={
                            !selectedMfw ||
                            isProgramming ||
                            waitingForReconnect ||
                            !device
                        }
                        onClick={async () => {
                            if (!device) {
                                throw new Error(
                                    'Device must be selected in order to program firmware'
                                );
                            }

                            if (!selectedMfw) {
                                throw new Error(
                                    'Modem firmware must be selected in order to program it'
                                );
                            }

                            setStage('programming');
                            setErrorMessage(undefined);
                            const progressCb = newProgressCb();

                            try {
                                await downloadModemFirmware(selectedMfw);
                                dispatch(setTerminalSerialPort(null));

                                await programModemFirmware(
                                    device,
                                    selectedMfw,
                                    progressCb
                                );

                                setTimeout(() => {
                                    // Test if new fw uses shell mode
                                    dispatch(autoSetUartSerialPort(device));
                                    dispatch(resetDashboardState());
                                    dispatch(resetTraceInfo());
                                    resetTraceEvents();
                                    setStage('success');
                                }, 3000);
                            } catch (error) {
                                logger.error(error);
                                setErrorMessage(
                                    'Unable to program device, please check the log.'
                                );
                                setStage('failed');
                            }
                        }}
                    >
                        Program
                    </DialogButton>
                )}

                {stage !== 'success' && (
                    <DialogButton
                        disabled={isProgramming}
                        onClick={() => setModalStage('programming')}
                    >
                        Skip
                    </DialogButton>
                )}

                <DialogButton
                    disabled={isProgramming}
                    onClick={() => {
                        selectSample(undefined);
                        setModalStage('programSelection');
                    }}
                >
                    Back
                </DialogButton>

                <DialogButton disabled={isProgramming} onClick={close}>
                    Close
                </DialogButton>
            </Dialog.Footer>
        </>
    );
};

const resetProgressMap = (progressMap: Map<Firmware, number>) => {
    [...progressMap.keys()].forEach(firmware => progressMap.set(firmware, 0));
    return progressMap;
};

const MCUBootModeInstructions = () => (
    <>
        <strong>Please enable MCUBoot mode:</strong>
        <p>
            Press down the center black button (SW3) on the device while
            powering on (SW1).
        </p>
        <p className="text-center">
            <img src={thingySvg} alt="Thingy91 diagram" />
        </p>
    </>
);
