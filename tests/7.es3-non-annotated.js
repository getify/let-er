/* test #7
 * testing how let-er works
 */

try{throw function () {
    try{throw function () {
        try{throw function () {}}catch (c) {
            c();
            try{throw function () {
                return 3;
            }}catch (c2) {
                c2()++;
            }
        }
    }}catch (b) {
        b();
        try{throw function () {
            return 3;
        }}catch (b2) {
            b2()++;
        }
    }
}}catch (a) {
    a();
    try{throw function () {
        try{throw function () {
            return 3;
        }}catch (a22) {
            return a22();
        }
    }}catch (a2) {
        return a2();
    }
}
