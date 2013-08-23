/*! let-er
    v0.1.0-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition) {
	if (typeof module != "undefined" && module.exports) module.exports = definition();
	else if (typeof define == "function" && define.amd) define(definition);
	else context[name] = definition();
})("letEr",this,function definition(name,context) {

	function trim(str) {
		return str.replace(/^\s+/g,"").replace(/\s+$/g,"");
	}

	function combineGeneralTokens(tokens) {
		var start, end, i, j;

		for (i=0; i<tokens.length; i++) {
			if (tokens[i].type === TOKEN_GENERAL_TEXT) {
				start = end = i;
				for (j=start+1; j<tokens.length; j++) {
					end = j;
					if (tokens[j].type !== TOKEN_GENERAL_TEXT) {
						end = j-1;
						break;
					}
				}
				if (end > start) {
					for (j=start+1; j<=end; j++) {
						tokens[start].val += tokens[j].val;
					}
					tokens.splice(start+1,end-start);
				}
				else i = j;
			}
		}

		return tokens;
	}

	function lex(code) {

		function abandonLetCandidate() {
			var let_text = "", old_state;

			// walk back and find the current state's let-token.
			// for every non-literal we find along the way, mark it as
			// just general text.
			for (var i=tokens.length-1; i>=0; i--) {
				let_text = tokens[i].val + let_text;

				if (tokens[i].type !== TOKEN_LITERAL) {
					// remove any heuristic annotations
					delete tokens[i].let_decl_list_complete;
					delete tokens[i].let_header_complete;
					delete tokens[i].let_block_complete;
					delete tokens[i].assignment;

					tokens[i].type = TOKEN_GENERAL_TEXT;

					if (tokens[i] === state_stack[state_stack.length-1].let_token) {
						break;
					}
				}
			}

			tokens = combineGeneralTokens(tokens);

			// restore previous state, but preserve current paren/bracket/brace counts
			old_state = state_stack.pop();
			state_stack[state_stack.length-1].paren_count += old_state.paren_count;
			state_stack[state_stack.length-1].bracket_count += old_state.bracket_count;
			state_stack[state_stack.length-1].brace_count += old_state.brace_count;

			// issue a warning for abandoning what turned out to not be a
			// recognizable `let` statement
			public_api.warnings.push("Skipping: " + let_text);
		}

		function saveText(text) {
			// can we add to a previous general-text token?
			if (tokens.length > 0 &&
				tokens[tokens.length-1].type === TOKEN_GENERAL_TEXT
			) {
				tokens[tokens.length-1].val += text;
			}
			// otherwise, just create a new one
			else {
				tokens.push({
					type: TOKEN_GENERAL_TEXT,
					val: text
				});
			}
		}

		// capture preceeding unmatched string, if any
		function handleUnmatched() {
			var tmp, matches, i;

			if (unmatched) {
				saveText(unmatched);
				tmp = unmatched;

				// unexpected characters make this not a let-statement
				if (!/^\s+$/.test(unmatched)) {
					if (match) {
						saveText(match[0]);
						tmp += match[0];
					}

					// let's count the braces, brackets, and parens (if any)
					matches = tmp.match(/[\{\}\[\]\(\)]/g);
					if (matches) {
						for (i=0; i<matches.length; i++) {
							if (matches[i] === "{") {
								state_stack[state_stack.length-1].brace_count++;
							}
							else if (matches[i] === "}") {
								state_stack[state_stack.length-1].brace_count--;
							}
							else if (matches[i] === "[") {
								state_stack[state_stack.length-1].bracket_count++;
							}
							else if (matches[i] === "]") {
								state_stack[state_stack.length-1].bracket_count--;
							}
							else if (matches[i] === "(") {
								state_stack[state_stack.length-1].paren_count++;
							}
							else if (matches[i] === ")") {
								state_stack[state_stack.length-1].paren_count--;
							}
						}
					}

					abandonLetCandidate();
					return false;
				}

				//saveText(unmatched);
			}

			return true;
		}

		function processGeneral() {
			// capture preceeding unmatched string, if any
			if (unmatched) {
				saveText(unmatched);
			}

			if (match) {
				if (match[0] === "let") {
					tokens.push({
						type: TOKEN_LET,
						val: match[0]
					});

					state_stack.push({
						let_token: tokens[tokens.length-1],
						paren_count: 0,
						bracket_count: 0,
						brace_count: 0,
						lexing_state: STATE_LET_DECLARATION_LIST_NEEDED
					});
				}
			}
		}

		function processLetStatementCandidate() {
			if (!handleUnmatched()) {
				// no need to warn if we only skipped over a stand-alone `let` keyword
				public_api.warnings.pop();
				return;
			}

			if (match) {
				if (match[0] === "(") {
					state_stack[state_stack.length-1].paren_count++;

					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					state_stack[state_stack.length-1].lexing_state = STATE_LET_DECLARATION_IDENTIFIER_NEEDED;
				}
			}
		}

		function processLetDeclarationIdentifier() {
			if (!handleUnmatched()) return;

			if (match) {
				tokens.push({
					type: TOKEN_IDENTIFIER,
					val: match[0]
				});

				state_stack[state_stack.length-1].lexing_state = STATE_LET_DECLARATION_IDENTIFIER_FOUND;
			}
		}

		function processLetDeclarationList() {
			if (!handleUnmatched()) return;

			if (match) {
				if (match[0] === ")") {
					state_stack[state_stack.length-1].paren_count--;

					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0],
						let_decl_list_complete: true
					});

					state_stack[state_stack.length-1].lexing_state = STATE_LET_BLOCK_NEEDED;
				}
				else if (match[0] === "=") {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0],
						assignment: true
					});

					state_stack[state_stack.length-1].lexing_state = STATE_LET_DECLARATION_ASSIGNMENT_NEEDED;
				}
				else if (match[0] === "," &&
					state_stack[state_stack.length-1].paren_count === 1 &&
					state_stack[state_stack.length-1].bracket_count === 0 &&
					state_stack[state_stack.length-1].brace_count === 0
				) {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					state_stack[state_stack.length-1].lexing_state = STATE_LET_DECLARATION_IDENTIFIER_NEEDED;
				}
				else {
					abandonLetCandidate();
				}
			}
		}

		function processLetAssignmentNeeded() {
			var i;

			if (unmatched) {
				// can we add to a previous assignment segment?
				if (tokens.length > 0 &&
					tokens[tokens.length-1].type === TOKEN_ASSIGNMENT
				) {
					tokens[tokens.length-1].val += unmatched;
				}
				// otherwise, just create a new one
				else {
					tokens.push({
						type: TOKEN_ASSIGNMENT,
						val: unmatched
					});
				}
			}

			if (tokens.length > 0 &&
				tokens[tokens.length-1].type !== TOKEN_ASSIGNMENT
			) {
				// placeholder segment
				tokens.push({
					type: TOKEN_ASSIGNMENT,
					val: ""
				});
			}

			if (match) {
				// a comma only matters to us if it's at the declaration-list level of nesting
				if (match[0] === "," &&
					state_stack[state_stack.length-1].paren_count === 1 &&
					state_stack[state_stack.length-1].bracket_count === 0 &&
					state_stack[state_stack.length-1].brace_count === 0
				) {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					state_stack[state_stack.length-1].lexing_state = STATE_LET_DECLARATION_IDENTIFIER_NEEDED;
				}
				else if (match[0] === "(") {
					state_stack[state_stack.length-1].paren_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "[") {
					state_stack[state_stack.length-1].bracket_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "{") {
					state_stack[state_stack.length-1].brace_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === ")") {
					state_stack[state_stack.length-1].paren_count--;

					// did we just complete the let-declaration-list by balancing the ( ) around it?
					if (state_stack[state_stack.length-1].paren_count === 0) {
						tokens.push({
							type: TOKEN_OPERATOR,
							val: match[0],
							let_decl_list_complete: true
						});

						// did we have a non-empty assignment rvalue?
						for (i=tokens.length-2; i>=0; i--) {
							// did we hit the = assignment? Uh oh...
							if (tokens[i].type === TOKEN_OPERATOR &&
								tokens[i].val === "=" &&
								tokens[i].assignment === true
							) {
								abandonLetCandidate();
								return;
							}
							// found something non-empty to satisfy our search?
							else if (tokens[i].val && /[^\s]/.test(tokens[i].val)) {
								break;
							}
						}

						// something is unbalanced in the let-declaration?
						if (state_stack[state_stack.length-1].bracket_count !== 0 ||
							state_stack[state_stack.length-1].brace_count !== 0
						) {
							abandonLetCandidate();
							return;
						}

						state_stack[state_stack.length-1].lexing_state = STATE_LET_BLOCK_NEEDED;
					}
					else {
						// add to previous assignment token
						tokens[tokens.length-1].val += match[0];
					}
				}
				else if (match[0] === "]") {
					state_stack[state_stack.length-1].bracket_count--;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "}") {
					state_stack[state_stack.length-1].brace_count--;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "let") {
					tokens.push({
						type: TOKEN_LET,
						val: match[0]
					});

					state_stack.push({
						let_token: tokens[tokens.length-1],
						paren_count: 0,
						bracket_count: 0,
						brace_count: 0,
						lexing_state: STATE_LET_DECLARATION_LIST_NEEDED
					});
				}
				else {
					// add to previous assignment token
					tokens[tokens.length-1].val += match[0];
				}
			}

			// something is unbalanced in the let-declaration?
			if (state_stack[state_stack.length-1].paren_count < 0 ||
				state_stack[state_stack.length-1].bracket_count < 0 ||
				state_stack[state_stack.length-1].brace_count < 0
			) {
				abandonLetCandidate();
			}
		}

		function processLetHeader() {
			var i, header;

			header = {
				type: TOKEN_LET_HEADER,
				tokens: null
			};

			// scoop up all the let-declaration tokens into a let-header wrapper
			for (i=tokens.length-1; i>=0; i--) {
				if (tokens[i] === state_stack[state_stack.length-1].let_token) {
					header.tokens = tokens.splice(i,tokens.length-i,header);
					state_stack[state_stack.length-1].let_token = header;
					break;
				}
			}
		}

		function processLetBlockNeeded() {
			// capture preceeding unmatched string, if any
			if (unmatched) {
				saveText(unmatched);
			}

			if (match) {
				if (match[0] === "{") {
					state_stack[state_stack.length-1].brace_count++;

					// start of let block (and thus end of let header)?
					if (state_stack[state_stack.length-1].brace_count === 1) {
						tokens.push({
							type: TOKEN_OPERATOR,
							val: match[0],
							let_header_complete: true
						});

						// group together let-header tokens
						processLetHeader();
					}
					else {
						saveText(match[0]);
					}
				}
				else if (match[0] === "}") {
					state_stack[state_stack.length-1].brace_count--;

					// end of let-block?
					if (state_stack[state_stack.length-1].brace_count === 0) {
						tokens.push({
							type: TOKEN_OPERATOR,
							val: match[0],
							let_block_complete: true
						});

						// link the let token to the the block-complete token
						state_stack[state_stack.length-1].let_token.block_complete_token = tokens[tokens.length-1];

						// restore previous state now that this let statement
						// is completely lexed
						state_stack.pop();
					}
					else {
						saveText(match[0]);
					}
				}
				else if (match[0] === "let") {
					tokens.push({
						type: TOKEN_LET,
						val: match[0]
					});

					state_stack.push({
						let_token: tokens[tokens.length-1],
						paren_count: 0,
						bracket_count: 0,
						brace_count: 0,
						lexing_state: STATE_LET_DECLARATION_LIST_NEEDED
					});
				}
				else {
					saveText(match[0]);
				}
			}

			// something is unbalanced in the let-block-declaration?
			if (state_stack[state_stack.length-1].brace_count < 0) {
				abandonLetCandidate();
			}
		}


		var segments = [],
			tokens = [],
			segment,

			match,
			unmatched = "",

			state_stack = [
				{
					paren_count: 0,
					bracket_count: 0,
					brace_count: 0,
					lexing_state: STATE_GENERAL
				}
			],

			STATE_PROCESSORS = [
				processGeneral,
				processLetStatementCandidate,
				processLetDeclarationIdentifier,
				processLetDeclarationList,
				processLetAssignmentNeeded,
				processLetBlockNeeded
			]
		;

		try {
			segments = LIT.lex(code);
		}
		catch (err) {
			console.log(err);
			process.exit(1);
		}

		// any warnings to pass-on from "literalizer"?
		if (LIT.warnings.length > 0) {
			public_api.warnings = public_api.warnings.concat(LIT.warnings);
		}

		while (segment = segments.shift()) {
			// general text segment?
			if (segment.type === LIT.SEGMENT.GENERAL) {
				code = segment.val;
				prev_match_idx = 0;
				next_match_idx = 0;

				while (next_match_idx < code.length) {
					unmatched = "";

					regex = STATE_PATTERNS[state_stack[state_stack.length-1].lexing_state];

					regex.lastIndex = next_match_idx;
					match = regex.exec(code);

					if (match) {
						prev_match_idx = next_match_idx;
						next_match_idx = regex.lastIndex;

						// collect the previous string code not matched before this segment
						if (prev_match_idx < next_match_idx - match[0].length) {
							unmatched = code.substring(prev_match_idx,next_match_idx - match[0].length);
						}
					}
					else {
						prev_match_idx = next_match_idx;
						next_match_idx = code.length;
						unmatched = code.substr(prev_match_idx);
						if (!unmatched) break;
					}

					STATE_PROCESSORS[state_stack[state_stack.length-1].lexing_state]();
				}
			}
			// otherwise, must be a literal segment
			else {
				tokens.push({
					type: TOKEN_LITERAL,
					val: segment.val,
					literal: segment.type
				});
			}
		}

		combineGeneralTokens(tokens);

		return tokens;
	}

	function parse(tokens) {

		function identifierText(identifierTokens) {
			var ret = "", i;

			for (i=0; i<identifierTokens.length; i++) {
				ret += identifierTokens[i].val;
			}

			return trim(ret);
		}

		function assignmentText(assignmentTokens,sanitize) {
			var ret = "", i;

			for (i=0; i<assignmentTokens.length; i++) {
				if (!("literal" in assignmentTokens[i]) ||
					assignmentTokens[i].literal !== LIT.SEGMENT.COMMENT ||
					!sanitize
				) {
					ret += assignmentTokens[i].val;
				}
			}

			if (sanitize) {
				ret = trim((ret.substr(0,10) + (ret.length > 10 ? "..." : "")).replace(/[\n\r]/g," "));
			}

			return ret;
		}

		var i, j, identifiers, assignments, header;

		for (i=0; i<tokens.length; i++) {
			if (tokens[i].type === TOKEN_LET_HEADER) {
				header = tokens[i];

				// depth-first traversal for nested let-headers
				parse(header.tokens);

				identifiers = null;
				assignments = null;

				// collect the identifiers (and assignments, if any)
				for (j=0; j<header.tokens.length; j++) {
					if (assignments && identifiers) {
						if (header.tokens[j].type === TOKEN_IDENTIFIER) {
							identifiers[identifiers.length-1].push(header.tokens[j]);
							assignments.push(null);
						}
						else if (header.tokens[j].type === TOKEN_OPERATOR &&
							header.tokens[j].val === "=" &&
							header.tokens[j].assignment === true
						) {
							assignments[assignments.length-1] = [];
						}
						else if (header.tokens[j].type === TOKEN_OPERATOR &&
							header.tokens[j].val === ")" &&
							header.tokens[j].let_decl_list_complete === true
						) {
							break;
						}
						// , means reset the next iteration to collect identifiers/comments
						else if (header.tokens[j].type === TOKEN_OPERATOR &&
							header.tokens[j].val === ","
						) {
							identifiers.push([]);
						}
						else if (
							!assignments[assignments.length-1] &&
							(
								header.tokens[j].type === TOKEN_GENERAL_TEXT ||
								(
									header.tokens[j].type === TOKEN_LITERAL &&
									header.tokens[j].literal === LIT.SEGMENT.COMMENT
								)
							)
						) {
							identifiers[identifiers.length-1].push(header.tokens[j]);
						}
						else if (
							assignments[assignments.length-1] &&
							(
								header.tokens[j].type === TOKEN_LITERAL ||
								header.tokens[j].type === TOKEN_ASSIGNMENT ||
								header.tokens[j].type === TOKEN_GENERAL_TEXT ||
								header.tokens[j].type === TOKEN_LET_HEADER ||
								header.tokens[j].type === TOKEN_OPERATOR
							)
						) {
							assignments[assignments.length-1].push(header.tokens[j]);
						}
					}
					else if (header.tokens[j].type === TOKEN_OPERATOR &&
						header.tokens[j].val === "("
					) {
						identifiers = [[]];
						assignments = [];
					}
				}

				if (public_api.opts.es6) {
					header.val = "{ let ";
				}
				else {
					header.val = "";
				}

				for (j=0; j<identifiers.length; j++) {
					if (public_api.opts.es6) {
						header.val += (j > 0 ? ", " : "") + identifierText(identifiers[j]);
						if (assignments[j]) {
							header.val += " = " + assignmentText(assignments[j],/*sanitize=*/false);
						}
					}
					else {
						header.val += (j > 0 ? "\n" : "") + "try{throw ";
						if (assignments[j]) {
							header.val += assignmentText(assignments[j],/*sanitize=*/false);
						}
						else {
							header.val += "void 0";
						}
						header.val += "}catch";

						if (public_api.opts.annotate) {
							header.val += "\n/*let*/ (" + identifierText(identifiers[j]);
							if (assignments[j]) {
								header.val += " /* = " + assignmentText(assignments[j],/*sanitize=*/true) + " */";
							}
							header.val += ") {";
						}
						else {
							header.val += "(" + identifierText(identifiers[j]) + "){";
						}
					}
				}

				if (public_api.opts.es6) {
					header.val += ";";
				}
				else {
					// make sure there's enough closing } operators
					// TODO: it'd be nicer to duplicate the operator token each time
					if (identifiers.length > 0) {
						header.block_complete_token.val = Array(identifiers.length + 1).join("}");
					}
				}

				delete header.tokens;
				delete header.block_complete_token;
			}
		}

		return tokens;
	}

	function compile(code) {
		var i, tokens = parse(lex(code)), ret = "";

		for (i=0; i<tokens.length; i++) {
			ret += tokens[i].val;
		}

		return ret;
	}

	function reset() {
		public_api.warnings.length = 0;
	}

	var LIT = require("literalizer"),

		TOKEN_GENERAL_TEXT = 0,
		TOKEN_LITERAL = 1,
		TOKEN_LET = 2,
		TOKEN_OPERATOR = 3,
		TOKEN_IDENTIFIER = 4,
		TOKEN_ASSIGNMENT = 5,
		TOKEN_LET_HEADER = 6,

		STATE_GENERAL = 0,
		STATE_LET_DECLARATION_LIST_NEEDED = 1,
		STATE_LET_DECLARATION_IDENTIFIER_NEEDED = 2,
		STATE_LET_DECLARATION_IDENTIFIER_FOUND = 3,
		STATE_LET_DECLARATION_ASSIGNMENT_NEEDED = 4,
		STATE_LET_BLOCK_NEEDED = 5,

		STATE_PATTERNS = [
			/\blet\b/g,					// find let keyword
			/[\(]/g,					// find start of let-declaration-list
										// find let-declaration identifier
			/[^0-9\s\(\)\[\]\{\}<>,.:;=~+\-\*\/!%&\|\?\"\'][^\s\(\)\[\]\{\}<>,.:;=~+\-\*\/!%&\|\?\"\']*/g,
			/[=,\)]/g,					// find operator after let-declaration identifier
			/[,\(\)\[\]\{\}]|\blet\b/g,	// find operator in/after let-declaration assignment
			/[\{\}]|\blet\b/g			// find { } pairs or nested `let`s
		],

		public_api,

		default_opts = {
			es6: false,
			annotate: true
		}
	;


	public_api = {
		lex: lex,
		parse: parse,
		compile: compile,
		reset: reset,

		warnings: [],

		opts: JSON.parse(JSON.stringify(default_opts)),

		TOKEN: {
			GENERAL_TEXT: TOKEN_GENERAL_TEXT,
			LITERAL: TOKEN_LITERAL,
			LET: TOKEN_LET
		}
	};

	return public_api;
});
