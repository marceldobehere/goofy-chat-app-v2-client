;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core.js"), require("./x64-core.js"), require("./sha3.js"), require("./hmac.js"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core.js", "./x64-core", "./sha3", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.HmacSHA3;

}));