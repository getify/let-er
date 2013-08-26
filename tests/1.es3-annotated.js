/* test #1
 * testing how let-er works
 */

try{throw 1}catch
/*let*/ (a /* = 1 */) {
try{throw 2}catch
/*let*/ (b /* = 2 */) {
	console.log(a, b);
}}
