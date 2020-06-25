module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		commonjs: true,
		es2020: true,
	},
	parserOptions: {
		ecmaVersion: 11,
	},
	plugins: ['prettier'],
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	rules: {
		'prettier/prettier': 'error',
		'no-empty-function': 2,
		'global-require': 2,
	},
};
