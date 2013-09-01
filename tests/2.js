/* test #2
 * testing how let-er works
 */

let /*kept*/(/*foo*/a/*bar*/=/*baz*/2/*blah*/ , // fun
	b/*me*/ =
		/*and
			then
				some*/ 42 /*more*/  ) /*kept*/ { // yay
	b *= a++;
} // bam!

let /*foo*/ (a = function () {
	let /*baz*/ (b) /*bam*/ {
		let /*fun*/ (c) /*fam*/ {
			c;
		}
	}
}) /*bar*/ {
	let /*boo*/ (d) /*bim*/ {
		d;
	}
}
