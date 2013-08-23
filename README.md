# let-er
ES6 is bringing the `let x = "foo"` syntax to JavaScript, which basically hijacks any block and scopes your declaration to that block (instead of hoisting to the containing function as in ES5 and below).

**Two problems, however:**

1. ES6 is a long time from being fully ubiquitous.
2. And even when ES6 arrives, the more preferable `let ( .. ) { .. }` block syntax was rejected and so won't be valid. This is most unfortunate, since that syntax has a more readable form, creating explicit blocks for block-scoping instead of hijacking them.

*let-er* solves both these problems. By simply writing `let ( .. ) { .. }` style code, and then running your code through *let-er* as a build-step, your block-scoping will work exactly as you expect, **today**, in all ES3+ browsers and environments!

## ES6 Only?
If you're already targeting an ES6-only environment (like node.js for instance), *let-er* is still very helpful. By using the `es6` [option setting](#options), `let ( .. ) { .. }` style code (which is not valid ES6) will be transpiled into valid ES6 code like `{ let .. ; .. }`.

## What does it look like?

Write block-scoped code like this:

```js
let (x = "foo") {
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

**NOTE:** *let-er* does **not** touch `let ..;` declaration syntax (similar to `var ..;`), only the (more preferable and more readable) `let ( .. ) { .. }` statement syntax. If you use `let ..;` declarations, *let-er* will simply skip over them.

## How does it work?
*let-er* will, by default, transform your `let ( .. ) { .. }` style blocks into this type of ES3-compatible code:

```js
try{throw "foo"}catch
/*let*/ (x /* = "foo" */) {
  console.log(x); // "foo"
}

console.log(x); // Reference Error!
```

A bit hacky? Sure. But it works. And you get to write nice, maintable code with the benefits of block-scoping. Who cares what the transpiled code looks like, right? :)

**NOTE:** By default, shown here are the extra comment annotations to make the transpiled code a bit more readable. You can suppress these default comment annotations with the `annotate` [option setting](#options), in which case the ES3+ code produced would be:

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

The ES3+ transpiled code will look like this:

```js
try{throw "foo"}catch
/*let*/ (x /* = "foo" */) {
try{throw "bar"}catch
/*let*/ (y /* = "bar" */) {
  console.log(x, y); // "foo" "bar"
}}

console.log(x, y); // Reference Error!
```

Or, ES3+ without annotations:

```js
try{throw "foo"}catch(x){try{throw "bar"}catch(y){
  console.log(x, y); // "foo" "bar"
}}

console.log(x, y); // Reference Error!
```

And in ES6-only targeting mode:

```js
{ let x = "foo", y = "bar";
  console.log(x, y); // "foo" "bar"
}

console.log(x, y); // Reference Error!
```

## Performance
You may be wondering if there's some crazy performance hit to the ES3 `try / catch` hack. So, here's several thoughts to address that concern:

1. Comparing block-scoped code to non-block-scoped code performance-wise wouldn't really tell you what you might expect. You might intuitively be wondering if the performance hit is small enough (or zero!) so that you can use block-scoping "for free". It **certainly is not**.

   Either you need/want block-scoping, or you don't. But asking if using block-scoping is poorer performance than not using block-scoping is not a terribly useful question. The merits of the block-scoping functionality are the important question.

2. A fairer comparison, though still skewed, is comparing different approaches for getting "block scoping". The main alternative to the `try / catch` hack which *let-er* uses is the IIFE (creating an inline, auto-executing function to get an extra function scope block where you want block-scoping). So, you *can* examine [how `try / catch` compares to IIFE](http://jsperf.com/block-scope-iife-vs-catch).

   As you'll see there, `try / catch` is about 10-20% slower on average than an IIFE. This may seem like the nail in the coffin for this approach. However, there's ***a major caveat to using an IIFE***. It has some significant side-effects.

   Namely, the value of `this`, the meaning of `return` `break` `continue`, and other such things, are very different inside an IIFE, whereas these things are not affected by wrapping a `catch(..) { .. }` block around any arbitrary code.

   So, even the IIFE vs. `try / catch` isn't a totally fair comparison, but it's close enough to be relevant. It does show that the `try / catch` hack isn't orders of magnitude worse or anything crazy like that. It's a bit worse than an IIFE, but in exchange you get truer block-scoping that is less intrusive/destructive to the code.

3. This transpiling to ES3 via `try / catch` is an admitted polyfill. Polyfills almost always have worse performance than their newer native counterparts. ES6 is giving us the `let` keyword for real block-scoping, and it certainly will be faster than the polyfill hack.

   Fortunately, *let-er* lets you [target ES6 only](#options) code if you happen to only care about ES6 environments (node.js for instance). As you can see above, the ES6-only targeting transpiles to usage of the native `let ..;` declaration syntax, which should have all the best native performance you can get.

   This makes it more "future proof" to use *let-er* now, in ES3 polyfill mode, and you'll be able to transparently flip the switch to ES6-only targeting whenever that's appropriate to do so.

4. If you still doubt the veracity of using the `try / catch` hack for ES3 block-scoping, note that [Google Traceur ES6 Transpiler](https://github.com/google/traceur-compiler) uses the same hack.

   Here's a [demo to try it out](http://traceur-compiler.googlecode.com/git/demo/repl.html#if%20%28true%29%20{%0A%20%20let%20x%20%3D%202%3B%0A%20%20console.log%28x%29%3B%20%2F%2F%202%0A}). **Note:** you will need to turn on "Options" -> "Show all options" -> "blockBinding" for it to work.

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
The code and all the documentation are released under the MIT license.

http://getify.mit-license.org/
