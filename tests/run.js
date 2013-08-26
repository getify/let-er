/*! let-er test suite
    (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/


// filter the diff output a bit
function filterDiff(obj) {
	return JSON.stringify(
		obj,
		function(key,val){
			if (
				val == null ||
				(
					typeof val === "object" &&
					!Array.isArray(val) &&
					val.added == null && val.removed == null
				)
			) {
				return;
			}
			else {
				return val;
			}
		},
		"\t"
	);
}

var fs = require("fs"),
	path = require("path"),
	diff = require("diff"),

	test_dir = __dirname,
	test_files = fs.readdirSync(test_dir),

	letEr = require(path.resolve(test_dir,"../lib/let-er.js")),

	test_sources = [],

	test_tokens = [],
	test_AST = [],
	test_es3_annotated_js = [],
	test_es3_non_annotated_js = [],
	test_es6_js = [],

	suite_passed = true
;

// collect all the test file sources and results
test_files.forEach(function(file,idx){
	var match;

	if (match = file.match(/\b(\d+)\.js/)) {
		test_sources[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
	else if (match = file.match(/\b(\d+)\.tokens\.json/)) {
		test_tokens[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
	else if (match = file.match(/\b(\d+)\.ast\.json/)) {
		test_AST[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
	else if (match = file.match(/\b(\d+)\.es3-annotated\.js/)) {
		test_es3_annotated_js[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
	else if (match = file.match(/\b(\d+)\.es3-non-annotated\.js/)) {
		test_es3_non_annotated_js[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
	else if (match = file.match(/\b(\d+)\.es6\.js/)) {
		test_es6_js[Number(match[1])-1] = fs.readFileSync(
			path.join(test_dir,file),
			{ encoding: "utf8" }
		);
	}
});

console.log("Running test suite...");

// process the test suite
test_sources.forEach(function(source,idx){
	var res_tokens, res_AST, res_code, error, tokens, AST,
		checks = {}, controls = {}, i, passed = true,

		tokens_filename = (idx+1) + ".tokens.json",
		ast_filename = (idx+1) + ".ast.json",
		es3_annotated_filename = (idx+1) + ".es3-annotated.js",
		es3_non_annotated_filename = (idx+1) + ".es3-non-annotated.js",
		es6_filename = (idx+1) + ".es6.js"
	;

	// collect the controls (if any)
	if (test_tokens[idx]) {
		controls[tokens_filename] = test_tokens[idx].trim();
	}
	if (test_AST[idx]) {
		controls[ast_filename] = test_AST[idx].trim();
	}
	if (test_es3_annotated_js[idx]) {
		controls[es3_annotated_filename] = test_es3_annotated_js[idx];
	}
	if (test_es3_non_annotated_js[idx]) {
		controls[es3_non_annotated_filename] = test_es3_non_annotated_js[idx];
	}
	if (test_es6_js[idx]) {
		controls[es6_filename] = test_es6_js[idx];
	}

	// now, collect all the checks
	try {
		tokens = letEr.lex(source);
		AST = letEr.parse(tokens);

		res_tokens = "{\"tokens\":" + JSON.stringify(tokens,null,"    ");
		res_AST = "{\"AST\":" + JSON.stringify(AST,null,"    ");
	}
	catch (err) {
		if (!res_tokens || typeof res_tokens !== "string") {
			res_tokens = "{\"error\":\"" + err.toString().replace(/"/,"\\\"") + "\"";
		}
		else if (!res_AST || typeof res_AST !== "string") {
			res_AST = "{\"error\":\"" + err.toString().replace(/"/,"\\\"") + "\"";
		}

		if (err.stack) error = err.stack.toString();
		else error = err.toString();
	}

	// include any warnings
	if (letEr.warnings.length > 0) {
		res_tokens += ",\"warnings\":" + JSON.stringify(letEr.warnings,null,"    ");
	}

	if (res_tokens) {
		res_tokens += "}";
		res_tokens = JSON.stringify(JSON.parse(res_tokens),null,"    ");

		checks[tokens_filename] = res_tokens.trim();
	}
	if (res_AST) {
		res_AST += "}";
		res_AST = JSON.stringify(JSON.parse(res_AST),null,"    ");

		checks[ast_filename] = res_tokens.trim();
	}

	if (!error) {
		// es3-annotated
		letEr.opts.annotate = true;
		letEr.opts.es6 = false;
		try {
			res_code = letEr.generate(AST);
		}
		catch (err) {
			res_code = "/*\n" + err.toString() + "\n*/";

			if (err.stack) error = err.stack.toString();
			else error = err.toString();
		}

		checks[es3_annotated_filename] = res_code;
	}

	if (!error) {
		// es3-non-annotated
		letEr.opts.annotate = false;
		letEr.opts.es6 = false;
		try {
			res_code = letEr.generate(AST);
		}
		catch (err) {
			res_code = "/*\n" + err.toString() + "\n*/";

			if (err.stack) error = err.stack.toString();
			else error = err.toString();
		}

		checks[es3_non_annotated_filename] = res_code;
	}

	if (!error) {
		// es6
		letEr.opts.annotate = true;
		letEr.opts.es6 = true;
		try {
			res_code = letEr.generate(AST);
		}
		catch (err) {
			res_code = "/*\n" + err.toString() + "\n*/";

			if (err.stack) error = err.stack.toString();
			else error = err.toString();
		}

		checks[es6_filename] = res_code;
	}

	if (Object.keys(controls).length > 0) {
		// compare the checks to the controls
		for (i in controls) {
			if (controls[i] !== checks[i]) {
				console.log("Test #" + (idx+1) + " (" + i + "): failed");
				if (error) {
					console.log(error);
				}
				else {
					console.log(
						filterDiff(
							diff.diffLines(controls[i],checks[i])
						)
					);
				}
				passed = false;
				break;
			}
		}

		if (passed) {
			console.log("Test #" + (idx+1) + ": passed");
		}
		else {
			suite_passed = false;
		}
	}
	else {
		console.log("Test #" + (idx+1) + ": skipped, results recorded");

		for (i in checks) {
			fs.writeFileSync(
				path.join(test_dir,i),
				checks[i],
				{ encoding: "utf8" }
			);
		}
	}

});

if (suite_passed) {
	console.log("Test suite passed!");
}
else {
	console.log("Test(s) failed.");
	process.exit(1);
}
