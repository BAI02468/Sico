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

"""Tests for ``TaskManager.submit_prepared``.

Validates that the new bypass-normalization API correctly executes prepared
batches and preserves caller-supplied ``batch_metadata`` verbatim."""

from __future__ import annotations

from pathlib import Path
import shutil
from types import SimpleNamespace

import pytest

from app.biz.task_runtime.artifact_store import FileArtifactStore
from app.biz.task_runtime.executors.base import Executor
from app.biz.task_runtime.executors.command_backend import LocalBackend
from app.biz.task_runtime.models import PreparedTaskBatch, TaskBatchInput, TaskDisplay
from app.biz.task_runtime.executors.tool_executor import ToolExecutor
from app.biz.task_runtime.manager import TaskManager
from app.biz.task_runtime.models import TaskSpec, ToolDispatch
from app.biz.task_runtime.store import FileRunStore
from app.biz.task_runtime.submitter import _prepared_submission_fingerprint
from app.schemas.conversation.plan import Plan
from app.biz.task_runtime.context import TurnContext
from app.tools.plan import PlanEditor


class _FakePlanEditor(PlanEditor):
    def __init__(self) -> None:
        self.plan: Plan | None = None
        self.next_tool_call_id = 0
        self.messages: dict[int, str] = {}
        self.deliverables: dict[int, list] = {}
        self.cancelled = False

    async def get_plan(self) -> Plan | None:
        return self.plan

    async def update_plan(self, plan: Plan) -> None:
        self.plan = plan

    async def create_tool_call(
        self,
        name,
        initial_message,
        execution_info=None,
        parent_tool_call_id=None,
        sub_call_index=0,
        display=None,
        tool_call_status=None,
    ):
        self.next_tool_call_id += 1
        self.messages[self.next_tool_call_id] = initial_message
        return self.next_tool_call_id

    async def update_tool_call_message(self, tool_call_id: int, message: str):
        self.messages[tool_call_id] = message
        return None

    async def update_tool_call(self, tool_call_id: int, updater):
        tool_call = SimpleNamespace(
            deliverables=self.deliverables.get(tool_call_id, []),
            tool_call_status=self.statuses.get(tool_call_id) if hasattr(self, "statuses") else None,
            execution_info=SimpleNamespace(
                task_runtime=SimpleNamespace(
                    current_stage="",
                    sandbox_id="",
                    sandbox_type="",
                    sandbox_endpoint="",
                    attempt=0,
                    max_attempts=0,
                    latest_progress_message="",
                )
            ),
        )
        updater(tool_call)
        self.deliverables[tool_call_id] = tool_call.deliverables
        return tool_call

    async def is_plan_cancelled(self) -> bool:
        return self.cancelled


def _turn_context(submission_id: str = "submission-1") -> TurnContext:
    return TurnContext(
        username="alice@example.com",
        agent_id="agent",
        agent_instance_id=1,
        project_id=1,
        conversation_id=1,
        turn_id=1,
        plan_editor=_FakePlanEditor(),
        submission_id=submission_id,
    )


def _echo_task(task_id: str, message: str) -> TaskSpec:
    return TaskSpec(
        task_id=task_id,
        title=f"Echo {task_id}",
        dispatch=ToolDispatch(tool_name="echo"),
        args={"message": message},
    )


def test_submission_fingerprint_tracks_execution_semantics_only() -> None:
    original = _echo_task("task-1", "hello")
    original.display = TaskDisplay(plan_title="First title")
    original.metadata["general_planner"] = {"rationale": "first wording"}
    cosmetic_change = original.model_copy(deep=True)
    cosmetic_change.display.plan_title = "Different title"
    cosmetic_change.metadata["general_planner"] = {"rationale": "different wording"}
    execution_change = original.model_copy(deep=True)
    execution_change.args["message"] = "different payload"

    original_batch = PreparedTaskBatch(batch=TaskBatchInput(tasks=(original,)))
    cosmetic_batch = PreparedTaskBatch(batch=TaskBatchInput(tasks=(cosmetic_change,)))
    execution_batch = PreparedTaskBatch(batch=TaskBatchInput(tasks=(execution_change,)))

    assert _prepared_submission_fingerprint(original_batch, "adapter:general") == _prepared_submission_fingerprint(
        cosmetic_batch,
        "adapter:general",
    )
    assert _prepared_submission_fingerprint(original_batch, "adapter:general") != _prepared_submission_fingerprint(
        execution_batch,
        "adapter:general",
    )
    assert _prepared_submission_fingerprint(original_batch, "adapter:general") != _prepared_submission_fingerprint(
        original_batch,
        "adapter:workbook",
    )


def _tool_executor(tmp_path: Path) -> ToolExecutor:
    return ToolExecutor(
        artifact_store=FileArtifactStore(tmp_path / "artifacts"),
        sandbox_backend=LocalBackend(),
    )


class _FailingBatchLookupStore(FileRunStore):
    """Simulates a store read that fails for a reason other than "not found"."""

    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self.fail_batch_lookup = False

    async def get_batch(self, batch_id: str):
        if self.fail_batch_lookup:
            raise ConnectionError(f"simulated backend outage for {batch_id}")
        return await super().get_batch(batch_id)


class _CountingExecutor:
    def __init__(self, inner: Executor) -> None:
        self.inner = inner
        self.run_count = 0

    async def run(self, run, store):
        self.run_count += 1
        return await self.inner.run(run, store)


class _MissNextBatchLookupStore(FileRunStore):
    miss_next_batch_lookup = False

    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self.update_batch_count = 0

    async def get_batch(self, batch_id: str):
        if self.miss_next_batch_lookup:
            self.miss_next_batch_lookup = False
            raise FileNotFoundError(f"simulated stale read for {batch_id}")
        return await super().get_batch(batch_id)

    async def update_batch(self, batch):
        self.update_batch_count += 1
        await super().update_batch(batch)


class _FailingDetailStore(FileRunStore):
    fail_run_id = ""
    detail_failures_remaining = 0

    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self.detail_calls = 0
        self.list_batch_runs_calls = 0

    async def get_task_detail(self, run_id: str, view: str):
        self.detail_calls += 1
        if run_id == self.fail_run_id and self.detail_failures_remaining > 0:
            self.detail_failures_remaining -= 1
            raise ConnectionError("transient detail read failure")
        return await super().get_task_detail(run_id, view)

    async def list_batch_runs(self, batch_id: str):
        self.list_batch_runs_calls += 1
        return await super().list_batch_runs(batch_id)


@pytest.mark.asyncio
async def test_submit_prepared_executes_prepared_echo_batch(tmp_path: Path) -> None:
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), _tool_executor(tmp_path), max_concurrency=2)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "hello"), _echo_task("task-2", "world")),
            join_strategy="partial_ok",
            description="Prepared echo batch.",
        ),
    )

    result = await manager.submit_prepared(_turn_context(), prepared)

    assert result.completed_count == 2
    assert result.failed_count == 0


@pytest.mark.asyncio
async def test_submit_prepared_preserves_caller_supplied_batch_metadata(tmp_path: Path) -> None:
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), _tool_executor(tmp_path), max_concurrency=1)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "ok"),),
            description="Single task.",
        ),
        batch_metadata={"source": "request-builder", "trace_id": "abc-123"},
    )

    result = await manager.submit_prepared(_turn_context(), prepared)

    batch = await manager.store.get_batch(result.batch_id)
    assert batch is not None
    assert batch.metadata["source"] == "request-builder"
    assert batch.metadata["trace_id"] == "abc-123"
    assert batch.metadata["_task_runtime"]["submission_id"] == "submission-1"


@pytest.mark.asyncio
async def test_submit_prepared_uses_caller_join_strategy(tmp_path: Path) -> None:
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), _tool_executor(tmp_path), max_concurrency=1)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "fast"),),
            join_strategy="first_success",
            description="First-success batch.",
        ),
    )

    result = await manager.submit_prepared(_turn_context(), prepared)

    assert result.completed_count == 1


@pytest.mark.asyncio
async def test_submit_prepared_reuses_replay_but_executes_new_submission(tmp_path: Path) -> None:
    executor = _CountingExecutor(_tool_executor(tmp_path))
    store = _MissNextBatchLookupStore(tmp_path / "turn" / "results")
    manager = TaskManager(store, executor, max_concurrency=1)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "again"),),
            description="Replay-safe batch.",
        ),
    )
    rerun_prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "changed for intentional rerun"),),
            description="Intentional rerun batch.",
        ),
    )

    replay_context = _turn_context("submission-1")
    first = await manager.submit_prepared(replay_context, prepared)
    updates_after_first = store.update_batch_count
    store.miss_next_batch_lookup = True
    replay = await manager.submit_prepared(replay_context, prepared)
    rerun = await manager.submit_prepared(_turn_context("submission-2"), rerun_prepared)

    assert replay.batch_id == first.batch_id
    assert rerun.batch_id != first.batch_id
    assert executor.run_count == 2
    assert store.update_batch_count == updates_after_first + 1


@pytest.mark.asyncio
async def test_submit_prepared_rejects_divergent_replay(tmp_path: Path) -> None:
    executor = _CountingExecutor(_tool_executor(tmp_path))
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), executor, max_concurrency=1)
    original = PreparedTaskBatch(
        batch=TaskBatchInput(tasks=(_echo_task("task-1", "original"),), description="Original batch."),
    )
    divergent = PreparedTaskBatch(
        batch=TaskBatchInput(tasks=(_echo_task("task-1", "different"),), description="Divergent replay."),
    )

    await manager.submit_prepared(_turn_context("submission-1"), original)

    with pytest.raises(RuntimeError, match="diverged"):
        await manager.submit_prepared(_turn_context("submission-1"), divergent)
    assert executor.run_count == 1


@pytest.mark.asyncio
async def test_submit_prepared_rejects_incomplete_replay_batch(tmp_path: Path) -> None:
    store = FileRunStore(tmp_path / "turn" / "results")
    manager = TaskManager(store, _tool_executor(tmp_path), max_concurrency=2)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "one"), _echo_task("task-2", "two")),
            description="Two-task batch.",
        ),
    )
    context = _turn_context("submission-1")

    first = await manager.submit_prepared(context, prepared)
    runs = await store.list_batch_runs(first.batch_id)
    shutil.rmtree(store.run_dir(first.batch_id, runs[-1].run_id))

    with pytest.raises(RuntimeError, match="expected 2 materialized runs, found 1"):
        await manager.submit_prepared(context, prepared)


@pytest.mark.asyncio
async def test_submit_prepared_replay_skips_execution_planning(tmp_path: Path, monkeypatch) -> None:
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), _tool_executor(tmp_path), max_concurrency=1)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(tasks=(_echo_task("task-1", "hello"),), description="Replay batch."),
    )
    context = _turn_context("submission-1")
    first = await manager.submit_prepared(context, prepared)

    async def unexpected_planning(*args, **kwargs):
        raise AssertionError("execution planning must be skipped for replay")

    monkeypatch.setattr(manager.submitter, "_plan_batch_execution", unexpected_planning)
    replay = await manager.submit_prepared(context, prepared)

    assert replay.batch_id == first.batch_id


@pytest.mark.asyncio
async def test_submit_prepared_replay_retries_transient_observation_failures(
    tmp_path: Path,
    monkeypatch,
) -> None:
    import app.biz.task_runtime.submitter as submitter_module

    monkeypatch.setattr(submitter_module, "_REPLAY_RESULT_POLL_SECONDS", 0)
    store = _FailingDetailStore(tmp_path / "turn" / "results")
    manager = TaskManager(store, _tool_executor(tmp_path), max_concurrency=2)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(
            tasks=(_echo_task("task-1", "one"), _echo_task("task-2", "two")),
            description="Two-task replay batch.",
        ),
    )
    context = _turn_context("submission-1")
    first = await manager.submit_prepared(context, prepared)
    runs = await store.list_batch_runs(first.batch_id)
    store.fail_run_id = runs[0].run_id
    store.detail_failures_remaining = 1
    store.detail_calls = 0
    store.list_batch_runs_calls = 0

    replay = await manager.submit_prepared(context, prepared)

    assert replay.completed_count == 2
    assert replay.failed_count == 0
    assert store.detail_calls == 3
    assert store.list_batch_runs_calls <= 4


@pytest.mark.asyncio
async def test_replayed_batch_result_wait_rejects_empty_runs(tmp_path: Path) -> None:
    manager = TaskManager(FileRunStore(tmp_path / "turn" / "results"), _tool_executor(tmp_path), max_concurrency=1)
    context = _turn_context("submission-1")
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(tasks=(_echo_task("task-1", "hello"),), description="Replay batch."),
    )
    result = await manager.submit_prepared(context, prepared)
    batch = await manager.store.get_batch(result.batch_id)

    with pytest.raises(RuntimeError, match="has no materialized runs"):
        await manager.submitter._wait_for_replayed_batch_results(context, batch, [])


@pytest.mark.asyncio
async def test_submit_prepared_marks_parent_failed_when_replay_lookup_errors(tmp_path: Path) -> None:
    store = _FailingBatchLookupStore(tmp_path / "turn" / "results")
    executor = _CountingExecutor(_tool_executor(tmp_path))
    manager = TaskManager(store, executor, max_concurrency=1)
    prepared = PreparedTaskBatch(
        batch=TaskBatchInput(tasks=(_echo_task("task-1", "hello"),), description="Replay batch."),
    )
    failed_parent_calls: list[int] = []

    async def record_failure(_ctx, parent_tool_call_id: int) -> None:
        failed_parent_calls.append(parent_tool_call_id)

    manager.submitter._progress.mark_delegate_tasks_failed = record_failure
    store.fail_batch_lookup = True

    with pytest.raises(ConnectionError, match="simulated backend outage"):
        await manager.submit_prepared(_turn_context("submission-1"), prepared)

    assert len(failed_parent_calls) == 1
    assert executor.run_count == 0
