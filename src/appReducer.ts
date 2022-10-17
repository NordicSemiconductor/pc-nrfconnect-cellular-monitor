/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { NrfConnectState } from 'pc-nrfconnect-shared';
import { combineReducers } from 'redux';

import modemReducer from './features/modem/modemSlice';
import powerEstimationReducer from './features/powerEstimation/powerEstimationSlice';
import traceReducer from './features/tracing/traceSlice';
import wiresharkReducer from './features/wireshark/wiresharkSlice';
import atReducer from './at/atSlice';

type AppState = ReturnType<typeof appReducer>;

export type RootState = NrfConnectState<AppState>;

const appReducer = combineReducers({
    modem: modemReducer,
    trace: traceReducer,
    powerEstimation: powerEstimationReducer,
    wireshark: wiresharkReducer,
    at: atReducer,
});

export default appReducer;
