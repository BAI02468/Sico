# Copyright (c) 2026 Sico Authors
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

from __future__ import annotations

import asyncio

import pytest

import app.biz.task_runtime.stale_reconciler as stale_reconciler


@pytest.mark.asyncio
async def test_startup_reconciler_runs_immediate_and_delayed_pass(monkeypatch) -> None:
    calls: list[str] = []

    async def reconcile_once() -> None:
        calls.append("reconcile")

    monkeypatch.setattr(stale_reconciler, "reconcile_stale_task_runtime_once", reconcile_once)
    monkeypatch.setattr(stale_reconciler, "_startup_reconcile_delay_seconds", lambda: 0.001)

    await stale_reconciler.run_task_runtime_startup_reconciler(asyncio.Event())

    assert calls == ["reconcile", "reconcile"]


@pytest.mark.asyncio
async def test_startup_reconciler_skips_delayed_pass_when_stopping(monkeypatch) -> None:
    calls: list[str] = []

    async def reconcile_once() -> None:
        calls.append("reconcile")

    monkeypatch.setattr(stale_reconciler, "reconcile_stale_task_runtime_once", reconcile_once)
    monkeypatch.setattr(stale_reconciler, "_startup_reconcile_delay_seconds", lambda: 60)
    stop_event = asyncio.Event()
    stop_event.set()

    await stale_reconciler.run_task_runtime_startup_reconciler(stop_event)

    assert calls == ["reconcile"]
