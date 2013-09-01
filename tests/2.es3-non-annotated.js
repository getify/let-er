/* test #2
 * testing how let-er works
 */

try{throw /*baz*/2/*blah*/}catch /*kept*/(/*foo*/a/*bar*/) /*kept*/ {try{throw /*and
			then
				some*/ 42 /*more*/}catch /*kept*/(// fun
	b/*me*/) /*kept*/ { // yay
	b *= a++;
}} // bam!

try{throw function () {
	try{throw void 0}catch /*baz*/ (b) /*bam*/ {
		try{throw void 0}catch /*fun*/ (c) /*fam*/ {
			c;
		}
	}
}}catch /*foo*/ (a) /*bar*/ {
	try{throw void 0}catch /*boo*/ (d) /*bim*/ {
		d;
	}
}
