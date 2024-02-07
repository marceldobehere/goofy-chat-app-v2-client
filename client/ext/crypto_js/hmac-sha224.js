;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core.js"), require("./sha256.js"), require("./sha224.js"), require("./hmac.js"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core.js", "./sha256", "./sha224", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.HmacSHA224;

}));