#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indent = '  ';

function stitchItTemplate(actionName) {
  return `
it("should handle action - ${actionName}", () => {
  const state = {};
  const finalState = {};
  const action = {
    type: actions.${actionName}
  };
  expect(reducers(state, action)).toEqual(finalState);
});
`;
}

function findActions(text) {
  try {
    return (text.match(/case (actions\.)?([^:]*):/g)||[]).map(str => {
        if(str.match("actions.")){
            return (str.match(/\.([^:]*):/)|| ['', ''])[1];
        } 
        else {
            return (str.match(/case ([^:]*):/)|| ['', ''])[1];
        }
    })
  } catch(e) {
      console.log("***** Cant parse actions from reducer file *****");
      console.log(e);
      return [];
  }
}

function parseReducerLogic(text) {
    const actions = {};

    text = text.replace(/(\ )*\.\.\.state(\ )*,(\ )*\n/,'');
    const reducerCases = text.split("case");

    return reducerCases.map(reducerCase => {
        const actionName = (reducerCase.match(/^ actions\.([^:]*):/) || ['', ''])[1];
        const finalState = "const finalState =" + reducerCase.substring(reducerCase.indexOf("return") + 6);
    });
}

function indentMultiLine(text) {
  return indent + text.replace(/\n/g, '\n' + indent);
}

function createModuleDescTemplate(fileContent) {
  const itsList = findActions(fileContent.data).map(action => indentMultiLine(stitchItTemplate(action))).join('');

  return `import reducers from './reducers';
import * as actions from './actions';
  
const defaultState = {};

describe("${fileContent.name}", () => {
  it("should return default state when no state is provided and no action matches", () => {
    expect(reducers(undefined, {type: "__SAMPLE_ACTION"})).toEqual(defaultState);
  });

  it("should return same state when no action is matched", () => {
    expect(reducers({}, {type: "__SAMPLE_ACTION"})).toEqual({});
  });
  ${itsList}
});`
}

function readFile(filePath) {
    // const name = path.basename(filePath).split('.').slice(0, -1).join('.');
    const name = path.parse(filePath).dir.split('/').pop() + path.parse(filePath).name;
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

function createReducerTestFile(pathStr) {
    const filePath = path.resolve(pathStr);
    readFile(filePath).then(createModuleDescTemplate).then(writeTestFile.bind(null, filePath));
}


createReducerTestFile(process.argv[2]);
