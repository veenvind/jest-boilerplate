
const {Parser} = require("acorn");
const walk = require("acorn-walk");
const stage3 = require('acorn-stage3');
var jsx = require("acorn-jsx");
const { extend } = require('acorn-jsx-walk');
const config = require("./config");
 
extend(walk.base);

walk.base.FieldDefinition = (node, st, c) => {
    return;
    c(node.value, st, "ArrowFunctionExpression")
}

let AST;
let funcList = [];
let importList = [];
let gFileObj;

function parse(fileObj) {
    gFileObj = fileObj;
    AST = Parser.extend(stage3).extend(jsx()).parse(fileObj.content, {sourceType: "module"});
    walkAST();
    return { fileObj: gFileObj, importList, funcList };
}

function walkAST() {
    walk.full(AST, (node, state, type) => {
        if(type === "ImportDeclaration") {
            importList.push(parseImport(node));
        } else if(type === "ExportNamedDeclaration") {
            parseExport(node)
        } else if(type === "ExportDefaultDeclaration") {
            gFileObj.defExport = true;
            parseExport(node, true)
        } else if(type === "ClassDeclaration") {
            gFileObj.hasClass = true;
            // parseClass(node);
        }
    });
}

function parseClass(node) {
    if(
        node.superClass &&
        node.superClass.name === "Component" ||
        node.superClass.name === "PureComponent" ||
        node.superClass.object.name === "React"
    ) {
        gFileObj.hasReactClass = true;
        node.body.body.forEach(memDef => {
            if(config.reactLifeCycleMethods.includes(memDef.key.name)) {
                return;
            }
            if(memDef.value.type === "FunctionExpression" || memDef.value.type === "ArrowFunctionExpression") {
                funcList.push(parseFunction(memDef.value, memDef.key.name));
            }
        });
        return;
    }
    node.body.body.forEach(memDef => {
        if(memDef.key.name == "constructor") {
            return;
        }
        if(memDef.value.type === "FunctionExpression" || memDef.value.type === "ArrowFunctionExpression") {
            funcList.push(parseFunction(memDef.value, memDef.key.name));
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

function parseExport(node, isDefault = false) {
    if(node.declaration.type === "FunctionDeclaration") {
        funcList.push(parseFunction(node.declaration));
    } else if(node.declaration.type === "VariableDeclaration") {
        node.declaration.declarations.map(varDecl => {
            if(varDecl.init.type === "ArrowFunctionExpression" || varDecl.init.type === "FunctionExpression") {
                funcList.push(parseFunction(varDecl.init, varDecl.id.name));
            }
        })
    } else if(node.declaration.type == "CallExpression") {
        if(node.declaration.callee.callee && node.declaration.callee.callee.name == 'connect') {
            gFileObj.useReduxConnect = true;
            gFileObj.exportComponentName = node.declaration.arguments[0].name;
            parseClass(AST.body
              .find(klass => klass.type === "ClassDeclaration" && klass.id.name === node.declaration.arguments[0].name));
        }
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
            let obj = null;
            if(node.callee.object && ["Object", "JSON"].includes(node.callee.object.name)) {
                return;
            }
            if(node.callee.object) {
                if(node.callee.object.type === "ThisExpression") {
                    obj = "this"
                } else {
                    obj = node.callee.object.name;
                }
            }
            callees.push({
                property: node.callee.name || node.callee.property && node.callee.property.name,
                object: obj,
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
        raw: gFileObj.content.substring(node.start, node.end),
        callees: parseCallees(node),
        branches: branchesCount,
    };

    return func;
}

module.exports = {
    parse
}