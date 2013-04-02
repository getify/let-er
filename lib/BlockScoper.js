(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
})('BlockScoper', this, function (name, context) {

  return {
		ify: function(code) {
			return code.replace(/\blet\s*(\([^)]+\)\s+\{)/g,"try{throw void 0}catch\n$1");
		}
	};
});
