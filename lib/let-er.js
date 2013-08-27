/*! let-er
    v0.3.0-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition) {
	if (typeof module != "undefined" && module.exports) module.exports = definition();
	else if (typeof define == "function" && define.amd) define(definition);
	else context[name] = definition();
})("letEr",this,function definition(name,context) {
	"use strict";

	function trim(str) {
		return str.replace(/^\s+/g,"").replace(/\s+$/g,"");
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	function combineGeneralTokens(tokens) {
		var start, end, i, j;

		for (i=0; i<tokens.length; i++) {
			if (tokens[i].type === TOKEN_TEXT) {
				start = end = i;
				for (j=start+1; j<tokens.length; j++) {
					end = j;
					if (tokens[j].type !== TOKEN_TEXT) {
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
			var let_text = "", let_text_2 = "", old_state, i, j;

			// walk back and find the current state's let-token.
			// for every non-literal we find along the way, mark it as
			// just general text.
			for (i=tokens.length-1; i>=0; i--) {
				// run across a let-header token?
				if (tokens[i].type === TOKEN_LET_HEADER) {
					// is it the one we're looking for, to abandon?
					if (tokens[i] === state_stack[state_stack.length-1].let_token) {

						// walk all the tokens of the header and mark them as non-let-header tokens
						for (j=tokens[i].tokens.length-1; j>=0; j--) {
							if (tokens[i].tokens[j].type === TOKEN_LET_HEADER) {
								// no need to recursively serialize let-blocks in the
								// warning text output, so just fake it
								let_text_2 = "let (..) {..}" + let_text_2;
							}
							else {
								let_text_2 = tokens[i].tokens[j].val + let_text_2;

								// ignore special tokens?
								if (tokens[i].tokens[j].type !== TOKEN_LITERAL &&
									tokens[i].tokens[j].let_block_complete !== true
								) {
									tokens[i].tokens[j].type = TOKEN_TEXT;

									// remove any heuristic annotations
									delete tokens[i].tokens[j].let_decl_list_complete;
									delete tokens[i].tokens[j].let_header_complete;
									delete tokens[i].tokens[j].assignment;
								}
							}
						}

						// flatten the let-header back into its string of tokens
						tokens.splice.apply(tokens,[i,1].concat(tokens[i].tokens));
						let_text = let_text_2 + let_text;

						break;
					}
					// otherwise, not the let-header we care about
					else {
						// no need to recursively serialize let-blocks in the
						// warning text output, so just fake it
						let_text = "let (..) {..}" + let_text;
					}
				}
				else {
					let_text = tokens[i].val + let_text;

					if (tokens[i].type !== TOKEN_LITERAL) {
						// remove any heuristic annotations
						delete tokens[i].let_decl_list_complete;
						delete tokens[i].let_header_complete;
						delete tokens[i].let_block_complete;
						delete tokens[i].assignment;

						tokens[i].type = TOKEN_TEXT;

						if (tokens[i] === state_stack[state_stack.length-1].let_token) {
							break;
						}
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
			public_api.warnings.push("Skipping: " + let_text.replace(/[\r\n]+/g,""));
		}

		function saveText(text) {
			// can we add to a previous general-text token?
			if (tokens.length > 0 &&
				tokens[tokens.length-1].type === TOKEN_TEXT
			) {
				tokens[tokens.length-1].val += text;
			}
			// otherwise, just create a new one
			else {
				tokens.push({
					type: TOKEN_TEXT,
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

				// found unexpected non-whitespace before the let-block has started?
				if (state_stack[state_stack.length-1].let_token.type !== TOKEN_LET_HEADER &&
					/[^\s]/.test(unmatched)
				) {
					abandonLetCandidate();
					//return;
				}
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

						// restore previous state now that this let statement
						// is completely lexed
						state_stack.pop();
					}
					// unexpected/unbalanced } found
					else if (state_stack[state_stack.length-1].brace_count < 0) {
						abandonLetCandidate();
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

			prev_match_idx,
			next_match_idx,
			regex,

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

		function parseHeader(headerTokens) {
			var i, declarations = [], decl = null, let_node,
				let_blocks_needed = 0
			;

			for (i=0; i<headerTokens.length; i++) {
				// need to find let-block after a let-header?
				if (let_blocks_needed > 0) {
					// let-block complete?
					if (headerTokens[i].type === TOKEN_OPERATOR &&
						headerTokens[i].val === "}" &&
						headerTokens[i].let_block_complete === true
					) {
						let_blocks_needed--;
						collections.pop();
					}
					// found another let-header to parse?
					else if (headerTokens[i].type === TOKEN_LET_HEADER) {
						let_node = {
							type: NODE_LET_BLOCK,
							// recursively parse the let-header's tokens
							declarations: parseHeader(headerTokens[i].tokens),
							children: []
						};

						collections[collections.length-1].push(let_node);
						collections.push(let_node.children);
						let_blocks_needed++;
					}
					// non-empty contents to append to the let-block?
					else if (headerTokens[i].val) {
						// is the most recent node not a text node we can append to?
						if (collections[collections.length-1].length === 0 ||
							collections[collections.length-1][collections[collections.length-1].length-1].type !== NODE_TEXT
						) {
							collections[collections.length-1].push({
								type: NODE_TEXT,
								val: ""
							});
						}

						collections[collections.length-1][collections[collections.length-1].length-1].val += headerTokens[i].val;
					}
				}
				else if (decl) {
					// found identifier?
					if (headerTokens[i].type === TOKEN_IDENTIFIER &&
						headerTokens[i].val
					) {
						decl.identifiers.push(clone(headerTokens[i]));
					}
					// append to identifier tokens?
					else if (
						!decl.assignments &&
						(
							headerTokens[i].type === TOKEN_TEXT ||
							(
								headerTokens[i].type === TOKEN_LITERAL &&
								headerTokens[i].literal === LIT.SEGMENT.COMMENT
							)
						) &&
						headerTokens[i].val
					) {
						decl.identifiers.push(clone(headerTokens[i]));
					}
					// now look for an assignment?
					else if (headerTokens[i].type === TOKEN_OPERATOR &&
						headerTokens[i].val === "=" &&
						headerTokens[i].assignment === true
					) {
						decl.assignments = [];
					}
					// append to assignment tokens?
					else if (
						decl.assignments &&
						(
							headerTokens[i].type === TOKEN_LITERAL ||
							headerTokens[i].type === TOKEN_ASSIGNMENT ||
							headerTokens[i].type === TOKEN_TEXT ||
							(
								headerTokens[i].type === TOKEN_OPERATOR &&
								!/[\),]/.test(headerTokens[i].val)
							)
						) &&
						headerTokens[i].val
					) {
						decl.assignments.push(clone(headerTokens[i]));
					}
					// found another let-header to parse?
					else if (decl.assignments &&
						headerTokens[i].type === TOKEN_LET_HEADER
					) {
						let_node = {
							type: NODE_LET_BLOCK,
							// recursively parse the let-header's tokens
							declarations: parseHeader(headerTokens[i].tokens),
							children: []
						};

						decl.assignments.push(let_node);
						collections.push(let_node.children);
						let_blocks_needed++;
					}
					// look for another identifier declaration?
					else if (headerTokens[i].type === TOKEN_OPERATOR &&
						headerTokens[i].val === ","
					) {
						decl = {
							identifiers: [],
							assignments: null
						};
						declarations.push(decl);
					}
					// declaration list and let-header now finished parsing?
					else if (headerTokens[i].type === TOKEN_OPERATOR &&
						headerTokens[i].val === ")" &&
						headerTokens[i].let_decl_list_complete === true
					) {
						break;
					}
				}
				// beginning of let-header's declaration list found?
				else if (headerTokens[i].type === TOKEN_OPERATOR &&
					headerTokens[i].val === "("
				) {
					decl = {
						identifiers: [],
						assignments: null
					};
					declarations.push(decl);
				}
			}

			return declarations;
		}


		var i,
			let_node,
			let_blocks_needed = 0,

			nodes = [],
			collections = [nodes]
		;

		for (i=0; i<tokens.length; i++) {
			// let-block complete?
			if (let_blocks_needed > 0 &&
				tokens[i].type === TOKEN_OPERATOR &&
				tokens[i].val === "}" &&
				tokens[i].let_block_complete === true
			) {
				collections.pop();
				let_blocks_needed--;
			}
			// found a let-header to parse?
			else if (tokens[i].type === TOKEN_LET_HEADER) {
				let_node = {
					type: NODE_LET_BLOCK,
					// recursively parse the let-header's tokens
					declarations: parseHeader(tokens[i].tokens),
					children: []
				};

				collections[collections.length-1].push(let_node);
				collections.push(let_node.children);
				let_blocks_needed++;
			}
			// literal to collect?
			else if (tokens[i].type === TOKEN_LITERAL) {
				collections[collections.length-1].push({
					type: NODE_LITERAL,
					val: tokens[i].val,
					literal: tokens[i].literal
				});
			}
			// non-empty contents to collect?
			else if (tokens[i].val) {
				// is the most recent node not a text node we can append to?
				if (collections[collections.length-1].length === 0 ||
					collections[collections.length-1][collections[collections.length-1].length-1].type !== NODE_TEXT
				) {
					collections[collections.length-1].push({
						type: NODE_TEXT,
						val: ""
					});
				}

				collections[collections.length-1][collections[collections.length-1].length-1].val += tokens[i].val;
			}
		}

		if (let_blocks_needed > 0) {
			public_api.warnings.push("Unterminated let-block at end of file");
		}

		return nodes;
	}

	function generate(nodes,sanitize) {

		function identifierText(identifierNodes) {
			var ret = "", i;

			for (i=0; i<identifierNodes.length; i++) {
				ret += identifierNodes[i].val;
			}

			return trim(ret);
		}

		function assignmentText(assignmentNodes,sanitize) {
			var ret = "", i, MAXLEN = 20;

			for (i=0; i<assignmentNodes.length; i++) {
				// bail because we're sanitizing and have enough text?
				if (sanitize && ret.length >= MAXLEN + 10) {
					break;
				}

				if (!("literal" in assignmentNodes[i]) ||
					assignmentNodes[i].literal !== LIT.SEGMENT.COMMENT ||
					!sanitize
				) {
					// node already has a direct value?
					if (assignmentNodes[i].val) {
						ret += assignmentNodes[i].val;
					}
					// sanitizing a let-block node?
					else if (sanitize &&
						assignmentNodes[i].type === NODE_LET_BLOCK
					) {
						// cheat on reporting a let block for sanitized output
						ret += "let (..) {..}";
					}
					// recursively generate the code for the let-block node
					else {
						ret += generate([ assignmentNodes[i] ],sanitize);
					}
				}
			}

			if (sanitize) {
				ret = trim(ret.replace(/[\n\r]/g," ").replace(/\*\//,"*\\/"));
				ret = ret.substr(0,MAXLEN) + (ret.length > MAXLEN ? "..." : "");
			}
			else {
				ret = trim(ret);
			}

			return ret;
		}

		var code = "", i, j, node;

		for (i=0; i<nodes.length; i++) {
			node = nodes[i];

			if (node.type === NODE_TEXT ||
				node.type === NODE_LITERAL
			) {
				code += node.val;
			}
			else if (node.type === NODE_LET_BLOCK) {
				// for ES6, start the naked block with a let declaration
				if (public_api.opts.es6) {
					code += "{ let ";
				}

				for (j=0; j<node.declarations.length; j++) {
					if (public_api.opts.es6) {
						code += (j > 0 ? ", " : "") + identifierText(node.declarations[j].identifiers);
						if (node.declarations[j].assignments) {
							code += " = " + assignmentText(node.declarations[j].assignments,/*sanitize=*/false || sanitize);
						}
					}
					else {
						code += ((public_api.opts.annotate && j > 0) ? "\n" : "") + "try{throw ";
						if (node.declarations[j].assignments) {
							code += assignmentText(node.declarations[j].assignments,/*sanitize=*/false || sanitize);
						}
						else {
							code += "void 0";
						}
						code += "}catch";

						if (public_api.opts.annotate) {
							code += "\n/*let*/ (" + identifierText(node.declarations[j].identifiers);
							if (node.declarations[j].assignments) {
								code += " /* = " + assignmentText(node.declarations[j].assignments,/*sanitize=*/true) + " */";
							}
							code += ") {";
						}
						else {
							code += "(" + identifierText(node.declarations[j].identifiers) + "){";
						}
					}
				}

				// for ES6, finish the let declaration statement
				if (public_api.opts.es6) {
					code += ";";
				}

				// recursively generate code for the let-block contents
				code += generate(node.children,sanitize);

				// close the let-block with enough closing }'s
				if (public_api.opts.es6) {
					code += "}";
				}
				else {
					code += new Array(node.declarations.length + 1).join("}");
				}
			}
		}

		return code;
	}

	function compile(code) {
		return generate(
			parse(
				lex(code)
			),
			/*sanitize=*/false
		);
	}

	function reset() {
		public_api.warnings.length = 0;
	}

	var LIT = require("literalizer"),

		TOKEN_TEXT = 0,
		TOKEN_LITERAL = 1,
		TOKEN_LET = 2,
		TOKEN_OPERATOR = 3,
		TOKEN_IDENTIFIER = 4,
		TOKEN_ASSIGNMENT = 5,
		TOKEN_LET_HEADER = 6,

		NODE_TEXT = 0,
		NODE_LITERAL = 1,
		NODE_LET_BLOCK = 2,

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
		generate: generate,

		compile: compile,
		reset: reset,

		warnings: [],

		opts: JSON.parse(JSON.stringify(default_opts)),

		TOKEN: {
			TEXT: TOKEN_TEXT,
			LITERAL: TOKEN_LITERAL,
			LET: TOKEN_LET,
			OPERATOR: TOKEN_OPERATOR,
			IDENTIFIER: TOKEN_IDENTIFIER,
			ASSIGNMENT: TOKEN_ASSIGNMENT,
			LET_HEADER: TOKEN_LET_HEADER
		},

		NODE: {
			TEXT: NODE_TEXT,
			LITERAL: NODE_LITERAL,
			LET_BLOCK: NODE_LET_BLOCK
		}
	};

	return public_api;
});
