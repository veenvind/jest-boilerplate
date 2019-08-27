const fs = require('fs');
const path = require('path');
const config = require('../config');


function getFileName(pathStr) {
    const filePath = path.resolve(pathStr);

    return {
        filePath, 
        name: path.parse(filePath).name,
        dirName: path.parse(filePath).dir.split('/').pop(),
        fullDir: path.parse(filePath).dir
    };
}

function readFile(pathStr) {
    const filePath = path.resolve(pathStr);
    const name = path.parse(filePath).dir.split('/').pop() + ' ' + path.parse(filePath).name;
    return new Promise(function(resolve, reject) {
        fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
            if (!err) {
                resolve({name, content: data});
            } else {
                console.log(err);
                resolve('');
            }
        });
    });
    
}

function writeTestFile(fileName, content) {
    fs.writeFile(fileName, content, function(err) {
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