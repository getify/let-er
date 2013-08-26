/* test #4
 * testing how let-er works
 */

let (b =
	/*myfunc*/function(g){
		let (c = g, d) {
			d = c * 2;
			let (f/* just a random*/) {
				f = d + c;
				console.log(f);
			}
		}
	},
	e = 3.14
) {
	e++; // sure, why not increment Pi?
	let (h = b(e * 3)) {
		let (j = h - 1) {
			h *= j;
		}
		console.log(h);
	}
}
