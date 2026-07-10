# Scripts agent guide

## Purpose

This directory contains startup and shutdown helpers for the local development workflow.

## Current scripts

- start.ps1: Starts the FastAPI backend on Windows PowerShell.
- stop.ps1: Stops the FastAPI backend on Windows PowerShell.
- start.sh: Starts the FastAPI backend on macOS/Linux.
- stop.sh: Stops the FastAPI backend on macOS/Linux.

## Working conventions

- Keep the scripts lightweight and focused on launching the app locally.
- Use the same default host and port across scripts whenever possible.
- Update the scripts if the app entry point or runtime command changes.
