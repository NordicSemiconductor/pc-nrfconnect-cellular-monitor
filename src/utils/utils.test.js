import { getNameAndDirectory } from './fileUtils';
import { truncateMiddle } from './index';
import { getSerialPorts } from './serialport';

test('get name and directory', () => {
    expect(getNameAndDirectory('some/path/to/file.bin')).toStrictEqual([
        'file.bin',
        'some/path/to',
    ]);
});

test('truncate string', () => {
    expect(
        truncateMiddle('some long string with more than 20 characters')
    ).toBe('some long string wit...20 characters');
    expect(truncateMiddle('short string')).toBe('short string');
    expect(truncateMiddle('string with 20 chars')).toBe('string with 20 chars');
    expect(truncateMiddle('string with 23 chars 12')).toBe(
        'string with 23 chars 12'
    );
    expect(truncateMiddle('string with 24 chars 123')).toBe(
        'string with 24 chars...3'
    );
});

test('get device serial ports', () => {
    const device = {
        serialport: {
            path: 'testPath1',
        },
        'serialport.1': {
            path: 'testPath2',
        },
        'serialport.2': {
            path: 'testPath3',
        },
    };
    const ports = getSerialPorts(device);
    expect(ports.length).toBe(3);
});
