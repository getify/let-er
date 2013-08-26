/* test #3
 * testing how let-er works
 */

try{throw (a['foo'] * 2, a == 8)}catch
/*let*/ (b /* = (a['foo'] * 2, a == ... */) {
try{throw void 0}catch
/*let*/ (c) {
try{throw /3*/ig}catch
/*let*/ (d /* = /3*\/ig */) {
	console.log(b);
}}}
