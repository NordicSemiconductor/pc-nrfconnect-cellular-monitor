/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InnerHTML from 'dangerously-set-html-content';
import { Alert, PaneProps, usageData } from 'pc-nrfconnect-shared';
import Plotly from 'plotly.js';

import { updatePowerData } from '../../features/powerEstimation/onlinePowerEstimator';
import {
    getRenderedHtml,
    hasError as powerEstimationError,
} from '../../features/powerEstimation/powerEstimationSlice';
import { findTshark } from '../../features/wireshark/wireshark';
import { getTsharkPath } from '../../features/wireshark/wiresharkSlice';
import EventAction from '../../usageDataActions';
import { Tshark } from '../Wireshark/Tshark';

import './powerEstimation.scss';

export default ({ active }: PaneProps) => {
    const dispatch = useDispatch();
    const oppHtml = useSelector(getRenderedHtml);
    const hasError = useSelector(powerEstimationError);

    const selectedTsharkPath = useSelector(getTsharkPath);
    const isTsharkInstalled = !!findTshark(selectedTsharkPath);

    window.Plotly = Plotly;

    useEffect(() => {
        if (!active) return;
        usageData.sendUsageData(EventAction.POWER_ESTIMATION_PANE);
    }, [active]);

    const updatePowerEstimationData = (key: string) => (event: Event) => {
        const { target } = event;
        dispatch(updatePowerData(key, target.checked ? 'on' : 'False'));
        // const { checked } = event.target;
        // console.log('value', value);
    };

    useEffect(() => {
        if (!oppHtml) return;
        const psm = document.getElementById('id_psm');
        const psmHandler = updatePowerEstimationData('psm');
        psm?.addEventListener('click', psmHandler);

        return () => {
            psm?.removeEventListener('click', psmHandler);
        };
    }, [oppHtml]);

    return (
        <div className="power-estimation-container">
            {hasError && (
                <Alert variant="danger" label="Error!">
                    Could not complete network request, see log for more
                    details.
                </Alert>
            )}
            {oppHtml ? (
                <InnerHTML html={oppHtml} />
            ) : (
                <div className="power-estimation-landing">
                    {isTsharkInstalled ? (
                        <p>
                            Start a trace to capture live data for power
                            estimate or read from existing trace file
                        </p>
                    ) : (
                        <Tshark />
                    )}
                </div>
            )}
        </div>
    );
};
