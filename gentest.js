const parser = require("./parser");
const util = require("./util/common");

let generateItListFunc;

function createFuncDescTemplate(func) {
    console.log(func.callees);
    func.itList = (func.itList && func.itList.length) ? func.itList : [{params: []}];
    const beforeEach = func.beforeEach && `\nbeforeEach(() => {\n${indentMultiLine(func.beforeEach)}\n});\n`;
    const afterEach = func.afterEach && `\nafterEach(() => {\n${indentMultiLine(func.afterEach)}\n});\n`;
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
    const assertion = '';

    return `it("${name}", () => {
${util.indentMultiLine(params.map(param => (`const ${param} = {};\n`)).join(''))}
${util.indentMultiLine(assertion)}
});\n`;
}

function createModuleDescTemplate(parsedFile) {
    const funcList = parsedFile.funcList
        .map(func => {func.itList = generateItListFunc(func); return func;})
        .map(func => createFuncDescTemplate(func))
        .map(func => util.indentMultiLine(func));

    let importList = parseImports(parsedFile.importList);

return `${importList}
  
describe("${parsedFile.name}", () => {
${funcList.join('')}
});`
}

function parseImports(importList) {
    return '';
}

function createBeforeAfterContent(callees) {
    let beforeEach = '';
    let afterEach = '';
    callees.map(callee => {
        if(callee.mockImplementation) {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}").mockImplementation(() => {});`;
        } else {
            beforeEach += `${callee.property}Spy = jest.spyOn(${callee.object}, "${callee.property}");`;
        }
      
        afterEach += `${callee.property}Spy.mockRestore();`;
    })
    return callees.join('');
}

function generateTestFile(pathStr, generateItList, assertions) {
    generateItListFunc = generateItList;
    assertions = assertions;
    util.readFile(pathStr)
        .then(parser.parse)
        // .then(parsedFile => generateItListFunc(parsedFile.funcList))
        .then(createModuleDescTemplate)
        .then(str => console.log(str));
    //.then(util.writeTestFile.bind(null, filePath));
}

module.exports = {
    createFuncDescTemplate,
    createModuleDescTemplate,
    createItTemplate,
    createBeforeAfterContent,
    generateTestFile
}