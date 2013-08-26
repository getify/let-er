/* test #4
 * testing how let-er works
 */

try{throw /*myfunc*/function(g){
		try{throw g}catch(c){try{throw void 0}catch(d){
			d = c * 2;
			try{throw void 0}catch(f/* just a random*/){
				f = d + c;
				console.log(f);
			}
		}}
	}}catch(b){try{throw 3.14}catch(e){
	e++; // sure, why not increment Pi?
	try{throw b(e * 3)}catch(h){
		try{throw h - 1}catch(j){
			h *= j;
		}
		console.log(h);
	}
}}
