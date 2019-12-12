const parser = require("./parser");
const util = require("./util/common");

let generateItListFunc;
let assertions = [];
let fileObj ;

const reactImports = [
    {
        specifiers: 'React',
        source: 'react'
    },
    {
        specifiers: '{ shallow }',
        source: 'enzyme'
    }
]

function createFuncDescTemplate(func) {
    assertions[0] = `expect(${fileObj.importName}.${func.name}(${func.params.join(', ')})).toEqual();`;

    if(fileObj.defExport) {
        assertions[0] = `expect(${fileObj.importName}(${func.params.join(', ')})).toEqual();`;
    }
    
    const beforeEach = func.beforeEach && `\nbeforeEach(() => {\n${util.indentMultiLine(func.beforeEach)}\n});\n`;
    const afterEach = func.afterEach && `\nafterEach(() => {\n${util.indentMultiLine(func.afterEach)}\n});\n\n`;
    const itTemplList = [];

    for(let i=0; i <= func.branches; i++ ) {
        itTemplList.push(createItTemplate((func.itList && func.itList[i]) || {name: "should return correctly"}, func));
    }
    const funcContent = func.globalVars + "\n" + beforeEach + afterEach + util.trimMultiLine(itTemplList.join(''));
    return `
describe("${func.name}", () => {
${util.indentMultiLine(funcContent)}
});\n`
}

function createItTemplate(it, func) {
    const name = it.name || "should ";
    const params = [...func.params];
    const assertion = assertions[it.assertionId || 0];

    if(it.params) {
        params.push(...it.params);
    }

    return `it("${name}", () => {
${util.indentMultiLine(params.map(param => (`const ${param} = {};\n`)).join(''))}
${util.indentMultiLine(assertion)}
});\n`;
}

function createModuleDescTemplate(parsedFile) {
    fileObj = parsedFile.fileObj;
    let importList = !fileObj.hasReactClass ? generateImports(parsedFile.importList)
        : generateImports(reactImports);

    const funcList = parsedFile.funcList
        .map(func => {func.itList = generateItListFunc(func); return func;})
        .map(func => {
            const { beforeEach, afterEach, globalVars } = createBeforeAfterContent(func.callees);
            func.beforeEach = beforeEach;
            func.afterEach = afterEach;
            func.globalVars = globalVars;
            return func;
        })
        .map(func => createFuncDescTemplate(func))
        .map(func => util.indentMultiLine(func));
    
    const moduleName = fileObj.exportComponentName ? `${fileObj.exportComponentName} component` :
        `${fileObj.dirName} ${fileObj.name}`;

return `${importList}
  
describe("${moduleName}", () => {
${funcList.join('')}
});`
}

function generateImports(importList) {
    fileObj.importName = fileObj.exportComponentName || `${fileObj.dirName}${fileObj.name}`;
    importList.push({
        source: `'./${fileObj.name}'`,
        specifiers: `${fileObj.defExport ? "" : "* as "}${fileObj.importName}`
    })
    return importList.map(imp => `import ${imp.specifiers} from ${imp.source};`).join('\n');
}

function createBeforeAfterContent(callees) {
    let beforeEach = '';
    let afterEach = '';
    let globalVars = '';
    callees.filter(callee => callee.object).forEach(callee => {
        if(callee.object === "this") {
            callee.object = fileObj.importName;
        }
        globalVars += `let ${callee.property}Spy;\n`;
        if(callee.mockImplementation) {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}").mockImplementation(() => ("TEST"));\n`;
        } else {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}");\n`;
        }
        afterEach += `${callee.property}Spy.mockRestore();\n`;
    })
    return {
        beforeEach: util.trimMultiLine(beforeEach),
        afterEach: util.trimMultiLine(afterEach),
        globalVars: util.trimMultiLine(globalVars)
    };
}

function generateTestFile(pathStr, generateItList, assertions) {
    fileObj = util.getFileName(pathStr);
    generateItListFunc = generateItList;
    assertions = assertions;
    util.readFile(fileObj)
        .then(parser.parse)
        .then(createModuleDescTemplate)
        .then(util.writeTestFile.bind(null, fileObj.fullDir + "/" + fileObj.name + '.test.js'));
}

module.exports = {
    createFuncDescTemplate,
    createModuleDescTemplate,
    createItTemplate,
    generateTestFile
}