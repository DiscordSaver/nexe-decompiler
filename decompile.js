#!/usr/bin/env node
const path = require('path'),
    fs = require('fs'),
    upath = require('upath');

function main(args) {
    file = path.resolve(args.file)

    try {
        buf = fs.readFileSync(file)
    } catch (err) {
        console.log("Could not open file '" + file + "'")
        return
    }

    fileSize = buf.length

    // Check if it's a nexe file
    nexeSentinel = buf.slice(fileSize - 32, fileSize - 16).toString()
    
    if (nexeSentinel != '<nexe~~sentinel>') {
        console.log("File is not a portale nexe executable.")
        return
    }

    sentinel = buf.slice(fileSize-16, fileSize)
    codeSize = sentinel.readDoubleLE(0)
    bundleSize = sentinel.readDoubleLE(8)

    console.log("File Size: " + buf.length)
    console.log("Code Size: " + codeSize)
    console.log("Bundle Size: " + bundleSize)
    console.log(typeof codeSize)
    console.log(typeof bundleSize)

    codeOffset = fileSize - codeSize - bundleSize - 16 - 16
    bundleOffset = fileSize - bundleSize - 16 - 16

    console.log("Code Offset: " + codeOffset)
    console.log("Bundle Offset: " + bundleOffset)

    code = buf.slice(codeOffset, codeOffset + codeSize)

    resourceString = code.toString().match(/process\.__nexe = (.*);\n/i)[1]

    resources = JSON.parse(resourceString).resources
    
    for (const [key, value] of Object.entries(resources)) {
        resourcePath = upath.normalize(upath.toUnix(key))
        if (resourcePath.includes("node_modules") && args.ignoreNodeModules) {
            continue;
        }

        resourceOffset = bundleOffset + value[0]
        resource = buf.slice(resourceOffset, resourceOffset + value[1])
    
        resourcePath = path.join(path.parse(file)['name']+"_extracted", "/", resourcePath)
        resourceParsed = path.parse(resourcePath)

        fs.mkdirSync(resourceParsed['dir'], { recursive: true})
        
        fs.writeFileSync(resourcePath, resource, "binary")

	process.stdout.write(".")
        //console.log("File: " + resourcePath)
    }
    process.stdout.write("\n")

    entry = code.toString().match(/const entry = path\.resolve\(path\.dirname\(process\.execPath\),"(\S*.js)"\)/i)[1]
    console.log("Entry Point: "+upath.normalize(path.join(path.parse(file)['name']+"_extracted",upath.toUnix(entry))))
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
