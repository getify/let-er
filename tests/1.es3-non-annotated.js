/* test #1
 * testing how let-er works
 */

try{throw 1}catch (a) {try{throw 2}catch (b) {
	console.log(a, b);
}}
