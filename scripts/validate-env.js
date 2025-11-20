#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Ensures all required environment variables are present before build/dev
 */

/* eslint-disable no-console */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env') });

// Define required environment variables with validation rules
const requiredEnvVars = [
	{
		name: 'TMDB_TOKEN',
		description: 'TMDb API Read Access Token',
		validate: (value) => {
			if (!value || value === 'your_tmdb_read_access_token_here') {
				return 'TMDB_TOKEN is missing or not configured';
			}
			if (!value.startsWith('eyJ')) {
				return 'TMDB_TOKEN should be a Bearer token (starts with "eyJ")';
			}
			if (value.length < 100) {
				return 'TMDB_TOKEN appears to be invalid (too short)';
			}
			return null; // Valid
		},
		helpUrl: 'https://www.themoviedb.org/settings/api',
	},
	{
		name: 'COOKIE',
		description: 'Picturehouse API Cookie',
		validate: (value) => {
			if (!value || value === 'your_picturehouse_cookie_here') {
				return 'COOKIE is missing or not configured';
			}
			// Basic validation: should contain typical cookie patterns
			if (!value.includes('=') || value.length < 50) {
				return 'COOKIE appears to be invalid (should be a long cookie string)';
			}
			return null; // Valid
		},
		helpUrl: 'https://www.picturehouses.com/cinema/finsbury-park',
	},
];

// Color codes for terminal output
const colors = {
	reset: '\x1B[0m',
	red: '\x1B[31m',
	green: '\x1B[32m',
	yellow: '\x1B[33m',
	blue: '\x1B[34m',
	bold: '\x1B[1m',
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironment() {
	log('\n🔍 Validating environment variables...\n', 'blue');

	const errors = [];
	const warnings = [];

	// Check each required variable
	for (const envVar of requiredEnvVars) {
		const value = process.env[envVar.name];
		const error = envVar.validate(value);

		if (error) {
			errors.push({
				name: envVar.name,
				description: envVar.description,
				error,
				helpUrl: envVar.helpUrl,
			});
		}
		else {
			log(`✓ ${envVar.name} is configured`, 'green');
		}
	}

	// Check optional variables
	if (!process.env.CINEMA_ID) {
		warnings.push('CINEMA_ID not set, will use default: 031 (Finsbury Park)');
	}

	// Display warnings
	if (warnings.length > 0) {
		log('\n⚠️  Warnings:', 'yellow');
		for (const warning of warnings) {
			log(`  - ${warning}`, 'yellow');
		}
	}

	// Display errors
	if (errors.length > 0) {
		log('\n❌ Environment validation failed!\n', 'red');
		log('Missing or invalid environment variables:\n', 'red');

		for (const error of errors) {
			log(`  ${error.name}:`, 'bold');
			log(`    Description: ${error.description}`, 'red');
			log(`    Error: ${error.error}`, 'red');
			log(`    Help: ${error.helpUrl}`, 'blue');
			log('');
		}

		log('Please update your .env file with the required values.', 'red');
		log('See .env.example for reference.\n', 'yellow');

		process.exit(1); // Exit with error code
	}

	log('\n✅ All required environment variables are configured!\n', 'green');
	process.exit(0);
}

// Run validation
validateEnvironment();
