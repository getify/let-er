/*! let-er
    v0.0.2 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition) {
	if (typeof module != "undefined" && module.exports) module.exports = definition();
	else if (typeof define == "function" && define.amd) define(definition);
	else context[name] = definition();
})("letEr",this,function definition(name,context) {

	function compile(code) {

		function combineGeneralTokens(tokensSlice) {
			var start, end, i, j;

			for (i=0; i<tokensSlice.length; i++) {
				if (tokensSlice[i].type === TOKEN_GENERAL) {
					start = end = i;
					for (j=start+1; j<tokensSlice.length; j++) {
						end = j;
						if (tokensSlice[j].type !== TOKEN_GENERAL) {
							end = j-1;
							break;
						}
					}
					if (end > start) {
						for (j=start+1; j<=end; j++) {
							tokensSlice[start].val += tokensSlice[j].val;
						}
						tokensSlice.splice(start+1,end-start);
					}
					else i = j;
				}
			}

			return tokensSlice;
		}

		function unescapeGeneralTokens(tokensSlice) {
			for (var i=0; i<tokensSlice.length; i++) {
				if (tokensSlice[i].type === TOKEN_GENERAL) {
					tokensSlice[i].val = tokensSlice[i].val.replace(/\\\\/g,"\\");
				}
			}

			return tokensSlice;
		}

		function abandonLetCandidate() {
			for (var i=tokens.length-1; i>=0; i--) {
				if (tokens[i].type !== TOKEN_LITERAL) {
					if (tokens[i].type === TOKEN_LET) {
						tokens[i].type = TOKEN_GENERAL;
						break;
					}
					else {
						tokens[i].type = TOKEN_GENERAL;
					}
				}
			}

			tokens = combineGeneralTokens(tokens);

			public_api.warnings.push("`let` skipped: " + tokens[tokens.length-1].val);
		}

		function recordGeneralText(text) {
			// can we add to a previous general token?
			if (tokens.length > 0 &&
				tokens[tokens.length-1].type === TOKEN_GENERAL
			) {
				tokens[tokens.length-1].val += text;
			}
			// otherwise, just create a new one
			else {
				tokens.push({
					type: TOKEN_GENERAL,
					val: text
				});
			}
		}

		// capture preceeding unmatched string, if any
		function handleUnmatched() {
			if (unmatched) {
				// unexpected characters make this not a let-statement
				if (!unmatched.match(/^\s*$/)) {
					tokens[tokens.length-1].val += unmatched;
					if (match) {
						tokens[tokens.length-1].val += match[0];
					}
					abandonLetCandidate();
					lexing_state = STATE_GENERAL;
					return false;
				}

				recordGeneralText(unmatched);
			}

			return true;
		}

		function processGeneral() {
			var tokensSlice;

			// capture preceeding unmatched string, if any
			if (unmatched) {
				recordGeneralText(unmatched);
			}

			if (match) {
				if (match[0] === "let") {
					tokens.push({
						type: TOKEN_LET,
						val: match[0]
					});

					lexing_state = STATE_LET_KEYWORD_FOUND;
				}
			}
			
			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}

		function processLetKeyword() {
			var tokensSlice;

			if (!handleUnmatched()) {
				// no need to warn if we only skipped over a stand-alone `let` keyword
				public_api.warnings.pop();
				return;
			}

			if (match) {
				if (match[0] === "(") {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_LET_DECLARATION_LIST;

					paren_count++;
				}
			}
			
			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}

		function processLetDeclarationList() {
			var tokensSlice;

			if (!handleUnmatched()) return;

			if (match) {
				tokens.push({
					type: TOKEN_IDENTIFIER,
					val: match[0]
				});

				lexing_state = STATE_LET_IDENTIFIER_FOUND;
			}
			
			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}

		function processLetDeclaration() {
			var tokensSlice;

			if (!handleUnmatched()) return;

			if (match) {
				if (match[0] === ")") {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_LET_DECLARATION_COMPLETE;

					paren_count--;
				}
				else if (match[0] === "=") {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_LET_ASSIGNMENT_STARTED;
				}
				else if (match[0] === "," &&
					paren_count === 1 &&
					bracket_count === 0 &&
					brace_count === 0
				) {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_LET_DECLARATION_LIST;
				}
				else {
					tokens.push({
						type: TOKEN_GENERAL,
						val: match[0]
					});
				}
			}

			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}

		function processLetAssignment() {
			var tokensSlice;

			if (unmatched) {
				// can we add to a previous assignment token?
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
				// placeholder token
				tokens.push({
					type: TOKEN_ASSIGNMENT,
					val: ""
				});
			}

			if (match) {
				// a comma only matters to us if it's at the declaration-list level of nesting
				if (match[0] === "," &&
					paren_count === 1 &&
					bracket_count === 0 &&
					brace_count === 0
				) {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_LET_DECLARATION_LIST;
				}
				else if (match[0] === "(") {
					paren_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "[") {
					bracket_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "{") {
					brace_count++;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === ")") {
					paren_count--;

					// did we just complete the let-declaration by balancing the ( ) around it?
					if (paren_count === 0) {
						tokens.push({
							type: TOKEN_OPERATOR,
							val: match[0]
						});

						lexing_state = STATE_LET_DECLARATION_COMPLETE;
					}
					else {
						tokens[tokens.length-1].val += match[0];
					}
				}
				else if (match[0] === "]") {
					bracket_count--;
					tokens[tokens.length-1].val += match[0];
				}
				else if (match[0] === "}") {
					brace_count--;
					tokens[tokens.length-1].val += match[0];
				}
			}

			// something is unbalanced in the let-declaration?
			if (paren_count < 0 || bracket_count < 0 || brace_count < 0) {
				abandonLetCandidate();
				lexing_state = STATE_GENERAL;
				return;
			}

			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}

		function processLetDeclarationListComplete() {
			var tokensSlice;

			if (!handleUnmatched()) return;

			if (match) {
				if (match[0] === "{") {
					tokens.push({
						type: TOKEN_OPERATOR,
						val: match[0]
					});

					lexing_state = STATE_GENERAL;
				}
			}
			
			// manage the tokens list
			tokens = tokens.concat((tokensSlice = unescapeGeneralTokens(combineGeneralTokens(tokens.splice(token_idx-tokens.length)))));
			token_idx = tokens.length;
		}


		var literals_tokens = [],
			tokens = [],
			token_idx = 0,
			lit_token,

			match,
			unmatched = "",

			paren_count = 0,
			bracket_count = 0,
			brace_count = 0,

			lexing_state = 0,
			lexing_index = 0,

			STATE_PROCESSORS = [
				processGeneral,
				processLetKeyword,
				processLetDeclarationList,
				processLetDeclaration,
				processLetAssignment,
				processLetDeclarationListComplete
			]
		;

		try {
			literals_tokens = LIT.tokenize(code);
		}
		catch (err) {
			console.log(err);
			process.exit(1);
		}

		// any warnings to pass-on from `literalizer`?
		if (LIT.warnings.length > 0) {
			public_api.warnings = public_api.warnings.concat(LIT.warnings);
		}

		while (lit_token = literals_tokens.shift()) {
			// general text token?
			if (lit_token.type === LIT.TOKEN.GENERAL) {
				code = lit_token.val;
				prev_match_idx = 0;
				next_match_idx = 0;
				lexing_index = 0;

				while (next_match_idx < code.length) {
					unmatched = "";

					regex = STATE_PATTERNS[lexing_state];

					regex.lastIndex = next_match_idx;
					match = regex.exec(code);

					if (match) {
						prev_match_idx = next_match_idx;
						next_match_idx = regex.lastIndex;

						// collect the previous string code not matched before this token
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

					STATE_PROCESSORS[lexing_state]();
				}
			}
			// otherwise, must be a literal token
			else {
				tokens.push({
					type: TOKEN_LITERAL,
					val: lit_token.val,
					literal: lit_token.type
				});
			}
		}

		return tokens;
	}

	function reset() {
		public_api.warnings.length = 0;
	}

	var LIT = require("literalizer"),

		TOKEN_GENERAL = 0,
		TOKEN_LITERAL = 1,
		TOKEN_LET = 2,
		TOKEN_OPERATOR = 3,
		TOKEN_IDENTIFIER = 4,
		TOKEN_ASSIGNMENT = 5,

		STATE_GENERAL = 0,
		STATE_LET_KEYWORD_FOUND = 1,
		STATE_LET_DECLARATION_LIST = 2,
		STATE_LET_IDENTIFIER_FOUND = 3,
		STATE_LET_ASSIGNMENT_STARTED = 4,
		STATE_LET_DECLARATION_COMPLETE = 5,

		STATE_PATTERNS = [
			/\blet\b/g,				/* find let keyword */
			/[\(]/g,				/* find start of let declaration */
			/[^0-9\s\(\)\[\]\{\}<>,.:;=~+\-\*\/!%&\|\?\"\'][^\s\(\)\[\]\{\}<>,.:;=~+\-\*\/!%&\|\?\"\']*/g, /* find identifier */
			/[=,\)]/g,				/* find operator after variable declaration */
			/[,\(\)\[\]\{\}]/g,		/* find operator after assignment */
			/[\{]/g					/* find start of let block */
		],

		public_api
	;


	public_api = {
		compile: compile,
		reset: reset,

		warnings: [],

		TOKEN: {
			GENERAL: TOKEN_GENERAL,
			LITERAL: TOKEN_LITERAL,
			LET: TOKEN_LET
		}
	};

	return public_api;
});
