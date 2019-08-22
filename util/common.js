const fs = require('fs');
const path = require('path');
const config = require('../config');


function getFileName(pathStr) {
    const filePath = path.resolve(pathStr);
    const name = path.parse(filePath).dir.split('/').pop() + ' ' + path.parse(filePath).name;

    return { filePath, name };
}

function readFile(pathStr) {
    // const name = path.basename(filePath).split('.').slice(0, -1).join('.');
    const filePath = path.resolve(pathStr);
    const name = path.parse(filePath).dir.split('/').pop() + ' ' + path.parse(filePath).name;
    return new Promise(function(resolve, reject) {
        fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
            if (!err) {
                resolve({name, data});
            } else {
                console.log(err);
                resolve('');
            }
        });
    });
    
}

function writeTestFile(filePath, content) {
    const fileName = path.basename(filePath).split('.').slice(0, -1).join('.') + ".test.js";
    const testFilePath = path.parse(filePath).dir +  "/" +fileName;
    fs.writeFile(testFilePath, content, function(err) {
        if(err) {
            return console.log(err);
        }    
    })
}

function trimMultiLine(text) {
    return text.replace(/\n[\ ]+\n/g, "\n\n").replace(/[\ ]+\n/g, "\n");
}

function indentMultiLine(text, indent) {
    indent = indent || config.indent;
    return trimMultiLine(indent + text.replace(/\n/g, '\n' + indent));
}

module.exports = {
    getFileName,
    readFile,
    writeTestFile,
    trimMultiLine,
    indentMultiLine
}