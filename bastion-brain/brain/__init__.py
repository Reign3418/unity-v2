"""Bastion Brain — always-on ring orchestrator (Railway).

Step 4 is the deterministic v0: Ring 1 (KENT/NULL/SCOUT) gathers demand, Ring 2 (TANK/BIG_JON/NUMNUM)
plans and gates jobs, Ring 3 (DOZER/AUDIT) verifies results and owns bot state. LLM leaders replace the
deterministic SCOUT/TANK/AUDIT planners in Step 6 without changing these contracts.
"""

__version__ = "0.7.0-step7"
