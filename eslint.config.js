import { createConfigForNuxt } from '@nuxt/eslint-config/flat';

export default createConfigForNuxt({
	features: {
		tooling: true,
		stylistic: {
			indent: 'tab',
			quotes: 'single',
			semi: true,
		},
	},
})
	.append({
		rules: {
			// Functional programming best practices
			'no-var': 'error',
			'prefer-const': 'error',
			'prefer-arrow-callback': 'warn',
			'no-param-reassign': 'warn',

			// Code quality
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'eqeqeq': ['error', 'always'],

			// Vue specific
			'vue/multi-word-component-names': 'off',
			'vue/require-default-prop': 'warn',
			'vue/no-unused-vars': 'error',

			// Nuxt specific - allow auto-imports
			'no-undef': 'off',
		},
	})
	.override('nuxt/javascript', {
		rules: {
			// Allow console in server files
			'no-console': 'off',
		},
	});
