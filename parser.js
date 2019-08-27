
const {Parser} = require("acorn");
const walk = require("acorn-walk");
const stage3 = require('acorn-stage3');
var jsx = require("acorn-jsx");

let AST;
let funcList = [];
let importList = [];
let fileContent = '';

function parse(fileObj) {
    fileContent = fileObj.content;
    AST = Parser.extend(stage3).extend(jsx()).parse(fileContent, {sourceType: "module"});
    walkAST();
    return { name: fileObj.name, importList, funcList };
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
    let specifiers = node.specifiers[0].local.name;
    if(node.specifiers[0].type === "ImportNamespaceSpecifier") {
        specifiers = `* as ${node.specifiers[0].local.name}`;
    } else if(node.specifiers[0].type === "ImportSpecifier"){
        const ind = []
        node.specifiers.forEach(spec => ind.push(spec.local.name));
        specifiers = `{ ${ind.join(', ')} }`;
    }
    return {
        source: node.source.raw,
        specifiers
    }
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
                property: node.callee.name || node.callee.property.name,
                object: node.callee.object ? node.callee.object.name : null,
                args: node.arguments,
                mockImplementation: true
            });
        }
    });

    return callees;
}

function parseFunction(node, name = '') {
    const branchesCount = countBranches(node);
    func = {
        node: node,
        name: (node.id && node.id.name) || name,
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