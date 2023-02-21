/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { Processor } from '..';
import { RequestType } from '../parseAT';
import { getNumberArray } from '../utils';

type ViewModel = {
    notifySignalQuality?: boolean;
    signalQuality: {
        rsrp: number;
        rsrp_threshold_index: number;
        rsrp_decibel: number;
        rsrq: number;
        rsrq_threshold_index: number;
        rsrq_decibel: number;
    };
};

let tentativeState: Partial<ViewModel> | null = null;

export const processor: Processor<'%CESQ'> = {
    command: '%CESQ',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/mob_termination_ctrl_status/proc_cesq.html',
    initialState: () => ({
        notifySignalQuality: false,
        signalQuality: {
            rsrp: 255,
            rsrp_threshold_index: 255,
            rsrp_decibel: 255,
            rsrq: 255,
            rsrq_threshold_index: 255,
            rsrq_decibel: 255,
        },
    }),
    onRequest: (packet, state) => {
        if (packet.payload) {
            if (packet.payload.startsWith('1')) {
                tentativeState = { notifySignalQuality: true };
            }
            if (packet.payload.startsWith('0')) {
                tentativeState = { notifySignalQuality: false };
            }
        }
        return state;
    },
    onResponse: (packet, state, requestType) => {
        if (
            packet.status === 'OK' &&
            requestType === RequestType.SET_WITH_VALUE
        ) {
            if (tentativeState != null) {
                return { ...state, ...tentativeState };
            }
        }
        return state;
    },
    onNotification: (packet, state) => {
        if (packet.payload) {
            const signalQualityValues = getNumberArray(packet.payload);

            if (signalQualityValues?.length === 4) {
                return {
                    ...state,
                    signalQuality: {
                        rsrp: signalQualityValues[0],
                        rsrp_threshold_index: signalQualityValues[1],
                        rsrp_decibel: signalQualityValues[0] - 140,

                        rsrq: signalQualityValues[2],
                        rsrq_threshold_index: signalQualityValues[3],
                        rsrq_decibel: signalQualityValues[2] / 2 - 19.5,
                    },
                };
            }
        }
        return state;
    },
};
