import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs';

export default generateEslintConfig({
	enableTypescript: true,
	typescriptRules: {
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/promise-function-async': 'off',
		'@typescript-eslint/no-base-to-string': 'off',
		'@typescript-eslint/prefer-promise-reject-errors': 'off',
		'@typescript-eslint/no-unsafe-function-type': 'off',
		'@typescript-eslint/no-wrapper-object-types': 'off',
		'@typescript-eslint/no-unsafe-declaration-merging': 'off',
		'@typescript-eslint/no-duplicate-type-constituents': 'off',
	},
	ignores: ['src/tfc/test.ts'],
});
