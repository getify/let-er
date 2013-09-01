/* test #2
 * testing how let-er works
 */

try{throw /*baz*/2/*blah*/}catch
/*let*/ /*kept*/(/*foo*/a/*bar*/ /* = 2 */) /*kept*/ {
try{throw /*and
			then
				some*/ 42 /*more*/}catch
/*let*/ /*kept*/(// fun
	b/*me*/ /* = 42 */) /*kept*/ { // yay
	b *= a++;
}} // bam!

try{throw function () {
	try{throw void 0}catch
/*let*/ /*baz*/ (b) /*bam*/ {
		try{throw void 0}catch
/*let*/ /*fun*/ (c) /*fam*/ {
			c;
		}
	}
}}catch
/*let*/ /*foo*/ (a /* = function () { let (.... */) /*bar*/ {
	try{throw void 0}catch
/*let*/ /*boo*/ (d) /*bim*/ {
		d;
	}
}
