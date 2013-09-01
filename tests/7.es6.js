/* test #7
 * testing how let-er works
 */

{ let a = function () {
    { let b = function () {
        { let c = function () {}; 
            c();
            { let c2 = function () {
                return 3;
            }; 
                c2()++;
            }
        }
    }; 
        b();
        { let b2 = function () {
            return 3;
        }; 
            b2()++;
        }
    }
}; 
    a();
    { let a2 = function () {
        { let a22 = function () {
            return 3;
        }; 
            return a22();
        }
    }; 
        return a2();
    }
}
