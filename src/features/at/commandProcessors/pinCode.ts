/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { Processor } from '..';

const pinCodeStatus = {
    Unknown: 'Not yet aware',
    READY: 'No PIN required',
    'SIM PUN': 'PIN code required',
    'SIM PIN': 'PUK code required',
    'SIM PUK': 'PIN2 code required',
    'SIM PIN2': 'PUK2 code required',
    'PH-SIM PIN': 'USIM depersonalization required',
    'PH-NET PIN': 'Network depersonalization required',
    'PH-NETSUB PIN': 'Network subset depersonalization required',
    'PH-SP PIN': 'Service provider depersonalization required',
    'PH-CORP PIN': 'Corporate depersonalization required',
};

type PinCodeStatus = keyof typeof pinCodeStatus;

type ViewModel = { pinCodeStatus: PinCodeStatus };

export const processor: Processor<ViewModel> = {
    command: '+CPIN',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/security/cpin.html',
    initialState: () => ({ pinCodeStatus: 'Unknown' }),
    onResponse: packet => {
        if (packet.status === 'OK') {
            const allowedStates = (
                Object.keys(pinCodeStatus) as PinCodeStatus[]
            ).filter(key => key !== 'Unknown');

            if (packet.payload) {
                return {
                    pinCodeStatus:
                        allowedStates.find(state => state === packet.payload) ??
                        'Unknown',
                };
            }
        }
        return { pinCodeStatus: 'Unknown' };
    },
};

export const commands = {
    enterPIN(pin: string, newPin: string) {
        const pin2 = newPin ? '' : `,"${newPin}"`;
        return `+CPIN="${pin}"${pin2}`; // +CPIN="pin","pin2"
    },
    checkPIN() {
        return '+CPIN?';
    },
};

export default processor;
