'use strict';

const fs = require('fs');

function parseInterfaces(text) {
    const interfaces = [];
    let current = null;
    let currentLogical = null;

    const commitLogical = () => {
        if (currentLogical) {
            current.logicalInterfaceList.push(currentLogical);
            currentLogical = null;
        }
    };

    const commitInterface = () => {
        if (current) {
            commitLogical();
            interfaces.push(current);
            current = null;
        }
    };

    for (let line of text.split('\n')) {
        line = line.trim();

        if (line.includes('Physical interface:')) {
            commitInterface();

            const parts = line.replace('Physical interface: ', '').split(',');
            current = {
                name: parts[0],
                state: {
                    admin: parts[1].trim().toLowerCase(),
                    link: parts[2].replace('Physical link is ', '').trim().toLowerCase(),
                },
                logicalInterfaceList: []
            };
            continue;
        }

        if (!current) continue;

        if (line.includes('Description:') && !currentLogical) {
            current.dscr = line.split('Description:')[1].trim();
        }

        if (line.includes('Speed:')) {
            const speed = line.split('Speed:')[1].split(',')[0].trim();
            current.speed = normalizeSpeed(speed);
        }

        if (line.includes('Link-mode:')) {
            const duplex = line.split('Link-mode:')[1].split(',')[0].trim();
            current.duplex = duplex.includes('full') ? 'full' : duplex;
        }

        if (line.includes('Current address:')) {
            const mac = line.split('Current address:')[1].split(',')[0].trim();
            current.mac = formatMac(mac);
        }

        if (line.startsWith('Logical interface ')) {
            commitLogical();
            const logicalName = line.replace('Logical interface ', '').split(' ')[0];
            currentLogical = {
                name: logicalName,
                protocolList: []
            };
            continue;
        }

        if (currentLogical) {
            if (line.includes('Description:')) {
                currentLogical.dscr = line.split('Description:')[1].trim();
            }

            if (line.startsWith('Protocol ')) {
                const protocol = line.replace('Protocol ', '').split(',')[0].trim();
                currentLogical.protocolList.push({ type: protocol });
            }
        }
    }

    commitInterface();
    return interfaces;
}

// Helpers
function normalizeSpeed(str) {
    const n = parseInt(str);
    const lower = str.toLowerCase();
    if (lower.includes('g')) return n * 1e9;
    if (lower.includes('m')) return n * 1e6;
    return n;
}

function formatMac(mac) {
    const raw = mac.replace(/:/g, '');
    return raw.match(/.{1,4}/g).join('.');
}

const text = fs.readFileSync('./parsing.task.txt', 'utf8');

const result = parseInterfaces(text);
fs.writeFile('./parsingResult.json', JSON.stringify(result, null, 2), (err) => {
    if (err) throw err;
    console.log('Data written to file');
});