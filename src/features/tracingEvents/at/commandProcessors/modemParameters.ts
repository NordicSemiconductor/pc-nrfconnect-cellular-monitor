/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    parsePowerSavingMode,
    TAU_TYPES,
} from '../../../../utils/powerSavingMode';
import { isValidAcTState, PowerSavingModeEntries } from '../../types';
import type { Processor } from '..';
import { getNumber, getParametersFromResponse } from '../utils';

export const processor: Processor<'%XMONITOR'> = {
    command: '%XMONITOR',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/nw_service/xmonitor.html',
    initialState: () => ({}),
    onResponse: (packet, state) => {
        if (packet.status === 'OK') {
            const responseArray = getParametersFromResponse(packet.payload);
            if (responseArray.length !== 15 && responseArray.length !== 16) {
                return state;
            }

            const rawAcT = getNumber(responseArray[5]);
            const AcTState = isValidAcTState(rawAcT) ? rawAcT : undefined;

            // if payload has 15 values it uses mfw v1.0.x - v1.1.x
            // if payload has 16 values it uses mfw v1.2.x - v1.3.x
            const mfwVersion = responseArray.length === 15 ? 'v1' : 'v2';

            let PsmValues;
            if (mfwVersion === 'v1') {
                PsmValues = {
                    activeTime: responseArray[13],
                    periodicTau: responseArray[14],
                };
            } else if (mfwVersion === 'v2') {
                PsmValues = {
                    activeTime: responseArray[13],
                    periodicTauExtended: responseArray[14],
                    periodicTau: responseArray[15],
                };
            } else {
                PsmValues = undefined as never;
            }

            const rsrp = getNumber(responseArray[10]);
            const snr = getNumber(responseArray[10]);

            return {
                ...state,
                networkStatusLastUpdate: 'networkStatus',
                networkStatus: getNumber(responseArray[0]),
                operatorFullName: responseArray[1],
                operatorShortName: responseArray[2],
                plmn: responseArray[3],
                tac: responseArray[4],
                AcTState,
                band: getNumber(responseArray[6]),
                cell_id: responseArray[7],
                phys_cell_id: getNumber(responseArray[8]),
                earfcn: getNumber(responseArray[9]),
                signalQuality: {
                    ...state.signalQuality,
                    rsrp: rsrp ?? state.signalQuality?.rsrp,
                    rsrp_decibel: rsrp
                        ? rsrp - 140
                        : state.signalQuality?.rsrp_decibel,
                    snr: snr ?? state.signalQuality?.snr,
                    snr_decibel: snr
                        ? snr - 24
                        : state.signalQuality?.snr_decibel,
                },
                NW_provided_eDRX_value: validateEmptyString(responseArray[12]),

                powerSavingMode: {
                    ...state.powerSavingMode,
                    granted: parsePSMValues(
                        PsmValues.activeTime,
                        PsmValues.periodicTau,
                        PsmValues.periodicTauExtended
                    ),
                },
            };
        }
        return state;
    },
};

const parsePSMValues = (
    activeTime: string,
    periodicTau?: string,
    periodicTauExtended?: string
) => {
    const PsmValues: PowerSavingModeEntries = {};
    PsmValues.T3324 = parsePowerSavingMode(activeTime, TAU_TYPES.ACTIVE_TIMER);
    if (periodicTauExtended !== undefined) {
        PsmValues.T3412Extended = parsePowerSavingMode(
            periodicTauExtended,
            TAU_TYPES.SLEEP_INTERVAL
        );
    }
    if (periodicTau !== undefined) {
        PsmValues.T3412 = parsePowerSavingMode(
            periodicTau,
            TAU_TYPES.SLEEP_INTERVAL
        );
    }

    if (
        PsmValues.T3324.activated &&
        (PsmValues?.T3412Extended?.activated || PsmValues?.T3412?.activated)
    ) {
        PsmValues.state = 'on';
    } else {
        PsmValues.state = 'off';
    }

    return PsmValues;
};

const validateEmptyString = (value: string) =>
    value === '' ? undefined : value;
