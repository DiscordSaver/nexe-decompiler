#!/usr/bin/env node
const path = require('path'),
    fs = require('fs');

function main(args) {
    console.log(args.file)
    console.log(args.ignoreNodeModules)

    file = path.resolve(args.file)

    const buf = fs.readFileSync(file)

    offset = buf.length - 16

    sentinel = buf.slice(offset, buf.length)
    codeSize = sentinel.readDoubleLE(0)
    bundleSize = sentinel.readDoubleLE(8)

    console.log("Code Size: " + codeSize)
    console.log("Bundle Size: " + bundleSize)

    codeOffset = offset - 16 - bundleSize - codeSize
    bundleOffset = offset - 16 - bundleSize

    code = buf.slice(codeOffset, codeOffset + codeSize)

    resourceString = code.toString().split("\n")[0].replace("!(function () {process.__nexe =", "").trim().slice(0,-1)

    resources = JSON.parse(resourceString).resources

    for (const [key, value] of Object.entries(resources)) {
        resourcePath = key.trim().replaceAll(/^\.\//ig, "").replaceAll(/^\.\.\//ig, "")
        if (resourcePath.includes("node_modules") && args.ignoreNodeModules) {
            continue;
        }
                
        resourceOffset = bundleOffset + value[0]
        resource = buf.slice(resourceOffset, resourceOffset + value[1])
    
        resourcePath = path.join(path.parse(file)['name'], "/", resourcePath)
        resourceParsed = path.parse(resourcePath)

        fs.mkdirSync(resourceParsed['dir'], { recursive: true})
        
        fs.writeFileSync(resourcePath, resource, "binary")

        console.log("File: " + resourcePath)
    }
}

require('yargs').usage("$0 <file> [args]")
    .command(
        "$0 <file>",
        "Decompile nexe executable",
        (yargs) => {
            yargs.positional("file", {
                type: "string",
                describe: "File to decompile (include .exe extension)"
            })
            .option('ignore-node-modules', {
                alias: ['i'],
                type: 'boolean',
                default: false,
                describe: 'Ignore node modules folder',
            })
        },
        (args) => {
            main(args)
        }).argv
