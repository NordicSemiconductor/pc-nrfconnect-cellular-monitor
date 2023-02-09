/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { SidePanel } from 'pc-nrfconnect-shared';

import AdvancedOptions from './AdvancedOptions';
import EventGraphOptions from './EventGraphOptions';
import Instructions from './Instructions';
import { LoadTraceFile } from './LoadTraceFile';
import PowerEstimationParams from './PowerEstimationParams';
import TraceCollector from './Tracing/TraceCollector';
import TraceFileInformation from './Tracing/TraceFileInformation';
import nrfml from '@nordicsemiconductor/nrf-monitor-lib-js';

import './sidepanel.scss';
import './Tracing/tracing.scss';

export const PowerEstimationSidePanel = () => (
    <SidePanel>
        <PowerEstimationParams />
    </SidePanel>
);

export const TraceCollectorSidePanel = () => (
    <SidePanel className="side-panel">
        <Instructions />
        <TraceCollector />
        <TraceFileInformation />
        <AdvancedOptions />
        <LoadTraceFile />
        <EventGraphOptions />
        <button onClick={async () => console.log(await nrfml.apiVersion())} >
            CLICK ME PLEASE
            </button>
    </SidePanel>
);
