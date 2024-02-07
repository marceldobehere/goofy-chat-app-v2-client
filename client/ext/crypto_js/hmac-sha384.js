;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core.js"), require("./x64-core.js"), require("./sha512.js"), require("./sha384.js"), require("./hmac.js"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core.js", "./x64-core", "./sha512", "./sha384", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.HmacSHA384;

}));