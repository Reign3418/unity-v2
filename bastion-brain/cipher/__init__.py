"""CIPHER v2 — typed-job executor for SIDEKICK (Ring 2).

Pulls validated `BastionJob`s from SQS, runs the mapped skill, and returns a validated
`BastionJobResult` with evidence. It never executes anything a job supplies as text: skills
are looked up by `job_type` and receive only schema-validated, bounded arguments.
"""

__version__ = "2.0.0-step3"
