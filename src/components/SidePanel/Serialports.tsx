/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown, Group, truncateMiddle } from 'pc-nrfconnect-shared';

import {
    getPopoutId,
    getSelectedSerialport as getTerminalPort,
} from '../../features/terminal/terminalSlice';
import {
    getAvailableSerialPorts,
    getSelectedSerialNumber,
    setSerialPort,
} from '../../features/tracing/traceSlice';
import { setSerialPort as persistSerialPort } from '../../utils/store';

type SerialPortProps = {
    disabled: boolean;
    selectedSerialPort: string;
};

export default ({ selectedSerialPort, disabled }: SerialPortProps) => {
    const dispatch = useDispatch();
    const availablePorts = useSelector(getAvailableSerialPorts);
    const serialNumber = useSelector(getSelectedSerialNumber) ?? '';
    const terminalId = useSelector(getPopoutId);
    const terminalPort = useSelector(getTerminalPort);

    const updateSerialPort = ({ value: port }: { value: string }) => {
        dispatch(setSerialPort(port));
        persistSerialPort(serialNumber, port);
    };

    const dropdownItems = availablePorts
        .filter(port => !(terminalId && port === terminalPort))
        .map(port => ({
            label: truncateMiddle(port, 20, 8),
            value: port as string,
        }));

    return (
        <Group heading="Serialport trace capture">
            <div className="serialport-selection">
                <Dropdown
                    disabled={disabled}
                    onSelect={updateSerialPort}
                    defaultIndex={availablePorts.indexOf(selectedSerialPort)}
                    items={dropdownItems}
                />
            </div>
        </Group>
    );
};
