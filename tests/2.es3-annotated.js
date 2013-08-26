/* test #2
 * testing how let-er works
 */

try{throw /*baz*/2/*blah*/}catch
/*let*/ (/*foo*/a/*bar*/ /* = 2 */) {
try{throw /*and
			then
				some*/ 42 /*more*/}catch
/*let*/ (// fun
	b/*me*/ /* = 42 */) { // yay
	b *= a++;
}} // bam!
