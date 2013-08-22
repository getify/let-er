# let-er

ES6 is bringing the `let x = "foo"` syntax to JavaScript, which basically hijacks any block and scopes your declaration to that block (instead of hoisting to the containing function as in ES5 and below).

**Two problems, however:**

1. ES6 is a long time from being fully ubiquitous.
2. And even when ES6 arrives, the more preferable `let ( .. ) { .. }` block syntax was rejected and so won't be valid. This is most unfortunate, since that syntax has a more readable form, creating explicit blocks for block-scoping instead of hijacking them.

*let-er* solves both these problems. By simply writing `let ( .. ) { .. }` style code, and then running your code through *let-er* as a build-step, your block-scoping will work exactly as you expect, **today**, in all ES3+ browsers and environments!

## ES6 Only?
If you're already targeting an ES6-only environment (like node.js for instance), *let-er* is still very helpful. By using the `es6` [option setting](#options), `let ( .. ) { .. }` style code (which is not valid ES6) will be transpiled into valid ES6 code like `{ let .. ; .. }`.

## What does it look like?

```js
let (x = "foo") {
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

**NOTE:** *let-er* does **not** touch `let ...` declaration syntax (similar to `var ...`), only the (more preferable and more readable) `let ( .. ) { .. }` statement syntax. If you use `let ...` declarations, *let-er* will simply skip over them.

## How does it work?

*let-er* will transform your `let ( .. ) { .. }` style blocks into this type of ES3-compatible code:

```js
try{throw "foo"}catch
/*let*/ (x /* = "foo" */) {
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

**NOTE:** By default, shown here are the extra comment annotations to make the transpiled code a bit more readable. You can suppress these default comment annotations with the `annotate` [option setting](#options), in which case the code produced would be:

```js
try{throw "foo"}catch(x){
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

And the ES6-only version of the transpiled code would be:

```js
{ let x = "foo";
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

### Multiple let-declarations
Multiple let-declarations are supported:

```js
let (x = "foo", y = "bar") {
  console.log(x, y); // "foo" "bar"
}

console.log(x, y); // Reference Error!
```

The transpiled code will look like this:

```js
try{throw "foo"}catch
/*let*/ (x /* = "foo" */) {
try{throw "bar"}catch
/*let*/ (y /* = "bar" */) {
  console.log(x, y); // "foo" "bar"
}}

console.log(x, y); // Reference Error!
```

Or, without annotations:

```js
try{throw "foo"}catch(x){try{throw "bar"}catch(y){
  console.log(x, y); // "foo" "bar"
}}

console.log(x, y); // Reference Error!
```

And in ES6-only mode:

```js
{ let x = "foo", y = "bar";
  console.log(x, y); // "foo" "bar"
}

console.log(x, y); // Reference Error!
```

## Usage
Use *let-er* like this:

```js
letEr.compile('let(x="foo"){console.log(x);}');
```

## Options
There are two options you can set that control the type of code produced by *let-er*.

* `letEr.opts.es6` (boolean; default: `false`) - If set to `true`, will assume ES6 where `let` is available, and create an ES6 `{ let x = "foo"; .. }` block instead of the default `try{throw "foo"}catch(x){ .. }` ES3-compatible snippet.

* `letEr.opts.annotate` (boolean; default: `true`) - If set to `true`, will output additional code comments (as shown in the above example snippets) to annotate to make the compiled code more readable/trackable to the original code. Otherwise, only the bare minimum code will be output.

   **NOTE:** No extra annotations are needed if `letEr.opts.es6` is set, so this option will not have any effect.

## Warnings
If there are any warnings/notices produced as part of the lexing or `let` processing, they will be populated in the `letEr.warnings` array.

## License

This is all MIT licensed. Enjoy.
