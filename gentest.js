const parser = require("./parser");
const util = require("./util/common");

let generateItListFunc;
let assertions = [];
let fileObj ;

function createFuncDescTemplate(func) {
    func.itList = (func.itList && func.itList.length) ? func.itList : [{params: []}];
    assertions[0] = `expect(${fileObj.name}.${func.name}).toEqual()`;
    
    const beforeEach = func.beforeEach && `\nbeforeEach(() => {\n${util.indentMultiLine(func.beforeEach)}\n});\n`;
    const afterEach = func.afterEach && `\nafterEach(() => {\n${util.indentMultiLine(func.afterEach)}\n});\n`;
    const itTemplList = func.itList.map(it => createItTemplate(it, func))
    const funcContent = beforeEach + afterEach + itTemplList;
    return `
describe("${func.name}", () => {
${util.indentMultiLine(funcContent)}
});\n`
}

function createItTemplate(it, func) {
    const name = it.name || "should ";
    const params = [...it.params, ...func.params];
    const assertion = assertions[it.assertionId || 0];

    return `it("${name}", () => {
${util.indentMultiLine(params.map(param => (`const ${param} = {};\n`)).join(''))}
${util.indentMultiLine(assertion)}
});\n`;
}

function createModuleDescTemplate(parsedFile) {
    const funcList = parsedFile.funcList
        .map(func => {func.itList = generateItListFunc(func); return func;})
        .map(func => {
            const { beforeEach, afterEach} = createBeforeAfterContent(func.callees);
            func.beforeEach = beforeEach;
            func.afterEach = afterEach;
            return func;
        })
        .map(func => createFuncDescTemplate(func))
        .map(func => util.indentMultiLine(func));

    let importList = generateImports(parsedFile.importList);

return `${importList}
  
describe("${fileObj.dirName} ${fileObj.name}", () => {
${funcList.join('')}
});`
}

function generateImports(importList) {
    importList.push({
        source: `'./${fileObj.name}'`,
        specifiers: `* as ${fileObj.name}`
    })
    return importList.map(imp => `import ${imp.specifiers} from ${imp.source};`).join('\n');
}

function createBeforeAfterContent(callees) {
    let beforeEach = '';
    let afterEach = '';
    callees.filter(callee => callee.object).forEach(callee => {
        
        if(callee.mockImplementation) {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}").mockImplementation(() => ());`;
        } else {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}");`;
        }
      
        afterEach += `${callee.property}Spy.mockRestore();`;
    })
    return {beforeEach, afterEach};
}

function generateTestFile(pathStr, generateItList, assertions) {
    fileObj = util.getFileName(pathStr);
    generateItListFunc = generateItList;
    assertions = assertions;
    util.readFile(pathStr)
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