'use strict';

const fs = require('fs');

function parseInterfaces(text) {
    let current = null;
    const interfaces = [];
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
            current.mac = mac.replace(/:/g, '').match(/.{1,4}/g).join('.');
        }

        if (line.includes('Logical interface ')) {
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

            if (line.includes('Protocol ')) {
                const protocol = line.replace('Protocol ', '').split(',')[0].trim();
                currentLogical.protocolList.push({ type: protocol });
            }
        }
    }

    commitInterface();
    return interfaces;
}

function normalizeSpeed(str) {
    let name = "";
    const lower = str.toLowerCase();
    if (str.toLowerCase().includes('g')) name = parseInt(str) * 1e9;
    if (str.toLowerCase().includes('m')) name = parseInt(str) * 1e6;
    return name;
}

const text = fs.readFileSync('./parsing.task.txt', 'utf8');
const result = parseInterfaces(text);
fs.writeFile('./parsingResult.json', JSON.stringify(result, null, 2), (err) => {
    if (err) throw err;
    console.log('Data written to file');
});