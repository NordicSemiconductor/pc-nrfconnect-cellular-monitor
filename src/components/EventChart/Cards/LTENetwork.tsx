/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { getDashboardState } from '../../../features/tracingEvents/dashboardSlice';
import type { AcTState, RRCState } from '../../../features/tracingEvents/types';
import DashboardCard, { DashboardCardFields } from './DashboardCard';

type RRCStateFlag = '🟡' | '🟢' | '🔴';

const getRRCStateColor = (
    state: RRCState | undefined
): `${RRCStateFlag}${string}` => {
    switch (state) {
        case 0:
            return '🟡 Idle';
        case 1:
            return '🟢 Connected';
        default:
            return '🔴 Unknown';
    }
};

export default () => {
    const {
        AcTState,
        rrcState,
        signalQuality,
        networkStatus,
        activityStatus,
        mcc,
        mccCode,
        mnc,
        mncCode,
        networkType,
        earfcn,
    } = useSelector(getDashboardState);

    const fields: DashboardCardFields = {
        MODE: {
            value:
                AcTState !== undefined ? parseModeFromAcT(AcTState) : 'Unknown',
            commands: ['AT+CEREG', 'AT%XMONITOR', 'AT+CEDRXRDP'],
        },
        // TODO: need to look into how to properly get correct value for this
        'RRC STATE': {
            value: getRRCStateColor(rrcState),
            commands: ['AT%CONEVAL', 'AT+CSCON'],
        },
        'NETWORK TYPE': { value: networkType ?? 'Unknown', commands: [] },
        PCI: { value: 'NOT IMPLEMENTED', commands: [] },
        SNR: { value: 'NOT IMPLEMENTED', commands: [] },
        MNC: { value: parseMCC(mnc, mncCode), commands: [] },
        'CELL ID': { value: 'NOT IMPLEMENTED', commands: [] },
        'RRC STATE CHANGE CAUSE': { value: 'NOT IMPLEMENTED', commands: [] },
        EARFCN: {
            value: earfcn ?? 'Unknown',
            commands: ['AT%CONEVAL'],
        },
        'PUCCH TX POWER': { value: 'NOT IMPLEMENTED', commands: [] },
        MCC: { value: parseMCC(mcc, mccCode), commands: [] },
        'NEIGHBOR CELLS': { value: 'NOT IMPLEMENTED', commands: [] },
        'EMM STATE': { value: 'NOT IMPLEMENTED', commands: [] },
        RSRP: {
            value: signalQuality?.rsrp_decibel ?? 'Unknown',
            commands: ['AT%CESQ'],
        },
        'CE MODE': { value: 'NOT IMPLEMENTED', commands: [] },
        'BAND INDICATOR': { value: 'NOT IMPLEMENTED', commands: [] },
        'EMM SUBSTATE': { value: 'NOT IMPLEMENTED', commands: [] },
        RSRQ: {
            value: signalQuality?.rsrq_decibel ?? 'Unknown',
            commands: ['AT%CESQ'],
        },
        'CE LEVEL': { value: 'NOT IMPLEMENTED', commands: [] },
        'TRACKING AREA': { value: 'NOT IMPLEMENTED', commands: [] },

        // TODO: To be removed?
        'ACTIVITY STATUS': {
            value: activityStatus ?? 'Unknown',
            commands: ['AT+CPAS'],
        },
        STATUS: { value: networkStatus ?? 'Unknown', commands: [] },
    };
    return (
        <DashboardCard
            title="LTE Network"
            iconName="mdi-access-point-network"
            fields={fields}
        />
    );
};

const parseModeFromAcT = (AcTState: AcTState) => {
    if (AcTState === 0) return 'NOT CONNECTED';
    if (AcTState === 4 || AcTState === 7) {
        return 'LTE-M';
    }
    if (AcTState === 5 || AcTState === 9) {
        return 'NB-IoT';
    }

    return null as never;
};

const parseMCC = (mcc: string | undefined, mccCode: number | undefined) => {
    let result = '';
    if (mccCode !== undefined) {
        result += `${mccCode}`;
    }
    if (mcc !== undefined) {
        result += ` ${mcc}`;
    }
    if (result === '') return 'Unknown';
    return result.trim();
};
