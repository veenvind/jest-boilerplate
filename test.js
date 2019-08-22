const {Parser} = require("acorn");
const walk = require("acorn-walk");
const stage3 = require('acorn-stage3');
const jsx = require("acorn-jsx");
const util = require("./util");

function parse(code) {
    return Parser.extend(stage3).extend(jsx()).parse(code, {sourceType: "module"});
}

function ancestorWalk(AST) {
    // console.log(AST.body[0].body[0].body.expression.body.body[0]);
    walk.full(AST, (...arguments) => {
        console.log(arguments[0]);
    })
}

function test() {
    var code = `import * as React from 'react'`;
    ancestorWalk(parse(code));
}

test();