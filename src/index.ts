import {Nexe} from './nexe';
import yargs from 'yargs/yargs';
import { argv } from 'process';
import { resolve } from 'path';
import { Arguments } from 'yargs';
import { Caxa } from './caxa';

interface UnpackArguments extends Arguments{
	file: string;
}

let opts = yargs(argv.slice(2)).options({
	file: {
            type: "string",
            describe: "File to unpack",
            demandOption: true,
			alias: "f"
        }
    }).argv as UnpackArguments;

function main(opts: UnpackArguments) {
	let filepath = resolve(opts.file);

	const unpackers = [
		new Nexe(filepath),
		new Caxa(filepath)
	];

	for (const unpacker of unpackers) {
		if (unpacker.check()) {
			unpacker.unpack();
			break;
		}
	}
}

main(opts)