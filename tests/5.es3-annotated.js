/* test #5
 * testing how let-er works
 */

try{throw void 0}catch
/*let*/ (a) {
try{throw void 0}catch
/*let*/ (b) {
	let c = 3;
	try{throw void 0}catch
/*let*/ (d) { d++; }
	let (e) foo({f:e});
	let (g=){g++}
}}