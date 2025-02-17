/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable no-await-in-loop */

import {
    Device,
    logger,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { type Progress } from '@nordicsemiconductor/pc-nrfconnect-shared/nrfutil';
import { NrfutilDeviceLib } from '@nordicsemiconductor/pc-nrfconnect-shared/nrfutil/device';
import { DeviceInfo } from '@nordicsemiconductor/pc-nrfconnect-shared/typings/generated/nrfutil/device';

import EventAction from '../../app/usageDataActions';
import { downloadedFilePath, Firmware, ModemFirmware } from './samples';

const { reset, program } = NrfutilDeviceLib;

export interface SampleProgress {
    firmware: Firmware | ModemFirmware;
    progress: Progress;
}

export type SupportedDeviceVersion = 'nRF9160' | 'nRF91x1' | 'AllDevices';

export const getDeviceKeyForTraceDatabaseEntries = (
    device?: Device,
    deviceInfo?: DeviceInfo
): SupportedDeviceVersion => {
    // generic check should work on no nordic DKs
    const deviceVersion = deviceInfo?.jlink?.deviceVersion;
    if (deviceVersion) {
        if (deviceVersion.match(/.*NRF91\d1.*/)) {
            return 'nRF91x1';
        }

        if (deviceVersion.match(/.*NRF9160.*/)) {
            return 'nRF9160';
        }
    }

    // only for dev kits
    if (is9131DK(device) || is9161DK(device) || is9151DK(device)) {
        return 'nRF91x1';
    }
    if (is9160DK(device) || isThingy91(device)) {
        return 'nRF9160';
    }

    // Used when loading file, and want to see all database files.
    return 'AllDevices';
};

export const isThingy91 = (device?: Device) => {
    const serialPorts = device?.serialPorts;

    if (serialPorts == null) {
        return false;
    }

    return serialPorts.some(port => port.productId === '9100');
};

export const is9160DK = (device?: Device) =>
    device?.devkit?.boardVersion === 'PCA10090';
export const is9161DK = (device?: Device) =>
    device?.devkit?.boardVersion === 'PCA10153';
export const is9151DK = (device?: Device) =>
    device?.devkit?.boardVersion === 'PCA10171';
export const is9131DK = (device?: Device) =>
    device?.devkit?.boardVersion === 'PCA10165';
export const is9151DK = (device?: Device) =>
    device?.devkit?.boardVersion === 'PCA10171';

export const programModemFirmware = async (
    device: Device,
    modemFirmware: ModemFirmware,
    progress: (progress: SampleProgress) => void
) => {
    try {
        telemetry.sendEvent(EventAction.PROGRAM_SAMPLE, {
            type: 'ModemFirmware',
            firmware: modemFirmware,
        });
        await programModem(device, modemFirmware, progress);
    } catch (error) {
        telemetry.sendErrorReport(
            `Failed to program modem firmware: ${modemFirmware.file}`
        );
        logger.error(error);
        throw error;
    }
};

export const programDevice = async (
    device: Device,
    firmwares: Firmware[],
    progress: (progress: SampleProgress) => void
) => {
    try {
        // eslint-disable-next-line no-restricted-syntax
        for (const fw of firmwares) {
            telemetry.sendEvent(EventAction.PROGRAM_SAMPLE, {
                firmware: fw,
            });
            switch (fw.type) {
                case 'Modem':
                    await programModem(device, fw, progress);

                    break;
                case 'Application':
                    await programFirmware(device, fw, progress);
                    break;
                default:
                    throw new Error(`Unable to program fw type: ${fw.type}`);
            }
        }

        logger.info('Programming complete, reseting device.');
        reset(device);
    } catch (error) {
        telemetry.sendErrorReport('Failed to program a sample');
        logger.error(error);
        throw error;
    }
};

const programModem = (
    device: Device,
    firmware: Firmware | ModemFirmware,
    progressCb: (progress: SampleProgress) => void
) =>
    program(device, downloadedFilePath(firmware.file), progress => {
        progressCb({ firmware, progress });
    });

const programFirmware = (
    device: Device,
    firmware: Firmware,
    progressCb: (progress: SampleProgress) => void
) =>
    program(
        device,
        downloadedFilePath(firmware.file),
        progress => {
            progressCb({ firmware, progress });
        },
        'Application'
    );
