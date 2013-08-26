/* test #4
 * testing how let-er works
 */

try{throw /*myfunc*/function(g){
		try{throw g}catch
/*let*/ (c /* = g */) {
try{throw void 0}catch
/*let*/ (d) {
			d = c * 2;
			try{throw void 0}catch
/*let*/ (f/* just a random*/) {
				f = d + c;
				console.log(f);
			}
		}}
	}}catch
/*let*/ (b /* = function(g){ 		let (... */) {
try{throw 3.14}catch
/*let*/ (e /* = 3.14 */) {
	e++; // sure, why not increment Pi?
	try{throw b(e * 3)}catch
/*let*/ (h /* = b(e * 3) */) {
		try{throw h - 1}catch
/*let*/ (j /* = h - 1 */) {
			h *= j;
		}
		console.log(h);
	}
}}
