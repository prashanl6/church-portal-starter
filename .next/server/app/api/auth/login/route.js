"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/login/route";
exports.ids = ["app/api/auth/login/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "./action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "./request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "./static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_prashanbastiansz_Downloads_church_portal_starter_src_app_api_auth_login_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/auth/login/route.ts */ \"(rsc)/./src/app/api/auth/login/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/login/route\",\n        pathname: \"/api/auth/login\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/login/route\"\n    },\n    resolvedPagePath: \"/Users/prashanbastiansz/Downloads/church-portal-starter/src/app/api/auth/login/route.ts\",\n    nextConfigOutput,\n    userland: _Users_prashanbastiansz_Downloads_church_portal_starter_src_app_api_auth_login_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/login/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGbG9naW4lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkZsb2dpbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkZsb2dpbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnByYXNoYW5iYXN0aWFuc3olMkZEb3dubG9hZHMlMkZjaHVyY2gtcG9ydGFsLXN0YXJ0ZXIlMkZzcmMlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGcHJhc2hhbmJhc3RpYW5zeiUyRkRvd25sb2FkcyUyRmNodXJjaC1wb3J0YWwtc3RhcnRlciZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDdUM7QUFDcEg7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaHVyY2gtcG9ydGFsLz82MzVmIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9wcmFzaGFuYmFzdGlhbnN6L0Rvd25sb2Fkcy9jaHVyY2gtcG9ydGFsLXN0YXJ0ZXIvc3JjL2FwcC9hcGkvYXV0aC9sb2dpbi9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvYXV0aC9sb2dpbi9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvbG9naW5cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvbG9naW4vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvcHJhc2hhbmJhc3RpYW5zei9Eb3dubG9hZHMvY2h1cmNoLXBvcnRhbC1zdGFydGVyL3NyYy9hcHAvYXBpL2F1dGgvbG9naW4vcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2F1dGgvbG9naW4vcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/auth/login/route.ts":
/*!*****************************************!*\
  !*** ./src/app/api/auth/login/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./src/lib/auth.ts\");\n\n\nasync function POST(req) {\n    const { email, password } = await req.json();\n    const token = await (0,_lib_auth__WEBPACK_IMPORTED_MODULE_1__.login)(email, password);\n    if (!token) return new next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse(\"Unauthorized\", {\n        status: 401\n    });\n    (0,_lib_auth__WEBPACK_IMPORTED_MODULE_1__.setAuthCookie)(token);\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        ok: true\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9hdXRoL2xvZ2luL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUEyQztBQUNPO0FBRTNDLGVBQWVHLEtBQUtDLEdBQVk7SUFDckMsTUFBTSxFQUFFQyxLQUFLLEVBQUVDLFFBQVEsRUFBRSxHQUFHLE1BQU1GLElBQUlHLElBQUk7SUFDMUMsTUFBTUMsUUFBUSxNQUFNUCxnREFBS0EsQ0FBQ0ksT0FBT0M7SUFDakMsSUFBSSxDQUFDRSxPQUFPLE9BQU8sSUFBSVIscURBQVlBLENBQUMsZ0JBQWdCO1FBQUVTLFFBQVE7SUFBSTtJQUNsRVAsd0RBQWFBLENBQUNNO0lBQ2QsT0FBT1IscURBQVlBLENBQUNPLElBQUksQ0FBQztRQUFFRyxJQUFJO0lBQUs7QUFDdEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaHVyY2gtcG9ydGFsLy4vc3JjL2FwcC9hcGkvYXV0aC9sb2dpbi9yb3V0ZS50cz9kMzFhIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcbmltcG9ydCB7IGxvZ2luLCBzZXRBdXRoQ29va2llIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcTogUmVxdWVzdCkge1xuICBjb25zdCB7IGVtYWlsLCBwYXNzd29yZCB9ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgY29uc3QgdG9rZW4gPSBhd2FpdCBsb2dpbihlbWFpbCwgcGFzc3dvcmQpO1xuICBpZiAoIXRva2VuKSByZXR1cm4gbmV3IE5leHRSZXNwb25zZSgnVW5hdXRob3JpemVkJywgeyBzdGF0dXM6IDQwMSB9KTtcbiAgc2V0QXV0aENvb2tpZSh0b2tlbik7XG4gIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IG9rOiB0cnVlIH0pO1xufVxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsImxvZ2luIiwic2V0QXV0aENvb2tpZSIsIlBPU1QiLCJyZXEiLCJlbWFpbCIsInBhc3N3b3JkIiwianNvbiIsInRva2VuIiwic3RhdHVzIiwib2siXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/auth/login/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/auth.ts":
/*!*************************!*\
  !*** ./src/lib/auth.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   clearAuthCookie: () => (/* binding */ clearAuthCookie),\n/* harmony export */   getUserFromCookie: () => (/* binding */ getUserFromCookie),\n/* harmony export */   login: () => (/* binding */ login),\n/* harmony export */   requireRole: () => (/* binding */ requireRole),\n/* harmony export */   setAuthCookie: () => (/* binding */ setAuthCookie)\n/* harmony export */ });\n/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jsonwebtoken */ \"(rsc)/./node_modules/jsonwebtoken/index.js\");\n/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsonwebtoken__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n/* harmony import */ var _prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./prisma */ \"(rsc)/./src/lib/prisma.ts\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! bcryptjs */ \"(rsc)/./node_modules/bcryptjs/index.js\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nconst JWT_SECRET = process.env.JWT_SECRET || \"dev-secret\";\nasync function login(email, password) {\n    const user = await _prisma__WEBPACK_IMPORTED_MODULE_2__.prisma.user.findUnique({\n        where: {\n            email\n        }\n    });\n    if (!user) return null;\n    const ok = await bcryptjs__WEBPACK_IMPORTED_MODULE_3___default().compare(password, user.passwordHash);\n    if (!ok) return null;\n    const token = jsonwebtoken__WEBPACK_IMPORTED_MODULE_0___default().sign({\n        sub: user.id,\n        role: user.role,\n        email: user.email\n    }, JWT_SECRET, {\n        expiresIn: \"8h\"\n    });\n    return token;\n}\nfunction setAuthCookie(token) {\n    (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)().set(\"token\", token, {\n        httpOnly: true,\n        sameSite: \"lax\",\n        secure: false,\n        path: \"/\"\n    });\n}\nfunction clearAuthCookie() {\n    (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)().set(\"token\", \"\", {\n        httpOnly: true,\n        sameSite: \"lax\",\n        secure: false,\n        path: \"/\",\n        maxAge: 0\n    });\n}\nfunction getUserFromCookie() {\n    const cookieStore = (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)();\n    const token = cookieStore.get(\"token\")?.value;\n    if (!token) return null;\n    try {\n        const payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_0___default().verify(token, JWT_SECRET);\n        return {\n            id: Number(payload.sub),\n            role: payload.role,\n            email: payload.email\n        };\n    } catch  {\n        return null;\n    }\n}\nfunction requireRole(roles) {\n    const u = getUserFromCookie();\n    if (!u || !roles.includes(u.role)) return null;\n    return u;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL2F1dGgudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0I7QUFDUTtBQUNMO0FBQ0o7QUFFOUIsTUFBTUksYUFBYUMsUUFBUUMsR0FBRyxDQUFDRixVQUFVLElBQUk7QUFFdEMsZUFBZUcsTUFBTUMsS0FBYSxFQUFFQyxRQUFnQjtJQUN6RCxNQUFNQyxPQUFPLE1BQU1SLDJDQUFNQSxDQUFDUSxJQUFJLENBQUNDLFVBQVUsQ0FBQztRQUFFQyxPQUFPO1lBQUVKO1FBQU07SUFBRTtJQUM3RCxJQUFJLENBQUNFLE1BQU0sT0FBTztJQUNsQixNQUFNRyxLQUFLLE1BQU1WLHVEQUFjLENBQUNNLFVBQVVDLEtBQUtLLFlBQVk7SUFDM0QsSUFBSSxDQUFDRixJQUFJLE9BQU87SUFDaEIsTUFBTUcsUUFBUWhCLHdEQUFRLENBQUM7UUFBRWtCLEtBQUtSLEtBQUtTLEVBQUU7UUFBRUMsTUFBTVYsS0FBS1UsSUFBSTtRQUFFWixPQUFPRSxLQUFLRixLQUFLO0lBQUMsR0FBR0osWUFBWTtRQUFFaUIsV0FBVztJQUFLO0lBQzNHLE9BQU9MO0FBQ1Q7QUFFTyxTQUFTTSxjQUFjTixLQUFhO0lBQ3pDZixxREFBT0EsR0FBR3NCLEdBQUcsQ0FBQyxTQUFTUCxPQUFPO1FBQUVRLFVBQVU7UUFBTUMsVUFBVTtRQUFPQyxRQUFRO1FBQU9DLE1BQU07SUFBSTtBQUM1RjtBQUVPLFNBQVNDO0lBQ2QzQixxREFBT0EsR0FBR3NCLEdBQUcsQ0FBQyxTQUFTLElBQUk7UUFBRUMsVUFBVTtRQUFNQyxVQUFVO1FBQU9DLFFBQVE7UUFBT0MsTUFBTTtRQUFLRSxRQUFRO0lBQUU7QUFDcEc7QUFFTyxTQUFTQztJQUNkLE1BQU1DLGNBQWM5QixxREFBT0E7SUFDM0IsTUFBTWUsUUFBUWUsWUFBWUMsR0FBRyxDQUFDLFVBQVVDO0lBQ3hDLElBQUksQ0FBQ2pCLE9BQU8sT0FBTztJQUNuQixJQUFJO1FBQ0YsTUFBTWtCLFVBQVVsQywwREFBVSxDQUFDZ0IsT0FBT1o7UUFDbEMsT0FBTztZQUFFZSxJQUFJaUIsT0FBT0YsUUFBUWhCLEdBQUc7WUFBR0UsTUFBTWMsUUFBUWQsSUFBSTtZQUFFWixPQUFPMEIsUUFBUTFCLEtBQUs7UUFBQztJQUM3RSxFQUFFLE9BQU07UUFDTixPQUFPO0lBQ1Q7QUFDRjtBQUVPLFNBQVM2QixZQUFZQyxLQUE2QjtJQUN2RCxNQUFNQyxJQUFJVDtJQUNWLElBQUksQ0FBQ1MsS0FBSyxDQUFDRCxNQUFNRSxRQUFRLENBQUNELEVBQUVuQixJQUFJLEdBQVUsT0FBTztJQUNqRCxPQUFPbUI7QUFDVCIsInNvdXJjZXMiOlsid2VicGFjazovL2NodXJjaC1wb3J0YWwvLi9zcmMvbGliL2F1dGgudHM/NjY5MiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XG5pbXBvcnQgeyBjb29raWVzIH0gZnJvbSAnbmV4dC9oZWFkZXJzJztcbmltcG9ydCB7IHByaXNtYSB9IGZyb20gJy4vcHJpc21hJztcbmltcG9ydCBiY3J5cHQgZnJvbSAnYmNyeXB0anMnO1xuXG5jb25zdCBKV1RfU0VDUkVUID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVCB8fCAnZGV2LXNlY3JldCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dpbihlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKSB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kVW5pcXVlKHsgd2hlcmU6IHsgZW1haWwgfSB9KTtcbiAgaWYgKCF1c2VyKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgb2sgPSBhd2FpdCBiY3J5cHQuY29tcGFyZShwYXNzd29yZCwgdXNlci5wYXNzd29yZEhhc2gpO1xuICBpZiAoIW9rKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdG9rZW4gPSBqd3Quc2lnbih7IHN1YjogdXNlci5pZCwgcm9sZTogdXNlci5yb2xlLCBlbWFpbDogdXNlci5lbWFpbCB9LCBKV1RfU0VDUkVULCB7IGV4cGlyZXNJbjogJzhoJyB9KTtcbiAgcmV0dXJuIHRva2VuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0QXV0aENvb2tpZSh0b2tlbjogc3RyaW5nKSB7XG4gIGNvb2tpZXMoKS5zZXQoJ3Rva2VuJywgdG9rZW4sIHsgaHR0cE9ubHk6IHRydWUsIHNhbWVTaXRlOiAnbGF4Jywgc2VjdXJlOiBmYWxzZSwgcGF0aDogJy8nIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJBdXRoQ29va2llKCkge1xuICBjb29raWVzKCkuc2V0KCd0b2tlbicsICcnLCB7IGh0dHBPbmx5OiB0cnVlLCBzYW1lU2l0ZTogJ2xheCcsIHNlY3VyZTogZmFsc2UsIHBhdGg6ICcvJywgbWF4QWdlOiAwIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXNlckZyb21Db29raWUoKTogeyBpZDogbnVtYmVyLCByb2xlOiBzdHJpbmcsIGVtYWlsOiBzdHJpbmcgfSB8IG51bGwge1xuICBjb25zdCBjb29raWVTdG9yZSA9IGNvb2tpZXMoKTtcbiAgY29uc3QgdG9rZW4gPSBjb29raWVTdG9yZS5nZXQoJ3Rva2VuJyk/LnZhbHVlO1xuICBpZiAoIXRva2VuKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXlsb2FkID0gand0LnZlcmlmeSh0b2tlbiwgSldUX1NFQ1JFVCkgYXMgYW55O1xuICAgIHJldHVybiB7IGlkOiBOdW1iZXIocGF5bG9hZC5zdWIpLCByb2xlOiBwYXlsb2FkLnJvbGUsIGVtYWlsOiBwYXlsb2FkLmVtYWlsIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlUm9sZShyb2xlczogQXJyYXk8J2FkbWluJ3wnc3RhZmYnPikge1xuICBjb25zdCB1ID0gZ2V0VXNlckZyb21Db29raWUoKTtcbiAgaWYgKCF1IHx8ICFyb2xlcy5pbmNsdWRlcyh1LnJvbGUgYXMgYW55KSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB1O1xufVxuIl0sIm5hbWVzIjpbImp3dCIsImNvb2tpZXMiLCJwcmlzbWEiLCJiY3J5cHQiLCJKV1RfU0VDUkVUIiwicHJvY2VzcyIsImVudiIsImxvZ2luIiwiZW1haWwiLCJwYXNzd29yZCIsInVzZXIiLCJmaW5kVW5pcXVlIiwid2hlcmUiLCJvayIsImNvbXBhcmUiLCJwYXNzd29yZEhhc2giLCJ0b2tlbiIsInNpZ24iLCJzdWIiLCJpZCIsInJvbGUiLCJleHBpcmVzSW4iLCJzZXRBdXRoQ29va2llIiwic2V0IiwiaHR0cE9ubHkiLCJzYW1lU2l0ZSIsInNlY3VyZSIsInBhdGgiLCJjbGVhckF1dGhDb29raWUiLCJtYXhBZ2UiLCJnZXRVc2VyRnJvbUNvb2tpZSIsImNvb2tpZVN0b3JlIiwiZ2V0IiwidmFsdWUiLCJwYXlsb2FkIiwidmVyaWZ5IiwiTnVtYmVyIiwicmVxdWlyZVJvbGUiLCJyb2xlcyIsInUiLCJpbmNsdWRlcyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/prisma.ts":
/*!***************************!*\
  !*** ./src/lib/prisma.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\nconst globalForPrisma = global;\nconst prisma = globalForPrisma.prisma || new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log: [\n        \"warn\",\n        \"error\"\n    ]\n});\nif (true) globalForPrisma.prisma = prisma;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL3ByaXNtYS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBOEM7QUFFOUMsTUFBTUMsa0JBQWtCQztBQUVqQixNQUFNQyxTQUNYRixnQkFBZ0JFLE1BQU0sSUFDdEIsSUFBSUgsd0RBQVlBLENBQUM7SUFDZkksS0FBSztRQUFDO1FBQVE7S0FBUTtBQUN4QixHQUFHO0FBRUwsSUFBSUMsSUFBeUIsRUFBY0osZ0JBQWdCRSxNQUFNLEdBQUdBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2h1cmNoLXBvcnRhbC8uL3NyYy9saWIvcHJpc21hLnRzPzAxZDciXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSAnQHByaXNtYS9jbGllbnQnO1xuXG5jb25zdCBnbG9iYWxGb3JQcmlzbWEgPSBnbG9iYWwgYXMgdW5rbm93biBhcyB7IHByaXNtYTogUHJpc21hQ2xpZW50IH07XG5cbmV4cG9ydCBjb25zdCBwcmlzbWEgPVxuICBnbG9iYWxGb3JQcmlzbWEucHJpc21hIHx8XG4gIG5ldyBQcmlzbWFDbGllbnQoe1xuICAgIGxvZzogWyd3YXJuJywgJ2Vycm9yJ10sXG4gIH0pO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgZ2xvYmFsRm9yUHJpc21hLnByaXNtYSA9IHByaXNtYTtcbiJdLCJuYW1lcyI6WyJQcmlzbWFDbGllbnQiLCJnbG9iYWxGb3JQcmlzbWEiLCJnbG9iYWwiLCJwcmlzbWEiLCJsb2ciLCJwcm9jZXNzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/semver","vendor-chunks/bcryptjs","vendor-chunks/jsonwebtoken","vendor-chunks/lodash.includes","vendor-chunks/jws","vendor-chunks/lodash.once","vendor-chunks/jwa","vendor-chunks/lodash.isinteger","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/lodash.isplainobject","vendor-chunks/ms","vendor-chunks/lodash.isstring","vendor-chunks/lodash.isnumber","vendor-chunks/lodash.isboolean","vendor-chunks/safe-buffer","vendor-chunks/buffer-equal-constant-time"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fprashanbastiansz%2FDownloads%2Fchurch-portal-starter&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();