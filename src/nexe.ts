import { Unpacker } from './unpacker';
import * as fs from 'fs';
import * as upath from 'upath';
import * as path from 'path';

export class Nexe extends Unpacker {
    filepath: string;
    buf: Buffer;
    fileSize: number;

    constructor(filepath: string) {
        super();
        this.filepath = filepath;
        this.buf = Buffer.from("");
        this.fileSize = 0;
    }

    public check() {
        try {
            this.buf = fs.readFileSync(this.filepath);
        } catch (err) {
            console.log("Could not open file '" + this.filepath + "'");
            return false;
        }

        this.fileSize = this.buf.length;

        if (this.buf.slice(this.fileSize - 32, this.fileSize - 16).toString() !== "<nexe~~sentinel>") {
            this.buf = Buffer.from("");
            return false;
        }

        console.log("[+] NEXE has been detected!");
        return true;
    }

    public unpack() {
        const sentinel = this.buf.slice(this.fileSize-16, this.fileSize);
        const codeSize = sentinel.readDoubleLE(0);
        const bundleSize = sentinel.readDoubleLE(8);

        console.log("[+] File size: " + this.fileSize)
        console.log("[+] Code size: " + codeSize)
        console.log("[+] Bundle size: " + bundleSize)

        const codeOffset = this.fileSize - codeSize - bundleSize - 16 - 16
        const bundleOffset = this.fileSize - bundleSize - 16 - 16

        const code = this.buf.slice(codeOffset, codeOffset+codeSize)

        if (code.length < 0) {
            console.log("[!] Failed extracting code.")
            return;
        }

        const resourceMatch = code.toString().match(/process\.__nexe = (.*);\n/i);
        if (resourceMatch == undefined) {
            console.log("[!] Failed extracing resources.")
            return;
        }

        const resourceString = resourceMatch[1];
        const resources = JSON.parse(resourceString).resources
        
        process.stdout.write("[+] Extracting files")

        for (const [key, value] of Object.entries(resources)) {
            const res = value as number[];

            let resourcePath = upath.normalize(upath.toUnix(key));

            const resourceOffset = bundleOffset + res[0];
            const resource = this.buf.slice(resourceOffset, resourceOffset + res[1]);
        
            resourcePath = path.join(path.parse(this.filepath)['name']+"_extracted", "/", resourcePath);
            
            const resourceParsed = path.parse(resourcePath);

            fs.mkdirSync(resourceParsed['dir'], { recursive: true});
            fs.writeFileSync(resourcePath, resource, "binary");

            process.stdout.write(".");
        }

        process.stdout.write("\n")

        const entryMatch = code.toString().match(/const entry = path\.resolve\(path\.dirname\(process\.execPath\),"(\S*.js)"\)/i);
        
        if (entryMatch == undefined) {
            console.log("[!] Failed to retrive entry point.");
            return;
        }

        const entryPoint = entryMatch[1];
        console.log("Entry Point: "+upath.normalize(path.join(path.parse(this.filepath)['name']+"_extracted",upath.toUnix(entryPoint))));
        console.log("[+] Finished.")
    }
}