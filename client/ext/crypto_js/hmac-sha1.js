;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core.js"), require("./sha1.js"), require("./hmac.js"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core.js", "./sha1", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.HmacSHA1;

}));