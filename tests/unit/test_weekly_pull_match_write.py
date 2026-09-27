#  Copyright (C) 2026 Comicarr contributors
#
#  This file is part of Comicarr.
#
#  Comicarr is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.

"""A followed series on the pull list must not crash the weekly job.

When ``new_pullcheck`` matched a pull row to a followed series, it saved the
match with keys that are not ``weekly`` columns (``Status``, ``WEEKNUMBER``,
``YEAR``). SQLite's raw SQL ignores column-name case, but since the SQLAlchemy
Core upsert (#45) the write raised ``CompileError: Unconsumed column names``,
so any week with a followed series in it failed the whole pull-list run.
"""

import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from sqlalchemy import insert, select

import comicarr
from comicarr import db, weeklypull
from comicarr.tables import comics, issues, metadata, weekly


@pytest.fixture
def pull_db(tmp_path, monkeypatch):
    monkeypatch.setattr(comicarr, "DATA_DIR", str(tmp_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    db.shutdown_engine()
    engine = db.get_engine()
    metadata.create_all(engine)
    yield engine
    db.shutdown_engine()


def _seed(engine, recent):
    with engine.begin() as conn:
        conn.execute(
            insert(comics).values(
                ComicID="160294",
                ComicName="Absolute Batman",
                ComicName_Filesafe="Absolute Batman",
                ComicYear="2024",
                ComicPublisher="DC Comics",
                ComicPublished="October 2024 - Present",
                LatestDate=recent,
                LatestIssue="23",
                Status="Active",
                DynamicComicName="absolutebatman",
                Type="Print",
                ForceContinuing=0,
            )
        )
        conn.execute(
            insert(issues).values(
                IssueID="1194150",
                ComicID="160294",
                ComicName="Absolute Batman",
                Issue_Number="24",
                Int_IssueNumber=24000,
                IssueDate="2026-11-01",
                ReleaseDate="2026-09-23",
                Status="Skipped",
            )
        )
        conn.execute(
            insert(weekly).values(
                COMIC="Absolute Batman",
                ISSUE="24",
                PUBLISHER="DC Comics",
                SHIPDATE="2026-09-23",
                STATUS=None,
                ComicID="160294",
                IssueID="1194150",
                DynamicName="absolutebatman",
                weeknumber="38",
                year="2026",
            )
        )


def test_a_matched_series_is_saved_on_its_pull_row(pull_db, monkeypatch):
    recent = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
    _seed(pull_db, recent)
    config = MagicMock()
    config.ANNUALS_ON = False
    config.AUTOWANT_UPCOMING = False
    monkeypatch.setattr(comicarr, "CONFIG", config)
    monkeypatch.setattr(weeklypull.helpers, "listPull", lambda week, year: ["160294"])
    monkeypatch.setattr(weeklypull.helpers, "checkthepub", lambda comicid: 60)
    monkeypatch.setattr(weeklypull.helpers, "LoadAlternateSearchNames", lambda *_args: None)
    monkeypatch.setattr(weeklypull.updater, "upcoming_update", MagicMock(return_value=None), raising=False)
    monkeypatch.setattr(weeklypull.updater, "foundsearch", MagicMock(return_value=None), raising=False)
    monkeypatch.setattr(weeklypull.updater, "dbUpdate", MagicMock(), raising=False)
    # new_pullcheck logs and swallows per-row errors; surface them instead.
    swallowed = MagicMock()
    monkeypatch.setattr(weeklypull.helpers, "log_that_exception", swallowed)

    weeklypull.new_pullcheck(38, "2026")

    assert not swallowed.called, swallowed.call_args

    row = db.select_one(select(weekly).where(weekly.c.IssueID == "1194150"))
    assert row["ComicID"] == "160294"
    assert row["STATUS"] == "Skipped"
    assert (row["weeknumber"], row["year"]) == ("38", "2026")
