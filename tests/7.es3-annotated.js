/* test #7
 * testing how let-er works
 */

try{throw function () {
    try{throw function () {
        try{throw function () {}}catch
/*let*/ (c /* = function () {} */) {
            c();
            try{throw function () {
                return 3;
            }}catch
/*let*/ (c2 /* = function () { return */) {
                c2()++;
            }
        }
    }}catch
/*let*/ (b /* = function () { let (.... */) {
        b();
        try{throw function () {
            return 3;
        }}catch
/*let*/ (b2 /* = function () { return */) {
            b2()++;
        }
    }
}}catch
/*let*/ (a /* = function () { let (.... */) {
    a();
    try{throw function () {
        try{throw function () {
            return 3;
        }}catch
/*let*/ (a22 /* = function () { return */) {
            return a22();
        }
    }}catch
/*let*/ (a2 /* = function () { let (.... */) {
        return a2();
    }
}
