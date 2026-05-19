
# RELOAD // MASTER V4

Precision load development platform for professional and hobbyist reloaders.

---

# Project Overview

RELOAD // MASTER V4 is a mobile-first progressive web application focused on:

- Precision rifle load development
- Chronograph data collection
- Statistical analysis
- Rifle lifecycle tracking
- Structured testing workflows
- Long-term performance analytics

The application is designed around immutable shot-level records and normalized data relationships rather than notebook-style batch summaries.

---

# Core Design Philosophy

## The Shot Is The Atomic Unit

All analytics derive upward from individual shot records.

This enables:

- Accurate SD / ES calculations
- Node detection
- Velocity trend analysis
- Vertical dispersion analysis
- Pressure trend tracking
- Historical recipe validation

---

# Architecture Goals

- Offline-first architecture
- IndexedDB local persistence
- Mobile-first field usability
- Relational data structure
- Modular service architecture
- Future cloud synchronization support

---

# Core Data Hierarchy

```text
Firearm
 └── Recipe
      └── Development Session
           └── Test Group
                └── Shot
```

---

# IndexedDB Schema

## Stores

```js
firearms
recipes
development_sessions
test_groups
shots
analytics
```

---

# Store Purposes

| Store | Purpose |
|---|---|
| firearms | Rifle/platform metadata |
| recipes | Permanent load definitions |
| development_sessions | Individual range sessions |
| test_groups | Structured test methodology |
| shots | Immutable shot-level records |
| analytics | Cached derived calculations |

---

# Current Feature Set

## Implemented

- IndexedDB database manager
- Normalized object model
- Shot-centric architecture
- Dashboard rewrite
- Analytics engine scaffold
- Recipe structure
- Session structure
- Test group structure

## In Progress

- Live chrono recording
- Garmin CSV import
- Target plotting engine
- Pressure tracking UI
- Session workflow engine
- Velocity graphing
- Node analysis

---

# Planned Workflow System

| Workflow | Purpose |
|---|---|
| Charge Ladder | Pressure + node discovery |
| OCW | Optimal charge validation |
| Seating Depth | Harmonic tuning |
| Powder Comparison | Velocity stability |
| Primer Comparison | SD optimization |
| Validation Group | Final recipe confirmation |
| Hunting Zero | Cold bore verification |

---

# Domain Models

## Firearm

Tracks:

- Chambering
- Barrel metadata
- Optics
- Barrel lifecycle
- Round count
- Cleaning intervals

---

## Recipe

Tracks:

- Bullet
- Powder
- Primer
- Brass
- Charge weight
- Jump
- CBTO
- Neck tension

---

## Development Session

Tracks:

- Environmental conditions
- Chronograph data
- Session notes
- Test methodologies

---

## Test Group

Isolates one variable for testing.

Examples:
- Powder charge
- Seating depth
- Primer type
- Powder selection

---

## Shot

Primary immutable record.

Tracks:
- Velocity
- Impact coordinates
- Pressure signs
- Environmental conditions
- Shot sequence
- Statistical exclusions

---

# Analytics Roadmap

Planned calculations:

- Average velocity
- Standard deviation
- Extreme spread
- Velocity regression
- Vertical dispersion
- Group centroid
- Temperature sensitivity
- Barrel trend analysis
- Harmonic node detection

---

# Technical Roadmap

## Phase 1 — Foundation
- Normalize schema
- Rewrite IndexedDB structure
- Create migration strategy
- Build immutable shot engine

## Phase 2 — Range Workflow
- Real-time shot entry
- Session tracking
- Chronograph integration
- Environmental logging

## Phase 3 — Analytics
- Velocity charts
- SD/ES visualizations
- Node analysis
- Target overlays

## Phase 4 — Precision Features
- Barrel wear modeling
- Temp shift analysis
- Cold bore tracking
- Load scoring

## Phase 5 — Synchronization
- Cloud backup
- User accounts
- Multi-device sync
- Collaborative sharing

---

# Recommended Future File Structure

```text
/ src
  / db
  / models
  / services
  / analytics
  / views
  / components
  / styles
```

---

# Development Standards

## Principles

- Never aggregate before storing shot-level data
- Derived calculations are not source-of-truth
- One test group should isolate one variable
- Analytics derive upward from immutable records
- UI workflows should mirror actual range workflows

---

# Immediate Priorities

1. Break monolithic HTML into modules
2. Build session workflow engine
3. Implement live shot entry
4. Add Garmin CSV parsing
5. Build target plotting engine
6. Add statistical dashboard
7. Create migration utilities

---

# Long-Term Vision

RELOAD // MASTER V4 is intended to evolve into a true precision load-development platform capable of:

- Long-term rifle performance tracking
- Statistical recipe validation
- Chronograph analytics
- Environmental correlation
- Precision rifle workflow management
- Multi-device synchronization

---

# Current Status

Architecture rewrite in progress.

Core schema and application foundation established.
