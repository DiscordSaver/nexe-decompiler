import { Unpacker } from './unpacker';
import * as fs from 'fs';
import * as upath from 'upath';
import * as path from 'path';
import * as tar from 'tar';
import { Stream } from 'stream';

interface Footer {
    identifier: string;
    command: string;
    uncompressionMessage: string;
}

export class Caxa extends Unpacker {
    filepath: string;
    buf: Buffer;
    fileSize: number;
    indexOf: number;
    lastOf: number;
    footerString: string;

    caxaBuffer = Buffer.from("\nCAXACAXACAXA\n");
    newlineBuffer = Buffer.from("\n");

    constructor(filepath: string) {
        super();
        this.filepath = filepath;
        this.buf = Buffer.from("");
        this.fileSize = 0;
        this.indexOf = -1;
        this.lastOf = -1;
        this.footerString = "";
    }

    public check() {
        try {
            this.buf = fs.readFileSync(this.filepath);
        } catch (err) {
            console.log("Could not open file '" + this.filepath + "'");
            return false;
        }
    
        this.indexOf = this.buf.indexOf(this.caxaBuffer);
        if (this.indexOf == -1) {
            this.buf = Buffer.from("");
            return false;
        }

        this.lastOf = this.buf.lastIndexOf(this.newlineBuffer);
        if (this.lastOf == -1) {
            this.buf = Buffer.from("");
            return false;
        }

        this.footerString = this.buf.slice(this.lastOf + this.newlineBuffer.length).toString();
        if (this.footerString === "") {
            this.buf = Buffer.from("");
            return false;
        }

        console.log("[+] CAXA has been detected!");
        return true;
    }

    public unpack() {
        const data = this.buf.slice(this.indexOf + this.caxaBuffer.length, this.lastOf);
        const destination = upath.normalize(path.join(path.parse(this.filepath)['name']+"_extracted"));

        fs.mkdirSync(destination, { recursive: true});

        const read = new Stream.PassThrough();
        const write = tar.x({
            C: destination
        });

        read.end(data);

        read.pipe(write);

        const footer: Footer = JSON.parse(this.footerString);
    
        const entryPoint = destination + new String(footer.command).split(",")[1].replace("{{caxa}}","")

        console.log("[+] Entrypoint found: " + entryPoint)

        write.on("finish", () => {
            console.log("[+] Finished.")
        })
    }
}