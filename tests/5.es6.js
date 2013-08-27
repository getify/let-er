/* test #5
 * testing how let-er works
 */

{ let a, b;
	let c = 3;
	{ let d; d++; }
	let (e) foo({f:e});
	let (g=){g++}
}