# Mapbox / Location Search Demo

[![Code Checks](https://github.com/sammydeveille/mapbox-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/sammydeveille/mapbox-sandbox/actions/workflows/ci.yml)

## Overview

- [About](#about)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Run](#run)

## About

This demo is using [Mapbox](https://www.mapbox.com/), [React](), [Tailwind CSS](https://tailwindcss.com/), [Node.js](https://tailwindcss.com/), [tRPC](https://trpc.io/), [Drizzle ORM](https://orm.drizzle.team/), [PostgreSQL](https://www.postgresql.org/) and [Redis](https://redis.io/) to build a full-stack location search application with interactive map.

## Architecture

### Front routes
- `/` - Home page with location search
- `/feedback` - Feedback list view
- `/feedback/new` - Create new feedback
- `/feedback/:id/edit` - Edit existing feedback

### Backend routes
- `getMapboxToken` - Returns Mapbox access token
- `location.getInfo` - Fetches location data (weather, air quality, Wikipedia, country info, World Bank data)
- `feedback.list` - List all feedback
- `feedback.create` - Create new feedback
- `feedback.update` - Update existing feedback
- `feedback.delete` - Delete feedback

## Prerequisites

- [Docker](https://www.mapbox.com)
- [Node.js](https://github.com/nvm-sh/nvm) 20+ with npm
- [Mapbox](https://www.mapbox.com) Access Token

## Install

```bash
# Dependencies
npm i

# Environment file
npm run env
#   Modify vars such as MAPBOX_ACCESS_TOKEN

# Seed data
npm run db:seed
```

## Run
```bash
# Compose
npm start

# Stop
npm stop

# Test
npm test
```

## Services
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Audit
```bash 
npm run audit
```
> **Note:** Known vulnerabilities in `drizzle-kit` (dev dependency) do not affect production. Use `--production` flag for production-only audit.


## Utils
```bash
# Logs
npm run log
npm run log:front
npm run log:front

# Docker
npm run docker:restart
npm run docker:rebuild

# Redis flush
npm run redis:flush
```