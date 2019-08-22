
const {Parser} = require("acorn");
const walk = require("acorn-walk");
const stage3 = require('acorn-stage3');
var jsx = require("acorn-jsx");

let AST;
let funcList = [];
let importList = [];
let fileContent = '';

function parse(str) {
    fileContent = str.data;
    console.log("parsing");
    AST = Parser.extend(stage3).extend(jsx()).parse(fileContent, {sourceType: "module"});
    console.log("parsing done");
    walkAST();
    return { importList, funcList };
}

function walkAST() {
    walk.full(AST, (node, state, type) => {
        if(type === "ImportDeclaration") {
            importList.push(parseImport(node));
        } else if(type === "ExportNamedDeclaration") {
            parseExport(node)
        }
    });
}

function parseImport(node) {
    return node;
}

function parseExport(node) {
    if(node.declaration.type === "FunctionDeclaration") {
        funcList.push(parseFunction(node.declaration));
    } else if(node.declaration.type === "VariableDeclaration") {
        node.declaration.declarations.map(varDecl => {
            if(varDecl.init.type === "ArrowFunctionExpression" || varDecl.init.type === "FunctionExpression") {
                funcList.push(parseFunction(varDecl.init, varDecl.id.name));
            }
        })
    }
}

function countBranches(node) {
    let count = 0;
    walk.full(node, (node, state, type) => {
        if(type === "IfStatement" || type === "ConditionalExpression" || type === "LogicalExpression") {
            count +=1;
        }
    });
    return count;
}

function parseCallees(node) {
    let callees = [];
    walk.full(node, (node, state, type) => {
        if(type === "CallExpression") {
            callees.push({
                property: node.callee.name,
                object: node.callee.object
            });
        }
    });

    return callees;
}

function parseFunction(node, name) {
    const branchesCount = countBranches(node);
    func = {
        node: node,
        name: name || node.id.name,
        params: node.params.map(param => (param.name || param.left.name)),
        raw: fileContent.substring(node.start, node.end),
        callees: parseCallees(node),
        branches: branchesCount,
    };

    return func;
}

module.exports = {
    parse
}