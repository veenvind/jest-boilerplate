const fs = require('fs');
const path = require('path');
const config = require('./config');
const {Parser} = require("acorn");
const walk = require("acorn-walk");
const stage3 = require('acorn-stage3');
var jsx = require("acorn-jsx");

function readFile(filePath) {
    // const name = path.basename(filePath).split('.').slice(0, -1).join('.');
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

function parseImports(fileContent) {
    const AST = Parser.extend(stage3).extend(jsx()).parse(fileContent, {sourceType: "module"});
    const importList = [];
    walk.full(AST, (node, state, type) => {
        if(type === "ImportDeclaration") {
            importList.push(`import * as ${node.source.value.split('/').pop()} from ${node.source.raw};\n`);
        }
    });
    return trimMultiLine(fileContent.match(/import (.*) from (.*)\n/g).join(''));
}

function countBranches(code) {
    let count = 0;
    walk.full(Parser.extend(stage3).extend(jsx()).parse(code), (node, state, type) => {
        if(type === "IfStatement" || type === "ConditionalExpression") {
            count +=1;
        }
    });
    return count;
}

function parseFunctions(fileContent) {
    const funcList = [];
    const AST = Parser.extend(stage3).extend(jsx()).parse(fileContent, {sourceType: "module"});
    // console.log(AST.body[5].declaration.body.body[1]);
    walk.full(AST, (node, state, type) => {
        if(type === "FunctionDeclaration") {
            const branchesCount = countBranches(fileContent.substring(node.start, node.end));
            funcList.push({
                name: node.id.name,
                callName: node.id.name,
                params: node.params.map(param => (param.name || param.left.name)),
                start: node.start,
                end: node.end,
                raw: fileContent.substring(node.start, node.end),
                beforeEach: '',
                afterEach: '',
                assertion: '',
                spy: '',
                branches: branchesCount,
                globalVars: []
            });
        }
    });
    return funcList;

    // console.log(AST.body);
    // old custom parsing logic
    // return fileContent.match(/function ([^(]*)\(([^)]*)\) ?{/g).map(funcDef => {
    //     const parsed = funcDef.match(/function ([^(]*)\(([^)]*)\) ?{/);
    //     return {
    //         name: parsed[1],
    //         params: parsed[2].split(",").map(par => par.trim())
    //     }
    // });
}

function createFuncDescTemplate(func) {
    func.itList = func.itList.length ? func.itList : [{}];
    const beforeEach = func.beforeEach && `\nbeforeEach(() => {\n${indentMultiLine(func.beforeEach)}\n});\n`;
    const afterEach = func.afterEach && `\nafterEach(() => {\n${indentMultiLine(func.afterEach)}\n});\n`
    return `
describe("${func.name}", () => {
${indentMultiLine(func.globalVars.join(''))}${indentMultiLine(beforeEach)}${indentMultiLine(afterEach)}
${func.itList.map(it => createItTemplate(it.name, func.params, func.assertion)).map(temp => indentMultiLine(temp)).join('')}
});\n`
}

function createItTemplate(name = "should ", params = [], assertion = '') {
    return `it("${name}", () => {
${indentMultiLine(params.map(param => (`const ${param} = {};\n`)).join(''))}
${indentMultiLine(assertion)}
});`;
}

module.exports = {
    readFile,
    writeTestFile,
    indentMultiLine,
    parseImports,
    parseFunctions,
    createFuncDescTemplate
}