/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { FunctionalMode } from '../../../features/tracingEvents/at/commandProcessors/functionMode';
import { getDashboardState } from '../../../features/tracingEvents/dashboardSlice';
import DashboardCard from './DashboardCard';

const formatAvailableBands = (bandsArray: number[]) =>
    `${bandsArray.join(',')}`;

export default () => {
    const {
        revisionID,
        hardwareVersion,
        functionalMode,
        IMEI,
        currentBand,
        availableBands,
        manufacturer,
    } = useSelector(getDashboardState);

    const fields = {
        'Funcational Mode': parseFunctionalMode(functionalMode),
        IMEI: IMEI ?? 'Unknown',
        'MODEM FIRMWARE': revisionID ?? 'Unknown',
        'HARDWARE VERSION': hardwareVersion ?? 'Unknown',
        'MODEM UUID': 'Not Implemented',
        'CURRENT BAND': currentBand ?? 'Unknown',
        'AVAILABLE BANDS': availableBands
            ? formatAvailableBands(availableBands)
            : 'Unknown',
        'DATA PROFILE': 'Not Implemented',
        MANUFACTURER: manufacturer ?? 'Unknown',
    };
    return (
        <DashboardCard
            title="Device"
            iconName="mdi-integrated-circuit-chip"
            fields={fields}
        />
    );
};

const functionalModeStrings = {
    0: 'Power off',
    1: 'Normal',
    4: 'Offline/Flight mode',
    44: 'Offline/Flight mode without shutting down UICC',
};

const functionalModeHasStringValue = (
    mode: FunctionalMode
): mode is keyof typeof functionalModeStrings => {
    if (Object.keys(functionalModeStrings).includes(`${mode}`)) {
        return true;
    }
    return false;
};

const parseFunctionalMode = (mode: FunctionalMode): string => {
    if (mode === undefined) return 'Unknown';
    if (functionalModeHasStringValue(mode)) {
        return `${mode}: ${functionalModeStrings[mode]}`;
    }
    return `${mode}`;
};
