import { processor as currentBand } from './currentBand';
import { processor as functionMode } from './functionMode';
import { processor as modemParameters } from './modemParameters';
import { processor as modeOfOperation } from './modeOfOperation';
import { parseAT } from './parseAT';
import { processor as periodicTAU } from './periodicTAU';
import { processor as signalQuality } from './signalQuality';

export interface Packet {
    packet_data: Uint8Array;
    format: 'at';
    timestamp?: {
        resolution: string;
        value: number;
    };
}

export interface Processor<VM> {
    command: string;
    documentation: string;
    initialState: () => VM;
    response: (packet: ParsedPacket) => Partial<VM>;
    request?: (packet: ParsedPacket) => Partial<VM>;
    notification?: (packet: ParsedPacket) => Partial<VM>;
}

export interface ParsedPacket {
    command?: string;
    operator?: string;
    body?: string;
    isRequest?: boolean;
    lastLine?: string;
    status?: string; // 'OK | 'ERROR'
}

type ExtractViewModel<Type> = Type extends Processor<infer X> ? X : never;

// Typescript challenge! Make this state object by iterating over the processors array below.
export type State = ExtractViewModel<typeof functionMode> &
    ExtractViewModel<typeof currentBand> &
    ExtractViewModel<typeof modeOfOperation> &
    ExtractViewModel<typeof periodicTAU> &
    ExtractViewModel<typeof signalQuality> &
    ExtractViewModel<typeof modemParameters>;

const processors = [
    functionMode,
    currentBand,
    modeOfOperation,
    signalQuality,
    periodicTAU,
    modemParameters,
];
export const initialState = (): State =>
    processors.reduce(
        (state, processor) => ({ ...state, ...processor.initialState() }),
        {} as State
    );

let waitingAT: string;

export const convert = (packet: Packet, state: State) => {
    if (packet.format !== 'at') {
        return state;
    }

    const parsedPacket = parseAT(packet);
    const { isRequest, lastLine, command } = parsedPacket;

    // request
    const processor = processors.find(p => p.command === command);
    if (isRequest) {
        waitingAT = command ?? '';
        if (processor && processor.request) {
            return { ...state, ...processor.request(parsedPacket) };
        }
        return state;
    }

    // notification or response
    if (processor) {
        // response if true, otherwise a notification
        if (command === waitingAT) {
            waitingAT = '';
            return {
                ...state,
                ...processor.response(parsedPacket),
            };
        }
        const notification = processor.notification
            ? processor.notification(parsedPacket)
            : processor.response(parsedPacket);
        return { ...state, ...notification };
    }

    // response without command
    const responseProcessor = processors.find(p => p.command === waitingAT);
    if (responseProcessor) {
        waitingAT = '';

        const change = responseProcessor.response(parsedPacket);
        return { ...state, ...change };
    }

    // eslint-disable-next-line no-empty
    if (lastLine?.startsWith('ERROR')) {
    }

    // eslint-disable-next-line no-empty
    if (lastLine?.startsWith('+CME ERROR')) {
    }

    // eslint-disable-next-line no-empty
    if (lastLine?.startsWith('+CMS ERROR')) {
    }

    return state;
};
