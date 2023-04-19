/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getModemVersionFromResponse } from './recommeneded';

test('Modem version is found', () => {
    expect(getModemVersionFromResponse('mfw_nrf9160_1.1.1')).toBe('1.1.1');
    expect(getModemVersionFromResponse('mfw_nrf9160_1.1.1\r\nOK\r\n')).toBe(
        '1.1.1'
    );

    expect(getModemVersionFromResponse('mfw_nrf9160_1.13.0')).toBe('1.13.0');
    expect(getModemVersionFromResponse('mfw_nrf9160_1.13.0\r\nOK\r\n')).toBe(
        '1.13.0'
    );
});
