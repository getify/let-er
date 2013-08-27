/* test #5
 * testing how let-er works
 */

try{throw void 0}catch(a){try{throw void 0}catch(b){
	let c = 3;
	try{throw void 0}catch(d){ d++; }
	let (e) foo({f:e});
	let (g=){g++}
}}