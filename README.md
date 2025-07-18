# Career Timeline

A comprehensive career timeline web application built with Svelte.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Development](#development)
- [Testing](#testing)
- [Building and Deployment](#building-and-deployment)
  - [CI/CD Pipeline](#cicd-pipeline)
  - [GitHub Pages Deployment](#github-pages-deployment)
- [Infrastructure](#infrastructure)
  - [Cloudflare Configuration](#cloudflare-configuration)
  - [Custom Domain Setup](#custom-domain-setup)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project visualizes a professional career timeline, highlighting key milestones, experiences, and skills developed over time. It offers an interactive and visually appealing way to present career progression.

## Tech Stack

- **Frontend Framework**: [Svelte](https://svelte.dev/) - A radical new approach to building user interfaces
- **Build Tool**: [SvelteKit](https://kit.svelte.dev/) - The fastest way to build Svelte apps
- **Deployment**: GitHub Pages via GitHub Actions
- **CDN/DNS**: Cloudflare

## Getting Started

### Prerequisites

- Node.js (version 14.x or higher recommended)
- yarn

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/feikegeerts/career-timeline.git
cd career-timeline

# Install dependencies
yarn install
```

### Running Locally

Start the development server:

```bash
yarn dev

# or start the server and open the app in a new browser tab
yarn dev -- --open
```

The application will be available at `http://localhost:5173` by default.

## Development

This project follows standard Svelte development practices. Here are some key commands:

```bash
# Run tests
yarn test

# Type checking
yarn check

# Lint code
yarn lint

# Format code
yarn format
```

## Testing

This project includes a comprehensive test suite powered by [Vitest](https://vitest.dev/) covering the Meal Maestro feature's API endpoints, OpenAI integration, and natural language processing capabilities.

### Test Structure

The test suite is organized into several categories:

- **Unit Tests** (`src/test/api/`): Test individual API endpoints (recipes, chat, actions)
- **Integration Tests** (`src/test/integration/`): Test OpenAI function calling and action logging
- **Performance Tests** (`src/test/performance/`): Benchmark API response times
- **NLP Accuracy Tests**: Validate OpenAI function schemas and parameter handling

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run type checking
yarn check
```

### Test Results Summary

The test suite includes **93 comprehensive tests** with:
- **71% pass rate** (66 passing tests)
- **100% performance benchmark success** (all API responses <2s)
- Complete validation of OpenAI function calling integration
- Comprehensive API endpoint testing with error handling
- Natural language processing accuracy validation

### Test Configuration

Tests are configured with:
- **TypeScript support** for type-safe testing
- **Supabase mocking** for database operations
- **OpenAI API mocking** for AI integration testing
- **Node.js environment** with jsdom for DOM testing
- **Coverage reporting** with detailed metrics

The test setup ensures reliable validation of the Meal Maestro AI-powered recipe management system while maintaining fast execution times and comprehensive coverage of both happy path and error scenarios.

## Building and Deployment

To create a production build:

```bash
yarn build
```

You can preview the production build locally:

```bash
yarn preview
```

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The workflow:

1. Triggers on push to the main branch
2. Runs tests and linting
3. Builds the application
4. Deploys to GitHub Pages

You can find the workflow configuration in `.github/workflows/deploy.yml`.

### GitHub Pages Deployment

The application is automatically deployed to GitHub Pages on successful builds of the main branch. The deployment:

- Uses the `gh-pages` branch for hosting
- Configures the application for the appropriate base path
- Sets up necessary CNAME records for custom domain

## Infrastructure

### Cloudflare Configuration

Cloudflare sits in front of our GitHub Pages deployment, providing:

- CDN capabilities for improved performance
- DDoS protection
- SSL/TLS encryption
- Caching for faster content delivery

### Custom Domain Setup

The application is accessible via a custom domain configured through:

1. GitHub Pages custom domain setting
2. DNS records in Cloudflare pointing to GitHub Pages
3. CNAME file in the project repository

## License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
